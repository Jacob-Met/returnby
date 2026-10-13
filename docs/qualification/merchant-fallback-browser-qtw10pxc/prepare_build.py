"""UNEXECUTED DRAFT v3: pinned ReturnBy source staging and direct Windows builds.
This file is a receiver, not product source. No install, npm script, test run,
browser launch, source edit, shared dependency write or adoption is performed.
Use only after the earlier unknown mkdir has been reconciled on the same host.
"""
import argparse
import base64
import datetime
import getpass
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import platform
import shutil
import stat
import subprocess
import sys
import traceback

INPUT_BLOB = "6dfc8145a8b2f442424f036a733d1938b1977462"
CONTRACT_BLOB = "837781b16a669c0eeb66b00e8901a2877c8696f4"
PARENT = Path(r"C:\Users\jacob\hamon-team-20261013-fongo8ab\runtime")
SHARED = Path(r"C:\Users\jacob\hamon-returnby-completion-checklist-3dcb83a1\node_modules")
NODE = Path(r"C:\Program Files\nodejs\node.exe")
MIN_FREE = 2 * 1024**3
EXPECTED = {
    "original": ("7a271cfbc27e6c79a889b90920a700fdbf638e22",
                 "c53ca326af314176e1367b6585e876ed3e560a21", 27),
    "candidate": ("f2ad8039ddef8f783bccf491847d7b95854f92e1",
                  "80a4535a69ca36be41598051945e1dd4b2aba7bd", 28),
}

def require(condition, message):
    if not condition:
        raise RuntimeError(message)

def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def identity(data):
    return {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
            "git_blob": hashlib.sha1(b"blob " + str(len(data)).encode("ascii") +
                                     b"\0" + data).hexdigest()}

def regular(path):
    st = path.lstat()
    require(stat.S_ISREG(st.st_mode), "Nonregular file: " + str(path))
    require(not (getattr(st, "st_file_attributes", 0) &
                 getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)),
            "Reparse file: " + str(path))
    return st

def no_redirects(path):
    for p in (path, *path.parents):
        st = p.lstat()
        require(not p.is_symlink() and
                not (getattr(st, "st_file_attributes", 0) & 0x400),
                "Redirected ancestor: " + str(p))

def relative(value):
    p = PurePosixPath(value)
    require(isinstance(value, str) and value == p.as_posix() and
            not p.is_absolute() and bool(p.parts) and
            all(x not in ("", ".", "..") and ":" not in x and "\\" not in x
                for x in p.parts), "Noncanonical relative path")
    return p

def read_json(path):
    regular(path)
    raw = path.read_bytes()
    return json.loads(raw.decode("utf-8")), identity(raw)

def create_bytes(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    no_redirects(path.parent)
    with path.open("xb") as f:
        f.write(data)

def save(path, value):
    raw = (json.dumps(value, indent=2, ensure_ascii=True) + "\n").encode("ascii")
    create_bytes(path, raw)
    return identity(raw)

def capacity(root):
    free = shutil.disk_usage(root).free
    require(free >= MIN_FREE, "Less than 2 GiB free; do not start this phase")
    return free

def inventory(root):
    no_redirects(root)
    rows = []
    for folder, dirs, files in os.walk(root, followlinks=False):
        dirs.sort()
        for name in dirs:
            no_redirects(Path(folder) / name)
        for name in sorted(files):
            p = Path(folder) / name
            regular(p)
            data = p.read_bytes()
            rows.append({"path": p.relative_to(root).as_posix(),
                         "bytes": len(data),
                         "sha256": hashlib.sha256(data).hexdigest()})
    return sorted(rows, key=lambda r: r["path"])

def source_rows(root, projection):
    rows = []
    for f in projection["files"]:
        p = root.joinpath(*relative(f["path"]).parts)
        st = regular(p)
        row = {"path": f["path"], **identity(p.read_bytes()),
               "mtime_ns": st.st_mtime_ns}
        require(row["git_blob"] == f["git_blob"],
                "Staged source mismatch: " + f["path"])
        rows.append(row)
    return rows

def check_source_shape(root, projection, allow_dist=False):
    expected = {x["path"] for x in projection["files"]}
    rows = inventory(root)
    found = {x["path"] for x in rows
             if not (allow_dist and x["path"].startswith("dist/"))}
    require(found == expected, "Unexpected or missing project source files")
    return source_rows(root, projection)

def intake(root):
    require(os.name == "nt" and platform.node().casefold() == "msi" and
            getpass.getuser().casefold() == "jacob",
            "Receiver is restricted to the admitted Jacob MSI host")
    require(platform.python_version() == "3.14.3", "Python version drift")
    require(root.is_absolute() and root.parent == PARENT and
            root.name.startswith("returnby-"),
            "ROOT must be the reconciled direct returnby-* child of Runtime")
    no_redirects(root)
    require(root.is_dir(), "ROOT must already exist after reconciliation")
    require(not os.environ.get("NODE_OPTIONS") and not os.environ.get("NODE_PATH"),
            "Unexpected Node injection environment; record and hold, do not clear")
    inp, inp_pin = read_json(root / "INPUT.json")
    contract, contract_pin = read_json(root / "CONTRACT.json")
    require(inp_pin["git_blob"] == INPUT_BLOB and
            contract_pin["git_blob"] == CONTRACT_BLOB, "Frozen intake mismatch")
    require(inp["contract_git_blob"] == CONTRACT_BLOB, "Contract linkage mismatch")
    bodies = {}
    require(len(inp["blobs"]) == 29, "Unexpected body count")
    for blob, row in inp["blobs"].items():
        require(row["encoding"] == "base64", "Unsupported body encoding")
        data = base64.b64decode("".join(row["content"].split()), validate=True)
        require(identity(data)["git_blob"] == blob, "Input body Git hash mismatch")
        bodies[blob] = data
    for variant, (commit, tree, count) in EXPECTED.items():
        p = inp[variant]
        require(p["commit"] == commit and p["tree"] == tree and
                len(p["files"]) == count, "Projection identity mismatch")
        require(contract[variant]["commit"] == commit and
                contract[variant]["tree"] == tree, "Contract source mismatch")
        paths = [x["path"] for x in p["files"]]
        require(len(set(paths)) == len(paths), "Duplicate source path")
        for f in p["files"]:
            relative(f["path"])
            require(f["mode"] == "100644" and f["git_blob"] in bodies,
                    "Unexpected projection mode/body")
    return inp, bodies, {"input": inp_pin, "contract": contract_pin}

def applicable(values, wanted):
    if not values:
        return True
    require(isinstance(values, list), "Unexpected lock platform selector")
    positive = [x for x in values if not x.startswith("!")]
    return "!" + wanted not in values and (not positive or wanted in positive)

def packages(lock, dependency_root):
    hidden, _ = read_json(dependency_root / ".package-lock.json")
    checks = []
    for key, row in sorted(lock["packages"].items()):
        if not key:
            continue
        if not applicable(row.get("os"), "win32") or not applicable(row.get("cpu"), "x64"):
            continue
        require(key.startswith("node_modules/"), "Unexpected package path")
        installed = hidden["packages"].get(key)
        require(installed is not None, "Missing installed metadata: " + key)
        fields = {k: row.get(k) for k in ("version", "resolved", "integrity")}
        require(all(installed.get(k) == v for k, v in fields.items()),
                "Installed lock mismatch: " + key)
        p = dependency_root.joinpath(*relative(key[len("node_modules/"):]).parts)
        no_redirects(p)
        actual, _ = read_json(p / "package.json")
        require(actual["version"] == row["version"], "Package version mismatch")
        checks.append({"path": key, **fields, "package_version": actual["version"]})
    require(len(checks) == 36, "Applicable package closure changed")
    return checks

def dependency_projection(current, baseline):
    by_path = {x["path"]: x for x in current}
    require(all(by_path.get(r["path"]) == r for r in baseline),
            "An original owned dependency file changed or disappeared")
    original_paths = {x["path"] for x in baseline}
    additions = [r for r in current if r["path"] not in original_paths]
    require(all(r["path"].startswith(".vite-temp/") for r in additions),
            "Unexpected owned dependency addition outside Vite's config cache")
    return additions

def node_version(env, cwd):
    regular(NODE)
    p = subprocess.run([str(NODE), "--version"], cwd=cwd, env=env,
                       capture_output=True, timeout=30, check=False)
    require(p.returncode == 0 and p.stdout.strip() == b"v24.14.0",
            "Node version gate failed")
    return {"path": str(NODE), "version": p.stdout.decode("ascii").strip(),
            "exit_code": p.returncode, "executable": identity(NODE.read_bytes())}

def stage(root):
    inp, bodies, pins = intake(root)
    for name in ("original", "candidate", "node_modules", "STAGED-SOURCE.json",
                 "DEPENDENCIES.json", "STAGE-ATTEMPT.json"):
        require(not os.path.lexists(root / name), "Create-only stage collision: " + name)
    receipt = {"format": "returnby.stage-attempt.v1", "accepted": False,
               "started_at": now(), "input_pins": pins}
    try:
        receipt["capacity_before"] = capacity(root)
        lock_blob = next(x["git_blob"] for x in inp["candidate"]["files"]
                         if x["path"] == "package-lock.json")
        lock = json.loads(bodies[lock_blob].decode("utf-8"))
        package_checks = packages(lock, SHARED)
        before = inventory(SHARED)
        require(len(before) == 748 and sum(x["bytes"] for x in before) == 62943799,
                "Shared closure differs from original read-only gate")
        copied_root = root / "node_modules"
        copied_root.mkdir()
        for row in before:
            src = SHARED.joinpath(*relative(row["path"]).parts)
            regular(src)
            data = src.read_bytes()
            require(len(data) == row["bytes"] and
                    hashlib.sha256(data).hexdigest() == row["sha256"],
                    "Shared dependency changed during copy")
            create_bytes(copied_root.joinpath(*relative(row["path"]).parts), data)
        copied = inventory(copied_root)
        source_after = inventory(SHARED)
        require(before == copied == source_after, "Dependency copy/preservation mismatch")
        require(packages(lock, copied_root) == package_checks,
                "Copied package metadata mismatch")
        deps = {"format": "returnby.dependencies.v1", "accepted": True,
                "source": str(SHARED), "copy": str(copied_root),
                "package_lock_git_blob": lock_blob, "packages": package_checks,
                "before": before, "copied": copied, "source_after": source_after}
        deps_pin = save(root / "DEPENDENCIES.json", deps)
        staged = {"format": "returnby.staged-source.v1", "accepted": False,
                  "input": pins["input"], "contract": pins["contract"],
                  "dependencies": {"path": "DEPENDENCIES.json", **deps_pin}}
        for variant in EXPECTED:
            project = root / variant
            project.mkdir()
            for f in inp[variant]["files"]:
                create_bytes(project.joinpath(*relative(f["path"]).parts),
                             bodies[f["git_blob"]])
            staged[variant] = {"commit": inp[variant]["commit"],
                               "tree": inp[variant]["tree"],
                               "files": check_source_shape(project, inp[variant])}
        require(read_json(root / "INPUT.json")[1] == pins["input"] and
                read_json(root / "CONTRACT.json")[1] == pins["contract"],
                "Intake changed during stage")
        require(inventory(SHARED) == before and inventory(copied_root) == copied,
                "Dependencies changed while source was staged")
        staged["accepted"] = True
        receipt["staged_manifest"] = save(root / "STAGED-SOURCE.json", staged)
        receipt["dependencies"] = deps_pin
        receipt["accepted"] = True
    except Exception:
        receipt["exception"] = traceback.format_exc()
    finally:
        receipt["finished_at"] = now()
        save(root / "STAGE-ATTEMPT.json", receipt)
    return receipt["accepted"]

def build(root, variant):
    inp, _, pins = intake(root)
    staged, staged_pin = read_json(root / "STAGED-SOURCE.json")
    deps, deps_pin = read_json(root / "DEPENDENCIES.json")
    require(staged["accepted"] is True and deps["accepted"] is True,
            "Stage/dependencies not accepted")
    require(staged["input"] == pins["input"] and staged["contract"] == pins["contract"],
            "Stage is not bound to exact frozen intake")
    require(staged["dependencies"] == {"path": "DEPENDENCIES.json", **deps_pin},
            "Dependency manifest pin mismatch")
    require(deps["source"] == str(SHARED) and deps["copy"] == str(root / "node_modules"),
            "Dependency paths changed")
    require(deps["before"] == deps["copied"] == deps["source_after"],
            "Dependency equality proof missing")
    project = root / variant
    out = root / ("build-" + variant)
    for p in (out, project / "dist", root / ("BUILD-" + variant + ".json")):
        require(not os.path.lexists(p), "Create-only build collision: " + str(p))
    out.mkdir()
    receipt = {"format": "returnby.build.v1", "accepted": False, "variant": variant,
               "source_commit": inp[variant]["commit"],
               "source_tree": inp[variant]["tree"], "input": pins["input"],
               "staged_manifest": staged_pin, "started_at": now(), "commands": [],
               "source_unchanged": False, "dist": {},
               "dependencies": {"accepted": False,
                    "manifest": {"path": "DEPENDENCIES.json", **deps_pin},
                    "shared_unchanged": False, "copied_original_files_unchanged": False,
                    "owned_cache_additions": []}}
    source_before = None
    env = os.environ.copy()
    tmp = out / "tmp"
    tmp.mkdir()
    env["TEMP"] = env["TMP"] = str(tmp)
    try:
        receipt["capacity_before"] = capacity(root)
        source_before = check_source_shape(project, inp[variant])
        require(source_before == staged[variant]["files"], "Source differs from staging")
        require(inventory(SHARED) == deps["before"], "Shared dependencies drifted")
        dependency_projection(inventory(root / "node_modules"), deps["copied"])
        receipt["node"] = node_version(env, project)
        jobs = [
            ("tsc", root / "node_modules/typescript/bin/tsc", ["--noEmit"]),
            ("vite", root / "node_modules/vite/bin/vite.js", ["build"]),
        ]
        for name, entry, args in jobs:
            regular(entry)
            cmd = [str(NODE), str(entry), *args]
            row = {"name": name, "argv": cmd, "cwd": str(project),
                   "timeout_seconds": 180, "started_at": now(), "exit_code": None}
            receipt["commands"].append(row)
            stdout_path, stderr_path = out / (name + ".stdout"), out / (name + ".stderr")
            with stdout_path.open("xb") as stdout, stderr_path.open("xb") as stderr:
                try:
                    result = subprocess.run(cmd, cwd=project, env=env, stdout=stdout,
                                            stderr=stderr, timeout=180, check=False)
                    row["exit_code"] = result.returncode
                except subprocess.TimeoutExpired:
                    row["timed_out"] = True
                    row["cleanup_scope"] = (
                        "subprocess.run killed and reaped its direct Node child; "
                        "descendant termination is not established. Hold receiving.")
                    raise
                finally:
                    row["finished_at"] = now()
            row["stdout"] = {"path": stdout_path.relative_to(root).as_posix(),
                             **identity(stdout_path.read_bytes())}
            row["stderr"] = {"path": stderr_path.relative_to(root).as_posix(),
                             **identity(stderr_path.read_bytes())}
            require(row["exit_code"] == 0, name + " returned nonzero")
        dist_rows = inventory(project / "dist")
        receipt["dist"] = {r["path"]: {"bytes": r["bytes"], "sha256": r["sha256"]}
                           for r in dist_rows}
        require({"index.html", "trip-checklist.html"}.issubset(receipt["dist"]),
                "Both configured HTML outputs were not produced")
    except Exception:
        receipt["exception"] = traceback.format_exc()
    finally:
        try:
            # Pin retained streams even on timeout; pin failures remain a held receipt.
            for row in receipt["commands"]:
                for channel in ("stdout", "stderr"):
                    raw_path = out / (row["name"] + "." + channel)
                    if raw_path.is_file():
                        row[channel] = {"path": raw_path.relative_to(root).as_posix(),
                                        **identity(raw_path.read_bytes())}
            after = check_source_shape(project, inp[variant], allow_dist=True)
            receipt["source_before"] = source_before
            receipt["source_after"] = after
            receipt["source_unchanged"] = source_before == after == staged[variant]["files"]
            shared_equal = inventory(SHARED) == deps["before"]
            additions = dependency_projection(inventory(root / "node_modules"), deps["copied"])
            receipt["dependencies"].update(
                shared_unchanged=shared_equal, copied_original_files_unchanged=True,
                owned_cache_additions=additions)
            manifests_equal = (
                read_json(root / "INPUT.json")[1] == pins["input"] and
                read_json(root / "CONTRACT.json")[1] == pins["contract"] and
                read_json(root / "STAGED-SOURCE.json")[1] == staged_pin and
                read_json(root / "DEPENDENCIES.json")[1] == deps_pin)
            receipt["manifests_unchanged"] = manifests_equal
            receipt["dependencies"]["accepted"] = shared_equal and manifests_equal
        except Exception:
            receipt["preservation_exception"] = traceback.format_exc()
        receipt["accepted"] = (
            "exception" not in receipt and "preservation_exception" not in receipt and
            len(receipt["commands"]) == 2 and
            all(r["exit_code"] == 0 for r in receipt["commands"]) and
            receipt["source_unchanged"] and receipt["dependencies"]["accepted"] and
            bool(receipt["dist"]))
        receipt["finished_at"] = now()
        save(root / ("BUILD-" + variant + ".json"), receipt)
    return receipt["accepted"]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", type=Path)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--stage", action="store_true")
    action.add_argument("--build", choices=tuple(EXPECTED))
    args = parser.parse_args()
    try:
        accepted = stage(args.root) if args.stage else build(args.root, args.build)
    except Exception:
        # Preflight/create-only failures intentionally do not overwrite old receipts.
        traceback.print_exc()
        return 1
    print(json.dumps({"phase": "stage" if args.stage else args.build,
                      "accepted": accepted}))
    return 0 if accepted else 1

if __name__ == "__main__":
    raise SystemExit(main())
