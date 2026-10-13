import hashlib,json,os,pathlib,signal,subprocess,sys,tempfile,time,urllib.request,zipfile,traceback
SOURCE=pathlib.Path("/private/var/tmp/hamon-dcac8b3b8755-returnby-intake-delivery-v1/returnby-intake-deadline-preview-72168cc8-v1.zip")
ROOT=pathlib.Path(__file__).parent
OUT=ROOT/"artifact-receiving-70"
OUT.mkdir(exist_ok=False)
EXTRACT=OUT/"received package \u03a9"
EXTRACT.mkdir()
receipt={"schema":"returnby70-artifact-http-receiving-v1","source_archive":str(SOURCE),"checks":[],"http":[],"browser_replay":False,"build_replay":False}
def require(name,ok,detail=None):
 receipt["checks"].append({"name":name,"pass":bool(ok),"detail":detail})
 if not ok:raise RuntimeError(name)
def witness(p):
 d=p.read_bytes();s=p.stat()
 return {"bytes":len(d),"sha256":hashlib.sha256(d).hexdigest(),"mode":s.st_mode,"mtime_ns":s.st_mtime_ns,"inode":s.st_ino}
def gitid(d):return hashlib.sha1(b"blob "+str(len(d)).encode()+b"\0"+d).hexdigest()
child=None
before=witness(SOURCE)
receipt["source_before"]=before
try:
 require("outer archive exact",before["bytes"]==1028338 and before["sha256"]=="cce7c108c88a906d65b7a1ff0af2b491f94604f4bfb6fe99c59bb41b5ebaf2db")
 with zipfile.ZipFile(SOURCE) as z:
  names=z.namelist()
  require("39 unique safe regular members",len(names)==39 and len(set(names))==39 and all(not n.startswith("/") and "\\" not in n and all(p not in ("..",".","") for p in n.split("/")) and (z.getinfo(n).external_attr>>16)&0o170000 in (0,0o100000) for n in names))
  require("archive CRC",z.testzip() is None)
  m=json.loads(z.read("MANIFEST.json"));rows={r["path"]:r for r in m["files"]}
  require("38 manifest payloads and exact membership",len(rows)==38 and set(names)==set(rows)|{"MANIFEST.json"})
  for n in names:
   d=z.read(n)
   if n in rows:
    r=rows[n]
    require("payload "+n,len(d)==r["bytes"] and hashlib.sha256(d).hexdigest()==r["sha256"] and gitid(d)==r["git_blob"])
   p=EXTRACT/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(d)
  expected={"source-selected/src/main.ts":"0ce65fa0406882a37f3ef679a887965fc2846da3","source-selected/src/intake-deadline.ts":"66acad777780210c10fc2f62f0f985c9ec9c1357","source-selected/tests/intake-deadline.test.ts":"89550b037c26e93569e6c12233058264628dc7a0","evidence/original/receiving.json":"f4141d504e5c42deb2c4849f7ba25f375382ac45","evidence/candidate/receiving.json":"b53e369963a516c434ddb3dab2a67cf74c0c2fc4"}
  require("product and receiver source pins",all(gitid(z.read(n))==sha for n,sha in expected.items()))
  asset_names=sorted(n for n in names if n.startswith("preview/"))
  require("ten actual built assets",len(asset_names)==10 and all(z.read(n)==(ROOT/"candidate/dist"/n.removeprefix("preview/")).read_bytes() for n in asset_names))
 admitted={n:witness(EXTRACT/n) for n in names};receipt["admitted"]=admitted
 verify=subprocess.run([sys.executable,"-B","VERIFY.py"],cwd=EXTRACT,capture_output=True,timeout=20)
 (OUT/"verify.stdout.txt").write_bytes(verify.stdout);(OUT/"verify.stderr.txt").write_bytes(verify.stderr)
 receipt["verify"]={"exit":verify.returncode,"stdout":verify.stdout.decode(),"stderr":verify.stderr.decode()}
 require("documented integrity check",verify.returncode==0 and verify.stdout==b"Verified 38 exact payloads.\n" and not verify.stderr)
 stdout=open(OUT/"server.stdout.txt","wb");stderr=open(OUT/"server.stderr.txt","wb")
 argv=[sys.executable,"-B","-m","http.server","8797","--bind","127.0.0.1","--directory","preview"]
 child=subprocess.Popen(argv,cwd=EXTRACT,stdout=stdout,stderr=stderr)
 receipt["server"]={"argv":argv,"pid":child.pid,"cwd":str(EXTRACT)}
 opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
 ready=False
 for _ in range(30):
  if child.poll() is not None:raise RuntimeError("Documented port unavailable: server exited")
  try:
   with opener.open("http://127.0.0.1:8797/",timeout=1) as r:
    body=r.read();status=r.status
   if body==(EXTRACT/"preview/index.html").read_bytes():ready=True;break
   raise RuntimeError("Unexpected serving source")
  except urllib.error.URLError:time.sleep(0.1)
 require("documented opening URL serves exact homepage",ready)
 for name in asset_names:
  if child.poll() is not None:raise RuntimeError("Server stopped during receiving")
  url="http://127.0.0.1:8797/"+name.removeprefix("preview/")
  with opener.open(url,timeout=3) as r:data=r.read();status=r.status;ctype=r.headers.get("Content-Type")
  require("HTTP "+name,status==200 and data==(EXTRACT/name).read_bytes())
  receipt["http"].append({"path":name,"status":status,"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest(),"content_type":ctype})
 child.send_signal(signal.SIGINT);exit_code=child.wait(timeout=10);receipt["server"]["exit_after_interrupt"]=exit_code
 stdout.close();stderr.close();child=None
 require("documented interrupt closes owned server",exit_code==0)
 require("all extracted payloads conserved",{n:witness(EXTRACT/n) for n in names}==admitted)
 require("original archive conserved",witness(SOURCE)==before)
 receipt["passed"]=True
except Exception as e:
 receipt["passed"]=False;receipt["error"]=str(e);receipt["traceback"]=traceback.format_exc()
finally:
 if child and child.poll() is None:
  child.send_signal(signal.SIGINT)
  try:receipt["server_cleanup_exit"]=child.wait(timeout=10)
  except subprocess.TimeoutExpired:child.kill();receipt["server_cleanup_exit"]=child.wait(timeout=5)
 receipt["source_after"]=witness(SOURCE)
 receipt["observer_sha256"]=hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()
 (OUT/"receiving.json").write_text(json.dumps(receipt,indent=2)+"\n")
 print(json.dumps({"passed":receipt.get("passed"),"checks":len(receipt["checks"]),"http_assets":len(receipt["http"]),"error":receipt.get("error"),"server":receipt.get("server")}))
sys.exit(0 if receipt.get("passed") else 1)
