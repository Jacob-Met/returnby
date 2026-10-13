import os,sys,json,hashlib,subprocess,time,socket,selectors,urllib.request,platform
from pathlib import Path
from http.server import HTTPServer,BaseHTTPRequestHandler
base=Path("/Users/me/hamon/receiving/root-d3745-returnby-install")
source=Path("/Users/me/Applications/ReturnBy-Completion-d3745-83abbe9a/serve_returnby.py")
expected="7fa92cf4a00072c714e7367feb09fb7f7e2eaa39cf62c9bbef180b303b6191a2"
def sha(): return hashlib.sha256(source.read_bytes()).hexdigest()
assert sha()==expected and platform.system()=="Darwin" and os.getuid()==501
with socket.socket() as s: s.bind(("127.0.0.1",0)); port=s.getsockname()[1]
driver="import importlib.util,sys; s=importlib.util.spec_from_file_location('r',sys.argv[1]); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); m.PORT=int(sys.argv[2]); sys.argv=[sys.argv[1]]; raise SystemExit(m.main())"
record={"source":str(source),"sha256":sha(),"port":port,"python":sys.version,"host":platform.node(),"uid":os.getuid(),"observations":[]}
p=subprocess.Popen([sys.executable,"-B","-u","-c",driver,str(source),str(port)],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
try:
 sel=selectors.DefaultSelector(); sel.register(p.stdout,selectors.EVENT_READ)
 if not sel.select(6): raise RuntimeError("server did not announce readiness")
 record["first_line"]=p.stdout.readline().strip(); sel.close()
 with urllib.request.urlopen("http://127.0.0.1:%d/index.html"%port,timeout=3) as r: body=r.read(); record["http_status"]=r.status
 record["body_sha256"]=hashlib.sha256(body).hexdigest(); record["body_bytes"]=len(body)
 out,err=p.communicate("\n",timeout=5); record["first_exit"]=p.returncode; record["first_remaining_stdout"]=out; record["first_stderr"]=err
 class Exclusive(HTTPServer): allow_reuse_address=False; allow_reuse_port=False
 started=time.monotonic()
 while True:
  try: probe=Exclusive(("127.0.0.1",port),BaseHTTPRequestHandler)
  except OSError as e:
   record["observations"].append({"seconds":round(time.monotonic()-started,3),"errno":e.errno})
   if time.monotonic()-started>=90: raise
   time.sleep(.25)
  else:
   probe.server_close(); record["non_reuse_bind_after_seconds"]=round(time.monotonic()-started,3); record["passed"]=True; break
except BaseException as e: record["error"]=repr(e); record["passed"]=False
finally:
 if p.poll() is None:
  try: p.communicate("\n",timeout=5)
  except subprocess.TimeoutExpired: p.kill(); p.communicate(timeout=5)
 record["source_unchanged"]=sha()==expected
 (base/"restart-repair/no-reuse-timing-receipt.json").write_text(json.dumps(record,indent=2)+"\n")
 print(json.dumps({k:v for k,v in record.items() if k!="observations"},indent=2),flush=True)
raise SystemExit(0 if record.get("passed") else 1)
