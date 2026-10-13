import hashlib, json, os, pathlib, shutil, subprocess, sys, time
root = pathlib.Path("/private/var/tmp/hamon-dcac8b3b8755-returnby-intake-v1")
donor = root / "original"
work = root / "author-unit"
packet_path = pathlib.Path("/private/var/tmp/hamon-dcac8b3b8755-returnby-intake-unit-packet-v2.json")
packet = json.loads(packet_path.read_text(encoding="utf-8"))
def identify(data):
    return {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
            "git_blob_sha1": hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()}
def witness(path):
    data = path.read_bytes()
    st = path.stat()
    return dict(identify(data), mode=st.st_mode, mtime_ns=st.st_mtime_ns, inode=st.st_ino)
def require(ok, message):
    if not ok: raise RuntimeError(message)
require(not work.exists(), "owned author directory already exists")
before = {e["path"]: witness(donor / e["path"]) for e in packet["donor_files"]}
for e in packet["donor_files"]:
    require(before[e["path"]]["git_blob_sha1"] == e["sha"], "donor Git identity mismatch: " + e["path"])
work.mkdir()
for e in packet["donor_files"]:
    dest = work / e["path"]
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(donor / e["path"], dest)
for e in packet["files"]:
    data = e["content"].encode("utf-8")
    require(all(identify(data)[k] == e[k] for k in ("bytes", "sha256", "git_blob_sha1")), "packet member mismatch")
    dest = work / e["path"]
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    dest.chmod(0o644)
# Keep all test cache and runner configuration within this owned directory.
config = work / "vitest.author.config.mjs"
config.write_text("export default { cacheDir: " + json.dumps(str(work / ".vite")) + " };\n", encoding="utf-8")
source_paths = sorted({e["path"] for e in packet["donor_files"]} | {e["path"] for e in packet["files"]})
source_before = {p: witness(work / p) for p in source_paths}
cmd = ["/opt/homebrew/bin/node", str(root / "node_modules/vitest/vitest.mjs"), "run",
       "tests/intake-deadline.test.ts", "tests/core.test.ts", "--config", str(config), "--root", str(work), "--reporter", "verbose"]
receipt = {"schema":"returnby.intake-deadline-focused-receiving/1","base_commit":packet["base_commit"],
           "base_tree":packet["base_tree"],"command":cmd,"cwd":str(work),"node_modules":str(root/"node_modules"),
           "packet":identify(packet_path.read_bytes()),"source_before":source_before,"donor_before":before}
started=time.monotonic()
try:
    child=subprocess.Popen(cmd,cwd=work,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=dict(os.environ,CI="true",NO_COLOR="1",TZ="UTC"))
    receipt["pid"]=child.pid
    try: stdout,stderr=child.communicate(timeout=60)
    except subprocess.TimeoutExpired:
        child.kill()
        stdout,stderr=child.communicate()
        receipt["timed_out"]=True
        raise RuntimeError("bounded unit child timed out")
    receipt["exit_code"]=child.returncode
    (work/"unit.stdout.log").write_bytes(stdout)
    (work/"unit.stderr.log").write_bytes(stderr)
    receipt["stdout"]=identify(stdout)
    receipt["stderr"]=identify(stderr)
    receipt["source_after"]={p:witness(work/p) for p in source_paths}
    receipt["donor_after"]={e["path"]:witness(donor/e["path"]) for e in packet["donor_files"]}
    require(receipt["source_after"]==source_before,"unit source changed")
    require(receipt["donor_after"]==before,"immutable original changed")
    require(child.returncode==0,"unit course returned nonzero")
    receipt["passed"]=True
except Exception as exc:
    receipt["passed"]=False
    receipt["error"]=str(exc)
finally:
    receipt["duration_seconds"]=round(time.monotonic()-started,3)
    (work/"receiving.json").write_text(json.dumps(receipt,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"passed":receipt["passed"],"exit_code":receipt.get("exit_code"),"pid":receipt.get("pid"),
                  "duration_seconds":receipt["duration_seconds"],"source_files":len(source_paths),
                  "donor_files":len(before),"receipt":str(work/"receiving.json")}))
if not receipt["passed"]:
    print((work/"unit.stdout.log").read_text(encoding="utf-8",errors="replace") if (work/"unit.stdout.log").exists() else "")
    print((work/"unit.stderr.log").read_text(encoding="utf-8",errors="replace") if (work/"unit.stderr.log").exists() else "",file=sys.stderr)
sys.exit(0 if receipt["passed"] else 1)
