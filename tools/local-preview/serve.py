#!/usr/bin/env python3
"""Run the exact qualified ReturnBy preview on its stable local origin."""
from __future__ import annotations

import argparse
import hashlib
import json
import signal
import stat
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

SOURCE_COMMIT = "d153659d1f561e1c316a1f9278b3d0b32c222c2f"
SOURCE_TREE = "c22fdac96a2d4219bb1a0b8b350b1f6c60d7d8db"
ARCHIVE_SHA256 = "45d5f732879ab0101295648c59c1955b5f8ec190aa4c44a42b46bc24a9b464e4"
MANIFEST_SHA256 = "384deec2a8587f210f7a1d74e067f79dea42ca0f6141130a577e82fa6f9e3feb"
HOST, PORT = "127.0.0.1", 48643
URL = f"http://{HOST}:{PORT}/index.html"
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
CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
}


class Refusal(ValueError):
    """An installation cannot supply the exact qualified build."""


def read_exact_file(path: Path, limit: int) -> bytes:
    if not stat.S_ISREG(path.lstat().st_mode):
        raise Refusal(f"Expected a regular file: {path.name}")
    with path.open("rb") as stream:
        data = stream.read(limit + 1)
    if len(data) > limit:
        raise Refusal(f"File exceeds its qualified size: {path.name}")
    return data


def admit_site(root: Path) -> tuple[dict, dict[str, bytes]]:
    installation = json.loads(read_exact_file(root / "INSTALLATION.json", 16384))
    if (
        installation.get("schema") != "returnby-local-installation-v1"
        or installation.get("sourceCommit") != SOURCE_COMMIT
        or installation.get("sourceTree") != SOURCE_TREE
        or installation.get("archiveSha256") != ARCHIVE_SHA256
        or installation.get("manifestSha256") != MANIFEST_SHA256
    ):
        raise Refusal("The installation did not complete for this release.")
    site = root / "site"
    manifest_bytes = read_exact_file(site / "BUILD-MANIFEST.json", 2734)
    if hashlib.sha256(manifest_bytes).hexdigest() != MANIFEST_SHA256:
        raise Refusal("The installed build manifest does not match this release.")
    manifest = json.loads(manifest_bytes)
    if (
        manifest.get("schema") != "returnby-qualified-preview-v1"
        or manifest.get("sourceCommit") != SOURCE_COMMIT
        or manifest.get("sourceTree") != SOURCE_TREE
        or set(manifest.get("files", {})) != EXPECTED_NAMES
    ):
        raise Refusal("The installed build is not the qualified ReturnBy release.")
    bodies: dict[str, bytes] = {}
    for name, pin in manifest["files"].items():
        body = read_exact_file(site / name, pin["bytes"])
        if len(body) != pin["bytes"] or hashlib.sha256(body).hexdigest() != pin["sha256"]:
            raise Refusal(f"An installed asset changed: {name}")
        bodies[name] = body
    return manifest, bodies


def make_handler(bodies: dict[str, bytes]) -> type[BaseHTTPRequestHandler]:
    class Handler(BaseHTTPRequestHandler):
        def send_asset(self, include_body: bool) -> None:
            path = unquote(urlsplit(self.path).path)
            name = "index.html" if path == "/" else path.removeprefix("/")
            if name not in bodies:
                self.send_error(404, "This local package has no such page.")
                return
            body = bodies[name]
            self.send_response(200)
            self.send_header("Content-Type", CONTENT_TYPES[Path(name).suffix])
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            if include_body:
                self.wfile.write(body)

        def do_GET(self) -> None:
            self.send_asset(True)

        def do_HEAD(self) -> None:
            self.send_asset(False)

        def reject_write(self) -> None:
            self.send_error(405, "This local package serves pages only.")

        do_POST = reject_write
        do_PUT = reject_write
        do_PATCH = reject_write
        do_DELETE = reject_write
        do_OPTIONS = reject_write

        def log_message(self, format: str, *args: object) -> None:
            pass

    return Handler


class LocalServer(HTTPServer):
    allow_reuse_address = True


def main() -> int:
    parser = argparse.ArgumentParser(description="Open the installed ReturnBy local preview.")
    parser.add_argument("--check", action="store_true", help="Verify the installed files without starting the app.")
    parser.add_argument("--no-open", action="store_true", help="Start the app without opening a browser.")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    try:
        manifest, bodies = admit_site(root)
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(f"ReturnBy could not start: {exc}", file=sys.stderr)
        return 2
    if args.check:
        print(json.dumps({
            "schema": "returnby-local-preview-check-v1",
            "sourceCommit": SOURCE_COMMIT,
            "sourceTree": SOURCE_TREE,
            "archiveSha256": ARCHIVE_SHA256,
            "manifestSha256": MANIFEST_SHA256,
            "origin": f"http://{HOST}:{PORT}",
            "files": manifest["files"],
        }, indent=2))
        return 0
    try:
        server = LocalServer((HOST, PORT), make_handler(bodies))
    except OSError as exc:
        print(
            f"ReturnBy could not use {URL}: {exc}\n"
            "Close the previous ReturnBy terminal and try again. "
            "The address stays fixed so this browser can keep your saved returns.",
            file=sys.stderr,
        )
        return 2

    def stop(_signum: int, _frame: object) -> None:
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, stop)
    print(f"ReturnBy is ready at {URL}", flush=True)
    print("Keep this terminal open while using ReturnBy. Press Control+C to stop.", flush=True)
    if not args.no_open:
        try:
            opened = subprocess.run(
                ["/usr/bin/open", URL], stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL, timeout=10, check=False,
            )
            if opened.returncode:
                print(f"Open this address in your browser: {URL}", flush=True)
        except (OSError, subprocess.TimeoutExpired):
            print(f"Open this address in your browser: {URL}", flush=True)
    try:
        with server:
            server.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        print("\nReturnBy stopped.", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
