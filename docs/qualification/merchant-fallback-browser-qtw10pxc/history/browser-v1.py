"""Exact-source ReturnBy affected-flow browser receiving, with fictional data only."""
import os, sys, json, hashlib, shutil, threading, socket, traceback, ctypes, datetime
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit
ROOT = Path(sys.argv[1]).resolve()
VARIANT = sys.argv[2]
if VARIANT not in ('original','candidate') or os.name != 'nt':
    raise SystemExit('This receiver is frozen for original/candidate on the admitted Windows host')
CONTRACT = json.loads((ROOT/'CONTRACT.json').read_text(encoding='utf-8'))
SOURCE = ROOT/VARIANT
DIST = SOURCE/'dist'
OUT = ROOT/('browser-'+VARIANT)
OUT.mkdir()
(OUT/'tmp').mkdir()
(OUT/'downloads').mkdir()
os.environ['TEMP'] = str(OUT/'tmp')
os.environ['TMP'] = str(OUT/'tmp')
import tempfile
tempfile.tempdir = str(OUT/'tmp')
from playwright.sync_api import sync_playwright

def pin(path):
    b=path.read_bytes()
    return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def inventory(root):
    return {str(p.relative_to(root)):pin(p) for p in sorted(root.rglob('*')) if p.is_file()}
def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()
def save(name,value):
    (OUT/name).write_text(json.dumps(value,indent=2,ensure_ascii=True)+'\n',encoding='utf-8')
def capacity():
    n=shutil.disk_usage(ROOT).free
    if n < 2*1024**3: raise RuntimeError('C: capacity below the frozen2GiB floor')
    return n

receipt={'variant':VARIANT,'source':CONTRACT[VARIANT],'scope':CONTRACT['scope'],
         'started_at':now(),'capacity_before':capacity(),'checks':[],'cases':[],
         'network':[],'console':[],'page_errors':[],'http':[],'lifecycle':{}}
checks=receipt['checks']
def check(name,actual,expected):
    row={'name':name,'actual':actual,'expected':expected,'passed':actual==expected}
    checks.append(row)
    return row['passed']
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs): super().__init__(*args,directory=str(DIST),**kwargs)
    def log_message(self,fmt,*args):
        receipt['http'].append({'at':now(),'message':fmt%args})
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
port=server.server_address[1]
origin='http://127.0.0.1:'+str(port)
thread=threading.Thread(target=server.serve_forever,name='owned-returnby-http')
thread.start()
receipt['origin']=origin
assets_before=inventory(DIST)
receipt['dist_before']=assets_before
browser=None
playwright=None
browser_handle=None
kernel=ctypes.WinDLL('kernel32',use_last_error=True)
kernel.OpenProcess.argtypes=(ctypes.c_uint32,ctypes.c_int,ctypes.c_uint32)
kernel.OpenProcess.restype=ctypes.c_void_p
kernel.WaitForSingleObject.argtypes=(ctypes.c_void_p,ctypes.c_uint32)
kernel.WaitForSingleObject.restype=ctypes.c_uint32
kernel.CloseHandle.argtypes=(ctypes.c_void_p,)
kernel.CloseHandle.restype=ctypes.c_int
class FILETIME(ctypes.Structure):
    _fields_=[('low',ctypes.c_uint32),('high',ctypes.c_uint32)]
kernel.GetProcessTimes.argtypes=(ctypes.c_void_p,ctypes.POINTER(FILETIME),ctypes.POINTER(FILETIME),ctypes.POINTER(FILETIME),ctypes.POINTER(FILETIME))
kernel.GetProcessTimes.restype=ctypes.c_int

try:
    playwright=sync_playwright().start()
    browser=playwright.chromium.launch(
        executable_path=CONTRACT['device']['chrome_path'],headless=True,chromium_sandbox=True,
        args=['--do-not-de-elevate','--disable-extensions','--disable-background-networking'],
        timeout=20000)
    receipt['browser_version']=browser.version
    session=browser.new_browser_cdp_session()
    processes=session.send('SystemInfo.getProcessInfo')['processInfo']
    main=[x for x in processes if x['type']=='browser']
    if len(main)!=1: raise RuntimeError('expected exactly one owned browser process identity')
    pid=int(main[0]['id'])
    browser_handle=kernel.OpenProcess(0x100000|0x1000,False,pid)
    if not browser_handle: raise RuntimeError('cannot retain own browser lifetime handle')
    created,exited,kern,user=FILETIME(),FILETIME(),FILETIME(),FILETIME()
    if not kernel.GetProcessTimes(browser_handle,ctypes.byref(created),ctypes.byref(exited),ctypes.byref(kern),ctypes.byref(user)):
        raise RuntimeError('cannot bind owned browser handle to creation identity')
    receipt['lifecycle']['browser']={'pid':pid,'creation_filetime':(created.high<<32)|created.low,'identity_source':'own browser CDP SystemInfo plus retained Windows process handle'}
    session.detach()
    for fixture in CONTRACT['fixtures']:
        case={'id':fixture['id'],'input':fixture['text'],'manual_merchant':fixture['manual_merchant']}
        receipt['cases'].append(case)
        context=browser.new_context(viewport={'width':1280,'height':900},accept_downloads=True)
        context.set_default_timeout(10000)
        def route_request(route):
            request=route.request
            parsed=urlsplit(request.url)
            allowed=(parsed.scheme in ('http','https') and parsed.scheme+'://'+parsed.netloc==origin)
            receipt['network'].append({'case':fixture['id'],'url':request.url,'method':request.method,'allowed':allowed})
            if allowed: route.continue_()
            else: route.abort()
        context.route('**/*',route_request)
        page=context.new_page()
        page.on('console',lambda msg:receipt['console'].append({'type':msg.type,'text':msg.text}))
        page.on('pageerror',lambda err:receipt['page_errors'].append(str(err)))
        try:
            page.goto(origin+'/index.html',wait_until='networkidle')
            key=fixture['id']+'.'
            check(key+'initial_saved_storage',page.evaluate("localStorage.getItem('returnby.v1')"),None)
            page.locator('#paste').fill(fixture['text'])
            page.locator('#find').click()
            page.locator('#preview').wait_for(state='visible')
            actual={name:page.locator('#preview [name='+name+']').input_value() for name in ('merchant','orderDate','orderNo','total')}
            actual['days']=int(page.locator('#preview [name=windowDays]').input_value())
            actual['source']=page.locator('#preview').get_attribute('data-source')
            actual['highlighted']=page.locator('#preview [name=merchant]').evaluate("(el)=>el.closest('label').classList.contains('missing')")
            case['preview']=actual
            for field,want in fixture['preview'].items(): check(key+'preview.'+field,actual[field],want)
            check(key+'preview_does_not_save',page.evaluate("localStorage.getItem('returnby.v1')"),None)
            check(key+'source_label',page.locator('#src').inner_text(),
                  'No store match: editable 30-day fallback.' if fixture['preview']['source']=='default' else 'Store rule from the local policy table; confirm with the retailer.')
            if fixture['id']=='embedded-alias':
                shot=OUT/(VARIANT+'-embedded-preview-desktop.png')
                page.screenshot(path=str(shot),full_page=True)
                case['preview_screenshot']=pin(shot)
            if fixture['manual_merchant'] is not None:
                page.locator('#preview [name=merchant]').fill(fixture['manual_merchant'])
            page.locator('#preview button[type=submit]').click()
            page.locator('#preview').wait_for(state='hidden')
            raw=page.evaluate("localStorage.getItem('returnby.v1')")
            orders=json.loads(raw)
            case['saved_raw']=raw
            check(key+'one_saved_order',len(orders),1)
            if len(orders)!=1: raise RuntimeError('unexpected order count prevents unambiguous follow-up receiving')
            order=orders[0]
            check(key+'approved_keys',sorted(order),sorted(['id','merchant','orderNo','total','orderDate','windowDays','windowSource','createdAt']))
            for field,want in {**fixture['saved'],'orderDate':fixture['preview']['orderDate'],'orderNo':fixture['preview']['orderNo'],'total':fixture['preview']['total']}.items():
                check(key+'saved.'+field,order.get(field),want)
            check(key+'paste_not_persisted',fixture['text'] in raw,False)
            check(key+'paste_cleared',page.locator('#paste').input_value(),'')
            check(key+'card_merchant',page.locator('#list .card .order-head strong').inner_text(),fixture['saved']['merchant'])
            check(key+'card_due',page.locator('#list .return-by').inner_text(),'RETURN BY '+fixture['due'])
            page.reload(wait_until='networkidle')
            check(key+'reload_exact_storage',page.evaluate("localStorage.getItem('returnby.v1')"),raw)
            check(key+'reload_card_due',page.locator('#list .return-by').inner_text(),'RETURN BY '+fixture['due'])
            if fixture['calendar_download']:
                with page.expect_download() as pending:
                    page.locator('#list button[data-ics]').click()
                download=pending.value
                target=OUT/'downloads'/(fixture['id']+'.ics')
                download.save_as(str(target))
                b=target.read_bytes()
                text=b.decode('utf-8')
                unfolded=text.replace('\r\n ','')
                title='Return deadline: '+fixture['saved']['merchant']+' #'+fixture['preview']['orderNo']
                day=datetime.date.fromisoformat(fixture['due'])
                expected_lines=['UID:'+order['id']+'@returnby','DTSTART;VALUE=DATE:'+day.strftime('%Y%m%d'),
                                'DTEND;VALUE=DATE:'+(day+datetime.timedelta(days=1)).strftime('%Y%m%d'),
                                'SUMMARY:'+title,'DESCRIPTION:'+title,'TRIGGER:-P3D']
                case['download']={'suggested_filename':download.suggested_filename,'path':str(target),**pin(target),'text':text}
                for line in expected_lines: check(key+'calendar.'+line.split(':',1)[0],line in unfolded.split('\r\n'),True)
                check(key+'calendar_one_event',unfolded.split('\r\n').count('BEGIN:VEVENT'),1)
                check(key+'calendar_crlf_only',b'\n' in b and b'\n' not in b.replace(b'\r\n',b''),True)
                check(key+'download_preserves_storage',page.evaluate("localStorage.getItem('returnby.v1')"),raw)
                if VARIANT=='candidate':
                    page.set_viewport_size({'width':390,'height':844})
                    page.evaluate("()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))")
                    geometry=page.evaluate("({width:innerWidth,scrollWidth:document.documentElement.scrollWidth})")
                    case['narrow_geometry']=geometry
                    check(key+'narrow_no_horizontal_overflow',geometry['scrollWidth']<=geometry['width'],True)
                    shot=OUT/'candidate-embedded-saved-narrow.png'
                    page.screenshot(path=str(shot),full_page=True)
                    case['narrow_screenshot']=pin(shot)
            save(fixture['id']+'.json',case)
        finally:
            context.close()
    check('no_foreign_page_requests',sum(not x['allowed'] for x in receipt['network']),0)
    check('no_page_exceptions',receipt['page_errors'],[])
    check('no_console_errors',[x for x in receipt['console'] if x['type']=='error'],[])
except BaseException:
    receipt['receiver_error']=traceback.format_exc()
    traceback.print_exc()
finally:
    for name,operation in (
        ('browser_close',lambda:browser.close() if browser else None),
        ('playwright_stop',lambda:playwright.stop() if playwright else None),
        ('server_shutdown',server.shutdown),('server_close',server.server_close)):
        try:
            operation()
            receipt['lifecycle'][name]='completed'
        except BaseException:
            receipt['lifecycle'][name]=traceback.format_exc()
    thread.join(timeout=5)
    receipt['lifecycle']['server_thread_stopped']=not thread.is_alive()
    if browser_handle:
        receipt['lifecycle']['browser_handle_signaled']=kernel.WaitForSingleObject(browser_handle,5000)==0
        kernel.CloseHandle(browser_handle)
    probe=socket.socket()
    probe.settimeout(1)
    try: receipt['lifecycle']['listener_closed']=probe.connect_ex(('127.0.0.1',port))!=0
    finally: probe.close()
    receipt['dist_after']=inventory(DIST)
    check('built_assets_unchanged',receipt['dist_after'],assets_before)
    check('server_thread_stopped',receipt['lifecycle']['server_thread_stopped'],True)
    check('listener_closed',receipt['lifecycle']['listener_closed'],True)
    check('browser_exited',receipt['lifecycle'].get('browser_handle_signaled'),True)
    receipt['passed']=sum(x['passed'] for x in checks)
    receipt['failed']=sum(not x['passed'] for x in checks)
    receipt['completed_cases']=len([c for c in receipt['cases'] if (OUT/(c['id']+'.json')).is_file()])
    receipt['finished_at']=now()
    receipt['product_pass']=not receipt.get('receiver_error') and receipt['failed']==0 and receipt['completed_cases']==3
    save('RECEIVING.json',receipt)
    print(json.dumps({'variant':VARIANT,'product_pass':receipt['product_pass'],'passed':receipt['passed'],'failed':receipt['failed'],
                      'completed_cases':receipt['completed_cases'],'receiver_error':bool(receipt.get('receiver_error')),
                      'receipt':str(OUT/'RECEIVING.json'),'pin':pin(OUT/'RECEIVING.json')}),flush=True)
raise SystemExit(0 if receipt['product_pass'] else 1)
