from pathlib import Path
import hashlib,json,sys
root=Path(__file__).resolve().parent
manifest=json.loads((root/"MANIFEST.json").read_text(encoding="utf-8"))
entries=manifest["files"]
expected={e["path"]:e for e in entries}
if len(expected)!=len(entries):raise SystemExit("Duplicate manifest entry")
for p in root.rglob("*"):
    if p.is_symlink():raise SystemExit("Symlink refused: "+str(p.relative_to(root)))
actual={p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file()}
if actual!=set(expected)|{"MANIFEST.json"}:raise SystemExit("Payload membership mismatch")
for name,e in expected.items():
    p=root/name
    if p.resolve().parent!=root.resolve() and root.resolve() not in p.resolve().parents:raise SystemExit("Unsafe path")
    raw=p.read_bytes()
    if len(raw)!=e["bytes"] or hashlib.sha256(raw).hexdigest()!=e["sha256"]:raise SystemExit("Identity mismatch: "+name)
print("Verified "+str(len(expected))+" exact payloads.")
