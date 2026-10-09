"""ReturnBy enquiry actual Chrome receiver; stdlib only, owned synthetic fixtures.

Transport/helper provenance is retained alongside this file. No OS clipboard write:
the browser invokes a controlled clipboard port; actual downloads are physical files.
"""
import argparse,base64,ctypes,datetime,hashlib,http.server,json,mimetypes,os,pathlib,re,shutil,subprocess,sys,threading,time,traceback
from urllib.parse import unquote,urlsplit
from cdp_transport import CDP
from browser_base import BrowserBase,now,digest,git_blob

HERE=pathlib.Path(__file__).resolve().parent
SOURCE=HERE.parents[2]
ROOT=SOURCE.parent
CHROME=pathlib.Path(r'C:\Program Files\Google\Chrome\Application\chrome.exe')
OWNER='hamon-ultra-ab529ac65023-20261008/coordination-integration'
KEY='returnby.v1'
ORDER_A={'id':'saved-A','merchant':'Fictional <Shop> & Co','orderNo':'00042\npart-\u03b2','total':'USD 001.20','orderDate':'2026-10-03','windowDays':30,'windowSource':'user','createdAt':'2026-10-03T12:00:00Z','completedAt':'2026-10-07T12:00:00Z','extra':{'untouched':['\u03b1',3]}}
ORDER_B={**ORDER_A,'id':'saved-B','merchant':'Another Store','orderNo':'00099','completedAt':'2026-10-06T12:00:00Z'}
RAW=json.dumps([ORDER_A,ORDER_B],ensure_ascii=False,separators=(',',':'))
DETAILS={'items':'Blue shirt\nSize M','reason':'The fit is different from expected.','signature':'Alex'}
BODY_A='\n'.join(['Hello,','','I would like to ask about the following order.','','Store: Fictional <Shop> & Co','Order number: 00042\npart-\u03b2','Order date: 2026-10-03','','Items I am asking about:','Blue shirt\nSize M','','Reason or context:','The fit is different from expected.','','Could you confirm whether these items can be returned and how to arrange it?','Please include the relevant deadline, any charges, and any packaging or proof-of-purchase requirements.','','Thank you,','Alex'])
BODY_B=BODY_A.replace('Store: Fictional <Shop> & Co','Store: Another Store').replace('Order number: 00042\npart-\u03b2','Order number: 00099').replace('Could you confirm whether these items can be returned and how to arrange it?','Could you confirm whether these items are eligible for a return?')
def output_bytes(subject,body):
    return ('Subject: '+subject+'\r\n\r\n'+re.sub(r'\r\n|\r|\n','\r\n',body)+'\r\n').encode('utf-8')
def write_json(path,data):
    with path.open('x',encoding='utf-8',newline='\n') as f:json.dump(data,f,ensure_ascii=False,indent=2);f.write('\n')
class Memory(ctypes.Structure):
    _fields_=[('length',ctypes.c_ulong),('load',ctypes.c_ulong),('total',ctypes.c_ulonglong),('available',ctypes.c_ulonglong),('page_total',ctypes.c_ulonglong),('page_available',ctypes.c_ulonglong),('virtual_total',ctypes.c_ulonglong),('virtual_available',ctypes.c_ulonglong),('extended',ctypes.c_ulonglong)]
def guard():
    m=Memory();m.length=ctypes.sizeof(Memory);assert ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
    result={'at':now(),'availableMemory':m.available,'disk':{str(p):shutil.disk_usage(p).free for p in [ROOT,pathlib.Path(os.environ.get('TEMP',r'C:\Windows\TEMP'))]},'floor':1073741824}
    if m.available<1073741824 or any(v<1073741824 for v in result['disk'].values()):raise RuntimeError('CAPACITY_HELD '+json.dumps(result))
    return result
def manifest():
    paths=subprocess.check_output(['git','-C',str(SOURCE),'ls-files','-z']).split(b'\0')
    result={'source':{},'baselineBuild':{},'candidateBuild':{}}
    for item in paths:
        if item:
            name=item.decode('utf-8');b=(SOURCE/name).read_bytes();result['source'][name]={'sha256':digest(b),'blob':git_blob(b),'bytes':len(b)}
    for key,root in [('baselineBuild',ROOT/'baseline-dist'),('candidateBuild',SOURCE/'dist')]:
        for p in sorted(root.rglob('*')):
            if p.is_file():result[key][p.relative_to(root).as_posix()]={'sha256':digest(p.read_bytes()),'bytes':p.stat().st_size}
    return result
SNAPSHOT="""(()=>({values:Object.fromEntries(['order','items','reason','request','signature','subject','body'].map(k=>[k,document.getElementById('enquiry-'+k)?.value??null])),facts:Object.fromEntries(['merchant','orderNo','orderDate'].map(k=>[k,document.getElementById('fact-'+k)?.textContent??null])),status:document.getElementById('enquiry-status')?.textContent,error:document.getElementById('enquiry-error')?.textContent,previewVisible:!document.getElementById('enquiry-preview')?.hidden,copyDisabled:document.getElementById('enquiry-copy')?.disabled,downloadDisabled:document.getElementById('enquiry-download')?.disabled,storage:window.__storageSnapshot?.(),audit:window.__audit,injected:!!document.querySelector('script[data-authored],img[data-authored]')}))()"""

class Receiver(BrowserBase):
    def __init__(self,out):
        super().__init__(out)
        self.report.update(schema='returnby.enquiry-windows-browser/1',scope='Actual built ReturnBy enquiry; synthetic saved records; controlled clipboard port and physical downloads; no deployment/Actions')
        self.page_sessions=[];self.seed_session=None
    def snapshot(self):return self.evaluate(SNAPSHOT)
    def storage(self):return self.evaluate('window.__storageSnapshot()')
    def evaluate_on(self,session,expression):
        r=self.cdp.call('Runtime.evaluate',{'expression':expression,'awaitPromise':True,'returnByValue':True},session)
        if 'exceptionDetails' in r:raise RuntimeError(json.dumps(r['exceptionDetails']))
        return r.get('result',{}).get('value')
    def new_page(self,path,audit=False,read_failure=False):
        target=self.cdp.call('Target.createTarget',{'url':'about:blank'})['targetId']
        session=self.cdp.call('Target.attachToTarget',{'targetId':target,'flatten':True})['sessionId']
        for method in ('Page.enable','Runtime.enable','Network.enable','DOM.enable'):self.cdp.call(method,session=session)
        if audit:
            script=(HERE/'audit.js').read_text(encoding='utf-8')
            if read_failure:script+='\nwindow.__readFailure=true;'
            self.cdp.call('Page.addScriptToEvaluateOnNewDocument',{'source':script},session)
        self.cdp.call('Emulation.setDeviceMetricsOverride',{'width':1440,'height':1100,'deviceScaleFactor':1,'mobile':False},session)
        result=self.cdp.call('Page.navigate',{'url':self.origin+path},session)
        assert 'errorText' not in result,result
        deadline=time.monotonic()+10
        while not self.evaluate_on(session,'document.readyState==="complete"&&location.href==='+json.dumps(self.origin+path)):
            if time.monotonic()>deadline:raise TimeoutError('Page load')
            time.sleep(.04)
        self.page_sessions.append({'target':target,'session':session,'path':path,'audit':audit})
        return session
    def seed(self,raw):
        self.evaluate_on(self.seed_session,'localStorage.setItem('+json.dumps(KEY)+','+json.dumps(raw)+');localStorage.setItem("fixture-unrelated","keep-this-byte-string");true')
    def fill(self,selector,value):
        self.pointer(selector);self.key('a','KeyA',65,2);self.key('Backspace','Backspace',8)
        if value:self.call('Input.insertText',{'text':value})
        self.until('document.querySelector('+json.dumps(selector)+').value==='+json.dumps(value))
    def choose_order(self,order_id):
        label=self.evaluate('[...document.querySelector("#enquiry-order").options].find(o=>o.value==='+json.dumps(order_id)+').textContent')
        self.select_option('#enquiry-order',label)
    def prepare_draft(self):
        self.pointer('#enquiry-prepare')
        self.until('!document.getElementById("enquiry-preview").hidden&&!document.getElementById("enquiry-download").disabled')
    def assert_no_effect(self,before):
        after=self.snapshot();assert after['storage']==before['storage'];assert after['audit']['writes']==[]
        assert after['audit']['workers']==[] and after['audit']['networkCalls']==[]
        return after
    def message(self,subject,body):
        snap=self.snapshot();assert snap['values']['subject']==subject and snap['values']['body']==body,snap
        assert not snap['injected'];return snap
    def download(self,label,expected,keyboard=False):
        before=self.snapshot();start_index=len(self.events)
        expected_path=self.out/(label+'.expected.txt')
        with expected_path.open('xb') as f:f.write(expected)
        if keyboard:
            assert self.evaluate('document.activeElement.id')=='enquiry-download'
            input_start=len(before['audit']['inputs']);self.key('Enter','Enter',13)
        else:self.pointer('#enquiry-download')
        deadline=time.monotonic()+15
        while True:
            self.evaluate('true')
            begins=[x['params'] for x in self.events[start_index:] if x.get('method')=='Browser.downloadWillBegin']
            assert len(begins)<=1,begins
            if begins:
                begin=begins[0];guid=begin['guid'];assert re.fullmatch(r'[a-fA-F0-9-]{20,80}',guid)
                progress=[x['params'] for x in self.events[start_index:] if x.get('method')=='Browser.downloadProgress' and x['params']['guid']==guid]
                assert not any(x['state']=='canceled' for x in progress)
                complete=[x for x in progress if x['state']=='completed'];physical=self.out/'downloads'/guid
                if complete and physical.is_file():
                    actual=physical.read_bytes();assert actual==expected,{'label':label,'actual':actual.decode('utf-8'),'expected':expected.decode('utf-8')}
                    assert begin['suggestedFilename']=='returnby-enquiry.txt' and begin['url'].startswith('blob:'+self.origin+'/')
                    assert complete[-1]['receivedBytes']==len(expected) and complete[-1]['totalBytes']==len(expected)
                    assert guid not in {d['guid'] for d in self.downloads}
                    item={'label':label,'guid':guid,'bytes':len(actual),'sha256':digest(actual),'physical':'downloads/'+guid,'expected':expected_path.name,'completed':complete[-1],'keyboardEnter':keyboard}
                    after=self.assert_no_effect(before);assert after['values']==before['values']
                    if keyboard:
                        inputs=after['audit']['inputs'][input_start:]
                        assert any(x['type']=='keypress' and x['key']=='Enter' and x['target']=='enquiry-download' and x['trusted'] for x in inputs)
                        item['inputEvidence']=inputs
                    self.downloads.append(item);return item
            if time.monotonic()>deadline:raise TimeoutError('Actual download incomplete: '+label)
            time.sleep(.04)
    def start(self):
        self.report['guard']=guard();self.report['sourceBefore']=manifest()
        self.profile.mkdir();(self.out/'downloads').mkdir();(self.out/'temp').mkdir()
        receiver=self
        class Handler(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                path=unquote(urlsplit(self.path).path)
                if path=='/seed.html':data=b'<!doctype html><title>Owned synthetic storage fixture</title>';mime='text/html';code=200
                elif path=='/favicon.ico':data=b'';mime='image/x-icon';code=204
                else:
                    parts=path.split('/');folder=ROOT/'baseline-dist' if len(parts)>1 and parts[1]=='baseline' else SOURCE/'dist' if len(parts)>1 and parts[1]=='candidate' else None
                    rel=pathlib.PurePosixPath('/'.join(parts[2:]) or 'index.html')
                    file=folder/rel if folder and not rel.is_absolute() and '..' not in rel.parts else None
                    if file and file.is_file():data=file.read_bytes();mime=mimetypes.guess_type(file.name)[0] or 'application/octet-stream';code=200
                    else:data=b'Not found';mime='text/plain';code=404
                receiver.http_log.append({'path':path,'status':code,'bytes':len(data),'sha256':digest(data)})
                self.send_response(code);self.send_header('Content-Type',mime+';charset=utf-8');self.send_header('Content-Length',str(len(data)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(data)
            def log_message(self,*args):pass
        self.server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
        self.origin='http://127.0.0.1:'+str(self.server.server_address[1])
        self.server_thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.server_thread.start()
        self.stderr=(self.out/'chrome-stderr.log').open('xb')
        args=[str(CHROME),'--headless=new','--remote-debugging-port=0','--user-data-dir='+str(self.profile),'--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--metrics-recording-only','--disable-extensions','--window-size=1440,1100','about:blank']
        self.report['chromeCommand']=args
        self.proc=subprocess.Popen(args,stdout=subprocess.DEVNULL,stderr=self.stderr,env=dict(os.environ,TEMP=str(self.out/'temp'),TMP=str(self.out/'temp')))
        self.report['chromePid']=self.proc.pid
        def watch():
            self.report['cleanup']['chromeExitCode']=self.proc.wait();self.report['cleanup']['chromeExitedAt']=now();self.proc_done.set()
        threading.Thread(target=watch,daemon=True).start()
        port=self.profile/'DevToolsActivePort';end=time.monotonic()+15
        self.report['startupPortReadRetries']=[]
        while True:
            if self.proc.poll() is not None:raise RuntimeError('Chrome exited before DevTools startup')
            if time.monotonic()>end:raise TimeoutError('Chrome startup')
            try:
                lines=port.read_text(encoding='utf-8').splitlines()
                if len(lines)==2 and lines[0].isdigit() and lines[1].startswith('/devtools/browser/'):break
                self.report['startupPortReadRetries'].append({'kind':'incomplete','lines':len(lines)})
            except (PermissionError,FileNotFoundError) as exc:
                self.report['startupPortReadRetries'].append({'kind':type(exc).__name__})
            time.sleep(.05)
        self.cdp=CDP(int(lines[0]),lines[1],self.event);self.report['chromeVersion']=self.cdp.call('Browser.getVersion')
        self.cdp.call('Target.setDiscoverTargets',{'discover':True})
        start=time.monotonic();stable=start;previous=None;self.report['startupTargetSamples']=[]
        while True:
            targets=self.cdp.call('Target.getTargets')['targetInfos'];fingerprint=sorted((x['targetId'],x['type'],x['url']) for x in targets);now_t=time.monotonic()
            self.report['startupTargetSamples'].append({'elapsed':now_t-start,'targets':targets})
            if fingerprint!=previous:previous=fingerprint;stable=now_t
            if now_t-start>=2 and now_t-stable>=1:break
            if now_t-start>=6:raise TimeoutError('Initial target inventory did not settle')
            time.sleep(.2)
        self.report['targetsBeforePages']=targets
        self.cdp.call('Browser.setDownloadBehavior',{'behavior':'allowAndName','downloadPath':str(self.out/'downloads'),'eventsEnabled':True})
        self.seed_session=self.new_page('/seed.html')
        self.seed(RAW)
        self.session=self.new_page('/baseline/index.html')
    def exercise(self):
        baseline=self.evaluate('({cards:document.querySelectorAll("#list .card").length,entry:!!document.querySelector("a[href=\\"./enquiry.html\\"]"),find:!!document.querySelector("#find"),calendar:document.querySelectorAll("[data-ics]").length})')
        assert baseline=={'cards':2,'entry':False,'find':True,'calendar':2},baseline
        assert 'enquiry.html' not in self.report['sourceBefore']['baselineBuild']
        self.session=self.new_page('/candidate/index.html')
        assert self.evaluate('!!document.querySelector("a[href=\\"./enquiry.html\\"]")')
        self.pointer('a[href="./enquiry.html"]')
        self.until('location.pathname==="/candidate/enquiry.html"&&document.getElementById("enquiry-count").textContent==="2 saved orders read."')
        # Reload with the frozen pre-page audit before any enquiry action.
        self.session=self.new_page('/candidate/enquiry.html',audit=True)
        self.until('!!window.__audit&&document.getElementById("enquiry-count").textContent==="2 saved orders read."')
        self.report['initialStorage']=self.storage()
        self.group(1,'original missing feature and actual candidate entry',{'baseline':baseline,'candidateEntryOpenedActualPage':True})

        self.choose_order('saved-A')
        for field,value in DETAILS.items():self.fill('#enquiry-'+field,value)
        self.prepare_draft();first=self.message('Return instructions enquiry',BODY_A)
        self.download('01-instructions-A',output_bytes('Return instructions enquiry',BODY_A))
        self.choose_order('saved-B')
        retained=self.snapshot();assert retained['values']['items']==DETAILS['items'] and retained['downloadDisabled']
        self.select_option('#enquiry-request','Whether a return is possible')
        self.prepare_draft();self.message('Return eligibility enquiry',BODY_B)
        self.download('02-eligibility-B',output_bytes('Return eligibility enquiry',BODY_B))
        self.group(2,'two exact saved-order messages and physical text files',{'initial':first,'literalSourceFields':True,'historicalExtraAndCompletionBytesPreserved':self.storage()==self.report['initialStorage']})

        before=self.snapshot();self.fill('#enquiry-items','Blue shirt\nSize M\nOne button missing')
        stale=self.snapshot();assert stale['values']['body']==before['values']['body'] and stale['downloadDisabled'] and stale['copyDisabled']
        self.prepare_draft()
        edited_subject='My reviewed enquiry';edited_body='<b>These are my own words.</b>\nKeep 001.20 and \u20ac literally.\nThanks, Alex'
        self.fill('#enquiry-subject',edited_subject);self.fill('#enquiry-body',edited_body)
        self.download('03-final-edits',output_bytes(edited_subject,edited_body))
        self.select_option('#enquiry-request','Exchange options')
        changed=self.snapshot();assert changed['values']['body']==edited_body and changed['downloadDisabled']
        self.prepare_draft()
        exchange=BODY_B.replace('Blue shirt\nSize M','Blue shirt\nSize M\nOne button missing').replace('Could you confirm whether these items are eligible for a return?','Could you confirm whether an exchange is possible and what options and steps are available?')
        self.message('Exchange options enquiry',exchange)
        self.download('04-exchange',output_bytes('Exchange options enquiry',exchange))
        self.group(3,'detail invalidation, retained wording and actual final edits',{'editedSubject':edited_subject,'editedBody':edited_body,'exchangeExact':True})

        self.choose_order('saved-A');self.select_option('#enquiry-request','How to arrange a return')
        for field,value in DETAILS.items():self.fill('#enquiry-'+field,value)
        self.prepare_draft();self.message('Return instructions enquiry',BODY_A)
        changed_raw=json.dumps([{**ORDER_A,'merchant':'Updated saved store'},ORDER_B],ensure_ascii=False,separators=(',',':'))
        self.seed(changed_raw)
        before=self.snapshot();calls=len(before['audit']['copies']);urls=len(before['audit']['urls'])
        for selector in ['#enquiry-prepare','#enquiry-copy','#enquiry-download']:
            self.pointer(selector)
            after=self.snapshot();assert 'changed' in after['error'].lower() and after['values']==before['values'];assert len(after['audit']['copies'])==calls and len(after['audit']['urls'])==urls;self.assert_no_effect(before)
        self.evaluate('window.__readFailure=true')
        before=self.snapshot();self.pointer('#enquiry-refresh');after=self.snapshot()
        assert after['values']==before['values'] and after['facts']==before['facts'] and after['error']
        self.evaluate('window.__readFailure=false')
        self.pointer('#enquiry-refresh');assert self.snapshot()['downloadDisabled']
        self.prepare_draft();updated_body=BODY_A.replace('Store: Fictional <Shop> & Co','Store: Updated saved store')
        self.message('Return instructions enquiry',updated_body)
        self.download('05-fresh-source',output_bytes('Return instructions enquiry',updated_body))
        # Whole-collection refusal includes an invalid unselected record.
        malformed=json.dumps([{**ORDER_A,'merchant':'Updated saved store'},{**ORDER_B,'orderDate':'not-a-date'}])
        before=self.snapshot();self.seed(malformed);self.pointer('#enquiry-refresh');after=self.snapshot()
        assert after['error'] and after['values']==before['values'] and after['facts']==before['facts']
        self.seed(json.dumps([ORDER_B],ensure_ascii=False));self.pointer('#enquiry-refresh')
        removed=self.snapshot();assert removed['values']['order']=='' and removed['values']['items']==DETAILS['items'] and removed['downloadDisabled']
        self.seed('[]');self.pointer('#enquiry-refresh');assert self.evaluate('document.getElementById("enquiry-count").textContent')=='0 saved orders read.'
        self.seed(RAW);self.pointer('#enquiry-refresh');self.choose_order('saved-A');self.prepare_draft()
        primary=self.session
        self.session=self.new_page('/candidate/enquiry.html',audit=True,read_failure=True)
        self.until('!!document.getElementById("enquiry-error").textContent')
        initial_failure=self.snapshot();assert initial_failure['values']['order']=='' and self.evaluate('document.getElementById("enquiry-prepare").disabled') and initial_failure['audit']['writes']==[]
        self.session=primary
        self.report['primaryVisibilityBeforeActivation']=self.evaluate('document.visibilityState')
        self.call('Page.bringToFront')
        self.until('document.visibilityState==="visible"')
        self.report['primaryVisibilityAfterActivation']=self.evaluate('document.visibilityState')
        self.group(4,'real second-tab freshness, unreadable and malformed collection, retained work',{'initialReadFailure':initial_failure,'staleEffects':0,'removedOrderRequiresNewSelection':True})

        self.message('Return instructions enquiry',BODY_A)
        expected_copy=output_bytes('Return instructions enquiry',BODY_A).decode('utf-8')
        before=self.snapshot();self.pointer('#enquiry-copy');self.until('document.getElementById("enquiry-status").textContent.startsWith("Message copied.")')
        assert self.snapshot()['audit']['copies'][-1]==expected_copy;self.assert_no_effect(before)
        self.evaluate('window.__copyMode="reject"');before=self.snapshot();self.pointer('#enquiry-copy')
        self.until('document.getElementById("enquiry-error").textContent.includes("Authored clipboard refusal")')
        rejected=self.snapshot();assert rejected['values']==before['values'] and not rejected['downloadDisabled']
        self.evaluate('Object.defineProperty(navigator,"clipboard",{configurable:true,value:undefined})')
        calls=len(self.snapshot()['audit']['copies']);self.pointer('#enquiry-copy')
        assert 'unavailable' in self.snapshot()['error'].lower() and len(self.snapshot()['audit']['copies'])==calls
        self.evaluate('Object.defineProperty(navigator,"clipboard",{configurable:true,value:window.__copyPort});window.__copyMode="pending"')
        self.pointer('#enquiry-copy');self.until('typeof window.__releaseCopy==="function"')
        self.fill('#enquiry-body','A newer edited message, kept while the old copy finishes.')
        newer=self.snapshot();self.evaluate('window.__releaseCopy();true')
        self.evaluate('(async()=>{await new Promise(r=>requestAnimationFrame(r));await new Promise(r=>requestAnimationFrame(r));return true})()')
        settled=self.snapshot();assert settled['values']==newer['values'] and settled['status']==newer['status'] and settled['error']==newer['error']
        self.evaluate('window.__copyMode="success"')
        self.group(5,'controlled clipboard success/refusal and late-feedback fence',{'osClipboardWritten':False,'observedCalls':len(settled['audit']['copies']),'lateCompletionPreservedNewerDraft':True})

        self.fill('#enquiry-subject',edited_subject);self.fill('#enquiry-body',edited_body)
        self.evaluate('window.__failNextUrl=true')
        before=self.snapshot();self.pointer('#enquiry-download');after=self.snapshot()
        assert after['values']==before['values'] and 'allocation refusal' in after['error'] and len(after['audit']['urls'])==len(before['audit']['urls'])
        self.assert_no_effect(before)
        self.download('06-allocation-retry',output_bytes(edited_subject,edited_body))
        self.group(6,'download allocation refusal and physical retry',{'retainedEditedText':True,'automaticRetry':False})

        self.call('Emulation.setDeviceMetricsOverride',{'width':390,'height':844,'deviceScaleFactor':1,'mobile':True})
        self.evaluate('document.querySelector(".enquiry-brand").focus();window.scrollTo(0,0)')
        # Programmatic entry focus only; every subsequent traversal/edit/activation is trusted CDP keyboard input.
        self.key('Tab','Tab',9);assert self.evaluate('document.activeElement.id')=='enquiry-refresh'
        self.key('Tab','Tab',9);assert self.evaluate('document.activeElement.id')=='enquiry-order'
        # Closed native selects apply Home/ArrowDown directly; Escape dismisses any native popup before Tab.
        self.key('Home','Home',36);self.key('ArrowDown','ArrowDown',40);self.key('Escape','Escape',27)
        assert self.evaluate('document.getElementById("enquiry-order").value')=='saved-A'
        self.key('Tab','Tab',9);assert self.evaluate('document.activeElement.id')=='enquiry-request'
        self.key('Home','Home',36);self.key('Escape','Escape',27)
        assert self.evaluate('document.getElementById("enquiry-request").value')=='instructions'
        for field in ['items','reason','signature']:
            self.key('Tab','Tab',9);assert self.evaluate('document.activeElement.id')=='enquiry-'+field
            self.key('a','KeyA',65,2);self.key('Backspace','Backspace',8);self.call('Input.insertText',{'text':DETAILS[field]})
        self.key('Tab','Tab',9);assert self.evaluate('document.activeElement.id')=='enquiry-prepare'
        self.key('Enter','Enter',13);self.until('document.activeElement.id==="enquiry-subject"')
        self.message('Return instructions enquiry',BODY_A)
        for wanted in ['enquiry-body','enquiry-copy','enquiry-download']:
            self.key('Tab','Tab',9);assert self.evaluate('document.activeElement.id')==wanted
        self.download('07-keyboard-phone',output_bytes('Return instructions enquiry',BODY_A),keyboard=True)
        dimensions=self.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth,focus:document.activeElement.id})')
        assert dimensions['width']==390 and dimensions['scroll']<=390,dimensions
        self.evaluate('window.scrollTo(0,0)');self.screenshot('phone-top.png')
        self.evaluate('document.getElementById("enquiry-preview").scrollIntoView({block:"start"})');self.screenshot('phone-message.png')
        self.call('Emulation.setDeviceMetricsOverride',{'width':1440,'height':1100,'deviceScaleFactor':1,'mobile':False})
        self.evaluate('window.scrollTo(0,0)');self.screenshot('desktop.png')
        before=self.snapshot();self.evaluate('window.__confirmPrompts=[];window.confirm=s=>{window.__confirmPrompts.push(s);return false;}')
        self.pointer('#enquiry-reset');canceled=self.snapshot();assert canceled['values']==before['values'] and canceled['previewVisible']==before['previewVisible']
        self.evaluate('window.confirm=s=>{window.__confirmPrompts.push(s);return true;}')
        self.pointer('#enquiry-reset');reset=self.snapshot()
        assert reset['values']['order']=='saved-A' and all(reset['values'][k]=='' for k in ['items','reason','signature','subject','body']) and reset['values']['request']=='instructions' and not reset['previewVisible']
        self.assert_no_effect(before)
        self.group(7,'trusted keyboard flow,390px reflow and controlled reset confirmation',{'entryFocus':'programmatic brand focus, followed by actual Tab/selection/text/Enter events','dimensions':dimensions,'confirmationPort':'controlled cancel then confirm; native dialog not claimed','screenshotsRequireInspection':True})

        self.until('window.__audit.urls.length===window.__audit.revoked.length')
        audit=self.snapshot()['audit'];assert audit['writes']==[] and audit['workers']==[] and audit['networkCalls']==[]
        assert self.storage()==self.report['initialStorage']
        starts=[e['params']['guid'] for e in self.events if e.get('method')=='Browser.downloadWillBegin']
        assert len(starts)==len(set(starts))==len(self.downloads)==7
        assert set(starts)=={d['guid'] for d in self.downloads}
        requests=[e['params']['request']['url'] for e in self.events if e.get('method')=='Network.requestWillBeSent']
        assert all(url.startswith(self.origin+'/') or url.startswith('blob:'+self.origin+'/') or url.startswith('data:image/') for url in requests),requests
        errors=[e for e in self.events if e.get('method')=='Runtime.exceptionThrown'];assert not errors,errors
        final_targets=self.cdp.call('Target.getTargets')['targetInfos'];initial_ids={x['targetId'] for x in self.report['targetsBeforePages']}
        unexpected=[x for x in final_targets if x['type'] in ['worker','service_worker','shared_worker'] and x['targetId'] not in initial_ids];assert not unexpected,unexpected
        self.report['sourceAfter']=manifest();assert self.report['sourceAfter']==self.report['sourceBefore']
        self.report['finalStorage']=self.storage();self.report['audit']=audit;self.report['targetsAfter']=final_targets
        self.group(8,'all physical downloads accounted, no writes/sends and exact source preservation',{'downloadCount':7,'requests':requests,'pageErrors':errors,'unknownWorkers':unexpected,'controlledClipboardOnly':True})

def run(name):
    if not re.fullmatch(r'run-v[1-9][0-9]*',name):raise ValueError('Use a unique run-vN')
    try:admission=guard()
    except Exception as error:
        path=ROOT/'evidence'/(name+'-capacity-held.json');write_json(path,{'at':now(),'stage':'before own run/profile/browser creation','error':str(error),'groups':0,'downloads':0});print(json.dumps({'held':str(path),'error':str(error)}));return 2
    out=ROOT/name;out.mkdir(exist_ok=False);write_json(out/'admission.json',admission)
    receiver=Receiver(out);passed=False
    try:
        receiver.start();receiver.exercise();passed=True;receiver.report['status']='behavior_passed_visual_review_pending'
    except BaseException:
        receiver.report['status']='failed';receiver.report['failure']=traceback.format_exc()
        try:
            if receiver.session:receiver.report['failureSnapshot']=receiver.snapshot();receiver.screenshot('failure.png')
        except BaseException:receiver.report['failureObservationError']=traceback.format_exc()
    finally:
        try:receiver.cleanup()
        except BaseException:receiver.report['cleanup']['unexpectedError']=traceback.format_exc()
        c=receiver.report['cleanup']
        if receiver.proc and (not c.get('chromeExited') or c.get('chromeExitCode')!=0 or not c.get('profileRemoved') or c.get('forcedOwnProcessTree')):passed=False;receiver.report['status']='failed_cleanup'
        receiver.report['finishedAt']=now();receiver.report['behaviorPassed']=passed
        for file,value in [('report.json',receiver.report),('events.json',receiver.events),('http.json',receiver.http_log)]:write_json(out/file,value)
        print(json.dumps({'status':receiver.report['status'],'groups':len(receiver.report['groups']),'downloads':len(receiver.downloads),'cleanup':c}),flush=True)
    return 0 if passed else 1
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--run',required=True);args=parser.parse_args();sys.exit(run(args.run))
