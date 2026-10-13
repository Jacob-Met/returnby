#!/usr/bin/env python3
"""Independent original-first receiver for ReturnBy issue 76."""
import argparse, copy, getpass, hashlib, io, json, os, platform, socket
import stat, subprocess, sys, time, traceback, warnings, zipfile
from pathlib import Path

def identity(data):
    return {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
            "git_blob": hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()}

def snapshot(path):
    s = path.stat()
    return dict(identity(path.read_bytes()), mode=s.st_mode, mtime_ns=s.st_mtime_ns, inode=s.st_ino)

def write_json(path, value):
    path.write_bytes((json.dumps(value, ensure_ascii=True, indent=2) + "\n").encode())

def check(receipt, name, condition, detail=None):
    receipt["checks"].append({"name": name, "passed": bool(condition), "detail": detail})
    if not condition:
        raise AssertionError(name)

def run(argv, root, output, label):
    started = time.time()
    env = dict(os.environ, TEMP=str(root / "tmp"), TMP=str(root / "tmp"), PYTHONDONTWRITEBYTECODE="1")
    process = subprocess.Popen(argv, cwd=root, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        stdout, stderr = process.communicate(timeout=30)
    except subprocess.TimeoutExpired:
        process.kill()
        stdout, stderr = process.communicate(timeout=10)
        (output / (label + ".stdout")).write_bytes(stdout)
        (output / (label + ".stderr")).write_bytes(stderr)
        raise
    (output / (label + ".stdout")).write_bytes(stdout)
    (output / (label + ".stderr")).write_bytes(stderr)
    return {"argv": [str(v) for v in argv], "pid": process.pid, "returncode": process.returncode,
            "started_unix": started, "finished_unix": time.time(),
            "stdout": stdout.decode("utf-8", "backslashreplace"),
            "stderr": stderr.decode("utf-8", "backslashreplace"),
            "stdout_identity": identity(stdout), "stderr_identity": identity(stderr)}

def zip_bytes(manifest, payloads, duplicate=False):
    contents = {"MANIFEST.json": (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode()}
    contents.update(payloads)
    out = io.BytesIO()
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)
        with zipfile.ZipFile(out, "w") as z:
            for name, data in sorted(contents.items()):
                info = zipfile.ZipInfo(name, (1980, 1, 1, 0, 0, 0))
                info.create_system = 3
                info.external_attr = (stat.S_IFREG | 0o644) << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                z.writestr(info, data)
            if duplicate:
                info = zipfile.ZipInfo("preview/guide.bin", (1980, 1, 1, 0, 0, 0))
                info.create_system = 3
                info.external_attr = (stat.S_IFREG | 0o644) << 16
                z.writestr(info, payloads["preview/guide.bin"])
    return out.getvalue()

def prepare(root, receipt, out):
    payloads = {
        "preview/index.html": '<!doctype html>\r\n<meta charset="utf-8"><title>Literal preview</title><p>  caf\u00e9 \u03bb \U0001f642 &amp; &lt;kept&gt;  </p>\r\n'.encode(),
        "preview/guide.bin": bytes(range(256)),
        "preview/notes.txt": " leading \u00e9 e\u0301 \u03a9 \U0001f642\r\ntrailing  \r\n".encode(),
        "VERIFY.py": b"from pathlib import Path\nPath('PACKAGED-CODE-RAN').write_text('unexpected execution')\n"
    }
    source = root / "selected"
    source.mkdir()
    for name, data in payloads.items():
        dest = source / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
    rows = [{"path": name, "bytes": len(data), "sha256": identity(data)["sha256"]} for name, data in sorted(payloads.items())]
    manifest = {"schema": "hamon.delivery-zip/1", "files": rows}
    write_json(root / "producer-manifest.json", manifest)
    archives = root / "archives"
    archives.mkdir()
    watched = [root / "make_delivery_zip.py", root / "original-receiver.py", root / "oracle.json",
               root / "receive_compatibility.py", root / "producer-manifest.json"] + list(source.rglob("*"))
    watched = [p for p in watched if p.is_file()]
    before = {str(p.relative_to(root)): snapshot(p) for p in watched}
    argv = [sys.executable, "-I", "-B", str(root / "make_delivery_zip.py"),
            str(source), str(root / "producer-manifest.json"), str(archives / "producer.zip"),
            "--manifest-sha256", snapshot(root / "producer-manifest.json")["sha256"]]
    result = run(argv, root, out, "producer-create")
    receipt["producer_command"] = result
    check(receipt, "actual maintained producer exits zero", result["returncode"] == 0, result["returncode"])
    check(receipt, "producer preserves all selected inputs and source", before == {str(p.relative_to(root)): snapshot(p) for p in watched})
    with zipfile.ZipFile(archives / "producer.zip") as z:
        check(receipt, "producer has exact five members", set(z.namelist()) == set(payloads) | {"MANIFEST.json"})
        check(receipt, "producer preserves exact manifest bytes", z.read("MANIFEST.json") == (root / "producer-manifest.json").read_bytes())
        check(receipt, "producer preserves every literal and binary payload", all(z.read(n) == b for n, b in payloads.items()))
    legacy = {"schema": "hamon.exact-delivery-manifest/1", "product_tree": "fictional-fixture-not-a-source-claim",
              "files": [{"path": n, **identity(b)} for n, b in sorted(payloads.items())]}
    cases = {"legacy": (legacy, payloads, False)}
    x = copy.deepcopy(manifest); x["files"][0]["git_blob"] = identity(payloads[x["files"][0]["path"]])["git_blob"]
    cases["mixed-row"] = (x, payloads, False)
    x = copy.deepcopy(manifest); x["product_tree"] = "unexpected"
    cases["mixed-top"] = (x, payloads, False)
    x = copy.deepcopy(legacy); del x["files"][0]["git_blob"]
    cases["legacy-missing-git"] = (x, payloads, False)
    altered = dict(payloads); altered["preview/guide.bin"] = b"\x01" + payloads["preview/guide.bin"][1:]
    cases["bad-payload"] = (manifest, altered, False)
    x = copy.deepcopy(manifest); x["files"][0]["sha256"] = x["files"][0]["sha256"].upper()
    cases["uppercase-sha"] = (x, payloads, False)
    x = copy.deepcopy(manifest)
    for row in x["files"]:
        if row["path"] == "preview/notes.txt": row["path"] = "preview/not\u00e9s.txt"
    renamed = dict(payloads); renamed["preview/not\u00e9s.txt"] = renamed.pop("preview/notes.txt")
    cases["nonascii-path"] = (x, renamed, False)
    cases["duplicate-member"] = (manifest, payloads, True)
    for name, args in cases.items():
        (archives / (name + ".zip")).write_bytes(zip_bytes(*args))
    write_json(root / "fixture-identities.json", {
        "payloads": {n: identity(b) for n, b in sorted(payloads.items())},
        "archives": {p.name: identity(p.read_bytes()) for p in sorted(archives.iterdir())}})
    receipt["producer_source_before"] = before
    receipt["producer_source_after"] = {str(p.relative_to(root)): snapshot(p) for p in watched}

def available_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--root", type=Path, required=True)
    p.add_argument("--phase", choices=["original", "candidate"], required=True)
    p.add_argument("--receiver", type=Path, required=True)
    p.add_argument("--receiver-git", required=True)
    a = p.parse_args()
    root = a.root.resolve()
    out = root / (a.phase + "-receiving")
    out.mkdir()
    receipt = {"schema": "hamon.returnby-producer-compatibility-receiving/1",
               "phase": a.phase, "passed": False, "checks": [], "commands": [], "started_unix": time.time(),
               "environment": {"host": platform.node(), "user": getpass.getuser(),
                               "python": sys.version, "executable": sys.executable},
               "scope": "Actual producer and CLI/HTTP byte receiving; no packaged code, browser or build execution."}
    watched = []
    before = {}
    try:
        check(receipt, "receiver exact supplied Git identity", snapshot(a.receiver)["git_blob"] == a.receiver_git)
        check(receipt, "exact maintained producer identity", snapshot(root / "make_delivery_zip.py")["git_blob"] == "34e192096abed7216025e8141a9cf3106bb82dfd")
        check(receipt, "frozen oracle identity", snapshot(root / "oracle.json")["git_blob"] == "d08b347e5850cfe9d0154effd59915849796f5d9")
        oracle = json.loads((root / "oracle.json").read_bytes())
        if a.phase == "original":
            prepare(root, receipt, out)
        else:
            old = json.loads((root / "original-receiving" / "receiving.json").read_bytes())
            check(receipt, "original course already frozen and passing", old["passed"] is True)
        watched = [root / n for n in ["make_delivery_zip.py", "original-receiver.py", "receive_compatibility.py",
                   "oracle.json", "producer-manifest.json", "fixture-identities.json"]] + [a.receiver]
        watched += [p for folder in ["selected", "archives"] for p in (root / folder).rglob("*") if p.is_file()]
        watched = sorted(set(watched))
        before = {str(p): snapshot(p) for p in watched}
        receipt["source_and_fixture_before"] = before
        tests = oracle[a.phase + "_course"]
        for test in tests:
            name = test["case"]
            archive = root / "archives" / (name + ".zip")
            dest = out / (name + "-output")
            port = available_port()
            argv = [sys.executable, "-I", "-B", str(a.receiver), "--archive", str(archive),
                    "--sha256", snapshot(archive)["sha256"], "--output", str(dest), "--port", str(port)]
            command = run(argv, root, out, name)
            command["case"] = name
            receipt["commands"].append(command)
            check(receipt, name + " exit", command["returncode"] == test["expected_exit"], command["returncode"])
            if test.get("output_absent"):
                check(receipt, name + " refused before creating output", not dest.exists() and not dest.is_symlink())
                if "expected_error" in test:
                    check(receipt, name + " expected original reason", test["expected_error"] in command["stderr"])
            else:
                raw = (dest / "receiving.json").read_bytes()
                result = json.loads(raw)
                command["receiver_receipt"] = result
                command["receiver_receipt_identity"] = identity(raw)
                check(receipt, name + " receiving passed", result["passed"] is True)
                check(receipt, name + " own server ready and collected zero", result["server"]["ready"] is True and result["server"]["returncode"] == 0 and result["server"]["pid"] > 0)
                with zipfile.ZipFile(archive) as z:
                    expected = {n: z.read(n) for n in z.namelist()}
                check(receipt, name + " extracted membership exact", {p.relative_to(dest / "package").as_posix() for p in (dest / "package").rglob("*") if p.is_file()} == set(expected))
                check(receipt, name + " all extracted bytes exact", all((dest / "package" / n).read_bytes() == b for n, b in expected.items()))
                check(receipt, name + " four exact HTTP identities", len(result["http"]) == test["http"] and all(item["status"] == 200 and {k:item[k] for k in identity(b"")} == identity(expected[item["member"]]) for item in result["http"]))
                check(receipt, name + " conserved receiver archive and five extracted files", result["archive_preserved"] is True and result["extracted_files_preserved"] == 5)
            check(receipt, name + " packaged code never executed", not (root / "PACKAGED-CODE-RAN").exists() and not list(out.rglob("PACKAGED-CODE-RAN")))
        receipt["passed"] = True
    except Exception as e:
        receipt["error"] = type(e).__name__ + ": " + str(e)
        receipt["traceback"] = traceback.format_exc()
    finally:
        if watched:
            after = {str(p): snapshot(p) for p in watched}
            receipt["source_and_fixture_after"] = after
            receipt["source_and_fixture_preserved"] = before == after
            if before != after:
                receipt["passed"] = False
                receipt["conservation_error"] = "Source or fixture changed"
        receipt["finished_unix"] = time.time()
        receipt["observer"] = identity(Path(__file__).read_bytes())
        write_json(out / "receiving.json", receipt)
    print(json.dumps({"passed": receipt["passed"], "checks": len(receipt["checks"]),
                      "passed_checks": sum(c["passed"] for c in receipt["checks"]),
                      "receipt": str(out / "receiving.json"), "error": receipt.get("error")}))
    return 0 if receipt["passed"] else 1

if __name__ == "__main__":
    raise SystemExit(main())
