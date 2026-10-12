"""Focused installer receiving; point RETURNBY_RECEIVED_ARCHIVE at the pinned ZIP.

On a non-Mac host only the installer platform precondition is simulated. Actual
shell/HTTP execution retains that host's identity and is not Mac acceptance.
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("returnby_mac_install", ROOT / "tools/received_preview/install_macos.py")
installer = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(installer)
ARCHIVE = os.environ.get("RETURNBY_RECEIVED_ARCHIVE")
NATIVE_MAC = sys.platform == "darwin"


def inventory(path: Path) -> dict:
    return {str(item.relative_to(path)): hashlib.sha256(item.read_bytes()).hexdigest()
            for item in path.rglob("*") if item.is_file()}


@unittest.skipUnless(ARCHIVE, "Supply the exact received archive through RETURNBY_RECEIVED_ARCHIVE")
class ReceivedMacEntry(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="ReturnBy receiver é ")
        self.root = Path(self.temp.name)
        self.destination = self.root / "ReturnBy completion copy"
        with patch.object(installer.sys, "platform", "darwin"):
            self.receipt = installer.install(Path(ARCHIVE), self.destination)
        self.processes = []

    def tearDown(self):
        for child in self.processes:
            if child.poll() is None:
                child.terminate()
                try:
                    child.communicate(timeout=6)
                except subprocess.TimeoutExpired:
                    child.kill()
                    child.communicate(timeout=6)
        self.temp.cleanup()

    def start(self, *args):
        child = subprocess.Popen([str(self.destination / installer.ENTRY_NAME), *args],
                                 stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                 text=True, encoding="utf-8")
        self.processes.append(child)
        return child

    def wait_ready(self, child):
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            if child.poll() is not None:
                self.fail("Entry exited before readiness: " + repr(child.communicate()))
            try:
                with urlopen("http://127.0.0.1:8769/index.html", timeout=1) as response:
                    self.assertEqual(response.status, 200)
                    return
            except OSError:
                time.sleep(0.05)
        self.fail("Entry did not become ready within ten seconds")

    def test_all_assets_and_server_remain_exact(self):
        self.assertEqual(self.receipt["assetsVerified"], 10)
        self.assertEqual(self.receipt["sourceCommit"], installer.SOURCE_COMMIT)
        self.assertEqual(installer.check_installation(self.destination), self.receipt)

    def test_existing_destination_is_never_overwritten(self):
        before = inventory(self.destination)
        with patch.object(installer.sys, "platform", "darwin"):
            with self.assertRaises(FileExistsError):
                installer.install(Path(ARCHIVE), self.destination)
        self.assertEqual(inventory(self.destination), before)

    def test_changed_archive_is_refused_before_destination_creation(self):
        changed = self.root / "changed.zip"
        data = bytearray(Path(ARCHIVE).read_bytes())
        data[-1] ^= 1
        changed.write_bytes(data)
        target = self.root / "must remain absent"
        with patch.object(installer.sys, "platform", "darwin"):
            with self.assertRaisesRegex(ValueError, "not the pinned"):
                installer.install(changed, target)
        self.assertFalse(target.exists())

    def test_changed_asset_refuses_check_and_server(self):
        target = self.destination / "app/index.html"
        target.write_bytes(target.read_bytes() + b" ")
        with self.assertRaises(ValueError):
            installer.check_installation(self.destination)
        child = self.start()
        out, err = child.communicate(timeout=6)
        self.assertEqual(child.returncode, 1)
        self.assertIn("missing or changed", err)
        self.assertNotIn("Tracker:", out)

    def test_symlinked_asset_refuses_check_and_server(self):
        target = self.destination / "app/index.html"
        original = self.root / "same bytes.html"
        target.rename(original)
        target.symlink_to(original)
        with self.assertRaisesRegex(ValueError, "regular file"):
            installer.check_installation(self.destination)
        child = self.start()
        out, err = child.communicate(timeout=6)
        self.assertEqual(child.returncode, 1)
        self.assertIn("regular local files", err)
        self.assertNotIn("Tracker:", out)

    def test_launcher_forwards_unexpected_arguments(self):
        child = self.start("--unexpected")
        out, err = child.communicate(timeout=6)
        self.assertEqual(child.returncode, 2)
        self.assertIn("takes no arguments", err)
        self.assertNotIn("Tracker:", out)

    def test_occupied_port_is_preserved(self):
        with socket.socket() as owner:
            owner.bind(("127.0.0.1", 8769))
            owner.listen()
            child = self.start()
            out, err = child.communicate(timeout=6)
            self.assertEqual(child.returncode, 1)
            self.assertIn("could not bind", err)
            self.assertNotIn("Tracker:", out)
            self.assertEqual(owner.getsockname(), ("127.0.0.1", 8769))
            with socket.create_connection(("127.0.0.1", 8769), timeout=1):
                pass

    def test_relocated_unicode_copy_serves_exact_assets_then_enter_stops(self):
        relocated = self.root / "Moved reçu copy"
        self.destination.rename(relocated)
        self.destination = relocated
        child = self.start()
        self.wait_ready(child)
        assets = json.loads((self.destination / "ASSETS.json").read_text())
        for asset in assets:
            with urlopen("http://127.0.0.1:8769/" + asset["path"], timeout=3) as response:
                self.assertEqual(hashlib.sha256(response.read()).hexdigest(), asset["sha256"])
        with self.assertRaises(HTTPError) as caught:
            urlopen("http://127.0.0.1:8769/INSTALLATION.json", timeout=3)
        self.assertEqual(caught.exception.code, 404)
        out, err = child.communicate("\n", timeout=6)
        self.assertEqual(child.returncode, 0, err)
        self.assertIn("Tracker:", out)
        self.assertIn("Trip checklist:", out)
        with socket.socket() as probe:
            self.assertNotEqual(probe.connect_ex(("127.0.0.1", 8769)), 0)

    def test_eof_stops_foreground_server(self):
        child = self.start()
        self.wait_ready(child)
        child.stdin.close()
        child.stdin = None
        out, err = child.communicate(timeout=6)
        self.assertEqual(child.returncode, 0, err)
        self.assertIn("Tracker:", out)
        with socket.socket() as probe:
            self.assertNotEqual(probe.connect_ex(("127.0.0.1", 8769)), 0)


if __name__ == "__main__":
    print(json.dumps({"host": sys.platform, "python": sys.version.split()[0],
                      "nativeMac": NATIVE_MAC, "platformPreconditionSimulated": not NATIVE_MAC}), flush=True)
    unittest.main(verbosity=2)
