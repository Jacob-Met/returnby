import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
const { chromium } = await import(process.env.RETURNBY_PLAYWRIGHT || 'playwright');
const root = resolve(process.env.RETURNBY_BUILD || 'dist');
const evidence = resolve(process.env.RETURNBY_EVIDENCE || '/tmp/returnby-phone-desk');
await mkdir(evidence, { recursive: true });
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const server = createServer(async (req,res) => {
  const url = new URL(req.url, 'http://localhost');
  const file = resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
  if (!file.startsWith(root + sep)) return void res.writeHead(403).end();
  try { res.writeHead(200, {'content-type':types[extname(file)] || 'application/octet-stream'}).end(await readFile(file)); }
  catch { res.writeHead(404).end(); }
});
await new Promise(done => server.listen(0,'127.0.0.1',done));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ headless:true, executablePath: process.env.RETURNBY_CHROME || undefined });
const errors=[];
try {
  const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  let page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin);
  assert(await page.locator('#purchase-intake').isVisible(),'empty phone starts with intake');
  await page.locator('#manual-open').click();
  for(const [name,value] of Object.entries({merchant:'Briar Trail Outfitters',orderDate:'2026-11-04',windowDays:'30',orderNo:'BT-4102',total:'$84.00'}))
    await page.locator('#manual-form [name='+name+']').fill(value);
  await page.locator('#manual-form button[type=submit]').click();
  await page.waitForFunction(()=>document.activeElement?.hasAttribute('data-order-id'));
  assert(await page.locator('#saved-returns').isVisible(),'manual save reveals the tracker');
  assert(!await page.locator('#purchase-intake').isVisible(),'manual save closes phone intake');
  assert.match(await page.locator('#edit-feedback').textContent(),/Briar Trail Outfitters saved/);
  assert.match(await page.locator(':focus').textContent(),/Briar Trail/);
  await page.screenshot({path:evidence+'/phone-saved-focus.png'});
  await page.close();

  page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin);
  assert(!await page.locator('#purchase-intake').isVisible(),'fresh-tab return visit must not lead with blank intake');
  const deadline=await page.locator('#list .return-by').first().boundingBox();
  assert(deadline && deadline.y>=0 && deadline.y+deadline.height<844,'saved deadline must be readable in first phone screen: '+JSON.stringify(deadline));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no phone overflow');
  await page.screenshot({path:evidence+'/phone-returning.png'});
  console.log('PASS fresh phone visit: first saved deadline at y='+deadline.y.toFixed(1));

  await page.locator('#return-search').fill('Briar');
  await page.locator('#desk-add').click();
  const receipt='Cedar Market\nOrder #CM-219\nOrder date: November 8, 2026\nTotal: $48.00';
  await page.locator('#paste').fill(receipt);
  await page.locator('#find').click();
  for(const [name,value] of Object.entries({merchant:'Cedar Market',orderDate:'2026-11-08',windowDays:'30',orderNo:'CM-219',total:'$48.00'}))
    await page.locator('#preview [name='+name+']').fill(value);
  await page.locator('#desk-back').click();
  assert(await page.locator('#saved-returns').isVisible());
  await page.locator('#desk-add').click();
  assert.equal(await page.locator('#paste').inputValue(),receipt,'back navigation preserves unsaved email');
  assert.equal(await page.locator('#preview [name=merchant]').inputValue(),'Cedar Market','back navigation preserves reviewed fields');

  await page.evaluate(()=>{
    window.originalWrite=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){if(key==='returnby.v1')throw new DOMException('Full','QuotaExceededError');return window.originalWrite.call(this,key,value);};
  });
  await page.locator('#preview button[type=submit]').click();
  assert(await page.locator('#storage-error').isVisible(),'failed save remains visible outside collapsed sections');
  assert(await page.locator('#preview').isVisible(),'failed save preserves reviewed draft');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('returnby.v1')).length),1);
  await page.evaluate(()=>{Storage.prototype.setItem=window.originalWrite;});
  await page.locator('#preview button[type=submit]').click();
  await page.waitForFunction(()=>document.activeElement?.hasAttribute('data-order-id') && document.activeElement.textContent.includes('Cedar Market'));
  assert.equal(await page.locator('#return-search').inputValue(),'','save clears stale search so new record is discoverable');
  assert.equal(await page.locator('#tracked-count').textContent(),'2');
  assert.match(await page.locator(':focus').textContent(),/Cedar Market/);
  console.log('PASS draft-preserving navigation, storage refusal/retry and explicit saved-row focus');

  await page.goto(origin+'/#paste');
  assert(await page.locator('#purchase-intake').isVisible(),'explicit intake links open the form');
  await page.locator('#desk-back').click();
  assert.equal(new URL(page.url()).hash,'','returning to tracker removes stale intake hash');
  await page.setViewportSize({width:1440,height:1000});
  await page.waitForFunction(()=>!document.getElementById('purchase-intake').hidden && !document.getElementById('saved-returns').hidden);
  assert(await page.locator('#purchase-intake').isVisible() && await page.locator('#saved-returns').isVisible(),'desktop retains both panels');
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:evidence+'/desktop-return-desk.png'});
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>document.getElementById('purchase-intake').hidden && !document.getElementById('saved-returns').hidden);
  assert(!await page.locator('#purchase-intake').isVisible(),'resize returns to selected phone desk');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#desk-add').click();
  await page.locator('#paste').fill('Store: Cedar Pending\nOrder date: November 1, 2026\nOrder number: PENDING-481\nTotal: $57.98\nReturns accepted within 14 days of delivery.');
  await page.locator('#find').click();
  await page.locator('#save-pending-delivery').click();
  await page.close();
  page=await context.newPage();
  await page.goto(origin);
  assert(await page.locator('#saved-returns').isVisible(),'saved desk remains primary with pending delivery');
  assert(await page.locator('#pending-desk').isVisible(),'pending purchase is discoverable outside collapsed intake');
  await page.locator('#pending-desk .pending-purchase button').first().click();
  assert(await page.locator('#purchase-intake').isVisible(),'pending resume opens phone intake');
  assert(await page.locator('#preview').isVisible(),'pending review is visible after opening');
  await page.locator('#preview [name=windowStartDate]').fill('2026-11-06');
  await page.locator('#preview button[type=submit]').click();
  await page.waitForFunction(()=>document.activeElement?.hasAttribute('data-order-id') && document.activeElement.textContent.includes('Cedar Pending'));
  assert.equal(await page.locator('#pending-desk').isVisible(),false,'confirmed delivery clears pending indicator');
  assert.equal(await page.locator('#tracked-count').textContent(),'3');
  console.log('PASS pending-delivery indicator on returning phone and resumed saved-row focus');
  assert.deepEqual(errors,[],'no runtime errors');
  console.log('PASS explicit intake links, phone/desktop resize and zero runtime errors');
  await context.close();

  const broken=await browser.newContext({viewport:{width:390,height:844}});
  await broken.addInitScript(()=>localStorage.setItem('returnby.v1','not-json'));
  const failure=await broken.newPage();
  await failure.goto(origin);
  assert(await failure.locator('#storage-error').isVisible(),'unreadable records must not silently become empty intake');
  assert(await failure.locator('#saved-returns').isVisible());
  assert.match(await failure.locator('#list').textContent(),/unavailable/);
  await failure.screenshot({path:evidence+'/phone-storage-error.png'});
  await broken.close();
  console.log('PASS unreadable saved data remains visible and recoverable');
} finally {
  await browser.close();
  await new Promise(done=>server.close(done));
}
