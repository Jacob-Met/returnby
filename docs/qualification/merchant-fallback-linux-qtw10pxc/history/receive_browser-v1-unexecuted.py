"""UNEXECUTED LINUX DRAFT v1. Exact-source ReturnBy affected-flow browser receiver.
Caller prerequisites: admitted owned Linux scratch; reviewed Linux staging/build
driver completed; immutable INPUT.json and successful bound build receipts.
This file alone is not evidence that source was staged, built, or browser-qualified.
"""
import os, sys, json, hashlib, shutil, threading, socket, traceback, datetime, platform, pwd, select, importlib.metadata
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path, PurePosixPath
from urllib.parse import urlsplit

ROOT = Path(sys.argv[1]).resolve(strict=True)
VARIANT = sys.argv[2]
if VARIANT not in ('original','candidate') or os.name != 'posix' or platform.system() != 'Linux':
    raise SystemExit('This receiver is frozen for original/candidate on the admitted Linux host')
CONTRACT_PATH = ROOT/'CONTRACT.json'
CONTRACT = json.loads(CONTRACT_PATH.read_text(encoding='utf-8'))
SOURCE = ROOT/VARIANT
DIST = SOURCE/'dist'
OUT = ROOT/('browser-'+VARIANT)
OUT.mkdir()
def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()
def pin(path):
    b=path.read_bytes()
    return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),
            'git_blob':hashlib.sha1(b'blob '+str(len(b)).encode('ascii')+b'\0'+b).hexdigest()}
def asset_pin(path):
    p=pin(path)
    return {'bytes':p['bytes'],'sha256':p['sha256']}
def regular_tree(root):
    if root.is_symlink() or root.is_junction() or not root.is_dir():
        raise RuntimeError('expected regular admitted directory: '+str(root))
    result={}
    for p in sorted(root.rglob('*')):
        if p.is_symlink() or p.is_junction():
            raise RuntimeError('links are not admitted: '+str(p))
        if p.is_file():
            result[p.relative_to(root).as_posix()]=asset_pin(p)
        elif not p.is_dir():
            raise RuntimeError('nonregular filesystem entry: '+str(p))
    return result
def save(name,value):
    with (OUT/name).open('x',encoding='utf-8',newline='\n') as stream:
        stream.write(json.dumps(value,indent=2,ensure_ascii=True)+'\n')
def capacity():
    n=shutil.disk_usage(ROOT).free
    if n < 2*1024**3:
        raise RuntimeError('Home filesystem capacity below the frozen 2 GiB floor')
    return n
def require(condition,message):
    if not condition:
        raise RuntimeError(message)

receipt={'format':'returnby-browser-receiver-linux-v1','variant':VARIANT,
         'source':CONTRACT[VARIANT],'scope':CONTRACT['scope'],'started_at':now(),
         'checks':[],'cases':[],'network':[],'console':[],'page_errors':[],'http':[],
         'network_scope':'Observed page/context HTTP(S) requests only; not an OS-wide Chrome network audit.',
         'lifecycle':{'contexts':[],'cleanup_errors':[]}}
checks=receipt['checks']
def check(name,actual,expected):
    row={'name':name,'actual':actual,'expected':expected,'passed':actual==expected}
    checks.append(row)
    return row['passed']

def bound_path(root,relative):
    require(isinstance(relative,str) and '\\' not in relative,'expected POSIX relative path')
    rel=PurePosixPath(relative)
    require(not rel.is_absolute() and relative==rel.as_posix() and all(p not in ('..','.') for p in rel.parts),
            'noncanonical source path')
    target=root.joinpath(*rel.parts)
    for parent in [root,*list(target.parents)[:len(rel.parts)-1],target]:
        require(not parent.is_symlink() and not parent.is_junction(),'source link is not admitted')
    require(target.resolve(strict=True).is_relative_to(root.resolve(strict=True)),'path escapes its owned root')
    require(target.is_file(),'expected regular source file')
    return target

def validate_source_and_build():
    import base64
    input_path=ROOT/'INPUT.json'
    stage_path=ROOT/'STAGED-SOURCE.json'
    build_path=ROOT/('BUILD-'+VARIANT+'.json')
    dependency_path=ROOT/'DEPENDENCIES.json'
    require(pin(input_path)['git_blob']=='98a434fe34dd6e175a64d0396d079cadf6f779b7',
            'immutable source-input identity mismatch')
    require(pin(CONTRACT_PATH)['git_blob']=='6b410f82313611ec9d1a81d0c53a835ac76a03f1',
            'immutable functional contract changed')
    inputs=json.loads(input_path.read_text(encoding='utf-8'))
    staged_manifest=json.loads(stage_path.read_text(encoding='utf-8'))
    require(staged_manifest.get('accepted') is True,'staging was not accepted')
    staged=staged_manifest[VARIANT]
    build=json.loads(build_path.read_text(encoding='utf-8'))
    require(build.get('accepted') is True and build.get('manifests_unchanged') is True,
            'complete build or manifest preservation was not accepted')
    require(build['input']==pin(input_path),'build input pin mismatch')
    require(build['staged_manifest']==pin(stage_path),'build staged-manifest pin mismatch')
    expected=inputs[VARIANT]
    for field in ('commit','tree'):
        require(expected[field]==CONTRACT[VARIANT][field],'input source identity mismatch')
        require(staged[field]==expected[field],'staged source identity mismatch')
        require(build['source_'+field]==expected[field],'build source identity mismatch')
    require(build['variant']==VARIANT,'build variant mismatch')
    require(build.get('source_unchanged') is True,'build did not preserve source')
    require([x['name'] for x in build['commands']]==['tsc','vite'],'unexpected build sequence')
    require(all(x.get('exit_code')==0 for x in build['commands']),'build did not complete successfully')
    dep=build['dependencies']
    require(all(dep.get(field) is True for field in ('accepted','shared_unchanged','copied_original_files_unchanged','aliases_unchanged')),
            'dependency custody not accepted by build')
    require(dep['manifest']['path']=='DEPENDENCIES.json','unexpected dependency manifest path')
    require(pin(dependency_path)=={k:dep['manifest'][k] for k in ('bytes','sha256','git_blob')},
            'dependency manifest byte identity mismatch')
    dep_evidence=json.loads(dependency_path.read_text(encoding='utf-8'))
    require(dep_evidence.get('accepted') is True,'dependency copy was not accepted')
    require(dep_evidence['before']==dep_evidence['copied']==dep_evidence['source_after'],
            'dependency copy differs from admitted shared bytes and modes')
    require(dep_evidence['aliases']['before']==dep_evidence['aliases']['copied']==dep_evidence['aliases']['source_after']==CONTRACT['dependencies']['aliases'],
            'dependency alias custody differs from the frozen Linux contract')
    require(build['node']['path']==CONTRACT['device']['node_path'] and build['node']['version']=='v'+CONTRACT['device']['node'],
            'build Node identity differs from the admitted Linux toolchain')
    require(SOURCE.is_dir() and not SOURCE.is_symlink() and not SOURCE.is_junction(),
            'expected regular owned source directory')
    rows={row['path']:row for row in staged['files']}
    expected_rows={row['path']:row for row in expected['files']}
    require(len(rows)==len(staged['files']) and len(expected_rows)==len(expected['files']),
            'duplicate source paths')
    require(set(rows)==set(expected_rows),'staged projection does not match immutable input')
    require(len(rows)==(27 if VARIANT=='original' else 28),'unexpected source projection count')
    require(expected_rows['src/parse.ts']['git_blob']==CONTRACT[VARIANT]['parser_blob'],
            'parser source identity mismatch')
    actual=[]
    for relative in sorted(rows):
        expected_row=expected_rows[relative]
        require(expected_row['mode']=='100644','unexpected input file mode')
        encoded=inputs['blobs'][expected_row['git_blob']]
        require(encoded['encoding']=='base64','unexpected input encoding')
        body=base64.b64decode(''.join(encoded['content'].split()),validate=True)
        identity={'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest(),
                  'git_blob':hashlib.sha1(b'blob '+str(len(body)).encode('ascii')+b'\0'+body).hexdigest()}
        require(identity['git_blob']==expected_row['git_blob'],'input body identity mismatch')
        require({k:rows[relative][k] for k in identity}==identity,'staged row identity mismatch')
        path=bound_path(SOURCE,relative)
        require(pin(path)==identity,'actual source byte identity mismatch')
        require(path.stat().st_mtime_ns==rows[relative]['mtime_ns'],'source modification time changed')
        actual.append({'path':relative,**identity,'mtime_ns':path.stat().st_mtime_ns})
    assets=regular_tree(DIST)
    require('index.html' in assets,'main-page build asset absent')
    require(assets==build['dist'],'actual build assets differ from bound successful build')
    manifests={path.name:pin(path) for path in (CONTRACT_PATH,input_path,stage_path,build_path,dependency_path)}
    return actual,assets,manifests


class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,directory=str(DIST),**kwargs)
    def log_message(self,fmt,*args):
        receipt['http'].append({'at':now(),'message':fmt%args})
def process_identity(pid):
    root=Path('/proc')/str(pid)
    raw=(root/'stat').read_text(encoding='ascii')
    tail=raw.rsplit(')',1)[1].split()
    # /proc field 3 starts tail[0]; field 22 is the process start tick count.
    return {'pid':pid,'uid':root.stat().st_uid,'start_ticks':int(tail[19])}

server=thread=port=origin=browser=playwright=browser_pidfd=None
thread_started=False
contexts=[]
assets_before=source_before=manifest_before=None
try:
    receipt['capacity_before']=capacity()
    require(ROOT.parent==Path('/home/jacob') and ROOT.name.startswith('hamon-returnby-linux-qtw10pxc-'),
            'browser root is not the admitted owned nonhidden Linux child')
    require(platform.node()==CONTRACT['device']['hostname'] and os.getuid()==CONTRACT['device']['uid'] and pwd.getpwuid(os.getuid()).pw_name==CONTRACT['device']['user'],
            'Linux host/user identity mismatch')
    require(platform.python_version()==CONTRACT['device']['python'], 'Linux Python version drift')
    require(importlib.metadata.version('playwright')==CONTRACT['device']['playwright'], 'Linux Playwright version drift')
    require(hasattr(os,'pidfd_open'),'pidfd process-exit observation unavailable')
    receipt['environment']={'host':platform.node(),'user':pwd.getpwuid(os.getuid()).pw_name,'uid':os.getuid(),'python':sys.version,'playwright':importlib.metadata.version('playwright'),'platform':platform.platform()}
    require(pin(CONTRACT_PATH)['git_blob']=='6b410f82313611ec9d1a81d0c53a835ac76a03f1',
            'frozen functional contract identity mismatch')
    source_before,assets_before,manifest_before=validate_source_and_build()
    receipt['source_before']=source_before
    receipt['dist_before']=assets_before
    receipt['manifest_before']=manifest_before
    (OUT/'tmp').mkdir()
    (OUT/'downloads').mkdir()
    os.environ['TMPDIR']=str(OUT/'tmp')
    os.environ['TEMP']=str(OUT/'tmp')
    os.environ['TMP']=str(OUT/'tmp')
    import tempfile
    tempfile.tempdir=str(OUT/'tmp')
    from playwright.sync_api import sync_playwright
    server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
    port=server.server_address[1]
    origin='http://127.0.0.1:'+str(port)
    receipt['origin']=origin
    thread=threading.Thread(target=server.serve_forever,name='owned-returnby-http')
    thread.start()
    thread_started=True
    playwright=sync_playwright().start()
    browser=playwright.chromium.launch(
        executable_path=CONTRACT['device']['chrome_path'],headless=True,chromium_sandbox=True,
        args=['--disable-extensions','--disable-background-networking'],
        timeout=20000)
    receipt['browser_version']=browser.version
    require(browser.version==CONTRACT['device']['chrome_version'],'Chromium version differs from admitted snap metadata')
    session=browser.new_browser_cdp_session()
    processes=session.send('SystemInfo.getProcessInfo')['processInfo']
    main=[x for x in processes if x['type']=='browser']
    require(len(main)==1,'expected exactly one owned browser process identity')
    pid=int(main[0]['id'])
    identity_before=process_identity(pid)
    require(identity_before['uid']==CONTRACT['device']['uid'],'owned browser UID mismatch')
    browser_pidfd=os.pidfd_open(pid,0)
    identity_after=process_identity(pid)
    require(identity_after==identity_before,'browser process identity changed while retaining pidfd')
    receipt['lifecycle']['browser']={**identity_before,'identity_source':'own browser CDP SystemInfo plus /proc start ticks and retained Linux pidfd'}
    session.detach()
    for fixture in CONTRACT['fixtures']:
        case={'id':fixture['id'],'input':fixture['text'],'manual_merchant':fixture['manual_merchant']}
        receipt['cases'].append(case)
        context=browser.new_context(viewport={'width':1280,'height':900},accept_downloads=True,timezone_id='UTC')
        context_state={'case':fixture['id'],'status':'open'}
        contexts.append((context,context_state))
        receipt['lifecycle']['contexts'].append(context_state)
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
            try:
                context.close()
                context_state['status']='completed'
            except BaseException:
                context_state['status']='error'
                context_state['error']=traceback.format_exc()
                raise
    check('no_foreign_page_requests',sum(not x['allowed'] for x in receipt['network']),0)
    check('no_page_exceptions',receipt['page_errors'],[])
    check('no_console_errors',[x for x in receipt['console'] if x['type']=='error'],[])

except BaseException:
    receipt['receiver_error']=traceback.format_exc()
    traceback.print_exc()
finally:
    def cleanup(name,operation,needed=True):
        if not needed:
            receipt['lifecycle'][name]='not-created'
            return
        try:
            operation()
            receipt['lifecycle'][name]='completed'
        except BaseException:
            receipt['lifecycle'][name]='error'
            receipt['lifecycle']['cleanup_errors'].append({'operation':name,'error':traceback.format_exc()})
    # Contexts whose setup failed before the per-case finally are still owned here.
    for context,state in contexts:
        if state['status']=='open':
            try:
                context.close()
                state['status']='completed'
            except BaseException:
                state['status']='error'
                state['error']=traceback.format_exc()
    cleanup('browser_close',lambda:browser.close(),browser is not None)
    cleanup('playwright_stop',lambda:playwright.stop(),playwright is not None)
    # shutdown requires a started serve_forever thread; construction alone is insufficient.
    thread_started=thread_started or (thread is not None and thread.ident is not None)
    cleanup('server_shutdown',lambda:server.shutdown(),server is not None and thread_started)
    cleanup('server_close',lambda:server.server_close(),server is not None)
    if thread_started:
        cleanup('server_thread_join',lambda:thread.join(timeout=5))
        receipt['lifecycle']['server_thread_stopped']=not thread.is_alive()
    else:
        receipt['lifecycle']['server_thread_join']='not-created'
        receipt['lifecycle']['server_thread_stopped']=True
    if browser_pidfd is not None:
        try:
            poller=select.poll()
            poller.register(browser_pidfd,select.POLLIN)
            events=poller.poll(5000)
            receipt['lifecycle']['browser_pidfd_events']=[{'fd':fd,'mask':mask} for fd,mask in events]
            receipt['lifecycle']['browser_pidfd_signaled']=any(fd==browser_pidfd and mask&select.POLLIN for fd,mask in events)
        except BaseException:
            receipt['lifecycle']['cleanup_errors'].append({'operation':'browser_pidfd_wait','error':traceback.format_exc()})
        cleanup('browser_pidfd_close',lambda:os.close(browser_pidfd))
    else:
        receipt['lifecycle']['browser_pidfd_close']='not-created'
    if port is not None:
        probe=None
        try:
            probe=socket.socket()
            probe.settimeout(1)
            receipt['lifecycle']['listener_closed']=probe.connect_ex(('127.0.0.1',port))!=0
        except BaseException:
            receipt['lifecycle']['cleanup_errors'].append({'operation':'listener_probe','error':traceback.format_exc()})
        finally:
            if probe is not None:
                cleanup('listener_probe_close',probe.close)
    required_cleanup=['browser_close','playwright_stop','server_shutdown','server_close',
                      'server_thread_join','browser_pidfd_close','listener_probe_close']
    cleanup_ok=all(receipt['lifecycle'].get(name)=='completed' for name in required_cleanup)
    cleanup_ok=cleanup_ok and all(state['status']=='completed' for _,state in contexts)
    cleanup_ok=cleanup_ok and not receipt['lifecycle']['cleanup_errors']
    check('required_cleanup_completed',cleanup_ok,True)
    check('server_thread_stopped',receipt['lifecycle']['server_thread_stopped'],True)
    check('listener_closed',receipt['lifecycle'].get('listener_closed'),True)
    check('browser_exited',receipt['lifecycle'].get('browser_pidfd_signaled'),True)
    if source_before is not None:
        try:
            source_after,assets_after,manifest_after=validate_source_and_build()
            receipt['source_after']=source_after
            receipt['dist_after']=assets_after
            receipt['manifest_after']=manifest_after
            check('staged_source_unchanged',source_after,source_before)
            check('built_assets_unchanged',assets_after,assets_before)
            check('binding_manifests_unchanged',manifest_after,manifest_before)
        except BaseException:
            receipt['postflight_error']=traceback.format_exc()
    receipt['passed']=sum(x['passed'] for x in checks)
    receipt['failed']=sum(not x['passed'] for x in checks)
    receipt['completed_cases']=len([c for c in receipt['cases'] if (OUT/(c['id']+'.json')).is_file()])
    receipt['finished_at']=now()
    lifecycle_verified=cleanup_ok and receipt['lifecycle']['server_thread_stopped'] and receipt['lifecycle'].get('listener_closed') is True and receipt['lifecycle'].get('browser_pidfd_signaled') is True
    receipt['lifecycle']['verified']=lifecycle_verified
    receipt['receiver_complete']=not receipt.get('receiver_error') and not receipt.get('postflight_error') and lifecycle_verified and receipt['completed_cases']==3
    receipt['product_pass']=receipt['receiver_complete'] and receipt['failed']==0
    save('RECEIVING.json',receipt)
    print(json.dumps({'variant':VARIANT,'receiver_complete':receipt['receiver_complete'],
                      'product_pass':receipt['product_pass'],'passed':receipt['passed'],'failed':receipt['failed'],
                      'completed_cases':receipt['completed_cases'],'receiver_error':bool(receipt.get('receiver_error')),
                      'receipt':str(OUT/'RECEIVING.json'),'pin':pin(OUT/'RECEIVING.json')}),flush=True)
raise SystemExit(0 if receipt['product_pass'] else 1)
