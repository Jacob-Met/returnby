"""Actual CLI receiving for the static-preview helper; standard library only."""
import hashlib
import http.client
import http.server
import json
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import threading
import unittest
import warnings
import zipfile

TOOL = Path(__file__).with_name("receive_static_preview.py")


def pin(data):
    return {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
            "git_blob": hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()}


def free_port():
    with socket.socket() as handle:
        handle.bind(("127.0.0.1", 0))
        return handle.getsockname()[1]


class Receiving(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="returnby receiver ")
        self.root = Path(self.temp.name)
        self.archive = self.root / "review packet.zip"
        self.output = self.root / "received packet \u03a9"
        self.files = {
            "preview/index.html": b"<!doctype html><title>Fictional preview</title>",
            "preview/assets/app%.js": b"document.title = 'literal';",
            "preview/notes \u03a9.txt": "Fictional \u03a9\r\n".encode(),
            "VERIFY.py": b"raise RuntimeError('Packaged code must never execute')\n",
        }

    def tearDown(self):
        self.temp.cleanup()

    def package(self, mutate=None):
        rows = [{"path": name, **pin(data)} for name, data in self.files.items()]
        manifest = {"schema": "hamon.exact-delivery-manifest/1", "files": rows}
        if mutate:
            mutate(manifest)
        with zipfile.ZipFile(self.archive, "w", zipfile.ZIP_DEFLATED) as archive:
            for name, data in self.files.items():
                archive.writestr(name, data)
            archive.writestr("MANIFEST.json", json.dumps(manifest).encode())
        return pin(self.archive.read_bytes())["sha256"]

    def run_cli(self, digest, port=None):
        return subprocess.run(
            [sys.executable, "-I", "-B", str(TOOL), "--archive", self.archive.name,
             "--sha256", digest, "--output", self.output.name, "--port", str(port or free_port())],
            cwd=self.root, capture_output=True, text=True, timeout=15)

    def refused_before_output(self, digest):
        result = self.run_cli(digest)
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertFalse(self.output.exists())
        self.assertFalse(json.loads(result.stderr)["passed"])
        return result

    def test_complete_http_course_with_literal_paths_and_no_packaged_execution(self):
        digest = self.package()
        archive_before = (self.archive.read_bytes(), self.archive.stat())
        port = free_port()
        result = self.run_cli(digest, port)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        receipt = json.loads((self.output / "receiving.json").read_text())
        self.assertTrue(receipt["passed"])
        self.assertEqual(receipt["server"]["returncode"], 0)
        self.assertEqual(len(receipt["http"]), 4)
        self.assertEqual(receipt["extracted_files_preserved"], 5)
        self.assertEqual(receipt["archive_before"], receipt["archive_after"])
        for name, data in self.files.items():
            self.assertEqual((self.output / "package" / name).read_bytes(), data)
        self.assertEqual(self.archive.read_bytes(), archive_before[0])
        self.assertEqual(self.archive.stat().st_mtime_ns, archive_before[1].st_mtime_ns)
        with socket.socket() as handle:
            self.assertNotEqual(handle.connect_ex(("127.0.0.1", port)), 0)

    def test_wrong_external_digest_refuses_without_output(self):
        self.package()
        self.refused_before_output("0" * 64)

    def test_corrupt_payload_manifest_identity_refuses_without_output(self):
        digest = self.package(lambda m: m["files"][0].update(sha256="0" * 64))
        self.refused_before_output(digest)

    def test_duplicate_manifest_row_refuses_without_output(self):
        digest = self.package(lambda m: m["files"].__setitem__(1, m["files"][0]))
        self.refused_before_output(digest)

    def test_boolean_size_is_not_an_integer_size(self):
        digest = self.package(lambda m: m["files"][0].update(bytes=True))
        self.refused_before_output(digest)

    def test_noncanonical_member_refuses_without_extraction(self):
        self.files["../outside.txt"] = b"fictional"
        digest = self.package()
        self.refused_before_output(digest)
        self.assertFalse((self.root.parent / "outside.txt").exists())

    def test_case_alias_refuses_without_extraction(self):
        self.files["preview/INDEX.html"] = b"second file"
        self.refused_before_output(self.package())

    def test_duplicate_archive_member_refuses_without_extraction(self):
        self.package()
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", UserWarning)
            with zipfile.ZipFile(self.archive, "a") as archive:
                archive.writestr("preview/index.html", b"second entry")
        self.refused_before_output(pin(self.archive.read_bytes())["sha256"])

    def test_existing_output_is_preserved(self):
        digest = self.package()
        self.output.mkdir()
        sentinel = self.output / "kept.txt"
        sentinel.write_bytes(b"keep this")
        result = self.run_cli(digest)
        self.assertEqual(result.returncode, 1)
        self.assertEqual(list(self.output.iterdir()), [sentinel])
        self.assertEqual(sentinel.read_bytes(), b"keep this")

    def test_occupied_listener_is_not_requested_or_stopped(self):
        digest = self.package()
        observed = []
        class Handler(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                observed.append(self.path)
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b"incumbent")
            def log_message(self, *args):
                pass
        with http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler) as incumbent:
            thread = threading.Thread(target=incumbent.serve_forever, kwargs={"poll_interval": 0.05})
            thread.start()
            try:
                result = self.run_cli(digest, incumbent.server_port)
                self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
                self.assertEqual(observed, [])
                receipt = json.loads((self.output / "receiving.json").read_text())
                self.assertFalse(receipt["passed"])
                self.assertEqual(receipt["http"], [])
                self.assertNotEqual(receipt["server"]["returncode"], 0)
                self.assertTrue(receipt["archive_preserved"])
                self.assertEqual(receipt["extracted_files_preserved"], 5)
                connection = http.client.HTTPConnection("127.0.0.1", incumbent.server_port, timeout=2)
                try:
                    connection.request("GET", "/control")
                    response = connection.getresponse()
                    self.assertEqual(response.read(), b"incumbent")
                    self.assertEqual(observed, ["/control"])
                finally:
                    connection.close()
            finally:
                incumbent.shutdown()
                thread.join(timeout=5)
                self.assertFalse(thread.is_alive())


if __name__ == "__main__":
    unittest.main(verbosity=2)
