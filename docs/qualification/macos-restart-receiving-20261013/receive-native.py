import os,sys,json,hashlib,subprocess,time,platform
from pathlib import Path
base=Path("/Users/me/hamon/receiving/root-d3745-returnby-install/restart-repair/safe-start")
source=base/"serve_returnby.py"; test=base/"test_foreground_restarts.py"
expected={"serve_returnby.py":"d2bbfaa4440d639bf20e37bc9b0fc3e20d01c643609f1af11d49a57b27e37ac2","test_foreground_restarts.py":"b395f99e7e428b475ab702c710c6f2081db2f4f435ab0c0b246ba88b3d491220"}
def snapshots(): return {n:hashlib.sha256((base/n).read_bytes()).hexdigest() for n in expected}
if snapshots()!=expected: raise ValueError("changed source")
if platform.system()!="Darwin" or os.getuid()!=501: raise ValueError("wrong consumer")
(base/"tmp").mkdir(exist_ok=True)
env={**os.environ,"RETURNBY_SERVER_SOURCE":str(source),"RETURNBY_RECEIVED_DIRECTORY":"/Users/me/Applications/ReturnBy-Completion-d3745-83abbe9a","TMPDIR":str(base/"tmp")}
record={"schema":"returnby.safe-darwin-restart.native.v1","host":platform.node(),"python":sys.version,"source_before":snapshots(),"courses":[]}
jobs=[]
for optimized in (False,True):
 name="optimized" if optimized else "normal"
 stdout=(base/(name+".stdout")).open("wb"); stderr=(base/(name+".stderr")).open("wb")
 command=[sys.executable,"-B"]+(["-O"] if optimized else [])+[str(test)]
 started=time.monotonic(); p=subprocess.Popen(command,stdout=stdout,stderr=stderr,env=env)
 jobs.append((name,p,stdout,stderr,started,command)); print(json.dumps({"course":name,"pid":p.pid}),flush=True)
try:
 for name,p,out,err,start,command in jobs:
  code=p.wait(timeout=290); out.close(); err.close()
  course={"name":name,"pid":p.pid,"command":command,"exit":code,"elapsedSeconds":round(time.monotonic()-start,3),"stdout":(base/(name+".stdout")).read_text(),"stderr":(base/(name+".stderr")).read_text()}
  record["courses"].append(course); print(json.dumps(course),flush=True)
finally:
 for name,p,out,err,start,command in jobs:
  if p.poll() is None: p.terminate(); p.wait(timeout=5)
  out.close(); err.close()
 record["source_after"]=snapshots(); record["source_unchanged"]=record["source_after"]==expected
 record["passed"]=len(record["courses"])==2 and all(c["exit"]==0 for c in record["courses"]) and record["source_unchanged"]
 (base/"native-receipt.json").write_text(json.dumps(record,indent=2)+"\n")
raise SystemExit(0 if record["passed"] else 1)
