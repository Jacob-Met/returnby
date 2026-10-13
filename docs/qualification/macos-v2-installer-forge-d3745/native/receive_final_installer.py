import hashlib,importlib.util,json,os,pathlib,platform,socket,stat,subprocess,sys,time
stage=pathlib.Path(__file__).parent
source=stage/"final"
source.mkdir()
files=json.loads((stage/"final-input.json").read_text())
for name,text in files.items():
    target=source/name
    target.parent.mkdir(parents=True,exist_ok=True)
    with target.open("x",encoding="utf-8",newline="") as stream: stream.write(text)
def snapshot(root,names):
    return {name:{"bytes":len((root/name).read_bytes()),"sha256":hashlib.sha256((root/name).read_bytes()).hexdigest(),"mode":stat.S_IMODE((root/name).stat().st_mode)} for name in names}
before=snapshot(source,files)
archive=stage/"received-returnby-83abbe9a.zip"
spec=importlib.util.spec_from_file_location("verify_received_archive",source/"tools/received_preview/install_macos.py")
installer=importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)
archive_bytes,original_files,_=installer.admit_archive(archive)
received=stage/"received-original"
received.mkdir()
for name,data in original_files.items():
    target=received/name
    target.parent.mkdir(parents=True,exist_ok=True)
    with target.open("xb") as stream: stream.write(data)
received_before=snapshot(received,original_files)
with socket.socket() as check:
    if sys.platform=="linux": check.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1)
    check.bind(("127.0.0.1",8769))
env=dict(os.environ,TMPDIR=str(stage/"tmp"),RETURNBY_RECEIVED_ARCHIVE=str(archive),RETURNBY_RECEIVED_DIRECTORY=str(received),RETURNBY_SERVER_SOURCE=str(source/"tools/received_preview/serve_returnby.py"),PYTHONDONTWRITEBYTECODE="1")
courses=[]
for script in ("test_install_macos.py","test_foreground_restarts.py"):
    for flag in ([],["-O"]):
        argv=[sys.executable,"-B",*flag,str(source/"tests/received_preview"/script)]
        start=time.monotonic()
        child=subprocess.Popen(argv,env=env,cwd=source,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
        print(json.dumps({"started":script,"optimized":bool(flag),"pid":child.pid}),flush=True)
        try:
            out,err=child.communicate(timeout=480 if sys.platform=="darwin" else 150)
        except subprocess.TimeoutExpired:
            child.kill()
            out,err=child.communicate()
            raise RuntimeError("Receiver exceeded host budget: "+out+err)
        courses.append({"argv":argv,"pid":child.pid,"exitCode":child.returncode,"elapsedSeconds":time.monotonic()-start,"stdout":out,"stderr":err})
receipt={"scope":"Native Linux installer and foreground lifecycle controls. Only installer platform precondition is simulated. Installer parent and retained-checker child run normal/optimized; production launcher keeps its recorded -B invocation. Separate foreground receiver propagates optimization into runtime children.","host":platform.platform(),"python":platform.python_version(),"pid":os.getpid(),"before":before,"after":snapshot(source,files),"sourceUnchanged":before==snapshot(source,files),"receivedBefore":received_before,"receivedAfter":snapshot(received,original_files),"receivedUnchanged":received_before==snapshot(received,original_files),"archiveSha256Before":hashlib.sha256(archive_bytes).hexdigest(),"archiveSha256After":hashlib.sha256(archive.read_bytes()).hexdigest(),"courses":courses}
(stage/"final-installer-receipt.json").write_text(json.dumps(receipt,indent=2)+"\n")
print(json.dumps({"pid":os.getpid(),"sourceUnchanged":receipt["sourceUnchanged"],"receivedUnchanged":receipt["receivedUnchanged"],"courses":[{k:v for k,v in c.items() if k not in {"stdout","stderr"}} for c in courses]},indent=2))
for course in courses: print(course["stdout"],course["stderr"])
raise SystemExit(0 if receipt["sourceUnchanged"] and receipt["receivedUnchanged"] and receipt["archiveSha256Before"]==receipt["archiveSha256After"] and all(c["exitCode"]==0 for c in courses) else 1)
