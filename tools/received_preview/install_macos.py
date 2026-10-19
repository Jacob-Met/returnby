#!/usr/bin/env python3
"""Install the already received ReturnBy completion build as a separate Mac copy.

The supplied archive is pinned to the original ten qualified assets. No build,
package download, existing installation, browser profile, or server is touched.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import platform
import shlex
import stat
import sys
import zipfile

SOURCE_COMMIT = "83abbe9a00a5169354df25c734c00340ae73ae43"
SOURCE_TREE = "cfd56ce9960f08c4f5983d5a7a3ca054373f34c8"
ARCHIVE_SHA256 = "816e8d09fbecc27ffeb189aa3c889e48e5bc81f352ccc5b75f5cb9bd64badd71"
ARCHIVE_BYTES = 260719
MANIFEST_SHA256 = "5bf81ba20fd4c12732661f0008c09ca71095176d72b373b04f4767c73fb75a83"
ORIGINAL_SERVER_SHA256 = "7fa92cf4a00072c714e7367feb09fb7f7e2eaa39cf62c9bbef180b303b6191a2"
INSTALLED_SERVER_SHA256 = "d2bbfaa4440d639bf20e37bc9b0fc3e20d01c643609f1af11d49a57b27e37ac2"
INSTALLED_SERVER_BYTES = 5744
SUPPORT_NAMES = {"ASSETS.json", "PROVENANCE.json", "serve_returnby.py", "START-HERE.md"}
ENTRY_NAME = "Start ReturnBy.command"

MAC_GUIDE = """# ReturnBy on this Mac

Double-click **Start ReturnBy.command** and keep its terminal open. Open either
address printed in the terminal:

- Tracker: http://127.0.0.1:8769/index.html
- Printable trip checklist: http://127.0.0.1:8769/trip-checklist.html

When finished, **press Enter in that terminal**. Closing input also stops the
server. Starting this copy installs no service and opens no browser automatically.
Use the same browser and address on subsequent openings to keep this copy's data.
If the address is occupied, this copy refuses to start; close its earlier terminal
and try again. It never chooses a different port or replaces another process.
On macOS, reopening after closing can wait up to 60 seconds for the local address
to become available. Keep the terminal open until the addresses are printed, or
press Ctrl+C to cancel startup. If that wait expires, inspect the reported error
and explicitly try again later.

## Use the tracker and checklist

Review an order before saving its deadline. Mark a finished return completed to
keep its history without listing it in a new trip. Reopen preserves its original
reviewed details and deadline. Open the separate checklist address, select open
orders, review the planned trip, and download the printable HTML. After a saved
change, explicitly refresh and reselect. A sheet already downloaded or printed
cannot be recalled. The tracker has no added checklist navigation link.

This exact received composition uses its own origin. It does not read data from
the hosted site or the older Mac manual-receipt copy at port 48643. To transfer
records, use the existing tracker Backup/Restore actions, review the preview,
and confirm deliberately. Browser storage is not copied by this installation.

## Verify and recover

Run the retained installer with `--check` and this folder's path to check the
original archive, all ten built assets, both runtime copies, original server,
launcher, and installation pins. Run these commands from this folder:

    python3 recovery/install_macos.py --check "/path/to/this/folder"

To make a fresh copy, choose a destination that does not already exist:

    python3 recovery/install_macos.py --archive recovery/received-build.zip \\
      --destination "/Users/me/Applications/ReturnBy-Completion-Recovered"

The installer requires macOS and Python 3.12 or later, records the interpreter
actually used, and installs no dependency. Existing destinations are never
overwritten. The launcher resolves its own folder, including spaces. Only one
copy can use the fixed origin at a time. The original Windows instructions and
qualified transfer are preserved under `recovery/`. A failed installation may
leave a partial destination: keep it for inspection and choose another new path.
The installer never removes a partial copy or repairs an existing destination.

## Source and receiving

Application source: Jacob-Met/returnby PR37, commit
83abbe9a00a5169354df25c734c00340ae73ae43, tree
cfd56ce9960f08c4f5983d5a7a3ca054373f34c8. The ten application assets are unchanged
from the independently received MSI package. This V2 installation uses a
separately verified foreground runtime in `serve_returnby.py` and retains an
identical copy beside the recovery installer. The original archive is unchanged;
its original runtime is preserved as `recovery/original-serve_returnby.py`.
`INSTALLATION.json` records separate original and installed runtime hashes.
`PROVENANCE.json` preserves the original authors, results, failures, and limits.
The new Mac entry and focused receiving have separate receipts. Existing
project owners retain wider stack composition and hosted adoption.
"""


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_regular(path: Path, max_bytes: int) -> bytes:
    if not stat.S_ISREG(path.lstat().st_mode):
        raise ValueError(f"Expected a regular file: {path}")
    with path.open("rb") as stream:
        data = stream.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise ValueError(f"File is too large: {path.name}")
    return data


def admit_archive(path: Path) -> tuple[bytes, dict[str, bytes], list[dict]]:
    archive = read_regular(path, ARCHIVE_BYTES)
    if len(archive) != ARCHIVE_BYTES or digest(archive) != ARCHIVE_SHA256:
        raise ValueError("The supplied archive is not the pinned received ReturnBy build.")
    with zipfile.ZipFile(io.BytesIO(archive)) as bundle:
        names = bundle.namelist()
        if len(names) != len(set(names)):
            raise ValueError("The received archive contains duplicate paths.")
        manifest_bytes = bundle.read("ASSETS.json")
        if digest(manifest_bytes) != MANIFEST_SHA256:
            raise ValueError("The asset manifest does not match this release.")
        assets = json.loads(manifest_bytes)
        expected = SUPPORT_NAMES | {"app/" + item["path"] for item in assets}
        if set(names) != expected or len(assets) != 10:
            raise ValueError("The received archive has an unexpected file set.")
        files = {name: bundle.read(name) for name in names}
    for item in assets:
        data = files["app/" + item["path"]]
        if len(data) != item["bytes"] or digest(data) != item["sha256"]:
            raise ValueError("A received application asset changed: " + item["path"])
    if digest(files["serve_returnby.py"]) != ORIGINAL_SERVER_SHA256:
        raise ValueError("The original foreground server changed.")
    provenance = json.loads(files["PROVENANCE.json"])
    if provenance["product"] != SOURCE_COMMIT or provenance["product_tree"] != SOURCE_TREE:
        raise ValueError("The original source identity does not match.")
    return archive, files, assets


def admit_runtime(path: Path) -> bytes:
    runtime = read_regular(path, INSTALLED_SERVER_BYTES)
    if len(runtime) != INSTALLED_SERVER_BYTES or digest(runtime) != INSTALLED_SERVER_SHA256:
        raise ValueError("The replacement foreground server does not match this installer.")
    return runtime


def launcher(python: str) -> bytes:
    return ("#!/bin/sh\nset -eu\n"
            'RETURNBY_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)\n'
            f'exec {shlex.quote(python)} -B "$RETURNBY_DIR/serve_returnby.py" "$@"\n').encode()


def installed_name(name: str) -> str:
    if name in {"START-HERE.md", "serve_returnby.py"}:
        return "recovery/original-" + name
    return name


def check_installation(destination: Path) -> dict:
    archive, files, assets = admit_archive(destination / "recovery/received-build.zip")
    receipt = json.loads(read_regular(destination / "INSTALLATION.json", 16384))
    if (not isinstance(receipt, dict)
            or receipt.get("schema") != "returnby-macos-received-preview-v2"
            or receipt.get("sourceCommit") != SOURCE_COMMIT
            or receipt.get("sourceTree") != SOURCE_TREE
            or receipt.get("archiveSha256") != ARCHIVE_SHA256
            or receipt.get("originalServerSha256") != ORIGINAL_SERVER_SHA256
            or receipt.get("installedServerSha256") != INSTALLED_SERVER_SHA256
            or not isinstance(receipt.get("python"), str)):
        raise ValueError("The installation receipt does not match this release.")
    expected = {installed_name(name): data for name, data in files.items()}
    runtime = admit_runtime(destination / "serve_returnby.py")
    expected["serve_returnby.py"] = runtime
    expected["recovery/serve_returnby.py"] = runtime
    expected[ENTRY_NAME] = launcher(receipt["python"])
    expected["START-HERE.md"] = MAC_GUIDE.encode()
    for name, data in expected.items():
        if read_regular(destination / name, len(data)) != data:
            raise ValueError("An installed file changed: " + name)
    installer = read_regular(destination / "recovery/install_macos.py", 32768)
    if digest(installer) != receipt.get("installerSha256"):
        raise ValueError("The retained installer changed.")
    if not os.access(destination / ENTRY_NAME, os.X_OK):
        raise ValueError("The Mac launcher is not executable.")
    return {"schema": "returnby-macos-received-preview-check-v2", "accepted": True,
            "destination": str(destination), "sourceCommit": SOURCE_COMMIT,
            "sourceTree": SOURCE_TREE, "archiveSha256": digest(archive),
            "assetsVerified": len(assets), "originalServerSha256": ORIGINAL_SERVER_SHA256,
            "installedServerSha256": INSTALLED_SERVER_SHA256,
            "origin": "http://127.0.0.1:8769", "python": receipt["python"]}


def install(archive_path: Path, destination: Path) -> dict:
    if sys.platform != "darwin" or sys.version_info < (3, 12):
        raise ValueError("Install using Python 3.12 or later on the intended Mac.")
    archive, files, _ = admit_archive(archive_path)
    installer_path = Path(__file__)
    runtime = admit_runtime(installer_path.with_name("serve_returnby.py"))
    installer = read_regular(installer_path, 32768)
    python = str(Path(sys.executable).absolute())
    # mkdir is the no-overwrite operation. A concurrent creator wins safely.
    # Payloads and receipt precede the executable entry. A write failure can
    # leave a partial destination; no rollback or overwrite is attempted.
    destination.mkdir(mode=0o700, parents=False, exist_ok=False)
    output = {installed_name(name): data for name, data in files.items()}
    output.update({"serve_returnby.py": runtime,
                   "recovery/serve_returnby.py": runtime,
                   "recovery/received-build.zip": archive,
                   "recovery/install_macos.py": installer,
                   "START-HERE.md": MAC_GUIDE.encode()})
    for name, data in output.items():
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("xb") as stream:
            stream.write(data)
    receipt = {"schema": "returnby-macos-received-preview-v2", "sourceCommit": SOURCE_COMMIT,
               "sourceTree": SOURCE_TREE, "archiveSha256": ARCHIVE_SHA256,
               "originalServerSha256": ORIGINAL_SERVER_SHA256,
               "installedServerSha256": INSTALLED_SERVER_SHA256,
               "installerSha256": digest(installer), "python": python,
               "pythonVersion": platform.python_version(), "machine": platform.machine(),
               "origin": "http://127.0.0.1:8769"}
    with (destination / "INSTALLATION.json").open("x", encoding="utf-8") as stream:
        json.dump(receipt, stream, indent=2)
        stream.write("\n")
    with (destination / ENTRY_NAME).open("xb") as stream:
        stream.write(launcher(python))
    (destination / ENTRY_NAME).chmod(0o755)
    return check_installation(destination)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path)
    parser.add_argument("--destination", type=Path)
    parser.add_argument("--check", type=Path)
    args = parser.parse_args()
    if args.check is not None:
        if args.archive is not None or args.destination is not None:
            parser.error("--check cannot be combined with installation arguments")
        action = lambda: check_installation(args.check.expanduser().absolute())
    elif args.archive is None or args.destination is None:
        parser.error("supply both --archive and a new --destination, or use --check")
    else:
        action = lambda: install(args.archive.expanduser().absolute(), args.destination.expanduser().absolute())
    try:
        print(json.dumps(action(), indent=2))
        return 0
    except (OSError, ValueError, KeyError, TypeError, zipfile.BadZipFile) as error:
        print("ReturnBy installation refused: " + str(error), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
