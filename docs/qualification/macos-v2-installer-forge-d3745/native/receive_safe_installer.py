import hashlib,json,os,pathlib,platform,socket,stat,subprocess,sys,time
stage=pathlib.Path(__file__).parent
source=stage/"safe"
source.mkdir()
files=json.loads((stage/"safe-input.json").read_text())
for name,text in files.items():
    target=source/name
    target.parent.mkdir(parents=True,exist_ok=True)
    with target.open("x",encoding="utf-8",newline="") as stream: stream.write(text)
def snapshot():
    return {name:{"bytes":len((source/name).read_bytes()),"sha256":hashlib.sha256((source/name).read_bytes()).hexdigest(),"mode":stat.S_IMODE((source/name).stat().st_mode)} for name in files}
before=snapshot()
archive=stage/"received-returnby-83abbe9a.zip"
if hashlib.sha256(archive.read_bytes()).hexdigest()!="816e8d09fbecc27ffeb189aa3c889e48e5bc81f352ccc5b75f5cb9bd64badd71": raise SystemExit("Changed original archive")
with socket.socket() as check:
    check.bind(("127.0.0.1",8769))
env=dict(os.environ,TMPDIR=str(stage/"tmp"),RETURNBY_RECEIVED_ARCHIVE=str(archive),PYTHONDONTWRITEBYTECODE="1")
courses=[]
for flag in ([],["-O"]):
    argv=[sys.executable,"-B",*flag,str(source/"tests/received_preview/test_install_macos.py")]
    start=time.monotonic()
    child=subprocess.Popen(argv,env=env,cwd=source,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    try:
        out,err=child.communicate(timeout=150)
    except subprocess.TimeoutExpired:
        child.kill()
        out,err=child.communicate()
        raise RuntimeError("Installer receiver exceeded 150 seconds: "+out+err)
    courses.append({"argv":argv,"pid":child.pid,"exitCode":child.returncode,"elapsedSeconds":time.monotonic()-start,"stdout":out,"stderr":err})
receipt={"scope":"Native Linux installer source controls. Only installation platform precondition is simulated; runtime/launcher children remain actual Linux. Test-parent and retained-checker child run normal/optimized; production launcher preserves its recorded -B invocation. Separate Mac runtime acceptance pending.","host":platform.platform(),"python":platform.python_version(),"pid":os.getpid(),"before":before,"after":snapshot(),"sourceUnchanged":before==snapshot(),"archiveSha256After":hashlib.sha256(archive.read_bytes()).hexdigest(),"courses":courses}
(stage/"safe-installer-receipt.json").write_text(json.dumps(receipt,indent=2)+"\n")
print(json.dumps({"pid":os.getpid(),"sourceUnchanged":receipt["sourceUnchanged"],"courses":[{k:v for k,v in c.items() if k not in {"stdout","stderr"}} for c in courses]},indent=2))
for course in courses: print(course["stdout"],course["stderr"])
raise SystemExit(0 if receipt["sourceUnchanged"] and all(c["exitCode"]==0 for c in courses) else 1)
