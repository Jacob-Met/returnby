import datetime,hashlib,http.server,json,os,pathlib,platform,socket,stat,subprocess,sys,threading,warnings,zipfile
ROOT=pathlib.Path(__file__).parent
TOOL=ROOT/"receive_static_preview.py"
def pin(raw):return {"bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest(),"git_blob":hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()}
def witness(p):
 s=p.stat();return dict(pin(p.read_bytes()),mode=s.st_mode,mtime_ns=s.st_mtime_ns,inode=s.st_ino)
def free_port():
 with socket.socket() as s:
  s.setsockopt(socket.SOL_SOCKET,socket.SO_EXCLUSIVEADDRUSE,1);s.bind(("127.0.0.1",0));return s.getsockname()[1]
def record_case(cid):
 case=ROOT/cid;case.mkdir()
 bodies={"preview/index.html":b"<!doctype html><meta charset='utf-8'><title>Independent fixture</title><p>Saved preview</p>\r\n",
 "preview/assets/caf\u00e9 1.txt":"First line \u6771\u4eac\r\nSecond line 100%\n".encode("utf-8"),
 "preview/assets/plain.css":b"body { color: #123456; }\n",
 "VERIFY.py":b"from pathlib import Path\nPath(__file__).with_name('PACKAGED_CODE_EXECUTED').write_text('ran')\n"}
 manifest={"schema":"hamon.exact-delivery-manifest/1","product_tree":"f"*40,"files":[{"path":n,**pin(d)} for n,d in bodies.items()]}
 stored=dict(bodies)
 if cid=="altered_payload":stored["preview/assets/plain.css"]=b"body { color: #654321; }\n"
 archive=case/"synthetic archive \u03a9.zip"
 with warnings.catch_warnings(record=True) as observed:
  warnings.simplefilter("always")
  with zipfile.ZipFile(archive,"x",compression=zipfile.ZIP_STORED) as z:
   for n,d in stored.items():
    info=zipfile.ZipInfo(n);info.create_system=3;info.external_attr=(stat.S_IFREG|0o644)<<16;z.writestr(info,d)
   z.writestr("MANIFEST.json",json.dumps(manifest,ensure_ascii=False).encode("utf-8"))
   if cid=="unsafe_or_ambiguous_membership":z.writestr("preview/assets/plain.css",stored["preview/assets/plain.css"])
  fixture_warnings=[str(x.message) for x in observed]
 return case,archive,bodies,fixture_warnings
R={"schema":"hamon.preview74-independent-windows/1","source_commit":"8c8d48bd0b7f745fe9a5ad6245bb236f3a7ef3ad","started_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"runtime":{"node":platform.node(),"user":os.environ.get("USERNAME"),"python":sys.executable,"version":platform.python_version()},"cases":[],"author_test_replayed":False}
source_before=witness(TOOL);frozen_before=witness(ROOT/"frozen-cases.json")
if source_before["bytes"]!=13114 or source_before["sha256"]!="beb836cc29bd3f44a8a6995cd98cc853e9844c2862f2cfe6dbe173a4f235ecac" or source_before["git_blob"]!="2d30a8a10014f8d21e5d34febc1f446e36fceba3":raise RuntimeError("source mismatch")
if platform.node()!="MSI" or os.environ.get("USERNAME","").lower()!="veria":raise RuntimeError("device mismatch")
ids=[x["id"] for x in json.loads((ROOT/"frozen-cases.json").read_text(encoding="utf-8"))["cases"]]
R["source_before"]=source_before;R["frozen_before"]=frozen_before
fixtures={}
for cid in ids:
 case,archive,bodies,fixture_warnings=record_case(cid)
 fixtures[cid]=(case,archive,bodies,fixture_warnings)
R["archive_before"]={cid:witness(v[1]) for cid,v in fixtures.items()}
(ROOT/"fixture-manifest.json").write_text(json.dumps({"schema":"hamon.independent-static-preview-fixtures/1","files":R["archive_before"],"frozen_before":frozen_before,"source":source_before},indent=2)+"\n",encoding="utf-8")
for cid in ids:
 case,archive,bodies,fixture_warnings=fixtures[cid]
 row={"id":cid,"checks":[],"fixture_warnings":fixture_warnings}
 def check(name,ok,detail=None):
  row["checks"].append({"name":name,"pass":bool(ok),"detail":detail})
  if not ok:raise RuntimeError(name)
 incumbent=None;thread=None;seen=[];sentinel=None;sentinel_before=None
 output=case/"new preview \u6771\u4eac space";port=free_port()
 if cid=="occupied_destination":
  output.mkdir();sentinel=output/"kept.txt";sentinel.write_bytes(b"Existing directory marker\r\n");sentinel_before=witness(sentinel)
 if cid=="occupied_listener":
  class Handler(http.server.BaseHTTPRequestHandler):
   def do_GET(self):
    seen.append(self.path);self.send_response(200);self.end_headers();self.wfile.write(b"independent incumbent")
   def log_message(self,*args):pass
  class Exclusive(http.server.ThreadingHTTPServer):
   allow_reuse_address=False
   def server_bind(self):
    self.socket.setsockopt(socket.SOL_SOCKET,socket.SO_EXCLUSIVEADDRUSE,1);super().server_bind()
  incumbent=Exclusive(("127.0.0.1",0),Handler);port=incumbent.server_port
  thread=threading.Thread(target=incumbent.serve_forever,kwargs={"poll_interval":0.05});thread.start()
 digest="0"*64 if cid=="wrong_archive_digest" else R["archive_before"][cid]["sha256"]
 argv=[sys.executable,"-I","-B",str(TOOL),"--archive",archive.name,"--sha256",digest,"--output",output.name,"--port",str(port)]
 row["argv"]=argv;row["cwd"]=str(case);row["port"]=port
 try:
  p=subprocess.run(argv,cwd=case,capture_output=True,timeout=20)
  row["exit"]=p.returncode
  for stream in ("stdout","stderr"):
   raw=getattr(p,stream);(case/(stream+".txt")).write_bytes(raw);row[stream]={"text":raw.decode("utf-8","replace"),**pin(raw)}
  check("archive conserved",witness(archive)==R["archive_before"][cid])
  check("packaged code inert",not any(ROOT.rglob("PACKAGED_CODE_EXECUTED")))
  if cid=="intact_unicode":
   check("exit zero",p.returncode==0,row["stderr"])
   received=json.loads((output/"receiving.json").read_text(encoding="utf-8"));row["receipt"]=received
   check("success receipt",received["passed"] is True)
   check("own readiness and exit",received["server"]["ready"] is True and received["server"]["returncode"]==0)
   check("five complete extracted files",received["archive_members"]==5 and received["manifest_payloads"]==4 and received["extracted_files_preserved"]==5)
   check("exact payloads",all((output/"package"/n).read_bytes()==d for n,d in bodies.items()))
   expected_http=[("/",bodies["preview/index.html"])]+[("/"+__import__("urllib.parse",fromlist=["quote"]).quote(n[len("preview/"):],safe="/"),bodies[n]) for n in sorted(bodies) if n.startswith("preview/")]
   actual=received["http"]
   check("four expected HTTP identities",len(actual)==len(expected_http) and all(x["path"]==path and x["status"]==200 and all(x[k]==v for k,v in pin(data).items()) for x,(path,data) in zip(actual,expected_http)))
   check("archive receipt conservation",received["archive_before"]==received["archive_after"] and received["archive_preserved"] is True)
   with socket.socket() as s:s.settimeout(0.5);check("owned listener closed",s.connect_ex(("127.0.0.1",port))!=0)
  elif cid=="occupied_listener":
   check("refused with nonzero exit",p.returncode==1)
   received=json.loads((output/"receiving.json").read_text(encoding="utf-8"));row["receipt"]=received
   check("truthful failed receipt and no HTTP",received["passed"] is False and received["http"]==[] and received["server"]["returncode"]!=0)
   check("incumbent received zero requests",seen==[],seen)
   check("incumbent still alive",thread.is_alive() and incumbent.socket.getsockname()==("127.0.0.1",port))
   check("failed extraction conserved",received["archive_preserved"] is True and received["extracted_files_preserved"]==5 and all((output/"package"/n).read_bytes()==d for n,d in bodies.items()))
  elif cid=="occupied_destination":
   check("refused with nonzero exit",p.returncode==1)
   check("original directory sentinel exact",witness(sentinel)==sentinel_before and sorted(x.name for x in output.iterdir())==["kept.txt"])
   check("no receiver stdout success",not p.stdout and json.loads(p.stderr)["passed"] is False)
  else:
   check("refused with nonzero exit",p.returncode==1)
   check("no output created",not output.exists())
   check("stderr refusal and no stdout",not p.stdout and json.loads(p.stderr)["passed"] is False)
  row["passed"]=True
 except Exception as e:row["passed"]=False;row["error"]=repr(e)
 finally:
  if incumbent:
   incumbent.shutdown();thread.join(timeout=5);incumbent.server_close();row["incumbent_stopped_by_owner"]=not thread.is_alive();row["incumbent_requests"]=list(seen)
  R["cases"].append(row)
  (ROOT/"receiving.partial.json").write_text(json.dumps(R,indent=2,ensure_ascii=True)+"\n",encoding="utf-8")
  print(json.dumps({"case":cid,"passed":row["passed"],"exit":row.get("exit"),"error":row.get("error")}),flush=True)
R["source_after"]=witness(TOOL);R["frozen_after"]=witness(ROOT/"frozen-cases.json");R["archive_after"]={cid:witness(v[1]) for cid,v in fixtures.items()}
R["source_conserved"]=R["source_after"]==source_before
R["criteria_conserved"]=R["frozen_after"]==frozen_before
R["archives_conserved"]=R["archive_after"]==R["archive_before"]
R["passed"]=all(x["passed"] for x in R["cases"]) and len(R["cases"])==6 and R["source_conserved"] and R["criteria_conserved"] and R["archives_conserved"]
R["observer"]=witness(pathlib.Path(__file__))
R["finished_utc"]=datetime.datetime.now(datetime.timezone.utc).isoformat()
(ROOT/"receiving.json").write_text(json.dumps(R,indent=2,ensure_ascii=True)+"\n",encoding="utf-8")
print(json.dumps({"passed":R["passed"],"cases":len(R["cases"]),"passing":sum(x["passed"] for x in R["cases"]),"checks":sum(len(x["checks"]) for x in R["cases"]),"source_conserved":R["source_conserved"],"criteria_conserved":R["criteria_conserved"],"archives_conserved":R["archives_conserved"],"receipt":str(ROOT/"receiving.json")}),flush=True)
sys.exit(0 if R["passed"] else 1)
