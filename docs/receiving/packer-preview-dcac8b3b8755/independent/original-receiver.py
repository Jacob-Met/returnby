#!/usr/bin/env python3
"""Receive a pinned ReturnBy preview ZIP without running its packaged code."""
from __future__ import annotations

import argparse
import hashlib
import http.client
import http.server
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import socket
import stat
import subprocess
import sys
import threading
import time
import unicodedata
from urllib.parse import quote
import uuid
import zipfile

MAX_ARCHIVE = 64 * 1024 * 1024
MAX_PAYLOAD = 16 * 1024 * 1024
MAX_TOTAL = 128 * 1024 * 1024
MAX_MEMBERS = 4096


def identity(data):
    return {
        "bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
        "git_blob": hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest(),
    }


def snapshot(path):
    info = path.stat()
    return dict(identity(path.read_bytes()), mode=info.st_mode,
                mtime_ns=info.st_mtime_ns, inode=info.st_ino)


def require(condition, message):
    if not condition:
        raise ValueError(message)


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, "Duplicate JSON key: " + key)
        result[key] = value
    return result


def safe_name(name):
    require(isinstance(name, str) and 0 < len(name) <= 1024, "Invalid member name")
    parts = name.split("/")
    require(len(parts) <= 16 and all(p not in ("", ".", "..") for p in parts),
            "Noncanonical member path: " + name)
    require(not PurePosixPath(name).is_absolute(), "Absolute member path")
    for part in parts:
        require(not any(ord(c) < 32 or c in '\\:*?"<>|' for c in part),
                "Nonportable member path: " + name)
        require(not part.endswith((" ", ".")), "Nonportable trailing path character")
        require(part.split(".")[0].upper() not in
                {"CON", "PRN", "AUX", "NUL", *(f"COM{i}" for i in range(1, 10)),
                 *(f"LPT{i}" for i in range(1, 10))}, "Reserved path component")
    return name


def admit(archive, expected_sha):
    require(re.fullmatch(r"[0-9a-fA-F]{64}", expected_sha) is not None,
            "Supply one complete SHA-256")
    require(not archive.is_symlink() and archive.is_file(), "Archive must be an ordinary file")
    require(archive.stat().st_size <= MAX_ARCHIVE, "Archive exceeds 64 MiB")
    before = snapshot(archive)
    data = archive.read_bytes()
    require(len(data) <= MAX_ARCHIVE and identity(data)["sha256"] == expected_sha.lower(),
            "Archive SHA-256 mismatch")
    require(identity(data) == {k: before[k] for k in identity(data)}, "Archive changed during admission")
    with zipfile.ZipFile(io.BytesIO(data)) as package:
        entries = package.infolist()
        require(0 < len(entries) <= MAX_MEMBERS, "Invalid archive member count")
        require(sum(e.file_size for e in entries) <= MAX_TOTAL, "Expanded archive exceeds 128 MiB")
        names = set()
        prefixes = {}
        for entry in entries:
            name = safe_name(entry.filename)
            require(name not in names, "Duplicate archive member: " + name)
            names.add(name)
            require(not entry.is_dir() and stat.S_IFMT(entry.external_attr >> 16) in (0, stat.S_IFREG),
                    "Only ordinary file members are accepted")
            require(not entry.flag_bits & 1, "Encrypted members are unsupported")
            require(entry.file_size <= MAX_PAYLOAD, "Member exceeds 16 MiB")
            for i in range(1, len(name.split("/")) + 1):
                prefix = "/".join(name.split("/")[:i])
                folded = unicodedata.normalize("NFC", prefix).casefold()
                require(prefixes.setdefault(folded, prefix) == prefix,
                        "Case or Unicode path alias: " + prefix)
        require(not any("/".join(n.split("/")[:i]) in names
                        for n in names for i in range(1, len(n.split("/")))),
                "File/directory path collision")
        require("MANIFEST.json" in names and "preview/index.html" in names,
                "Manifest and preview/index.html are required")
        payloads = {e.filename: package.read(e) for e in entries}
    manifest = json.loads(payloads["MANIFEST.json"].decode("utf-8"), object_pairs_hook=unique_object)
    require(isinstance(manifest, dict) and manifest.get("schema") == "hamon.exact-delivery-manifest/1",
            "Unsupported manifest schema")
    rows = manifest.get("files")
    require(isinstance(rows, list) and len(rows) == len(payloads) - 1, "Manifest membership mismatch")
    indexed = {}
    for row in rows:
        require(isinstance(row, dict), "Invalid manifest row")
        name = safe_name(row.get("path"))
        require(name != "MANIFEST.json" and name not in indexed, "Duplicate or self-listed manifest member")
        require(name in payloads, "Missing manifest payload: " + name)
        require(type(row.get("bytes")) is int and row["bytes"] >= 0, "Invalid byte count")
        found = identity(payloads[name])
        require(all(found[key] == row.get(key) for key in found), "Payload identity mismatch: " + name)
        indexed[name] = row
    require(set(indexed) == set(payloads) - {"MANIFEST.json"}, "Manifest membership mismatch")
    require(snapshot(archive) == before, "Archive changed during admission")
    return payloads, before, manifest


class PreviewServer(http.server.ThreadingHTTPServer):
    allow_reuse_address = False
    daemon_threads = True

    def server_bind(self):
        if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


def serve(directory, port, token):
    import functools
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(directory))
    with PreviewServer(("127.0.0.1", port), handler) as server:
        thread = threading.Thread(target=server.serve_forever, kwargs={"poll_interval": 0.05})
        thread.start()
        try:
            print(json.dumps({"ready": token, "pid": os.getpid(), "port": server.server_port}), flush=True)
            sys.stdin.readline()
        finally:
            server.shutdown()
            thread.join(timeout=5)
            require(not thread.is_alive(), "Owned HTTP thread did not stop")
    return 0


def receive(archive, digest, output, port):
    require(1 <= port <= 65535, "Port must be from 1 through 65535")
    require(not output.exists() and not output.is_symlink(), "Output directory already exists")
    payloads, before, manifest = admit(archive, digest)
    output.mkdir()  # No parents or replacement: a raced existing destination also refuses.
    package = output / "package"
    package.mkdir()
    receipt = {
        "schema": "returnby.static-preview-receiving/1",
        "passed": False,
        "archive": str(archive),
        "archive_before": before,
        "archive_members": len(payloads),
        "manifest_payloads": len(payloads) - 1,
        "product_tree": manifest.get("product_tree"),
        "http": [],
        "scope": "Archive integrity and loopback HTTP bytes only; no packaged code, browser, build or install.",
        "started_unix": time.time(),
    }
    child = None
    logs = []
    extracted_before = None
    failure = None
    try:
        for name, data in payloads.items():
            destination = package / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            with destination.open("xb") as stream:
                stream.write(data)
        extracted_before = {n: snapshot(package / n) for n in sorted(payloads)}
        token = uuid.uuid4().hex
        logs = [(output / ("server." + suffix)).open("wb") for suffix in ("stdout", "stderr")]
        argv = [sys.executable, "-I", "-B", "-u", str(Path(__file__).resolve()),
                "--serve-directory", str(package / "preview"), "--port", str(port), "--ready-token", token]
        child = subprocess.Popen(argv, stdin=subprocess.PIPE, stdout=logs[0], stderr=logs[1])
        receipt["server"] = {"argv": argv, "pid": child.pid, "port": port}
        deadline = time.monotonic() + 5
        ready = None
        while time.monotonic() < deadline:
            if child.poll() is not None:
                raise ValueError("Owned server exited before readiness; inspect server.stderr")
            raw = (output / "server.stdout").read_bytes()
            require(len(raw) <= 4096, "Unexpected server readiness output")
            if b"\n" in raw:
                ready = json.loads(raw.split(b"\n", 1)[0])
                break
            time.sleep(0.02)
        require(ready == {"ready": token, "pid": child.pid, "port": port},
                "Owned server readiness was not confirmed")
        receipt["server"]["ready"] = True
        selected = [("/", "preview/index.html")] + [
            ("/" + quote(name[len("preview/"):], safe="/"), name)
            for name in sorted(payloads) if name.startswith("preview/")]
        for route, name in selected:
            require(child.poll() is None, "Owned server stopped during receiving")
            connection = http.client.HTTPConnection("127.0.0.1", port, timeout=3)
            try:
                connection.request("GET", route)
                response = connection.getresponse()
                data = response.read(len(payloads[name]) + 1)
                require(response.status == 200 and data == payloads[name], "HTTP bytes differ: " + name)
                receipt["http"].append({"path": route, "member": name, "status": 200, **identity(data)})
            finally:
                connection.close()
    except Exception as error:
        failure = f"{type(error).__name__}: {error}"
    finally:
        if child is not None:
            try:
                child.stdin.close()
                child.wait(timeout=5)
            except (OSError, subprocess.TimeoutExpired):
                child.kill()
                child.wait(timeout=5)
                failure = failure or "Owned server required forced termination"
            receipt["server"]["returncode"] = child.returncode
            if child.returncode != 0:
                failure = failure or "Owned server did not exit successfully"
        for log in logs:
            log.close()
        try:
            receipt["archive_after"] = snapshot(archive)
            require(receipt["archive_after"] == before, "Archive changed during receiving")
            if extracted_before is not None:
                actual = {p.relative_to(package).as_posix() for p in package.rglob("*") if p.is_file()}
                require(actual == set(payloads), "Extracted membership changed")
                after = {n: snapshot(package / n) for n in sorted(payloads)}
                require(after == extracted_before, "Extracted payload or metadata changed")
                receipt["extracted_files_preserved"] = len(after)
                receipt["extracted_identity"] = after
            receipt["archive_preserved"] = True
        except Exception as error:
            failure = failure or f"{type(error).__name__}: {error}"
        receipt["passed"] = failure is None
        if failure:
            receipt["error"] = failure
        receipt["finished_unix"] = time.time()
        receipt["observer"] = identity(Path(__file__).read_bytes())
        for name in ("server.stdout", "server.stderr"):
            if (output / name).exists():
                receipt[name] = identity((output / name).read_bytes())
        (output / "receiving.json").write_text(json.dumps(receipt, ensure_ascii=True, indent=2) + "\n",
                                              encoding="utf-8")
    return receipt


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path)
    parser.add_argument("--sha256")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--serve-directory", type=Path, help=argparse.SUPPRESS)
    parser.add_argument("--ready-token", help=argparse.SUPPRESS)
    args = parser.parse_args(argv)
    try:
        if args.serve_directory is not None:
            require(bool(args.ready_token), "Readiness token required")
            return serve(args.serve_directory, args.port, args.ready_token)
        require(args.archive is not None and args.sha256 and args.output is not None,
                "--archive, --sha256 and --output are required")
        result = receive(args.archive.absolute(), args.sha256, args.output.absolute(), args.port)
        print(json.dumps({"passed": result["passed"], "receipt": str(args.output / "receiving.json"),
                          "http_responses": len(result["http"]), "error": result.get("error")}))
        return 0 if result["passed"] else 1
    except (OSError, ValueError, zipfile.BadZipFile, RuntimeError) as error:
        print(json.dumps({"passed": False, "error": f"{type(error).__name__}: {error}"}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
