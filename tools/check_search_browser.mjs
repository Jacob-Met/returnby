const {chromium}=await import(process.env.RETURNBY_PLAYWRIGHT || 'playwright');
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=spawn('python3',['-m','http.server','18952','--bind','127.0.0.1','--directory',process.env.BUILD||'dist']);
await new Promise(r=>setTimeout(r,1000));
const browser=await chromium.launch({executablePath:process.env.RETURNBY_CHROME || '/usr/local/bin/google-chrome',headless:true,args:['--no-sandbox']});
await mkdir(process.env.RETURNBY_EVIDENCE || '/tmp/returnby-search-evidence',{recursive:true});
try {
for (const width of [1440,390]) {
const page=await browser.newPage({viewport:{width,height:900}});
await page.goto('http://127.0.0.1:18952');
await page.evaluate(()=>localStorage.setItem('returnby.v1',JSON.stringify([{id:'first',merchant:'Cedar Camera',orderNo:'CAM-2048',orderDate:'2026-11-01',windowDays:30,windowSource:'user',createdAt:'2026-11-01T00:00:00Z'},{id:'second',merchant:'Harbor Books',orderNo:'BOOK-713',orderDate:'2026-10-01',windowDays:30,windowSource:'user',createdAt:'2026-10-01T00:00:00Z'},{id:'third',merchant:'Cedar Camera',orderNo:'CAM-2055',orderDate:'2026-11-01',windowDays:30,windowSource:'user',createdAt:'2026-11-01T00:00:00Z'}])));
await page.reload();
assert.equal(await page.locator('#list .card').count(),3);
await page.locator('#return-search').fill(' cAm-2048 ');
assert.equal(await page.locator('#list .card').count(),1);
assert.match(await page.locator('#list').innerText(),/CAM-2048/);
await page.locator('#return-search').scrollIntoViewIfNeeded();
await page.screenshot({path:(process.env.RETURNBY_EVIDENCE || '/tmp/returnby-search-evidence')+'/search-'+width+'.png'});
await page.locator('#filter-expired').click();
assert.equal(await page.locator('#list .card').count(),0);
await page.locator('#search-clear').click();
assert.equal(await page.locator('#list .card').count(),1);
await page.locator('#filter-all').click();
assert.equal(await page.locator('#list .card').count(),3);
await page.locator('#return-search').fill('cedar');
assert.equal(await page.locator('#list .card').count(),2);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('returnby.v1')).length),3);
await page.close();
}
console.log('PASS desktop/mobile search, whitespace/case, exact reference, urgency composition, clear, preservation, no overflow');
} finally {await browser.close();server.kill();}
