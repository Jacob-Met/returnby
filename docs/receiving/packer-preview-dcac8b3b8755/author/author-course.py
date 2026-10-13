"""Run the maintained legacy and new manifest receiver CLI tests once."""
import base64,datetime,hashlib,json,os,pathlib,platform,subprocess,sys,time
ROOT=pathlib.Path(__file__).resolve().parent
def ident(b):
    return {"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest(),"git_blob":hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()}
def witness(p):
    s=p.stat()
    return dict(ident(p.read_bytes()),mode=s.st_mode,mtime_ns=str(s.st_mtime_ns),inode=str(s.st_ino))
def main():
    if platform.node()!="MSI" or os.environ.get("USERNAME")!="Veria":raise ValueError("Wrong device identity")
    packet=ROOT/"source-packet.json";raw=packet.read_bytes()
    if ident(raw)["git_blob"]!="e9d91c69b92c6964fd123e4a16feec390e8dcd10":raise ValueError("Packet differs")
    data=json.loads(raw); source=ROOT/"source"; source.mkdir()
    for f in data["files"]:
        b=f["content"].encode("utf-8")
        if any(ident(b)[k]!=f[k] for k in ident(b)):raise ValueError("Source differs: "+f["path"])
        p=source/f["path"];p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
    watched=[packet,pathlib.Path(__file__).resolve(),*[source/f["path"] for f in data["files"]]]
    before={str(p):witness(p) for p in watched}
    temp=ROOT/"process-temp";temp.mkdir()
    env=dict(os.environ);env["TEMP"]=str(temp);env["TMP"]=str(temp);env["PYTHONIOENCODING"]="utf-8"
    argv=[sys.executable,"-I","-B","-m","unittest","discover","-s",str(source/"tools"),"-p","test_receive_*preview.py","-v"]
    receipt={"schema":"returnby.packer-compatibility-author/1","started_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),
             "identity":{"host":platform.node(),"user":os.environ.get("USERNAME"),"python":sys.executable,"version":platform.python_version()},
             "argv":argv,"source_before":before,"passed":False}
    with (ROOT/"tests.stdout").open("xb") as out,(ROOT/"tests.stderr").open("xb") as err:
        p=subprocess.Popen(argv,cwd=source,env=env,stdout=out,stderr=err)
        receipt["child_pid"]=p.pid
        try:receipt["child_exit"]=p.wait(timeout=120)
        except subprocess.TimeoutExpired:
            p.kill();p.wait();receipt["timeout"]=True;receipt["child_exit"]=p.returncode
    receipt["source_after"]={str(p):witness(p) for p in watched}
    receipt["source_conserved"]=receipt["source_after"]==before
    receipt["temporary_files_remaining"]=[str(p.relative_to(temp)) for p in temp.rglob("*") if p.is_file()]
    receipt["source_paths_after"]=sorted(p.relative_to(source).as_posix() for p in source.rglob("*") if p.is_file())
    receipt["source_paths_expected"]=sorted(f["path"] for f in data["files"])
    receipt["stdout"]=(ROOT/"tests.stdout").read_text(encoding="utf-8")
    receipt["stderr"]=(ROOT/"tests.stderr").read_text(encoding="utf-8")
    receipt["passed"]=receipt.get("child_exit")==0 and receipt["source_conserved"] and not receipt["temporary_files_remaining"] and receipt["source_paths_after"]==receipt["source_paths_expected"]
    receipt["finished_utc"]=datetime.datetime.now(datetime.timezone.utc).isoformat()
    body=(json.dumps(receipt,ensure_ascii=True,indent=2)+"\n").encode()
    (ROOT/"receiving.json").write_bytes(body)
    rows=[]
    for name in ("author-course.py","receiving.json","tests.stdout","tests.stderr"):
        p=ROOT/name;b=p.read_bytes()
        rows.append({"path":name,**ident(b),"encoding":"base64","content":base64.b64encode(b).decode()})
    exported=(json.dumps({"schema":"hamon.native-author-custody/1","files":rows},indent=2)+"\n").encode()
    (ROOT/"publication-packet.json").write_bytes(exported)
    print(json.dumps({"passed":receipt["passed"],"child_pid":receipt["child_pid"],"child_exit":receipt["child_exit"],
                      "receipt":ident(body),"packet":ident(exported),"temporary_files_remaining":receipt["temporary_files_remaining"]}))
    return 0 if receipt["passed"] else 1
if __name__=="__main__":raise SystemExit(main())
