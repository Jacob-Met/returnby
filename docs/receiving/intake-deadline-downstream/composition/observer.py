import functools,hashlib,http.server,io,json,os,pathlib,platform,subprocess,sys,tarfile,threading,time,traceback
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).parent
SOURCE=ROOT/"combined"
OUT=ROOT/"combined-consumer"
OUT.mkdir(exist_ok=False)
expected=json.loads((ROOT/"combined-expected.json").read_text())
receipt={"schema":"returnby-preview-card-wrap-composition-v1","source":expected,"started_utc":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),"device":{"node":platform.node(),"uid":os.getuid(),"python":platform.python_version()},"checks":[],"commands":[],"requests":[],"page_errors":[],"browser_disconnected":False}
def require(name,ok,detail=None):
 receipt["checks"].append({"name":name,"pass":bool(ok),"detail":detail})
 if not ok:raise RuntimeError(name)
def gitid(data):return hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()
def inventory():
 rows=[]
 for x in expected["files"]:
  p=SOURCE/x["path"];d=p.read_bytes();st=p.stat()
  if gitid(d)!=x["sha"] or len(d)!=x["size"]:raise RuntimeError("source mismatch "+x["path"])
  rows.append({"path":x["path"],"sha":x["sha"],"bytes":len(d),"mode":st.st_mode,"mtime_ns":st.st_mtime_ns,"inode":st.st_ino})
 return rows
def run(argv):
 p=subprocess.run(argv,cwd=SOURCE,capture_output=True,timeout=180)
 row={"argv":argv,"exit":p.returncode}
 for stream in ("stdout","stderr"):
  d=getattr(p,stream);name="build-"+str(len(receipt["commands"]))+"."+stream+".txt";(OUT/name).write_bytes(d)
  row[stream]={"path":name,"bytes":len(d),"sha256":hashlib.sha256(d).hexdigest()}
 receipt["commands"].append(row);require("build "+str(len(receipt["commands"])),p.returncode==0,row)
server=None;browser=None;before=None
try:
 archive=(ROOT/"combined-source.tar.gz").read_bytes()
 receipt["archive"]={"bytes":len(archive),"sha256":hashlib.sha256(archive).hexdigest()}
 wanted={x["path"]:x for x in expected["files"]};received={}
 with tarfile.open(fileobj=io.BytesIO(archive),mode="r:gz") as tf:
  for m in tf.getmembers():
   if m.isdir():continue
   if not m.isfile():raise RuntimeError("nonregular archive member")
   name=m.name.split("/",1)[1]
   if name in received:raise RuntimeError("duplicate archive member")
   received[name]=tf.extractfile(m).read()
 require("complete published file set",set(received)==set(wanted))
 SOURCE.mkdir(exist_ok=False)
 for name,d in received.items():
  require("admit "+name,len(d)==wanted[name]["size"] and gitid(d)==wanted[name]["sha"])
  p=SOURCE/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(d);p.chmod(0o644)
 before=inventory();receipt["source_before"]=before
 run(["node",str(ROOT/"node_modules/typescript/bin/tsc"),"--noEmit"])
 run(["node",str(ROOT/"node_modules/vite/bin/vite.js"),"build"])
 class Quiet(http.server.SimpleHTTPRequestHandler):
  def log_message(self,*args):pass
 server=http.server.ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=str(SOURCE/"dist")))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 origin="http://127.0.0.1:"+str(server.server_port);receipt["origin"]=origin
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless=True)
  browser.on("disconnected",lambda:receipt.__setitem__("browser_disconnected",True))
  receipt["browser_version"]=browser.version
  context=browser.new_context(viewport={"width":1280,"height":960},timezone_id="UTC")
  blocked=[]
  def route(r):
   if r.request.url.startswith(origin+"/"):r.continue_()
   else:blocked.append(r.request.url);r.abort()
  context.route("**/*",route)
  page=context.new_page()
  page.on("request",lambda r:receipt["requests"].append({"url":r.url,"method":r.method}))
  page.on("pageerror",lambda e:receipt["page_errors"].append(str(e)))
  page.goto(origin+"/",wait_until="networkidle")
  long={"id":"long-label-composition","merchant":"FictionalStore"+"M"*180,"orderNo":"REFERENCE"+"R"*220,"total":"$42.50","orderDate":"2026-10-13","windowDays":30,"windowSource":"user","createdAt":"2026-10-13T00:00:00.000Z"}
  stored=json.dumps([long],separators=(",",":"));page.evaluate("(v)=>localStorage.setItem('returnby.v1',v)",stored);page.reload(wait_until="networkidle")
  def saved():return page.evaluate("localStorage.getItem('returnby.v1')")
  for width in (1280,390):
   page.set_viewport_size({"width":width,"height":960})
   require(str(width)+" full store text",page.locator("#list .order-head strong").inner_text()==long["merchant"])
   require(str(width)+" full reference text",page.locator("#list .order-head .mono").inner_text()=="#"+long["orderNo"])
   bounds=page.evaluate("({viewport:innerWidth,document:document.documentElement.scrollWidth,card:document.querySelector('#list .card').getBoundingClientRect().toJSON(),label:document.querySelector('#list .order-head>div').getBoundingClientRect().toJSON()})")
   require(str(width)+" document fits",bounds["document"]<=width,bounds)
   require(str(width)+" label fits card",bounds["label"]["x"]>=bounds["card"]["x"] and bounds["label"]["right"]<=bounds["card"]["right"]+1,bounds)
   require(str(width)+" storage unchanged",saved()==stored)
  fixture=json.loads((ROOT/"consumer-criteria.json").read_text())["fixture"]
  page.locator("#paste").fill(fixture);page.locator("#find").click()
  require("preview present after CSS composition",page.locator("#intake-deadline").inner_text()=="Calculated return-by date: 2026-11-12")
  page.locator("#preview [name=orderDate]").fill("2026-11-01");page.locator("#preview [name=windowDays]").fill("1")
  require("preview updates beside wrapped saved card",page.locator("#intake-deadline").inner_text()=="Calculated return-by date: 2026-11-02")
  require("preview retains long saved record",saved()==stored)
  require("preview retained paste",page.locator("#paste").input_value()==fixture)
  require("preview retained focus",page.locator("#preview [name=windowDays]").evaluate("(e)=>e===document.activeElement"))
  box=page.locator("#intake-deadline").bounding_box()
  require("390px preview fits",box and box["x"]>=0 and box["x"]+box["width"]<=391,box)
  page.screenshot(path=str(OUT/"combined-390.png"),full_page=True)
  page.locator("#preview button[type=submit]").click()
  rows=json.loads(saved())
  require("Save preserves long original and adds review",len(rows)==2 and rows[0]==long)
  require("Save agrees with preview",page.locator("#list .card").filter(has_text="NW-INTAKE-7001").locator(".return-by").inner_text()=="RETURN BY 2026-11-02")
  require("390px saved list fits",page.evaluate("document.documentElement.scrollWidth<=innerWidth"))
  receipt["saved_records"]=rows
  require("no outside requests",not blocked,blocked);require("no page errors",not receipt["page_errors"])
  context.close();browser.close();browser=None
 require("managed browser disconnected",receipt["browser_disconnected"])
 receipt["passed"]=True
except Exception as e:
 receipt["passed"]=False;receipt["error"]=str(e);receipt["traceback"]=traceback.format_exc()
finally:
 if browser:
  try:browser.close()
  except Exception as e:receipt["close_error"]=str(e)
 if server:server.shutdown();server.server_close()
 if before:
  receipt["source_after"]=inventory();receipt["source_preserved"]=receipt["source_after"]==before
  if not receipt["source_preserved"]:receipt["passed"]=False
 receipt["observer_sha256"]=hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()
 receipt["os_browser_exit_code"]=None
 receipt["finished_utc"]=time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime())
 (OUT/"receiving.json").write_text(json.dumps(receipt,indent=2)+"\n")
 print(json.dumps({"passed":receipt.get("passed"),"checks":len(receipt["checks"]),"file_admissions":len(received) if "received" in globals() else 0,"error":receipt.get("error"),"source_preserved":receipt.get("source_preserved")}))
sys.exit(0 if receipt.get("passed") else 1)
