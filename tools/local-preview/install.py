#!/usr/bin/env python3
"""Install the qualified ReturnBy preview into an explicitly new directory."""
from __future__ import annotations

import argparse
import datetime
import hashlib
import io
import json
import os
from pathlib import Path
import shlex
import stat
import sys
import zipfile

ARCHIVE_BYTES = 26444
ARCHIVE_SHA256 = "45d5f732879ab0101295648c59c1955b5f8ec190aa4c44a42b46bc24a9b464e4"
MANIFEST_SHA256 = "384deec2a8587f210f7a1d74e067f79dea42ca0f6141130a577e82fa6f9e3feb"
SOURCE_COMMIT = "d153659d1f561e1c316a1f9278b3d0b32c222c2f"
SOURCE_TREE = "c22fdac96a2d4219bb1a0b8b350b1f6c60d7d8db"
SOURCE_NAMES = ("install.py", "serve.py", "launch.command", "README.md")
EXPECTED_NAMES = {
    "assets/main-CZ6nOqh4.css",
    "assets/main-chTbUV5O.js",
    "assets/manual-C76pRCPN.js",
    "assets/manual-COJ3z-YY.css",
    "assets/order-admission-Bp_ZSQx5.css",
    "assets/order-admission-qAxwqzWX.js",
    "favicon.svg",
    "index.html",
    "manual-entry.html",
}


class Refusal(ValueError):
    """The input or destination is not admitted for installation."""


def read_bounded(path: Path, maximum: int) -> bytes:
    if not stat.S_ISREG(path.lstat().st_mode):
        raise Refusal(f"Expected a regular file: {path}")
    with path.open("rb") as stream:
        data = stream.read(maximum + 1)
    if len(data) > maximum:
        raise Refusal(f"File is larger than expected: {path}")
    return data


def admit_archive(path: Path) -> tuple[bytes, dict, dict[str, bytes]]:
    archive = read_bounded(path, ARCHIVE_BYTES)
    if len(archive) != ARCHIVE_BYTES or hashlib.sha256(archive).hexdigest() != ARCHIVE_SHA256:
        raise Refusal("The archive is not the exact qualified ReturnBy preview.")
    with zipfile.ZipFile(io.BytesIO(archive)) as bundle:
        infos = bundle.infolist()
        expected = EXPECTED_NAMES | {"BUILD-MANIFEST.json"}
        if len(infos) != 10 or {item.filename for item in infos} != expected:
            raise Refusal("Unexpected archive membership.")
        if any(item.is_dir() or item.file_size > 131072 for item in infos):
            raise Refusal("Unexpected archive member.")
        members = {item.filename: bundle.read(item) for item in infos}
    manifest_bytes = members["BUILD-MANIFEST.json"]
    if hashlib.sha256(manifest_bytes).hexdigest() != MANIFEST_SHA256:
        raise Refusal("The build manifest does not match this release.")
    manifest = json.loads(manifest_bytes)
    if (
        manifest.get("schema") != "returnby-qualified-preview-v1"
        or manifest.get("sourceCommit") != SOURCE_COMMIT
        or manifest.get("sourceTree") != SOURCE_TREE
        or set(manifest.get("files", {})) != EXPECTED_NAMES
    ):
        raise Refusal("Unexpected build identity.")
    for name, pin in manifest["files"].items():
        body = members[name]
        blob = hashlib.sha1(f"blob {len(body)}\0".encode() + body).hexdigest()
        if (
            len(body) != pin["bytes"]
            or hashlib.sha256(body).hexdigest() != pin["sha256"]
            or blob != pin["gitBlob"]
        ):
            raise Refusal(f"A bundled asset does not match the manifest: {name}")
    return archive, manifest, members


def write_new(path: Path, body: bytes, mode: int = 0o644) -> None:
    with path.open("xb") as stream:
        stream.write(body)
        stream.flush()
        os.fsync(stream.fileno())
    path.chmod(mode)


def main() -> int:
    parser = argparse.ArgumentParser(description="Install the exact qualified ReturnBy preview without replacing an existing directory.")
    parser.add_argument("--archive", type=Path, required=True, help="The original qualified-preview.zip.")
    parser.add_argument("--destination", type=Path, required=True, help="An absolute, new application directory.")
    args = parser.parse_args()
    destination = args.destination.expanduser()
    made_directory = False
    try:
        if not destination.is_absolute():
            raise Refusal("The destination must be an absolute path.")
        if os.path.lexists(destination):
            raise Refusal("The destination already exists; choose a new directory.")
        if not destination.parent.is_dir():
            raise Refusal("The destination parent must already exist.")
        archive, manifest, members = admit_archive(args.archive.expanduser())
        source_root = Path(__file__).resolve().parent
        sources = {name: read_bounded(source_root / name, 65536) for name in SOURCE_NAMES}
        template = sources["launch.command"].decode("utf-8")
        if template.count("@@PYTHON@@") != 1:
            raise Refusal("The launcher template is not valid.")
        launcher = template.replace("@@PYTHON@@", shlex.quote(sys.executable)).encode("utf-8")
        compile(sources["serve.py"], str(source_root / "serve.py"), "exec")

        destination.mkdir(mode=0o700)
        made_directory = True
        site = destination / "site"
        site.mkdir()
        (site / "assets").mkdir()
        recovery = destination / "recovery"
        recovery.mkdir()
        (recovery / "installer").mkdir()
        for name, body in members.items():
            write_new(site / name, body)
        write_new(destination / "serve.py", sources["serve.py"])
        write_new(destination / "Launch ReturnBy.command", launcher, 0o755)
        write_new(destination / "README.md", sources["README.md"])
        write_new(recovery / "qualified-preview.zip", archive, 0o600)
        for name, body in sources.items():
            write_new(recovery / "installer" / name, body)

        files = {}
        for path in sorted(destination.rglob("*")):
            if path.is_file():
                body = path.read_bytes()
                files[path.relative_to(destination).as_posix()] = {
                    "bytes": len(body), "sha256": hashlib.sha256(body).hexdigest(),
                }
        receipt = {
            "schema": "returnby-local-installation-v1",
            "installedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "destination": str(destination),
            "sourceCommit": SOURCE_COMMIT,
            "sourceTree": SOURCE_TREE,
            "archiveSha256": ARCHIVE_SHA256,
            "manifestSha256": MANIFEST_SHA256,
            "python": sys.executable,
            "pythonVersion": sys.version.split()[0],
            "origin": "http://127.0.0.1:48643",
            "files": files,
        }
        write_new(destination / "INSTALLATION.json", (json.dumps(receipt, indent=2) + "\n").encode())
        print(json.dumps(receipt, indent=2))
        return 0
    except (OSError, ValueError, KeyError, TypeError, zipfile.BadZipFile) as exc:
        print(f"ReturnBy was not installed: {exc}", file=sys.stderr)
        if made_directory:
            print(
                f"The incomplete new directory is retained for inspection: {destination}\n"
                "No existing installation was changed. Do not launch the incomplete copy.",
                file=sys.stderr,
            )
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
