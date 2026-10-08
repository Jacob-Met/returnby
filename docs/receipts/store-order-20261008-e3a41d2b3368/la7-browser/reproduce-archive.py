"""Rebuild and verify the bounded ReturnBy LA7 evidence archive using only stdlib.

Usage: python reproduce-archive.py SOURCE_ROOT evidence-members.json OUTPUT.tar.gz
SOURCE_ROOT is the archive's extracted directory or original frozen LA7 receiver.
Only the explicit regular members in the manifest are admitted. No links,
directories-as-members, duplicate names, extra archive entries or profile files.
"""
import sys, pathlib, json, hashlib, tarfile, gzip, io, stat
def sha(b): return hashlib.sha256(b).hexdigest()
def build(source, manifest):
    seen=set(); raw=io.BytesIO()
    with tarfile.open(fileobj=raw, mode="w", format=tarfile.USTAR_FORMAT) as archive:
        for entry in manifest["members"]:
            name=entry["path"]; parts=pathlib.PurePosixPath(name).parts
            if name in seen or not parts or any(x in ("..",".git","profile","profiles") for x in parts) or pathlib.PurePosixPath(name).is_absolute():
                raise ValueError("unsafe or duplicate member: "+name)
            seen.add(name); p=source.joinpath(*parts)
            mode=p.lstat().st_mode
            if not stat.S_ISREG(mode): raise ValueError("not a regular file: "+name)
            data=p.read_bytes()
            if len(data)!=entry["bytes"] or sha(data)!=entry["sha256"]:
                raise ValueError("member bytes changed: "+name)
            info=tarfile.TarInfo(name); info.size=len(data); info.mode=0o644
            info.uid=info.gid=info.mtime=0; info.uname=info.gname=""
            archive.addfile(info,io.BytesIO(data))
    return gzip.compress(raw.getvalue(),compresslevel=9,mtime=0)
def verify(data, manifest):
    expected={x["path"]:x for x in manifest["members"]}
    if len(expected)!=len(manifest["members"]): raise ValueError("duplicate manifest member")
    seen=set()
    with tarfile.open(fileobj=io.BytesIO(data),mode="r:gz") as archive:
        for member in archive.getmembers():
            if not member.isreg() or member.name in seen or member.name not in expected:
                raise ValueError("unexpected/nonregular/duplicate archive member")
            seen.add(member.name); entry=expected[member.name]
            body=archive.extractfile(member).read()
            if len(body)!=entry["bytes"] or sha(body)!=entry["sha256"] or member.mode!=0o644:
                raise ValueError("archive member mismatch: "+member.name)
            if member.uid or member.gid or member.mtime or member.uname or member.gname:
                raise ValueError("nondeterministic archive metadata")
    if seen!=set(expected): raise ValueError("missing archive members")
    return len(seen)
if __name__=="__main__":
    source=pathlib.Path(sys.argv[1]); manifest=json.loads(pathlib.Path(sys.argv[2]).read_text(encoding="utf-8"))
    data=build(source,manifest); count=verify(data,manifest)
    if sha(data)!=manifest["archive"]["sha256"] or len(data)!=manifest["archive"]["bytes"]:
        raise ValueError("archive output differs from frozen bytes; check Python/zlib versions")
    out=pathlib.Path(sys.argv[3])
    with out.open("xb") as f:f.write(data)
    print(json.dumps({"status":"pass","members":count,"archive_sha256":sha(data),"bytes":len(data)}))
