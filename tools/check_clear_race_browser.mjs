import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const { chromium } = await import(process.env.RETURNBY_PLAYWRIGHT || 'playwright');
const root = resolve(process.env.RETURNBY_BUILD || 'dist');
const capture = resolve(process.env.RETURNBY_CLEAR_OUTPUT || 'test-results/clear-race');
const key = 'returnby.v1';
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml' };
const server = createServer(async (request,response)=>{
  const pathname = new URL(request.url,'http://localhost').pathname;
  const file = resolve(root, '.' + (pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+sep)) return void response.writeHead(403).end();
  try { response.writeHead(200, {'content-type':mime[extname(file)]||'application/octet-stream'}).end(await readFile(file)); }
  catch {response.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
const row = id => ({
 id,merchant:'Fixture Supply',orderNo:id,total:'$12.00',
 orderDate:'2026-10-01',windowDays:30,windowSource:'user',createdAt:'2026-10-01T00:00:00Z'
});
const read = page => page.evaluate(k=>JSON.parse(localStorage.getItem(k)||'[]'),key);
const put = (page,rows) => page.evaluate(([k,rows])=>localStorage.setItem(k,JSON.stringify(rows)),[key,rows]);
try {
  await mkdir(capture,{recursive:true});
  browser = await chromium.launch({headless:true,executablePath:process.env.RETURNBY_CHROME || '/usr/local/bin/google-chrome',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const left=await context.newPage(), right=await context.newPage();
  const errors=[];
  for (const page of [left,right]) page.on('pageerror',e=>errors.push(e.message));
  await left.goto(origin); await right.goto(origin);
  await put(left,[row('FIRST')]);
  await left.reload(); await right.reload();
  // Unsaved intake remains intact when another tab adds an unreviewed return.
  await right.locator('#paste').fill('My unsaved confirmation email');
  const updated=[row('FIRST'),row('ADDED-IN-OTHER-TAB')];
  await put(left,updated);
  await right.locator('#clear').click();
  assert.deepEqual(await read(right),updated);
  assert.equal(await right.locator('#tracked-count').textContent(),'2');
  assert.match(await right.locator('#storage-error').textContent(),/changed|review/i);
  assert.equal(await right.locator('#paste').inputValue(),'My unsaved confirmation email');
  await right.screenshot({path:resolve(capture,'stale-clear-preserves-remote-mobile.png'),fullPage:true});
  // Change shared storage exactly while confirm() executes (synchronous browser boundary).
  await right.reload();
  const during=[...updated,row('WRITTEN-DURING-CONFIRM')];
  await right.evaluate(([k,rows])=>{
    window.confirm=()=>{localStorage.setItem(k,JSON.stringify(rows));return true;};
  },[key,during]);
  await right.locator('#clear').click();
  assert.deepEqual(await read(right),during);
  assert.equal(await right.locator('#tracked-count').textContent(),'3');
  assert.match(await right.locator('#storage-error').textContent(),/changed|review/i);
  await right.screenshot({path:resolve(capture,'during-confirm-preserved-mobile.png'),fullPage:true});
  assert.equal(await right.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);
  // Unchanged state still supports deliberate clear.
  await right.reload();
  right.on('dialog', dialog => dialog.accept());
  await right.locator('#clear').click();
  assert.deepEqual(await read(right),[]);
  assert.equal(await right.locator('#tracked-count').textContent(),'0');
  console.log(JSON.stringify({browser:browser.version(),result:'3 clear paths passed',real_tabs:2,stale_remote_preserved:true,write_during_confirm_preserved:true,unchanged_clear:true,console_errors:errors}));
  await context.close();
} finally {
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
