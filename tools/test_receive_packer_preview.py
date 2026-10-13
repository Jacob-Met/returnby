"""CLI compatibility checks for estate-packer previews; no packaged code executes."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import zipfile

from test_receive_static_preview import free_port, pin

TOOL = Path(__file__).with_name("receive_static_preview.py")


class PackerReceiving(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="packer receiver ")
        self.root = Path(self.temp.name)
        self.archive = self.root / "selected.zip"
        self.output = self.root / "new receiving"
        self.files = {
            "preview/index.html": "<!doctype html><title>Caf\u00e9 \u03a9</title>\r\n".encode(),
            "preview/notes with spaces.txt": "\ufeffliteral\r\n\u4e2d\t".encode(),
            "preview/payload.bin": bytes([0, 255, 13, 10]),
            "DO-NOT-RUN.py": b"raise RuntimeError('packaged code must not execute')\n",
        }

    def tearDown(self):
        self.temp.cleanup()

    def package(self, mutate=None, padding=0):
        rows = [{"path": n, "bytes": len(b), "sha256": pin(b)["sha256"]}
                for n, b in self.files.items()]
        manifest = {"schema": "hamon.delivery-zip/1", "files": rows}
        if mutate:
            mutate(manifest)
        raw = json.dumps(manifest, ensure_ascii=True).encode() + b" " * padding
        with zipfile.ZipFile(self.archive, "w", zipfile.ZIP_DEFLATED) as package:
            for name, body in self.files.items():
                package.writestr(name, body)
            package.writestr("MANIFEST.json", raw)
        return pin(self.archive.read_bytes())["sha256"]

    def run_cli(self, digest):
        return subprocess.run(
            [sys.executable, "-I", "-B", str(TOOL), "--archive", self.archive.name,
             "--sha256", digest, "--output", self.output.name, "--port", str(free_port())],
            cwd=self.root, capture_output=True, text=True, timeout=15)

    def refuse(self, digest, message):
        before = (self.archive.read_bytes(), self.archive.stat().st_mtime_ns)
        result = self.run_cli(digest)
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertFalse(self.output.exists())
        report = json.loads(result.stderr)
        self.assertFalse(report["passed"])
        self.assertIn(message, report["error"])
        self.assertEqual((self.archive.read_bytes(), self.archive.stat().st_mtime_ns), before)

    def test_complete_packer_schema_receives_exact_literal_binary_payloads(self):
        digest = self.package()
        result = self.run_cli(digest)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        receipt = json.loads((self.output / "receiving.json").read_text())
        self.assertTrue(receipt["passed"])
        self.assertEqual(receipt["manifest_schema"], "hamon.delivery-zip/1")
        self.assertEqual(receipt["manifest_fields_checked"], ["bytes", "sha256"])
        self.assertIsNone(receipt["product_tree"])
        self.assertEqual(receipt["server"]["returncode"], 0)
        self.assertEqual(len(receipt["http"]), 4)
        self.assertEqual(receipt["archive_before"], receipt["archive_after"])
        self.assertEqual(receipt["extracted_files_preserved"], 5)
        for name, body in self.files.items():
            self.assertEqual((self.output / "package" / name).read_bytes(), body)
            self.assertEqual(receipt["extracted_identity"][name]["git_blob"], pin(body)["git_blob"])

    def test_mixed_or_extra_manifest_fields_refuse(self):
        for field, value in [("product_tree", "fictional"), ("extra", None)]:
            with self.subTest(field=field):
                self.refuse(self.package(lambda m: m.update({field: value})),
                            "Delivery manifest has unsupported fields")

    def test_mixed_or_missing_row_fields_refuse(self):
        def missing(row):
            row.pop("sha256")
        for mutate in [lambda row: row.update(git_blob="0" * 40),
                       lambda row: row.update(extra=None), missing]:
            with self.subTest(mutation=str(mutate)):
                self.refuse(self.package(lambda m: mutate(m["files"][0])),
                            "Invalid delivery manifest row fields")

    def test_uppercase_digest_refuses_even_when_numerically_equal(self):
        self.refuse(self.package(lambda m: m["files"][0].update(
            sha256=m["files"][0]["sha256"].upper())), "lowercase hexadecimal")

    def test_payload_difference_refuses_before_materialization(self):
        self.refuse(self.package(lambda m: m["files"][0].update(sha256="0" * 64)),
                    "Payload identity mismatch")

    def test_unknown_schema_refuses(self):
        self.refuse(self.package(lambda m: m.update(schema="hamon.delivery-zip/2")),
                    "Unsupported manifest schema")

    def test_nonproducer_member_names_refuse(self):
        for name, message in [
                ("preview/caf\u00e9.txt", "printable ASCII"),
                ("preview/" + "a" * 233, "at most 240"),
                ("preview/ leading.txt", "surrounding spaces"),
                ("preview/CON .txt", "Reserved delivery member")]:
            with self.subTest(name=name):
                self.files[name] = b"literal"
                self.refuse(self.package(), message)
                del self.files[name]

    def test_manifest_size_limit_refuses(self):
        self.refuse(self.package(padding=1024 * 1024), "Delivery manifest exceeds 1 MiB")

    def test_file_count_limit_refuses(self):
        for i in range(1021):
            self.files["preview/empty-" + str(i) + ".txt"] = b""
        self.refuse(self.package(), "1 through 1024 payloads")

    def test_boolean_byte_count_refuses(self):
        self.refuse(self.package(lambda m: m["files"][0].update(bytes=True)),
                    "Invalid byte count")


if __name__ == "__main__":
    unittest.main(verbosity=2)
