"""Focused installer receiving; point RETURNBY_RECEIVED_ARCHIVE at the pinned ZIP.

On a non-Mac host only the installer platform precondition is simulated. Actual
shell/HTTP execution retains that host's identity and is not Mac acceptance.
"""
from __future__ import annotations

import errno
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


def bind_incumbent_fixture(owner):
    """Admit the test-owned listener without mistaking TIME_WAIT for a product failure."""
    if sys.platform == "linux":
        # This fixture covers a reuse-enabled incumbent; port reuse stays off.
        owner.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    deadline = time.monotonic() + 65
    while True:
        try:
            owner.bind(("127.0.0.1", 8769))
            return
        except OSError as error:
            if not NATIVE_MAC or error.errno != errno.EADDRINUSE or time.monotonic() >= deadline:
                raise
            # Keep Darwin's non-reuse fixture bind; never wait out a live owner.
            try:
                with socket.create_connection(("127.0.0.1", 8769), timeout=0.25):
                    pass
            except ConnectionRefusedError:
                time.sleep(0.25)
            else:
                raise RuntimeError("Receiver fixture port already has a live owner") from error


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
        deadline = time.monotonic() + (65 if NATIVE_MAC else 10)
        while time.monotonic() < deadline:
            if child.poll() is not None:
                self.fail("Entry exited before readiness: " + repr(child.communicate()))
            try:
                with urlopen("http://127.0.0.1:8769/index.html", timeout=1) as response:
                    self.assertEqual(response.status, 200)
                    return
            except OSError:
                time.sleep(0.05)
        self.fail("Entry did not become ready within the host startup deadline")

    def test_all_assets_and_source_identity_remain_exact(self):
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
            bind_incumbent_fixture(owner)
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
        caught.exception.close()
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

    def source_copy(self, name="source copy"):
        source = self.root / name
        source.mkdir()
        own_installer = source / "install_macos.py"
        own_installer.write_bytes(Path(installer.__file__).read_bytes())
        (source / "serve_returnby.py").write_bytes(
            (ROOT / "tools/received_preview/serve_returnby.py").read_bytes())
        return own_installer

    def test_original_custody_and_installed_runtime_roles_are_exact(self):
        archive, files, _ = installer.admit_archive(Path(ARCHIVE))
        runtime = (ROOT / "tools/received_preview/serve_returnby.py").read_bytes()
        self.assertEqual((self.destination / "recovery/received-build.zip").read_bytes(), archive)
        self.assertEqual((self.destination / "recovery/original-serve_returnby.py").read_bytes(),
                         files["serve_returnby.py"])
        self.assertEqual((self.destination / "serve_returnby.py").read_bytes(), runtime)
        self.assertEqual((self.destination / "recovery/serve_returnby.py").read_bytes(), runtime)
        self.assertNotEqual(runtime, files["serve_returnby.py"])
        self.assertEqual(self.receipt["originalServerSha256"], installer.ORIGINAL_SERVER_SHA256)
        self.assertEqual(self.receipt["installedServerSha256"], installer.INSTALLED_SERVER_SHA256)

    def test_bad_adjacent_runtime_refuses_before_mkdir_then_corrected_retry_succeeds(self):
        original = (ROOT / "tools/received_preview/serve_returnby.py").read_bytes()
        for kind in ("missing", "directory", "symlink", "changed", "truncated", "oversized"):
            with self.subTest(kind=kind):
                own_installer = self.source_copy("source " + kind)
                runtime = own_installer.with_name("serve_returnby.py")
                runtime.unlink()
                if kind == "directory":
                    runtime.mkdir()
                elif kind == "symlink":
                    target = own_installer.with_name("same bytes.py")
                    target.write_bytes(original)
                    runtime.symlink_to(target)
                elif kind == "changed":
                    runtime.write_bytes(bytes([original[0] ^ 1]) + original[1:])
                elif kind == "truncated":
                    runtime.write_bytes(original[:-1])
                elif kind == "oversized":
                    runtime.write_bytes(original + b"\n")
                destination = self.root / ("corrected " + kind)
                with patch.object(installer, "__file__", str(own_installer)):
                    with patch.object(installer.sys, "platform", "darwin"):
                        with self.assertRaises((OSError, ValueError)):
                            installer.install(Path(ARCHIVE), destination)
                        self.assertFalse(destination.exists())
                        if runtime.is_symlink() or runtime.is_file():
                            runtime.unlink()
                        elif runtime.is_dir():
                            runtime.rmdir()
                        runtime.write_bytes(original)
                        received = installer.install(Path(ARCHIVE), destination)
                self.assertTrue(received["accepted"])
                self.assertEqual((destination / "serve_returnby.py").read_bytes(), original)

    def test_admitted_runtime_bytes_are_reused_after_source_changes(self):
        own_installer = self.source_copy()
        runtime = own_installer.with_name("serve_returnby.py")
        admitted = runtime.read_bytes()
        destination = self.root / "admitted before source changed"
        original_mkdir = Path.mkdir

        def change_after_admission(path, *args, **kwargs):
            if path == destination:
                runtime.write_bytes(b"changed after runtime admission")
            return original_mkdir(path, *args, **kwargs)

        with patch.object(installer, "__file__", str(own_installer)):
            with patch.object(installer.sys, "platform", "darwin"):
                with patch.object(Path, "mkdir", change_after_admission):
                    received = installer.install(Path(ARCHIVE), destination)
        self.assertTrue(received["accepted"])
        self.assertNotEqual(runtime.read_bytes(), admitted)
        self.assertEqual((destination / "serve_returnby.py").read_bytes(), admitted)
        self.assertEqual((destination / "recovery/serve_returnby.py").read_bytes(), admitted)

    def test_self_check_refuses_each_changed_runtime_custody_copy(self):
        for name in ("serve_returnby.py", "recovery/serve_returnby.py",
                     "recovery/original-serve_returnby.py", "recovery/install_macos.py"):
            with self.subTest(name=name):
                path = self.destination / name
                original = path.read_bytes()
                try:
                    path.write_bytes(bytes([original[0] ^ 1]) + original[1:])
                    with self.assertRaises(ValueError):
                        installer.check_installation(self.destination)
                finally:
                    path.write_bytes(original)
                self.assertEqual(installer.check_installation(self.destination), self.receipt)

    def test_self_check_refuses_runtime_role_tampering_and_v1_receipt(self):
        path = self.destination / "INSTALLATION.json"
        original = path.read_bytes()
        for field, value in (
                ("originalServerSha256", installer.INSTALLED_SERVER_SHA256),
                ("installedServerSha256", installer.ORIGINAL_SERVER_SHA256),
                ("schema", "returnby-macos-received-preview-v1")):
            with self.subTest(field=field):
                changed = json.loads(original)
                changed[field] = value
                try:
                    path.write_text(json.dumps(changed), encoding="utf-8")
                    with self.assertRaisesRegex(ValueError, "receipt does not match"):
                        installer.check_installation(self.destination)
                finally:
                    path.write_bytes(original)
        self.assertEqual(installer.check_installation(self.destination), self.receipt)

    def test_retained_installer_recovers_into_another_new_destination(self):
        original = inventory(self.destination)
        retained = self.destination / "recovery/install_macos.py"
        recovery_spec = importlib.util.spec_from_file_location("returnby_recovery_copy", retained)
        recovery = importlib.util.module_from_spec(recovery_spec)
        recovery_spec.loader.exec_module(recovery)
        second = self.root / "Recovered reçu copy"
        with patch.object(recovery.sys, "platform", "darwin"):
            received = recovery.install(self.destination / "recovery/received-build.zip", second)
            with self.assertRaises(FileExistsError):
                recovery.install(self.destination / "recovery/received-build.zip", second)
        self.assertTrue(received["accepted"])
        self.assertEqual(recovery.check_installation(second), received)
        self.assertEqual(inventory(second), original)
        self.assertEqual(inventory(self.destination), original)

    def test_payload_write_failure_retains_partial_copy_without_launcher(self):
        destination = self.root / "partial copy"
        original_open = Path.open

        def fail_payload(path, mode="r", *args, **kwargs):
            if path == destination / "recovery/serve_returnby.py" and mode == "xb":
                raise OSError("controlled recovery payload write failure")
            return original_open(path, mode, *args, **kwargs)

        with patch.object(installer.sys, "platform", "darwin"):
            with patch.object(Path, "open", fail_payload):
                with self.assertRaisesRegex(OSError, "controlled recovery"):
                    installer.install(Path(ARCHIVE), destination)
            self.assertTrue(destination.is_dir())
            self.assertFalse((destination / installer.ENTRY_NAME).exists())
            self.assertFalse((destination / "INSTALLATION.json").exists())
            partial = inventory(destination)
            with self.assertRaises(FileExistsError):
                installer.install(Path(ARCHIVE), destination)
            self.assertEqual(inventory(destination), partial)
            fresh = self.root / "fresh after partial"
            self.assertTrue(installer.install(Path(ARCHIVE), fresh)["accepted"])

    def test_non_object_receipt_is_a_controlled_cli_refusal(self):
        path = self.destination / "INSTALLATION.json"
        original = path.read_bytes()
        for value in (None, [], 7, "invalid receipt"):
            with self.subTest(value=value):
                try:
                    path.write_text(json.dumps(value), encoding="utf-8")
                    child = subprocess.run(
                        [sys.executable, "-B", *(["-O"] if sys.flags.optimize else []),
                         str(self.destination / "recovery/install_macos.py"),
                         "--check", str(self.destination)],
                        text=True, capture_output=True, timeout=6)
                    self.assertEqual(child.returncode, 2)
                    self.assertEqual(child.stdout, "")
                    self.assertIn("receipt does not match", child.stderr)
                    self.assertNotIn("Traceback", child.stderr)
                finally:
                    path.write_bytes(original)
        self.assertEqual(installer.check_installation(self.destination), self.receipt)


if __name__ == "__main__":
    print(json.dumps({"host": sys.platform, "python": sys.version.split()[0],
                      "nativeMac": NATIVE_MAC, "platformPreconditionSimulated": not NATIVE_MAC}), flush=True)
    unittest.main(verbosity=2)
