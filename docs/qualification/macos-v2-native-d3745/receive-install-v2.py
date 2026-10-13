from pathlib import Path
import datetime,hashlib,json,os,platform,subprocess,sys
root=Path("/Users/me/hamon/receiving/root-d3745-returnby-install")
stage=root/"v2"; app=Path("/Users/me/Applications/ReturnBy-Completion-V2-d3745-83abbe9a")
original=Path("/Users/me/Applications/ReturnBy-Completion-d3745-83abbe9a")
archive=root/"source/received-returnby-83abbe9a.zip"; recovery=stage/"recovery-copy"
pins={"install_macos.py":"a8190f86a0534348e1453aaabc661b1dca5788c64a1ba71fb73942bd0a0173d3","serve_returnby.py":"d2bbfaa4440d639bf20e37bc9b0fc3e20d01c643609f1af11d49a57b27e37ac2"}
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def snap(p):return {str(f.relative_to(p)):{"bytes":f.stat().st_size,"sha256":digest(f),"mode":f.stat().st_mode&511} for f in sorted(p.rglob("*")) if f.is_file()}
def check(condition,message):
 if not condition:raise RuntimeError(message)
record={"schema":"returnby.actual-macos-v2-installation.v1","utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"source_commit":"7eb25c1013807e8a6f9f8e4bb374344b8801908e","source_tree":"19145f3eccfd120c1cc0a22fc667d999b6c4b292","host":platform.node(),"uid":os.getuid(),"python":sys.version,"application":str(app),"recovery_copy":str(recovery),"commands":[]}
before=snap(original);record["original_before"]=before
def run(arguments):
 p=subprocess.Popen([sys.executable,"-B",*map(str,arguments)],cwd=stage,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
 out,err=p.communicate(timeout=30)
 r={"pid":p.pid,"argv":arguments,"exit":p.returncode,"stdout":out,"stderr":err};record["commands"].append(r)
 check(p.returncode==0,"receiving command failed")
 value=json.loads(out);check(value.get("accepted") is True,"checker did not accept")
 return value
try:
 check(platform.system()=="Darwin" and os.getuid()==501 and platform.node()=="Mac.lan","wrong device")
 check(all(digest(stage/n)==h for n,h in pins.items()),"wrong installer/runtime")
 check(archive.stat().st_size==260719 and digest(archive)=="816e8d09fbecc27ffeb189aa3c889e48e5bc81f352ccc5b75f5cb9bd64badd71","wrong original archive")
 check(not os.path.lexists(app) and not os.path.lexists(recovery),"new destinations already exist")
 record["installation"]=run([str(stage/"install_macos.py"),"--archive",str(archive),"--destination",str(app)])
 record["installed_check"]=run([str(app/"recovery/install_macos.py"),"--check",str(app)])
 record["recovery_installation"]=run([str(app/"recovery/install_macos.py"),"--archive",str(app/"recovery/received-build.zip"),"--destination",str(recovery)])
 record["recovery_check"]=run([str(recovery/"recovery/install_macos.py"),"--check",str(recovery)])
 record["original_check"]=run([str(original/"recovery/install_macos.py"),"--check",str(original)])
 record["installed_files"]=snap(app);record["recovery_files"]=snap(recovery)
 check(len(record["installed_files"])==21 and len(record["recovery_files"])==21,"unexpected installed file set")
 check(digest(app/"serve_returnby.py")==pins["serve_returnby.py"],"runtime changed")
 check(digest(app/"recovery/original-serve_returnby.py")=="7fa92cf4a00072c714e7367feb09fb7f7e2eaa39cf62c9bbef180b303b6191a2","original runtime lost")
 record["passed"]=True
except Exception as e:record["passed"]=False;record["error"]=repr(e)
finally:
 record["original_after"]=snap(original);record["original_unchanged"]=before==record["original_after"]
 record["source_unchanged"]=all(digest(stage/n)==h for n,h in pins.items())
 record["passed"]=record.get("passed",False) and record["original_unchanged"] and record["source_unchanged"]
 (stage/"installation-receipt.json").write_text(json.dumps(record,indent=2)+"\n")
 print(json.dumps({k:v for k,v in record.items() if k not in ("original_before","original_after","installed_files","recovery_files","commands")},indent=2),flush=True)
raise SystemExit(0 if record["passed"] else 1)
