import functools, hashlib, http.server, json, os, pathlib, platform, subprocess, sys, threading, time, traceback
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).parent
variant=sys.argv[1]
if variant not in ("original","candidate"): raise SystemExit("Choose original or candidate")
SOURCE=ROOT/variant
OUT=ROOT/(variant+"-consumer")
OUT.mkdir(exist_ok=False)
CRITERIA=ROOT/"consumer-criteria.json"
c=json.loads(CRITERIA.read_text())
expected=json.loads((ROOT/("expected.json" if variant=="original" else "candidate-expected.json")).read_text())
receipt={"schema":"returnby-intake-consumer-v1","variant":variant,"started_utc":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),"source":expected,"criteria_sha256":hashlib.sha256(CRITERIA.read_bytes()).hexdigest(),"observer_sha256":hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),"device":{"node":platform.node(),"uid":os.getuid(),"python":platform.python_version()},"checks":[],"observations":[],"commands":[],"requests":[],"page_errors":[],"browser_disconnected":False}
def check(name,ok,detail=None):
    receipt["checks"].append({"name":name,"pass":bool(ok),"detail":detail})
    if not ok: raise RuntimeError(name)
def gid(data): return hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()
def snapshot():
    records=[]
    for r in expected["files"]:
        p=SOURCE/r["path"];data=p.read_bytes();st=p.stat()
        if gid(data)!=r["sha"] or len(data)!=r["size"]: raise RuntimeError("Wrong source "+r["path"])
        records.append({"path":r["path"],"sha":r["sha"],"mode":oct(st.st_mode&0o777),"mtime_ns":st.st_mtime_ns,"inode":st.st_ino})
    return records
def run(argv):
    t=time.monotonic();p=subprocess.run(argv,cwd=SOURCE,capture_output=True,timeout=180)
    row={"argv":argv,"exit":p.returncode,"seconds":round(time.monotonic()-t,3)}
    for key in ("stdout","stderr"):
        data=getattr(p,key);path=OUT/("build-"+str(len(receipt["commands"]))+"."+key+".txt");path.write_bytes(data)
        row[key]={"path":path.name,"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest()}
    receipt["commands"].append(row)
    check("build command "+str(len(receipt["commands"])),p.returncode==0,row)
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=None
browser=None
before=None
try:
    before=snapshot()
    run(["node",str(ROOT/"node_modules/typescript/bin/tsc"),"--noEmit"])
    run(["node",str(ROOT/"node_modules/vite/bin/vite.js"),"build"])
    server=http.server.ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=str(SOURCE/"dist")))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    origin="http://127.0.0.1:"+str(server.server_port)
    receipt["origin"]=origin
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless=True)
        browser.on("disconnected",lambda:receipt.__setitem__("browser_disconnected",True))
        receipt["browser_version"]=browser.version
        context=browser.new_context(viewport=c["browser_scope"]["desktop"],timezone_id="UTC")
        blocked=[]
        def route(r):
            if r.request.url.startswith(origin+"/"): r.continue_()
            else: blocked.append(r.request.url);r.abort()
        context.route("**/*",route)
        page=context.new_page()
        page.on("request",lambda r:receipt["requests"].append({"url":r.url,"method":r.method}))
        page.on("pageerror",lambda e:receipt["page_errors"].append(str(e)))
        page.goto(origin+"/",wait_until="networkidle")
        sentinel={"id":"frozen-existing-return","merchant":"Existing Fictional Store","orderNo":"OLD-ONLY","total":"$11.00","orderDate":"2026-09-01","windowDays":30,"windowSource":"default","createdAt":"2026-09-01T10:00:00.000Z"}
        stored=json.dumps([sentinel],separators=(",",":"))
        page.evaluate("(v)=>localStorage.setItem('returnby.v1',v)",stored)
        page.reload(wait_until="networkidle")
        def storage(): return page.evaluate("localStorage.getItem('returnby.v1')")
        def fields(): return page.locator("#preview input").evaluate_all("(xs)=>Object.fromEntries(xs.map(x=>[x.name,x.value]))")
        def fill(name,value): page.locator("#preview [name="+name+"]").fill(value)
        def feature(name,due=None,prompt=False):
            out=page.locator("#intake-deadline")
            count=out.count();value=out.inner_text() if count else None
            receipt["observations"].append({"name":name,"output_count":count,"text":value,"fields":fields()})
            if variant=="original": check(name+" original feature absent",count==0)
            elif due is not None: check(name+" calculated date",count==1 and value==c["candidate_contract"]["valid_prefix"]+due,value)
            else: check(name+" no invented date",count==1 and value and not __import__("re").search(r"\d{4}-\d{2}-\d{2}",value),value)
        page.locator("#paste").fill(c["fixture"]);page.locator("#find").click()
        check("review visible",page.locator("#preview").is_visible())
        check("recognized fixture",fields()=={"merchant":"Northwind Outfitters","orderDate":"2026-10-13","orderNo":"NW-INTAKE-7001","total":"$42.50","windowDays":"30"},fields())
        initial=fields()
        feature("initial","2026-11-12")
        for index,case in enumerate(c["ordinary_dates"]):
            fill("orderDate",case["date"]);fill("windowDays",case["days"])
            feature("ordinary "+str(index),case["due"])
            now=fields()
            check("ordinary "+str(index)+" other fields untouched",all(now[k]==initial[k] for k in ("merchant","orderNo","total")))
        fill("merchant","Northwind Review");fill("orderNo","NW-INTAKE-7001-EDIT");fill("total","$52.75")
        feature("nondatelike edits","2026-11-02")
        check("typing never saved",storage()==stored)
        check("typing retained pasted confirmation",page.locator("#paste").input_value()==c["fixture"])
        focused=page.locator("#preview [name=total]").evaluate("(e)=>e===document.activeElement")
        check("output update did not move focus",focused)
        fill("orderDate","");feature("missing date",prompt=True)
        if variant=="candidate": check("date guidance",page.locator("#intake-deadline").inner_text()==c["candidate_contract"]["date_prompt"])
        fill("orderDate","2026-10-13")
        for days in c["invalid_windows"]:
            fill("windowDays",days);feature("invalid window "+repr(days),prompt=True)
        check("invalid review never saved",storage()==stored)
        page.locator("#preview [name=windowDays]").evaluate("(e)=>{e.value='14';e.dispatchEvent(new Event('change',{bubbles:true}));}")
        feature("change event","2026-10-27")
        page.locator("#find").click()
        feature("repeat Find","2026-11-12")
        check("repeat Find preserved parsed input values",fields()==initial)
        for index,due in enumerate(c["sample_due_dates"]):
            page.locator("#sample").click();feature("sample "+str(index),due,prompt=due is None)
        check("sample review never saved",storage()==stored)
        page.locator("#paste").fill(c["fixture"]);page.locator("#find").click()
        final=c["final_save"]
        for name,value in [("orderDate",final["date"]),("windowDays",final["days"]),("merchant",final["merchant"]),("orderNo",final["orderNo"]),("total",final["total"])]: fill(name,value)
        feature("before Save",final["due"])
        before_save_fields=fields()
        page.locator("#preview").scroll_into_view_if_needed()
        page.screenshot(path=str(OUT/"desktop-review.png"),full_page=True)
        page.set_viewport_size(c["browser_scope"]["narrow"]);page.locator("#preview").scroll_into_view_if_needed()
        page.screenshot(path=str(OUT/"narrow-review.png"),full_page=True)
        check("390px document bounds",page.evaluate("document.documentElement.scrollWidth<=innerWidth"),page.evaluate("({width:innerWidth,scrollWidth:document.documentElement.scrollWidth})"))
        if variant=="candidate":
            box=page.locator("#intake-deadline").bounding_box()
            check("390px output readable within page",box and box["x"]>=0 and box["x"]+box["width"]<=391,box)
        check("all review steps conserved saved storage",storage()==stored)
        page.locator("#preview button[type=submit]").click()
        saved=json.loads(storage())
        check("one Save added one record",len(saved)==2)
        check("preexisting record unchanged",saved[0]==sentinel)
        check("saved review fields exact",all(saved[1][key]==value for key,value in {"merchant":final["merchant"],"orderNo":final["orderNo"],"total":final["total"],"orderDate":final["date"],"windowDays":int(final["days"]),"windowSource":"user"}.items()),saved[1])
        check("saved-card date agrees",page.locator("#list .card").filter(has_text=final["orderNo"]).locator(".return-by").inner_text()=="RETURN BY "+final["due"])
        check("Save retains existing behavior",page.locator("#preview").is_hidden() and page.locator("#paste").input_value()=="")
        receipt["saved_records"]=saved
        receipt["before_save_fields"]=before_save_fields
        check("no outside requests",not blocked,blocked)
        check("no page errors",not receipt["page_errors"],receipt["page_errors"])
        context.close();browser.close();browser=None
    check("managed browser disconnected",receipt["browser_disconnected"])
    receipt["pass"]=True
except Exception as e:
    receipt["pass"]=False;receipt["error"]=str(e);receipt["traceback"]=traceback.format_exc()
finally:
    if browser:
        try: browser.close()
        except Exception as e: receipt["browser_close_error"]=str(e)
    if server: server.shutdown();server.server_close()
    if before:
        try:
            receipt["source_preserved"]=snapshot()==before
            if not receipt["source_preserved"]: receipt["pass"]=False
        except Exception as e: receipt["source_error"]=str(e);receipt["pass"]=False
    receipt["os_browser_exit_code"]=None
    receipt["finished_utc"]=time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime())
    (OUT/"receiving.json").write_text(json.dumps(receipt,indent=2)+"\n")
    print(json.dumps({"variant":variant,"pass":receipt.get("pass"),"checks":len(receipt["checks"]),"error":receipt.get("error"),"source_preserved":receipt.get("source_preserved"),"browser_disconnected":receipt["browser_disconnected"]}))
sys.exit(0 if receipt.get("pass") else 1)
