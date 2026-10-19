from pathlib import Path
import difflib,hashlib,json,os,subprocess
ROOT=Path(__file__).resolve().parent
spec=json.loads((ROOT/"day-input.json").read_bytes());base=json.loads((ROOT/"pr22-source-manifest.json").read_bytes())
tree=json.loads((ROOT/"published-trees.json").read_bytes())["pr22"]
def sha(b):return hashlib.sha256(b).hexdigest()
def blob(b):return hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()
def need(v,msg):
 if not v:raise RuntimeError(msg)
def merkle(rows):
 root={}
 for row in rows:
  node=root;parts=row["path"].split("/")
  for part in parts[:-1]:node=node.setdefault(part,{})
  node[parts[-1]]=(row["mode"],row["sha"])
 def walk(node):
  raw=b""
  for name,value in sorted(node.items(),key=lambda pair:(pair[0]+("/" if isinstance(pair[1],dict) else "")).encode()):
   mode,digest=("40000",walk(value)) if isinstance(value,dict) else value
   raw+=mode.encode()+b" "+name.encode()+b"\0"+bytes.fromhex(digest)
  return hashlib.sha1(b"tree "+str(len(raw)).encode()+b"\0"+raw).hexdigest()
 return walk(root)
published=[r for r in tree["tree"] if r["type"]=="blob"]
need(merkle(published)==tree["sha"],"original full-tree calculation differs")
raw_main=spec["main_source"]["content"].encode()
need(blob(raw_main)==spec["main_source"]["sha"],"day owner main mismatch")
import_line="import { startDayRefresh } from './day-refresh';\n"
callback=raw_main.decode().split("startDayRefresh(() => {",1)[1]
callback="startDayRefresh(() => {"+callback
need(callback.endswith("});\n") and callback.count("startDayRefresh(")==1,"owner callback boundary")
old={(r["path"]):(ROOT/"pr22"/r["path"]).read_bytes() for r in base["files"]}
for r in base["files"]:need(sha(old[r["path"]])==r["sha256"],("PR22 source drift",r["path"]))
need(import_line not in old["src/main.ts"].decode(),"day callback already received")
anchor="import { dueDate, daysLeft, status, todayISO } from './deadline';\n"
need(old["src/main.ts"].decode().count(anchor)==1,"import seam mismatch")
main_before=old["src/main.ts"].decode().replace(anchor,anchor+import_line)+callback
fixture=Path(spec["prior_fixture"]["source"]).read_bytes()
need(blob(fixture)=="7c7a426fc97a6c857abd5a04f31009259ee7669a" and sha(fixture)=="5549b3a48a0515d2963fd6d5f1137ae4711a8d30ce52408f3fd42e0e54664690","prior lifecycle fixture mismatch")
need(blob(old["tests/helpers/storage-fixture.mjs"])==spec["prior_fixture"]["preimage"],"fixture preimage mismatch")
before=dict(old);before["src/main.ts"]=main_before.encode();before["tests/helpers/storage-fixture.mjs"]=fixture
for row in spec["additional_files"]:
 raw=(Path(spec["source"])/row["path"]).read_bytes()
 need(len(raw)==row["size"] and blob(raw)==row["sha"],("day source mismatch",row["path"]))
 before[row["path"]]=raw
needle="focused?.hasAttribute('data-del') ? 'del' : undefined"
replacement="focused?.hasAttribute('data-del') ? 'del' : focused?.hasAttribute('data-edit') ? 'edit' : undefined"
need(main_before.count(needle)==1,"focus seam mismatch")
after=dict(before);after["src/main.ts"]=main_before.replace(needle,replacement).encode()
need(len(after["src/main.ts"])-len(before["src/main.ts"])==46,"focus byte delta")
p="".join(difflib.unified_diff(before["src/main.ts"].decode().splitlines(True),after["src/main.ts"].decode().splitlines(True),fromfile="a/src/main.ts",tofile="b/src/main.ts"))
(ROOT/"edit-focus-on-pr22-day.patch").write_text(p)
summaries=[]
for label,bodies in [("pr22-day-before",before),("pr22-day-focus",after)]:
 target=ROOT/label;target.mkdir();files=[]
 for path,raw in bodies.items():
  out=target/path;out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(raw);os.chmod(out,0o644)
  files.append({"path":path,"bytes":len(raw),"sha256":sha(raw),"git_blob":blob(raw),"mode":"100644"})
 subprocess.run(["git","init","-q"],cwd=target,check=True)
 subprocess.run(["git","add","--all"],cwd=target,check=True)
 captured=subprocess.check_output(["git","write-tree"],cwd=target,text=True).strip()
 deps=target/"node_modules";deps.mkdir()
 for item in (ROOT/"pr22"/"node_modules").iterdir():
  if item.name in {".vite",".cache",".vite-temp"}:continue
  (deps/item.name).symlink_to(item.resolve(),target_is_directory=item.is_dir())
 leaves={r["path"]:r for r in published};changes=[]
 for row in files:
  if row["path"] not in leaves or leaves[row["path"]]["sha"]!=row["git_blob"]:
   changes.append({"path":row["path"],"preimage":leaves.get(row["path"],{}).get("sha"),"postimage":row["git_blob"]})
   leaves[row["path"]]={"path":row["path"],"mode":row["mode"],"type":"blob","sha":row["git_blob"]}
 fulltree=merkle(list(leaves.values()))
 result={"schema":"returnby.pr22-day-native-composition.v1","label":label,"root":str(target),"published_commit":base["published_commit"],"published_tree":base["published_tree"],
         "main_day_commit":spec["main_commit"],"native_capture_tree":captured,"calculated_full_receiving_tree":fulltree,"receiving_tree_is_unpublished":True,
         "files":files,"changes_from_pr22":changes,"unchanged_published_leaves":len(published)-sum(c["preimage"] is not None for c in changes)}
 (ROOT/(label+"-source-manifest.json")).write_text(json.dumps(result,indent=2)+"\n")
 summaries.append({k:result[k] for k in ["label","native_capture_tree","calculated_full_receiving_tree","changes_from_pr22","unchanged_published_leaves"]})
need([p for p in before if before[p]!=after[p]]==["src/main.ts"],"unexpected focus scope")
summary={"compositions":summaries,"original_main_day_sha256":sha(raw_main),"same_original_callback_received":True,
         "fixed_existing_source_paths":["src/main.ts"],"focus_added_bytes":46,"patch_sha256":sha(p.encode()),
         "fixture_scope":"Unchanged historical lifecycle-only inert test fixture; no live browser or application substitute."}
(ROOT/"day-composition.json").write_text(json.dumps(summary,indent=2)+"\n")
print(json.dumps(summary))
