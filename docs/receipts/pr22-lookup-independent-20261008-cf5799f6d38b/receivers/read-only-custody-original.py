from pathlib import Path
import datetime,difflib,hashlib,json,os,subprocess
ROOT=Path("/tmp/returnby-pr22-review-cf5799f6d38b-p3exbdk4").resolve()
def sha(b):return hashlib.sha256(b).hexdigest()
def blob(b):return hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()
def need(v,m):
 if not v:raise RuntimeError(m)
def identity(p):
 b=p.read_bytes();return {"bytes":len(b),"sha256":sha(b),"git_blob":blob(b)}
def tree_of(folder,rows):
 nodes={}
 for r in rows:
  path=r["path"].split("/");node=nodes
  for part in path[:-1]:node=node.setdefault(part,{})
  node[path[-1]]=bytes.fromhex(blob((folder/r["path"]).read_bytes()))
 def encode(node):
  raw=b""
  for name,value in sorted(node.items(),key=lambda x:(x[0]+("/" if isinstance(x[1],dict) else "")).encode()):
   if isinstance(value,dict):mode="40000";digest=encode(value)
   else:mode="100644";digest=value
   raw+=mode.encode()+b" "+name.encode()+b"\0"+digest
  return hashlib.sha1(b"tree "+str(len(raw)).encode()+b"\0"+raw).digest()
 return encode(nodes).hex()
derived={}
labels=["pr20","pr22","pr22-day-before","pr22-day-focus"];source=[]
for label in labels:
 m=json.loads((ROOT/(label+"-source-manifest.json")).read_bytes());folder=ROOT/label
 bad=[r["path"] for r in m["files"] if identity(folder/r["path"])!={k:r[k] for k in ("bytes","sha256","git_blob")} or (folder/r["path"]).stat().st_mode&0o777!=0o644]
 capture=tree_of(folder,m["files"])
 need(not bad and capture==m["native_capture_tree"],("source drift",label,bad))
 native=json.loads((ROOT/(label+"-native-receipt.json")).read_bytes())
 need(len(native["runs"])==2 and all(r["exit_code"]==0 and not r["source_drift"] for r in native["runs"]),("native failure",label))
 for item in native["build"]:need(identity(folder/item["path"])["sha256"]==item["sha256"],("build drift",label,item["path"]))
 source.append({"label":label,"checked_source_files":len(m["files"]),"native_capture_tree":capture,"source_drift":[],"build_drift":[],"native_runs":native["runs"]})
a=(ROOT/"independent_search_actions_original.mjs").read_bytes();b=(ROOT/"independent_search_actions_pr22.mjs").read_bytes()
need(sha(a)=="ce03920bc7c06064bd5d418f315505122517e6ba2e51c63900fe81ebfabc21cc","original action receiver")
need(a.count(b"#order-search-status")==1 and a.replace(b"#order-search-status",b"#search-status")==b,"selector adaptation altered scenario")
need(sha(b)=="788d7f1d62bc47604f923df2b4f185c093446c50b39167181344f34303ce19f9","adapted receiver")
need(sha((ROOT/"independent_edit_focus_original.mjs").read_bytes())=="0ceed3763257d418ddeacefa7088de8c46ab13de6c16b1305d55014b87f378e1","frozen focus receiver")
def patch(x,y,name):return "".join(difflib.unified_diff(x.decode().splitlines(True),y.decode().splitlines(True),fromfile="a/"+name,tofile="b/"+name))
derived["pr22-status-selector.patch"]=patch(a,b,"independent_search_actions.mjs")
derived["receive-main-day.patch"]=patch((ROOT/"pr22/src/main.ts").read_bytes(),(ROOT/"pr22-day-before/src/main.ts").read_bytes(),"src/main.ts")
derived["lifecycle-test-fixture.patch"]=patch((ROOT/"pr22/tests/helpers/storage-fixture.mjs").read_bytes(),(ROOT/"pr22-day-before/tests/helpers/storage-fixture.mjs").read_bytes(),"tests/helpers/storage-fixture.mjs")
before={r["path"]:r for r in json.loads((ROOT/"pr22-day-before-source-manifest.json").read_bytes())["files"]}
after={r["path"]:r for r in json.loads((ROOT/"pr22-day-focus-source-manifest.json").read_bytes())["files"]}
need(set(before)==set(after) and [p for p in before if before[p]["sha256"]!=after[p]["sha256"]]==["src/main.ts"],"extra correction change")
need(after["src/main.ts"]["bytes"]-before["src/main.ts"]["bytes"]==46,"correction length")
browsers=[];expected=[("browser-pr22-actions","pr22",4,0),("browser-pr22-day-before-focus","pr22-day-before",0,2),("browser-pr22-day-focus-focus","pr22-day-focus",2,0),("browser-pr22-day-focus-actions","pr22-day-focus",4,0)]
for name,label,passed,failed in expected:
 r=json.loads((ROOT/name/"receipt.json").read_bytes());native=json.loads((ROOT/(label+"-native-receipt.json")).read_bytes())
 need((r["passed"],r["failed"])==(passed,failed) and not r["errors"] and not r["external"],("browser receiving differs",name))
 need(r["tree"]==native["native_capture_tree"],("browser source tree",name))
 artifacts={x["path"]:x for x in native["build"]}
 for entry in r["server"]:
  rel="dist/index.html" if entry["path"]=="/" else "dist"+entry["path"]
  need(rel in artifacts and entry["sha256"]==artifacts[rel]["sha256"] and entry["bytes"]==artifacts[rel]["bytes"],("served build mismatch",name,rel))
 browsers.append({"name":name,"label":label,"passed":passed,"failed":failed,"receiver_sha256":r["receiver_sha256"],"runtime":r["runtime"],"served_build_matches":True,"receipt":identity(ROOT/name/"receipt.json")})
versions={}
for name in ["typescript","vite","vitest"]:
 path=ROOT/"pr22/node_modules"/name/"package.json";versions[name]={"version":json.loads(path.read_bytes())["version"],"realpath":str(path.resolve()),"sha256":sha(path.read_bytes())}
fulltrees=json.loads((ROOT/"published-trees.json").read_bytes())
leaves={name:{"tree":tree["sha"],"truncated":tree["truncated"],"leaves":[{k:r[k] for k in ("path","mode","type","sha")} for r in tree["tree"] if r["type"]=="blob"]} for name,tree in fulltrees.items()}
published_identity={n:{"tree":v["tree"],"leaf_count":len(v["leaves"])} for n,v in leaves.items()}
result={"schema":"returnby.pr22-final-native-readback.v1","completed_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"source_checks":source,"browser_checks":browsers,"package_versions":versions,"correction_only_path":"src/main.ts","correction_bytes":46,"other_corrected_capture_files_unchanged":68,"selector_transport_only":True,"owner_implementation_modified":False,"github_writes":False}


files=["ownership.json","day-composition.json","edit-focus-on-pr22-day.patch","independent_search_actions_original.mjs","independent_search_actions_pr22.mjs","independent_edit_focus_original.mjs","late-process-observations.json","temporary-profile-cleanup.json","qualify.py","compose-day.py","day-input.json"]
for label in labels:
 files.extend([label+"-source-manifest.json",label+"-native-receipt.json",label+"-tests.stdout",label+"-build.stdout"])
for name,label,passed,failed in expected:files.append(name+"/receipt.json")
files.append("browser-pr22-day-before-focus.stdout")
for name in ["HANDOFF.md","HANDOFF-v2.md","documentation-write-observation.json","freeze-review.py","freeze-review.stdout","freeze-review.stderr"]:
 p=ROOT/name
 if p.exists():files.append(name)
transfer=[{"path":p,**identity(ROOT/p)} for p in files]
print(json.dumps({"schema":"returnby.pr22-readonly-custody-transfer.v1","final_readback":result,"published_identity":published_identity,"derived":derived,"transfer":transfer,"packaging_failed_attempt":{p:(ROOT/p).read_text() for p in ["freeze-review.stdout","freeze-review.stderr"] if (ROOT/p).exists()}},separators=(",",":")))
