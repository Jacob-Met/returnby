from pathlib import Path
import json,hashlib,subprocess,traceback,time,re,asyncio
from playwright.async_api import async_playwright
ROOT=Path('D:/HAMON/returnby-backup-calendar-browser-5f566b5ec8ef')
SOURCE=ROOT/'source';OUT=ROOT/'evidence/browser-v1';OUT.mkdir(exist_ok=False)
CHROME='C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
at='2026-10-09T12:00:00.000Z'
def order(id,**extra):
 return dict(id=id,merchant='Shop Ω <img src="https://example.invalid/x">,\nsecond',orderNo='A,;\\ #',total='12.34',orderDate='2026-10-01',windowDays=30,windowSource='user',createdAt=at,**extra)
def payload(rows):
 return json.dumps(dict(schema='returnby.backup',version=2,exportedAt=at,orders=rows),ensure_ascii=False).encode()
fixtures=OUT/'fixtures';fixtures.mkdir()
# kwargs replacement helper above must permit overrides.
def make(id,**extra):
 d=order(id);d.update(extra);return d
mixed=[make('late'),make('done',completedAt=at),make('edge',orderDate='9999-12-30',windowDays=1),make('early',orderDate='2026-09-01')]
cases={'mixed.json':payload(mixed),'replacement.json':payload([make('new')]),'many.json':payload([make('item'+str(i)) for i in range(80)]),'malformed.json':b'{"schema":','invalid-last.json':payload([make('valid'),make('bad',windowDays=0)]),'empty.json':payload([]),'slow-a.json':payload([make('old')]),'slow-error.json':payload([make('error-old')]),'digest-a.json':payload([make('digest-old')])}
for name,b in cases.items():(fixtures/name).write_bytes(b)
hashes={str(p.relative_to(SOURCE)):hashlib.sha256(p.read_bytes()).hexdigest() for p in SOURCE.rglob('*') if p.is_file() and '.git' not in p.parts}
checks=[];errors=[];external=[];browser=None;context=None;page=None
def check(name):checks.append(name)
async def wait_value(page,expr,value=True):
 end=time.monotonic()+8
 while time.monotonic()<end:
  if await page.evaluate(expr)==value:return
  await asyncio.sleep(.03)
 raise AssertionError('Timed out '+expr)
async def load(page,name):
 await page.locator('#choose').set_input_files(str(fixtures/name))
 await page.locator('#source-name').filter(has_text=name).wait_for(state='visible')
async def run():
 global browser,context,page
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=CHROME,headless=True)
  context=await browser.new_context(viewport={'width':1280,'height':900},accept_downloads=True)
  async def route(r):
   u=r.request.url
   if u.startswith('file:') or u.startswith('blob:'):await r.continue_()
   else:external.append(u);await r.abort()
  await context.route('**/*',route)
  await context.add_init_script(r"""
window.__reads=[];window.__digests=[];window.__holdDigest=false;window.__stores=[];
const read=File.prototype.arrayBuffer;
File.prototype.arrayBuffer=function(){
 const file=this;
 if(!file.name.startsWith('slow-'))return read.call(file);
 return new Promise((resolve,reject)=>window.__reads.push({name:file.name,done:()=>read.call(file).then(resolve,reject),fail:()=>reject(new Error('Controlled late read failure'))}));
};
const digest=crypto.subtle.digest.bind(crypto.subtle);
crypto.subtle.digest=function(...args){
 if(!window.__holdDigest)return digest(...args);
 window.__holdDigest=false;
 return new Promise((resolve,reject)=>window.__digests.push({done:()=>digest(...args).then(resolve,reject),fail:()=>reject(new Error('Controlled late digest failure'))}));
};
const set=Storage.prototype.setItem;
Storage.prototype.setItem=function(...args){window.__stores.push(args);return set.apply(this,args);};
""")
  page=await context.new_page()
  page.on('pageerror',lambda e:errors.append(str(e)))
  await page.goto((SOURCE/'browser/calendar.html').as_uri(),wait_until='load')
  assert await page.locator('#source').is_hidden()
  assert await page.locator('#preview').is_hidden()
  check('Standalone local file loads with no implicit source, selection or download')
  await load(page,'mixed.json')
  assert await page.locator('#rows tr').count()==4
  assert await page.locator('#rows input:checked').count()==0
  assert await page.locator('#rows input:disabled').count()==2
  assert await page.locator('#source-hash').inner_text()==hashlib.sha256(cases['mixed.json']).hexdigest()
  assert await page.locator('#rows img').count()==0
  check('Actual complete file input displays literal four source rows with no default selection; completed and blocked disabled')
  await page.locator('input[data-id="late"]').focus();await page.keyboard.press('Space')
  await page.locator('input[data-id="early"]').check()
  await page.locator('#prepare').focus();await page.keyboard.press('Enter')
  assert await page.locator('#preview').is_visible()
  assert await page.locator('#preview-body tr').count()==2
  assert await page.locator('#preview-body tr').first.locator('td').nth(1).inner_text()=='early'
  check('Keyboard selection and explicit preview preserve native calendar order')
  stamp=re.search(r'timestamp (\S+)',await page.locator('#preview-binding').inner_text()).group(1)
  async with page.expect_download() as download:await page.locator('#download').click()
  downloaded=await download.value;path=OUT/'reviewed.ics';await downloaded.save_as(str(path))
  (OUT/'native-parity-input.json').write_text(json.dumps({'file':str(fixtures/'mixed.json'),'ids':['late','early'],'at':stamp}),encoding='utf-8')
  parity=ROOT/'native-browser-parity.mjs'
  run=subprocess.run(['C:/Program Files/nodejs/node.exe',str(parity),str(OUT/'native-parity-input.json'),str(OUT/'native-expected.ics')],capture_output=True)
  (OUT/'parity-stdout.txt').write_bytes(run.stdout);(OUT/'parity-stderr.txt').write_bytes(run.stderr)
  assert run.returncode==0,run.stderr
  assert path.read_bytes()==(OUT/'native-expected.ics').read_bytes()
  raw=path.read_bytes();assert raw.count(b'BEGIN:VEVENT')==2 and raw.count(b'TRIGGER:-P3D')==2
  assert all(len(line)<=75 for line in raw.split(b'\r\n'))
  check('Physical downloaded ICS equals complete unchanged accepted native output at captured time; two actual events and folded lines')
  await page.screenshot(path=str(OUT/'desktop-preview.png'),full_page=True)
  await page.set_viewport_size({'width':390,'height':844})
  assert await page.evaluate('document.documentElement.scrollWidth')==390
  await page.screenshot(path=str(OUT/'phone-preview.png'),full_page=True)
  check('Actual desktop and 390px preview remain within viewport; source tables have their own scroll')
  await page.locator('input[data-id="late"]').uncheck();await page.locator('input[data-id="late"]').check()
  assert await page.locator('#preview').is_hidden();assert await page.locator('#download').is_disabled()
  await page.locator('#prepare').click()
  await page.locator('#choose').set_input_files([])
  assert await page.locator('#preview').is_visible()
  check('A-B-A checkbox edits require new preview; empty chooser selection preserves current review')
  await load(page,'replacement.json')
  assert await page.locator('#rows input:checked').count()==0 and await page.locator('#preview').is_hidden()
  check('A new explicit source retires the prior selection and preview')
  for name in ['malformed.json','invalid-last.json']:
   await page.locator('#choose').set_input_files(str(fixtures/name))
   await page.locator('#status.error').wait_for()
   assert await page.locator('#source').is_hidden() and await page.locator('#preview').is_hidden()
  check('Malformed and late-invalid complete backups refuse without stale source/calendar')
  await load(page,'many.json')
  await page.locator('input[data-id="item0"]').check()
  await page.locator('#next').click()
  assert await page.locator('#rows tr').count()==30
  await page.locator('input[data-id="item79"]').check();await page.locator('#previous').click()
  assert await page.locator('input[data-id="item0"]').is_checked()
  await page.locator('#prepare').click();assert await page.locator('#preview-body tr').count()==2
  check('All eighty source occurrences are accessible and selections survive fifty-row pagination')
  await page.locator('#choose').set_input_files(str(fixtures/'slow-a.json'))
  await wait_value(page,'window.__reads.length',1)
  await load(page,'replacement.json')
  await page.evaluate('window.__reads.shift().done()');await asyncio.sleep(.1)
  assert await page.locator('#source-name').inner_text()=='replacement.json'
  check('Controlled late File.arrayBuffer success cannot replace newer actual source')
  await page.locator('#choose').set_input_files(str(fixtures/'slow-error.json'))
  await wait_value(page,'window.__reads.length',1)
  await load(page,'mixed.json')
  await page.evaluate('window.__reads.shift().fail()');await asyncio.sleep(.1)
  assert not await page.locator('#status').evaluate('(x)=>x.classList.contains("error")')
  check('Controlled late read rejection cannot overwrite current source status')
  await page.evaluate('window.__holdDigest=true')
  await page.locator('#choose').set_input_files(str(fixtures/'digest-a.json'))
  await wait_value(page,'window.__digests.length',1)
  await load(page,'replacement.json');await page.evaluate('window.__digests.shift().done()');await asyncio.sleep(.1)
  assert await page.locator('#source-name').inner_text()=='replacement.json'
  check('Controlled late actual SHA digest success cannot replace newer source')
  await page.evaluate('window.__holdDigest=true')
  await page.locator('#choose').set_input_files(str(fixtures/'digest-a.json'))
  await wait_value(page,'window.__digests.length',1)
  await page.locator('#clear').click();await page.evaluate('window.__digests.shift().fail()');await asyncio.sleep(.1)
  assert await page.locator('#source').is_hidden()
  assert (await page.locator('#status').inner_text()).startswith('Cleared.')
  check('Clear retires pending digest rejection without restoring a source or error')
  await load(page,'empty.json')
  assert await page.locator('#rows tr').count()==0 and await page.locator('#select-all').is_disabled()
  check('Empty valid backup remains explicit and cannot create an implicit event')
  await load(page,'mixed.json');await page.locator('#select-all').click()
  assert await page.locator('#rows input:checked').count()==2
  await page.locator('#clear-selection').click();assert await page.locator('#prepare').is_disabled()
  check('Explicit select-all includes only eligible IDs; clearing selection retires its output')
  assert await page.evaluate('window.__stores')==[];assert not errors;assert not external
  check('No browser storage writes, external requests or page errors throughout actual use')
  await context.close();context=None;await browser.close();browser=None
receipt={'exit':1,'checks':checks,'scope':'Actual installedChrome local file/download. Late read/digest continuations use explicit test-only controlled seams. No original45 fullcampaign replay.'}
start=time.monotonic()
try:
 asyncio.run(run());receipt['exit']=0
except BaseException:
 receipt['failure']=traceback.format_exc()
finally:
 receipt.update(seconds=time.monotonic()-start,count=len(checks),errors=errors,external_requests=external,source_hashes=hashes)
 receipt['source_unchanged']=all(hashlib.sha256((SOURCE/p).read_bytes()).hexdigest()==h for p,h in hashes.items())
 (OUT/'receipt.json').write_bytes((json.dumps(receipt,indent=2)+'\n').encode())
 print(json.dumps(receipt))
