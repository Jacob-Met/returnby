from pathlib import Path
import hashlib,json,os,platform,queue,socket,subprocess,sys,threading,time,urllib.request
root=Path('/Users/me/hamon/receiving/root-d3745-returnby-install')
app=Path('/Users/me/Applications/ReturnBy-Completion-V2-d3745-83abbe9a')
out=root/'v2/launcher-browser-receiving';out.mkdir(exist_ok=False)
(out/'tmp').mkdir();os.environ['TMPDIR']=str(out/'tmp')
runtime=Path('/Users/me/hamon-returnby-choices-9785663a4318/py-runtime')
sys.path.insert(0,str(runtime))
from playwright.sync_api import sync_playwright
import importlib.metadata
def snap():return {str(p.relative_to(app)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'mode':p.stat().st_mode&511} for p in sorted(app.rglob('*')) if p.is_file()}
before=snap();checks=[]
def check(name,actual,expected):
    if actual!=expected:raise RuntimeError(name+': '+repr(actual)+' != '+repr(expected))
    checks.append({'name':name,'actual':actual if not isinstance(actual,bytes) else {'bytes':len(actual),'sha256':hashlib.sha256(actual).hexdigest()},'expected':expected if not isinstance(expected,bytes) else {'bytes':len(expected),'sha256':hashlib.sha256(expected).hexdigest()}})
receipt={'host':platform.node(),'uid':os.getuid(),'python':platform.python_version(),'playwright':importlib.metadata.version('playwright'),'runtime':str(runtime),'application':str(app),'before':before,'checks':checks,'page_errors':[],'page_requests':[]}
server=None;context=None;lines=[];errors=[];ready=queue.Queue()
receipt['source_commit']='7eb25c1013807e8a6f9f8e4bb374344b8801908e'
receipt['children']=[]
def collect(stream,target):
    for line in stream:
        target.append(line.rstrip())
        if target is lines:ready.put(line.rstrip())
def start():
    global server,lines,errors,ready,threads
    lines=[];errors=[];ready=queue.Queue()
    started=time.monotonic()
    server=subprocess.Popen([str(app/'Start ReturnBy.command')],cwd=out,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    receipt['children'].append({'pid':server.pid})
    threads=[threading.Thread(target=collect,args=(server.stdout,lines),daemon=True),threading.Thread(target=collect,args=(server.stderr,errors),daemon=True)]
    for t in threads:t.start()
    deadline=started+65
    while True:
        line=ready.get(timeout=max(.01,deadline-time.monotonic()))
        if line=='Tracker: http://127.0.0.1:8769/index.html':break
        check('recognized bounded startup message',line,'Waiting up to 60 seconds for the local address to become available. Press Ctrl+C to cancel.')
    receipt['children'][-1]['readiness_seconds']=round(time.monotonic()-started,3)
    receipt['children'][-1]['startup_lines']=list(lines)
def stop(eof):
    global server
    if eof:server.stdin.close()
    else:server.stdin.write('\n');server.stdin.flush()
    server.wait(timeout=5)
    for t in threads:t.join(timeout=2)
    receipt['children'][-1].update(exit=server.returncode,stdout=list(lines),stderr=list(errors))
    check('foreground stops on '+('EOF' if eof else 'Enter'),server.returncode,0)
    server=None
try:
    check('installed runtime is accepted source',hashlib.sha256((app/'serve_returnby.py').read_bytes()).hexdigest(),'d2bbfaa4440d639bf20e37bc9b0fc3e20d01c643609f1af11d49a57b27e37ac2')
    with socket.socket() as probe:probe.bind(('127.0.0.1',8769))
    start()
    manifest=json.loads((app/'ASSETS.json').read_bytes())
    receipt['http_assets']=[]
    for asset in manifest:
        with urllib.request.urlopen('http://127.0.0.1:8769/'+asset['path'],timeout=3) as response:
            body=response.read();check('HTTP asset '+asset['path'],hashlib.sha256(body).hexdigest(),asset['sha256'])
            check('no-store '+asset['path'],response.headers['Cache-Control'],'no-store')
            receipt['http_assets'].append({'path':asset['path'],'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest(),'status':response.status})
    other=subprocess.run([str(app/'Start ReturnBy.command')],cwd=out,input='\n',capture_output=True,text=True,timeout=5)
    receipt['occupied_attempt']={'exit':other.returncode,'stdout':other.stdout,'stderr':other.stderr}
    check('second installed launcher refuses promptly',other.returncode,1)
    check('second launcher reports occupied origin','could not bind 127.0.0.1:8769' in other.stderr,True)
    with sync_playwright() as p:
        context=p.chromium.launch_persistent_context(str(out/'profile'),executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless=True,viewport={'width':390,'height':844})
        browser=context.browser
        receipt['chrome']=browser.version
        page=context.pages[0]
        page.set_default_timeout(12000)
        page.on('pageerror',lambda error:receipt['page_errors'].append(str(error)))
        def route(request):
            url=request.request.url
            allowed=url.startswith('http://127.0.0.1:8769/') or url.startswith('data:') or url.startswith('blob:')
            receipt['page_requests'].append({'url':url,'allowed':allowed})
            request.continue_() if allowed else request.abort()
        context.route('**/*',route)
        response=page.goto('http://127.0.0.1:8769/trip-checklist.html',wait_until='networkidle',timeout=25000)
        check('checklist HTTP',response.status,200)
        check('checklist title',page.title(),'ReturnBy · Return-trip checklist')
        check('fresh profile has no stored returns',page.evaluate("localStorage.getItem('returnby.v1')"),None)
        check('empty checklist has no order checkboxes',page.locator('#order-options input[type="checkbox"]').count(),0)
        check('empty preview disabled',page.locator('#preview-trip').is_disabled(),True)
        check('empty download disabled',page.locator('#download-checklist').is_disabled(),True)
        receipt['empty_state']=page.locator('#order-options').inner_text()
        receipt['layout']=page.evaluate("({viewport:innerWidth,width:document.documentElement.scrollWidth})")
        check('checklist no horizontal overflow',receipt['layout']['width']<=receipt['layout']['viewport'],True)
        page.screenshot(path=str(out/'checklist-390.png'),full_page=True)
        page.get_by_role('link',name='Back to your tracker').click()
        page.wait_for_url('**/index.html')
        check('backlink returns to tracker',page.title(),'ReturnBy - The Return Desk')
        check('empty tracker remains unmodified',page.evaluate("localStorage.getItem('returnby.v1')"),None)
        page.screenshot(path=str(out/'tracker-after-backlink.png'),full_page=True)
        check('no page errors',receipt['page_errors'],[])
        check('page requests stay in admitted local scope',all(x['allowed'] for x in receipt['page_requests']),True)
        context.close();context=None
        check('browser disconnected after owned context close',browser.is_connected(),False)
    stop(True)
    start()
    with urllib.request.urlopen('http://127.0.0.1:8769/index.html',timeout=3) as response:
        reopened=response.read()
    check('actual reopened launcher serves complete pinned tracker',reopened,(app/'app/index.html').read_bytes())
    stop(False)
    checked=subprocess.run([sys.executable,'-B',str(app/'recovery/install_macos.py'),'--check',str(app)],capture_output=True,text=True,timeout=10)
    receipt['installation_check']={'exit_code':checked.returncode,'stdout':checked.stdout,'stderr':checked.stderr}
    check('installed checker after use',checked.returncode,0)
    receipt['passed']=True
except Exception as error:
    receipt['error']=str(error);receipt['passed']=False
finally:
    if context is not None:
        try:context.close()
        except Exception as error:receipt['browser_cleanup_error']=str(error)
    if server is not None and server.poll() is None:
        try:
            if server.stdin and not server.stdin.closed:server.stdin.write('\n');server.stdin.flush()
            server.wait(timeout=10);receipt['cleanup_exit']=server.returncode
        except Exception as error:receipt['cleanup_error']=str(error)
    receipt['after']=snap();receipt['source_unchanged']=receipt['after']==before
    receipt['passed']=receipt.get('passed',False) and receipt['source_unchanged']
    receipt['screenshots']=[{'path':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(out.glob('*.png'))]
    (out/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
    print(json.dumps({k:v for k,v in receipt.items() if k not in ('before','after')}),flush=True)
raise SystemExit(0 if receipt['passed'] else 1)
