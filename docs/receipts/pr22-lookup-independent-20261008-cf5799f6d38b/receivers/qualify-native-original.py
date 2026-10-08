from pathlib import Path
import datetime,hashlib,json,os,subprocess,sys
ROOT=Path(__file__).resolve().parent
label=sys.argv[1];source=ROOT/label
expected=json.loads((ROOT/(label+"-source-manifest.json")).read_bytes())
def sha(raw):return hashlib.sha256(raw).hexdigest()
def drift():return [r["path"] for r in expected["files"] if sha((source/r["path"]).read_bytes())!=r["sha256"]]
if drift():raise RuntimeError("input drift")
env=dict(os.environ);env["npm_config_cache"]=str(ROOT/(label+"-npm-cache"));env["NO_COLOR"]="1";env["CI"]="1"
runs=[]
for name,args in [("tests",["npm","test"]),("build",["npm","run","build"])]:
 started=datetime.datetime.now(datetime.timezone.utc).isoformat()
 with (ROOT/(label+"-"+name+".stdout")).open("xb") as out,(ROOT/(label+"-"+name+".stderr")).open("xb") as err:
  result=subprocess.run(args,cwd=source,env=env,stdout=out,stderr=err)
 row={"command":args,"cwd":str(source),"exit_code":result.returncode,"started_at":started,
      "completed_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),
      "stdout_sha256":sha((ROOT/(label+"-"+name+".stdout")).read_bytes()),
      "stderr_sha256":sha((ROOT/(label+"-"+name+".stderr")).read_bytes()),"source_drift":drift()}
 runs.append(row)
 print(json.dumps({"label":label,"phase":name,"exit_code":result.returncode,"source_drift":row["source_drift"]}),flush=True)
 if result.returncode:break
build=[]
if (source/"dist").exists():
 for file in sorted((source/"dist").rglob("*")):
  if file.is_file():build.append({"path":str(file.relative_to(source)),"bytes":file.stat().st_size,"sha256":sha(file.read_bytes())})
receipt={"schema":"returnby.pr22-independent-native.v1","label":label,"published_commit":expected["published_commit"],
         "published_tree":expected["published_tree"],"native_capture_tree":expected["native_capture_tree"],
         "runs":runs,"build":build,"source_drift":drift(),
         "runtime":{"node":subprocess.check_output(["node","--version"],text=True).strip(),"npm":subprocess.check_output(["npm","--version"],text=True).strip()}}
(ROOT/(label+"-native-receipt.json")).write_text(json.dumps(receipt,indent=2)+"\n")
sys.exit(0 if len(runs)==2 and all(r["exit_code"]==0 and not r["source_drift"] for r in runs) and not receipt["source_drift"] else 1)
