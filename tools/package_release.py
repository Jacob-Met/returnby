#!/usr/bin/env python3
"""Create a relocatable ReturnBy browser release from the actual Vite build."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
VERSION = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]
FOLDER = "ReturnBy-v" + VERSION
STATIC = ROOT / "dist"
REQUIRED = ("index.html", "trip-checklist.html", "favicon.svg")
SERVER = """#!/usr/bin/env python3
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys

folder = Path(__file__).resolve().parent
host, port = "127.0.0.1", 8769
try:
    server = ThreadingHTTPServer((host, port), partial(SimpleHTTPRequestHandler, directory=str(folder)))
except OSError as error:
    print("ReturnBy cannot start on http://127.0.0.1:8769 (port in use or unavailable):", error, file=sys.stderr)
    sys.exit(2)
print("ReturnBy running at http://127.0.0.1:8769", flush=True)
print("Open this address in your browser; press Ctrl+C to stop.", flush=True)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
"""
MAC = '#!/bin/sh\ncd "$(dirname "$0")" || exit 1\nexec python3 serve_returnby.py\n'
WIN = '@echo off\r\ncd /d "%~dp0"\r\nwhere py >nul 2>nul\r\nif %errorlevel% == 0 (py -3 serve_returnby.py) else (python serve_returnby.py)\r\npause\r\n'


def put(archive, name, content, executable=False):
    info = ZipInfo(FOLDER + "/" + name, (2026, 1, 1, 0, 0, 0))
    info.compress_type = ZIP_DEFLATED
    info.external_attr = ((0o100755 if executable else 0o100644) << 16)
    archive.writestr(info, content)


def main():
    if len(sys.argv) != 2:
        sys.exit("Usage: python3 tools/package_release.py /existing/output/directory")
    out = Path(sys.argv[1]).expanduser().resolve()
    if not out.is_dir():
        sys.exit("Existing output directory required")
    if any(not (STATIC / name).is_file() for name in REQUIRED):
        sys.exit("Run npm run build first; release static files are missing")
    source = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    if subprocess.check_output(["git", "status", "--porcelain"], cwd=ROOT, text=True).strip():
        sys.exit("Commit all source changes before making a source-pinned release")
    archive = out / (FOLDER + "-browser.zip")
    if archive.exists():
        sys.exit("Refusing to overwrite an existing release ZIP")
    files = sorted(p for p in STATIC.rglob("*") if p.is_file() and not p.is_symlink())
    if not files:
        sys.exit("No built assets to package")
    readme = (
        "RETURNBY " + VERSION + " — LOCAL BROWSER RELEASE\n\n"
        "Requires Python 3; no Node/npm needed to use this release.\n"
        "Windows: double-click Start ReturnBy.cmd, or run py -3 serve_returnby.py.\n"
        "macOS: double-click Start ReturnBy.command, or run python3 serve_returnby.py.\n"
        "Linux: run ./Start ReturnBy.sh, or python3 serve_returnby.py.\n"
        "Then open http://127.0.0.1:8769 in your browser; press Ctrl+C to stop.\n"
        "The launcher binds only to 127.0.0.1. Keep the same port/browser profile:\n"
        "reviewed orders are saved in that browser's local storage for this origin.\n"
        "Do not open index.html directly by file:// because the module assets need HTTP.\n\n"
        "Review/save several returns, correct them, back up and restore, select calendar\n"
        "reminders, plan a month, and download offline printable return-trip checklists.\n"
        "Pasted emails are not uploaded or retained by the app. Downloaded backups\n"
        "contain order details and are unencrypted; keep those files private.\n"
        "Merchant rules are reference estimates, not verified current return policies.\n"
        "Calendar reminders are file exports, not live subscriptions.\n\n"
        "Source: https://github.com/Jacob-Met/returnby/commit/" + source + "\n"
        "Build: npm ci; npm test; npm run build (from matching source)\n"
    )
    try:
        with ZipFile(archive, "x") as z:
            for path in files:
                put(z, path.relative_to(STATIC).as_posix(), path.read_bytes())
            put(z, "serve_returnby.py", SERVER.encode("utf-8"), executable=True)
            put(z, "Start ReturnBy.sh", MAC.encode("utf-8"), executable=True)
            put(z, "Start ReturnBy.command", MAC.encode("utf-8"), executable=True)
            put(z, "Start ReturnBy.cmd", WIN.encode("utf-8"))
            put(z, "READ_ME_FIRST.txt", readme.encode("utf-8"))
    except Exception:
        archive.unlink(missing_ok=True)
        raise
    print(json.dumps({"archive": str(archive), "source": source, "built_assets": len(files), "bytes": archive.stat().st_size}))


if __name__ == "__main__":
    main()
