"""Create-only copy of the two observed Node Playwright packages.
No package import, browser launch, installation, shared write or old record edit.
"""
import argparse
import datetime
import getpass
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import platform
import shutil
import stat
import traceback

PROFILE_BLOB = "e23bb4224084ca8612fe52c8fc757e8bfa2b03e9"
INVENTORY_BLOB = "a5f2f1554773ac4da0927117277f38b63d43e9d4"
CONTRACT_BLOB = "6b410f82313611ec9d1a81d0c53a835ac76a03f1"
INPUT_BLOB = "98a434fe34dd6e175a64d0396d079cadf6f779b7"
SHARED = Path("/home/jacob/hamon-returnby-choices-9785663a4318/driver/node_modules")
PACKAGES = ("playwright", "playwright-core")
RECORDS = ("INPUT.json", "CONTRACT.json", "STAGED-SOURCE.json", "DEPENDENCIES.json",
           "STAGE-ATTEMPT.json", "BUILD-original.json", "browser-original/RECEIVING.json")

def require(ok, message):
    if not ok:
        raise RuntimeError(message)

def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def identity(data):
    return {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
            "git_blob": hashlib.sha1(b"blob " + str(len(data)).encode("ascii")
                                     + b"\0" + data).hexdigest()}

def regular(path):
    st = path.lstat()
    require(stat.S_ISREG(st.st_mode), "Expected regular file: " + str(path))
    return st

def no_links(path):
    for p in (path, *path.parents):
        require(not p.is_symlink(), "Redirected path: " + str(p))
        p.lstat()

def relative(value):
    require(isinstance(value, str), "Expected path string")
    p = PurePosixPath(value)
    require(value == p.as_posix() and bool(p.parts) and not p.is_absolute()
            and all(x not in (".", "..") and "\\" not in x for x in p.parts),
            "Noncanonical relative path")
    return p

def read_json(path):
    no_links(path)
    regular(path)
    data = path.read_bytes()
    return json.loads(data.decode("utf-8")), identity(data)

def create(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    no_links(path.parent)
    with path.open("xb") as stream:
        stream.write(data)

def package_files(root):
    no_links(root)
    rows = []
    for package in PACKAGES:
        directory = root / package
        no_links(directory)
        require(directory.is_dir(), "Missing package directory")
        for folder, dirs, files in os.walk(directory, followlinks=False):
            dirs.sort()
            for name in dirs:
                no_links(Path(folder) / name)
            for name in sorted(files):
                p = Path(folder) / name
                st = regular(p)
                data = p.read_bytes()
                rows.append({"path": p.relative_to(root).as_posix(),
                             "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
                             "mode": stat.S_IMODE(st.st_mode)})
    return sorted(rows, key=lambda row: row["path"])

def metadata(inv):
    paths = {"package.json": SHARED.parent / "package.json",
             "package-lock.json": SHARED.parent / "package-lock.json",
             "node_modules/.package-lock.json": SHARED / ".package-lock.json",
             "node_modules/playwright/package.json": SHARED / "playwright/package.json",
             "node_modules/playwright-core/package.json": SHARED / "playwright-core/package.json"}
    require(set(inv["metadata"]) == set(paths), "Metadata projection differs")
    pins, objects = {}, {}
    for key, path in paths.items():
        obj, pin = read_json(path)
        frozen = inv["metadata"][key]
        require(frozen["path"] == str(path), "Metadata path changed")
        require(pin == {k: frozen[k] for k in ("bytes", "sha256", "git_blob")},
                "Metadata changed since read-only admission")
        require(identity(frozen["content"].encode("utf-8")) == pin,
                "Recorded metadata content identity mismatch")
        pins[key], objects[key] = pin, obj
    lock = objects["package-lock.json"]["packages"]
    hidden = objects["node_modules/.package-lock.json"]["packages"]
    require(set(lock) == {"", "node_modules/playwright", "node_modules/playwright-core",
                          "node_modules/fsevents"}, "Unexpected package closure")
    require(set(hidden) == {"node_modules/playwright", "node_modules/playwright-core"},
            "Unexpected installed package closure")
    for package in PACKAGES:
        key = "node_modules/" + package
        row = lock[key]
        actual = objects[key + "/package.json"]
        require(actual["name"] == package and actual["version"] == row["version"] == "1.55.0",
                "Playwright package version drift")
        require(all(hidden[key].get(field) == row.get(field)
                    for field in ("version", "resolved", "integrity")),
                "Installed metadata differs from exact package lock")
    require(objects["node_modules/playwright/package.json"]["dependencies"] ==
            {"playwright-core": "1.55.0"}, "Unexpected required dependency")
    require(objects["node_modules/playwright/package.json"]["optionalDependencies"] ==
            {"fsevents": "2.3.2"}, "Unexpected optional dependency")
    require(not objects["node_modules/playwright-core/package.json"].get("dependencies"),
            "Unexpected core dependency")
    require(lock["node_modules/fsevents"]["os"] == ["darwin"] and
            lock["node_modules/fsevents"]["optional"] is True,
            "Excluded optional dependency is not Darwin-only")
    return pins

def preserve(root):
    paths = [root.joinpath(*relative(name).parts) for name in RECORDS]
    for variant in ("original", "candidate"):
        directory = root / variant
        no_links(directory)
        require(directory.is_dir(), "Staged source directory absent")
        for folder, dirs, files in os.walk(directory, followlinks=False):
            dirs.sort()
            for name in dirs:
                no_links(Path(folder) / name)
            paths.extend(Path(folder) / name for name in sorted(files))
    result = {}
    for path in sorted(paths):
        no_links(path)
        st = regular(path)
        result[path.relative_to(root).as_posix()] = {
            **identity(path.read_bytes()), "mtime_ns": str(st.st_mtime_ns)}
    return result

def main(root):
    require(platform.system() == "Linux" and platform.node() == "hamon-thinkpad"
            and os.getuid() == 1000 and getpass.getuser() == "jacob"
            and platform.python_version() == "3.14.4", "Host/interpreter identity drift")
    require(root.is_absolute() and root.parent == Path("/home/jacob")
            and root.name.startswith("hamon-returnby-linux-qtw10pxc-"),
            "Expected existing owned Linux receiving root")
    no_links(root)
    require(root.is_dir() and root.stat().st_uid == 1000, "Unowned receiving root")
    profile, profile_pin = read_json(root / "NODE-BROWSER-PROFILE.json")
    inv, inv_pin = read_json(root / "NODE-TOOLCHAIN-READONLY.json")
    require(profile_pin["git_blob"] == PROFILE_BLOB and
            inv_pin["git_blob"] == INVENTORY_BLOB, "Frozen Node intake mismatch")
    require(inv["source"] == str(SHARED) and inv["aliases"] == [] and
            inv["files"] == 455 and inv["bytes"] == 12133249,
            "Observed Node package closure mismatch")
    require(profile["toolchain"]["source"] == str(SHARED) and
            profile["toolchain"]["copy"] == "node-browser-driver/node_modules" and
            profile["toolchain"]["inventory_git_blob"] == INVENTORY_BLOB,
            "Node profile paths/linkage mismatch")
    inp, inp_pin = read_json(root / "INPUT.json")
    contract, contract_pin = read_json(root / "CONTRACT.json")
    require(inp_pin["git_blob"] == INPUT_BLOB and
            contract_pin["git_blob"] == CONTRACT_BLOB, "Existing frozen intake drift")
    require(profile["fixtures"] == contract["fixtures"], "Functional fixture drift")
    stage, stage_pin = read_json(root / "STAGED-SOURCE.json")
    build, _ = read_json(root / "BUILD-original.json")
    require(stage["accepted"] is True and stage["input"] == inp_pin and
            stage["contract"] == contract_pin, "Existing stage binding is not accepted")
    require(build["accepted"] is True and build["manifests_unchanged"] is True
            and build["input"] == inp_pin and build["staged_manifest"] == stage_pin,
            "Existing original build binding is not accepted")
    failure, failure_pin = read_json(root / "browser-original/RECEIVING.json")
    require(failure_pin == {k: profile["prior_failure"][k]
                            for k in ("bytes", "sha256", "git_blob")}
            and failure["receiver_complete"] is False and failure["completed_cases"] == 0,
            "Prior Python failure is not the frozen retained attempt")
    copy_parent = root / "node-browser-driver"
    copy_root = copy_parent / "node_modules"
    receipt_path = root / "NODE-DRIVER-COPY.json"
    require(not os.path.lexists(copy_parent) and not os.path.lexists(receipt_path),
            "Create-only Node copy collision; do not overwrite or retry")
    receipt = {"format": "returnby.node-driver-copy.v1", "accepted": False,
               "started_at": now(), "profile": profile_pin, "inventory": inv_pin,
               "source": str(SHARED), "copy": str(copy_root),
               "shared_unchanged": False, "preserved_unchanged": False}
    try:
        receipt["free_before"] = shutil.disk_usage(root).free
        require(receipt["free_before"] >= 2 * 1024**3, "Less than 2 GiB free")
        receipt["preserved_before"] = preserve(root)
        receipt["metadata_before"] = metadata(inv)
        before = package_files(SHARED)
        receipt["before"] = before
        require(before == inv["regular_files"] and len(before) == 455
                and sum(row["bytes"] for row in before) == 12133249,
                "Shared package bytes/modes changed since observed admission")
        copy_root.mkdir(parents=True)
        for row in before:
            rel = relative(row["path"])
            require(rel.parts[0] in PACKAGES, "Unexpected copied package path")
            source = SHARED.joinpath(*rel.parts)
            data = source.read_bytes()
            require(len(data) == row["bytes"] and
                    hashlib.sha256(data).hexdigest() == row["sha256"],
                    "Shared file changed during copy")
            target = copy_root.joinpath(*rel.parts)
            create(target, data)
            os.chmod(target, row["mode"])
        receipt["copied"] = package_files(copy_root)
        require(receipt["copied"] == before, "Owned package copy differs")
    except Exception:
        receipt["exception"] = traceback.format_exc()
    finally:
        try:
            receipt["source_after"] = package_files(SHARED)
            receipt["metadata_after"] = metadata(inv)
            receipt["preserved_after"] = preserve(root)
            receipt["shared_unchanged"] = (
                receipt.get("before") == receipt["source_after"] == inv["regular_files"]
                and receipt.get("metadata_before") == receipt["metadata_after"])
            receipt["preserved_unchanged"] = (
                receipt.get("preserved_before") == receipt["preserved_after"]
                and read_json(root / "NODE-BROWSER-PROFILE.json")[1] == profile_pin
                and read_json(root / "NODE-TOOLCHAIN-READONLY.json")[1] == inv_pin)
        except Exception:
            receipt["preservation_exception"] = traceback.format_exc()
        receipt["accepted"] = (
            "exception" not in receipt and "preservation_exception" not in receipt
            and receipt.get("copied") == receipt.get("before") == receipt.get("source_after")
            and receipt["shared_unchanged"] and receipt["preserved_unchanged"])
        receipt["finished_at"] = now()
        create(receipt_path, (json.dumps(receipt, indent=2, ensure_ascii=True) + "\n").encode("ascii"))
    print(json.dumps({"accepted": receipt["accepted"], "receipt": str(receipt_path),
                      "identity": identity(receipt_path.read_bytes())}))
    return 0 if receipt["accepted"] else 1

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", type=Path)
    args = parser.parse_args()
    try:
        raise SystemExit(main(args.root))
    except Exception:
        traceback.print_exc()
        raise SystemExit(1)
