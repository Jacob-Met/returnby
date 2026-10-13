"""Serve the exact received ReturnBy build on one private loopback origin."""
from pathlib import Path
from http.server import BaseHTTPRequestHandler, HTTPServer
from threading import Thread
import errno
import hashlib
import json
import sys
import socket
import time

MANIFEST_SHA256 = "5bf81ba20fd4c12732661f0008c09ca71095176d72b373b04f4767c73fb75a83"
PORT = 8769
STARTUP_WAIT_SECONDS = 60.0


def admitted_assets():
    base = Path(__file__).resolve().parent
    manifest_path = base / "ASSETS.json"
    if manifest_path.is_symlink() or manifest_path.is_junction():
        raise ValueError("The asset manifest must be a regular local file.")
    with manifest_path.open("rb") as handle:
        manifest = handle.read(1551)
    if hashlib.sha256(manifest).hexdigest() != MANIFEST_SHA256:
        raise ValueError("The asset manifest does not match this received build.")
    assets = {}
    for item in json.loads(manifest):
        relative = Path(item["path"])
        target = base / "app" / relative
        for parent in [target, *target.parents]:
            if parent == base:
                break
            if parent.is_symlink() or parent.is_junction():
                raise ValueError("The build must contain regular local files.")
        with target.open("rb") as handle:
            body = handle.read(item["bytes"] + 1)
        if len(body) != item["bytes"] or hashlib.sha256(body).hexdigest() != item["sha256"]:
            raise ValueError("A built asset is missing or changed: " + item["path"])
        mime = {".html": "text/html;charset=utf-8", ".js": "text/javascript;charset=utf-8",
                ".css": "text/css;charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png"}[target.suffix]
        assets["/" + item["path"]] = (body, mime)
    assets["/"] = assets["/index.html"]
    return assets


def bind_local_server(server_type, handler):
    """Keep Darwin's non-reuse bind and wait only for a refused local endpoint."""
    deadline = time.monotonic() + STARTUP_WAIT_SECONDS
    last_error = None
    announced = False
    while True:
        if last_error is not None and time.monotonic() >= deadline:
            raise OSError(errno.EADDRINUSE,
                          "The local address is still unavailable after 60 seconds.") from last_error
        try:
            return server_type(("127.0.0.1", PORT), handler)
        except OSError as error:
            if sys.platform != "darwin" or error.errno != errno.EADDRINUSE:
                raise
            last_error = error
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                continue
            try:
                with socket.create_connection(("127.0.0.1", PORT),
                                              timeout=min(0.25, remaining)):
                    pass
            except ConnectionRefusedError:
                pass
            except OSError:
                raise error from None
            else:
                raise error
            if not announced:
                print("Waiting up to 60 seconds for the local address to become available. "
                      "Press Ctrl+C to cancel.", flush=True)
                announced = True
            remaining = deadline - time.monotonic()
            if remaining > 0:
                time.sleep(min(0.25, remaining))


def main():
    if len(sys.argv) != 1:
        print("This foreground entry takes no arguments.", file=sys.stderr)
        return 2
    try:
        assets = admitted_assets()
    except (OSError, ValueError) as error:
        print("ReturnBy cannot start: " + str(error), file=sys.stderr)
        return 1

    class Handler(BaseHTTPRequestHandler):
        def respond(self, head=False):
            target = self.requestline.split()[1]
            entry = assets.get(target)
            if entry is None:
                self.send_error(404)
                return
            body, mime = entry
            self.send_response(200)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            if not head:
                self.wfile.write(body)

        def do_GET(self):
            self.respond()

        def do_HEAD(self):
            self.respond(True)

        def log_message(self, *_):
            pass

    class LocalServer(HTTPServer):
        # Linux retains released-address reuse. Darwin keeps non-reuse binding.
        allow_reuse_address = sys.platform == "linux"
        allow_reuse_port = False

        def get_request(self):
            request, address = super().get_request()
            request.settimeout(2)
            return request, address

    try:
        server = bind_local_server(LocalServer, Handler)
    except OSError as error:
        print("ReturnBy could not bind 127.0.0.1:8769: " + str(error), file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("ReturnBy startup cancelled.", flush=True)
        return 0
    worker = Thread(target=lambda: server.serve_forever(poll_interval=0.05), daemon=True)
    started = False
    try:
        worker.start()
        started = True
        print("Tracker: http://127.0.0.1:8769/index.html", flush=True)
        print("Trip checklist: http://127.0.0.1:8769/trip-checklist.html", flush=True)
        print("Open a URL manually. Press Enter here when finished.", flush=True)
        sys.stdin.readline()
    except KeyboardInterrupt:
        pass
    finally:
        if started:
            server.shutdown()
            worker.join()
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
