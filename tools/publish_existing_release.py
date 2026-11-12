#!/usr/bin/env python3
"""Publish a checked ReturnBy package with its native archives and preview images.

The existing single-browser-archive manifest remains supported. New manifests
may include an assets list of checked native archives and product screenshots.
A repeated invocation observes the existing release and its assets before
uploading any missing file; it never clobbers an existing release asset.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tarfile
from tempfile import TemporaryFile
from zipfile import ZipFile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("source", help="source commit embedded in the packaged app")
parser.add_argument("tag")
parser.add_argument("directory")
parser.add_argument("--gh", default="/usr/bin/gh")
parser.add_argument("--title", default="ReturnBy — mobile desk and refund follow-through")
parser.add_argument("--published", action="store_true",
                    help="publish a stable release instead of a prerelease")
args = parser.parse_args()

directory = Path(args.directory).resolve()
manifest = json.loads((directory / "manifest.json").read_text())
if manifest["source"] != args.source or manifest["tag"] != args.tag:
    raise RuntimeError("Source commit and version tag differ from the package manifest")
if not re.fullmatch(r"[0-9a-f]{40}", args.source) or not re.fullmatch(r"v[0-9]+\.[0-9]+\.[0-9]+", args.tag):
    raise RuntimeError("Invalid source commit or release version tag")

def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1048576), b""):
            h.update(chunk)
    return h.hexdigest()

def checked_path(name, expected):
    if not isinstance(name, str) or not name or Path(name).name != name or name.startswith("."):
        raise RuntimeError("Release asset name must be a single safe filename")
    path = directory / name
    if path.is_symlink() or not path.is_file() or digest(path) != expected:
        raise RuntimeError("Release bytes differ from the checked package: " + name)
    return path

def embedded_readme(path):
    if path.name.endswith(".tar.gz"):
        with tarfile.open(path, "r:gz") as archive:
            names = [item for item in archive.getmembers() if item.name.endswith("/READ_ME_FIRST.txt")]
            if len(names) != 1 or not names[0].isfile():
                raise RuntimeError("Native package has no single launcher README")
            return archive.extractfile(names[0]).read().decode()
    with ZipFile(path) as archive:
        names = [name for name in archive.namelist() if name.endswith("/READ_ME_FIRST.txt")]
        if len(names) != 1:
            raise RuntimeError("Browser/native package has no single launcher README")
        return archive.read(names[0]).decode()

browser_name = Path(manifest["archive"]).name
assets = [(browser_name, manifest["sha256"])]
for row in manifest.get("assets", []):
    if not isinstance(row, dict) or set(row) != {"name", "sha256"}:
        raise RuntimeError("Malformed release asset entry")
    assets.append((row["name"], row["sha256"]))
if len({name for name, _ in assets}) != len(assets):
    raise RuntimeError("Duplicate release asset filename")
for name, expected in assets:
    if not isinstance(expected, str) or not re.fullmatch(r"[0-9a-f]{64}", expected):
        raise RuntimeError("Bad release digest for " + name)
    path = checked_path(name, expected)
    if name.endswith((".zip", ".tar.gz")):
        if args.source not in embedded_readme(path):
            raise RuntimeError("Packaged app does not identify its source: " + name)
    elif name.endswith(".png"):
        with path.open("rb") as stream:
            if stream.read(8) != b"\x89PNG\r\n\x1a\n":
                raise RuntimeError("Release screenshot is not a PNG")
    else:
        raise RuntimeError("Unrecognized release asset: " + name)

notes = directory / "RELEASE_NOTES.md"
if not notes.is_file() or not notes.read_text().strip():
    raise RuntimeError("Release notes are missing")
checksums = directory / "SHA256SUMS"
if not checksums.is_file():
    raise RuntimeError("Release checksum list is missing")
if manifest.get("assets") is not None:
    expected_lines = "".join(f"{pin}  {name}\n" for name, pin in sorted(assets))
    if checksums.read_text() != expected_lines:
        raise RuntimeError("Release checksum list differs from selected assets")

def run(arguments):
    result = subprocess.run(arguments, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError("Release command failed: " + " ".join(arguments[:3]) + ": " + result.stderr[-600:])
    return result.stdout

endpoint = "repos/Jacob-Met/returnby/releases/tags/" + args.tag
found = subprocess.run([args.gh, "api", endpoint], text=True, capture_output=True)
if found.returncode == 0:
    release = json.loads(found.stdout)
    if release["target_commitish"] != args.source:
        raise RuntimeError("Existing release targets another source")
    if args.published and release["prerelease"]:
        raise RuntimeError("Existing release is a prerelease, not the requested stable release")
else:
    if "HTTP 404" not in found.stderr:
        raise RuntimeError("Release absence is not established: " + found.stderr[-600:])
    request = {
        "tag_name": args.tag, "target_commitish": args.source, "name": args.title,
        "body": notes.read_text(), "draft": False, "prerelease": not args.published,
    }
    (directory / "release-request.json").write_text(json.dumps(request))
    command = [
        args.gh, "release", "create", args.tag, "--repo", "Jacob-Met/returnby",
        "--target", args.source, "--title", args.title, "--notes-file", str(notes),
    ]
    if not args.published:
        command.append("--prerelease")
    created = subprocess.run(command, text=True, capture_output=True)
    observed = subprocess.run([args.gh, "api", endpoint], capture_output=True, text=True)
    if observed.returncode:
        raise RuntimeError("Release creation not confirmed: " + created.stderr[-600:] + observed.stderr[-600:])
    release = json.loads(observed.stdout)
    if release["target_commitish"] != args.source:
        raise RuntimeError("New release does not target the requested source")

for name, expected in [*assets, (checksums.name, digest(checksums))]:
    current = {item["name"]: item for item in release.get("assets", [])}
    if name not in current:
        attempt = subprocess.run([
            args.gh, "release", "upload", args.tag, str(directory / name),
            "--repo", "Jacob-Met/returnby",
        ], capture_output=True, text=True)
        release = json.loads(run([args.gh, "api", endpoint]))
        current = {item["name"]: item for item in release.get("assets", [])}
        if name not in current:
            raise RuntimeError("Release asset upload not confirmed: " + name + " " + attempt.stderr[-600:])
    asset = current[name]
    if asset.get("size") != (directory / name).stat().st_size:
        raise RuntimeError("Published asset size differs: " + name)
    with TemporaryFile(dir=directory) as received:
        result = subprocess.run([
            args.gh, "api", "repos/Jacob-Met/returnby/releases/assets/" + str(asset["id"]),
            "-H", "Accept: application/octet-stream",
        ], stdout=received, stderr=subprocess.PIPE)
        if result.returncode:
            raise RuntimeError("Could not read published asset: " + name + " " + result.stderr.decode()[-600:])
        received.seek(0)
        actual = hashlib.sha256()
        for chunk in iter(lambda: received.read(1048576), b""):
            actual.update(chunk)
        if actual.hexdigest() != expected:
            raise RuntimeError("Published asset content differs: " + name)

print(json.dumps({
    "url": release["html_url"], "source": args.source, "download_verified": True,
    "assets": [name for name, _ in assets],
}))
