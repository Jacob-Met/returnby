"""Attributed native receiver helpers, copied exactly from qualified Ledgerly receiver75f0fd2.
Product-specific startup and tests are in receive.py; no donor runtime state is used.
"""
import base64,json,threading,time,shutil,subprocess,datetime,hashlib
OWNER="hamon-ultra-ab529ac65023-20261008/coordination-integration"
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def digest(raw):return hashlib.sha256(raw).hexdigest()
def git_blob(raw):return hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()
class BrowserBase:
    def __init__(self, out):
        self.out = out
        self.cdp = None
        self.session = None
        self.proc = None
        self.proc_done = threading.Event()
        self.server = None
        self.server_thread = None
        self.stderr = None
        self.profile = out / 'profile'
        self.events = []
        self.downloads = []
        self.http_log = []
        self.errors = []
        self.report = {'schema': 'ledgerly.saved-ledger-windows-browser/1', 'startedAt': now(), 'owner': OWNER, 'scope': 'Independently served exact static reader projection; not full application, deploy, or Actions qualification', 'status': 'started', 'groups': [], 'downloads': self.downloads, 'screenshots': [], 'cleanup': {}, 'noActions': True, 'noInstallation': True}

    def event(self, event):
        # Nonreentrant record-only callback. No Fetch interception/paused targets.
        if len(self.events) >= 10000:
            raise RuntimeError('CDP event bound exceeded')
        event['receivedAt'] = now()
        self.events.append(event)

    def call(self, method, params=None, timeout=15):
        return self.cdp.call(method, params, self.session, timeout)

    def evaluate(self, expression, timeout=15):
        result = self.call('Runtime.evaluate', {'expression': expression, 'awaitPromise': True, 'returnByValue': True}, timeout)
        if 'exceptionDetails' in result:
            raise RuntimeError('Page evaluation exception: ' + json.dumps(result['exceptionDetails']))
        return result.get('result', {}).get('value')

    def until(self, expression, timeout=10):
        deadline = time.monotonic() + timeout
        while True:
            value = self.evaluate(expression, timeout=min(15, max(1, deadline-time.monotonic())))
            if value:
                return value
            if time.monotonic() >= deadline:
                raise TimeoutError('Browser predicate did not settle: ' + expression[:180])
            time.sleep(0.04)

    def pointer(self, selector):
        coordinates = self.evaluate("""(()=>{const e=document.querySelector(SELECTOR);if(!e||e.disabled)throw new Error('Missing or disabled pointer target');e.scrollIntoView({block:'center',inline:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height};})()""".replace('SELECTOR', json.dumps(selector)))
        assert coordinates['w'] > 0 and coordinates['h'] > 0
        x, y = coordinates['x'], coordinates['y']
        for kind in ('mouseMoved', 'mousePressed', 'mouseReleased'):
            self.call('Input.dispatchMouseEvent', {'type': kind, 'x': x, 'y': y, 'button': 'left' if kind != 'mouseMoved' else 'none', 'buttons': 1 if kind == 'mousePressed' else 0, 'clickCount': 1 if kind != 'mouseMoved' else 0})

    def key(self, key, code, vk, modifiers=0):
        for kind in ('keyDown', 'keyUp'):
            params = {'type': kind, 'key': key, 'code': code, 'windowsVirtualKeyCode': vk, 'nativeVirtualKeyCode': vk, 'modifiers': modifiers}
            # CDP Enter needs the CR text to produce its native keypress/default
            # activation. Same mapping as Puppeteer's cdp/Input.ts and
            # common/USKeyboardLayout.ts; no synthetic DOM event or click.
            if kind == 'keyDown' and key == 'Enter':
                params.update(text='\r', unmodifiedText='\r')
            self.call('Input.dispatchKeyEvent', params)

    def select_option(self, selector, label):
        # Actual pointer focus, then native keyboard selection in the select.
        options = self.evaluate('[...document.querySelector(' + json.dumps(selector) + ').options].map(o=>o.textContent)')
        index = options.index(label)
        self.pointer(selector)
        self.key('Escape', 'Escape', 27)
        self.key('Home', 'Home', 36)
        for _ in range(index):
            self.key('ArrowDown', 'ArrowDown', 40)
        self.key('Enter', 'Enter', 13)
        self.until('document.querySelector(' + json.dumps(selector) + ').selectedIndex===' + str(index))

    def screenshot(self, name):
        raw = base64.b64decode(self.call('Page.captureScreenshot', {'format': 'png', 'captureBeyondViewport': False})['data'], validate=True)
        assert raw.startswith(b'\x89PNG\r\n\x1a\n')
        with (self.out / name).open('xb') as f:
            f.write(raw)
        self.report['screenshots'].append({'file': name, 'bytes': len(raw), 'sha256': digest(raw), 'visualInspection': 'pending independent human-visible image inspection'})

    def group(self, number, name, details):
        self.report['groups'].append({'number': number, 'name': name, 'status': 'passed', 'at': now(), 'details': details})
        print(json.dumps({'group': number, 'name': name, 'passed': True}), flush=True)

    def cleanup(self):
        cleanup = self.report['cleanup']
        if self.cdp:
            try:
                self.cdp.call('Browser.close', timeout=5)
                cleanup['browserCloseAcknowledged'] = True
            except Exception as error:
                cleanup['browserCloseError'] = repr(error)
            try:
                self.cdp.close()
            except Exception as error:
                cleanup['socketCloseError'] = repr(error)
        if self.proc:
            if not self.proc_done.wait(8) and self.proc.poll() is None:
                cleanup['forcedOwnProcessTree'] = True
                try:
                    result = subprocess.run(['taskkill','/PID',str(self.proc.pid),'/T','/F'],capture_output=True,text=True,timeout=8)
                    cleanup['taskkill'] = {'returncode':result.returncode,'stdout':result.stdout,'stderr':result.stderr}
                except Exception as error:
                    cleanup['taskkillError'] = repr(error)
                self.proc_done.wait(5)
            cleanup['chromeExited'] = self.proc_done.is_set()
        if self.stderr:
            self.stderr.close()
        if self.server:
            self.server.shutdown()
            self.server.server_close()
        if self.server_thread:
            self.server_thread.join(timeout=3)
        if self.profile.exists():
            # Only the exact profile created by this run, only after Chrome exit.
            if self.proc is None or self.proc_done.is_set():
                try:
                    assert self.profile.parent==self.out and self.profile.name=='profile'
                    shutil.rmtree(self.profile)
                except Exception as error:
                    cleanup['profileRemovalError']=repr(error)
            cleanup['profileRemoved'] = not self.profile.exists()
        else:
            cleanup['profileRemoved'] = True
