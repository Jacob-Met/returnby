
const {chromium}=await import(process.env.RETURNBY_PLAYWRIGHT || 'playwright');
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const output=process.env.EVIDENCE || 'docs/manual-purchase';
await mkdir(output,{recursive:true});
const url=process.env.BASE_URL || 'http://127.0.0.1:18972';
const server=process.env.BASE_URL ? null : spawn('python3',['-m','http.server','18972','--bind','127.0.0.1','--directory',process.env.BUILD || 'dist']);
const browser=await chromium.launch({executablePath:'/usr/local/bin/google-chrome',headless:true,args:['--no-sandbox']});
const results=[];
try {
for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900},acceptDownloads:true});
 const page=await context.newPage();
 for(let attempt=0;;attempt++){try {await page.goto(url);break;}catch(e){if(attempt>15)throw e;await new Promise(r=>setTimeout(r,100));}}
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.locator('#paste').fill('Private email draft waiting for review');
 await page.locator('#manual-open').click();
 await page.locator('#manual-form button[type=submit]').click();
 assert.match(await page.locator('#manual-error').innerText(),/store name/);
 assert.equal(await page.evaluate(()=>localStorage.getItem('returnby.v1')),null);
 const form=page.locator('#manual-form');
 await form.locator('[name=merchant]').fill('Paper & Pine');
 await form.locator('[name=orderDate]').fill('2026-11-10');
 await form.locator('[name=windowDays]').fill('14');
 await form.locator('[name=orderNo]').fill('PAPER-414');
 await form.locator('[name=total]').fill('£42.50');
 assert.equal(await page.locator('#manual-deadline').innerText(),'Return by 2026-11-24');
 await page.locator('#manual-close').click();
 assert.equal(await page.locator('#paste').inputValue(),'Private email draft waiting for review');
 await page.locator('#manual-open').click();
 assert.equal(await form.locator('[name=orderNo]').inputValue(),'PAPER-414');
 await page.screenshot({path:output+'/manual-'+width+'.png'});
 // Refused storage write must leave a retryable draft and no saved purchase.
 await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Quota exceeded','QuotaExceededError');};});
 await form.locator('button[type=submit]').click();
 assert.match(await page.locator('#manual-error').innerText(),/wasn't saved/);
 assert.equal(await form.locator('[name=merchant]').inputValue(),'Paper & Pine');
 await page.evaluate(()=>{Storage.prototype.setItem=window.originalSetItem;});
 await form.locator('button[type=submit]').click();
 assert.equal(await page.locator('#manual-dialog').evaluate(e=>e.open),false);
 assert.equal(await page.locator('#paste').inputValue(),'Private email draft waiting for review');
 let stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('returnby.v1')));
 assert.equal(stored.length,1);assert.equal(stored[0].windowSource,'user');assert.equal(stored[0].total,'£42.50');
 assert.equal(JSON.stringify(stored).includes('Private email'),false);
 await page.locator('#paste').fill('');
 await page.reload();
 assert.match(await page.locator('#list').innerText(),/Paper & Pine/);
 const download=page.waitForEvent('download');await page.locator('[data-ics]').click();
 const receipt=await download;const ics=await readFile(await receipt.path(),'utf8');
 assert.match(ics,/20261124/);assert.match(ics,/PAPER-414/);
 await page.locator('#list').scrollIntoViewIfNeeded();
 await page.screenshot({path:output+'/saved-'+width+'.png'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);
 results.push({width,manualReview:true,closeResume:true,writeRefusalRetry:true,persistedReload:true,calendarDeadline:'2026-11-24',separateEmailDraft:true,noOverflow:true});
 await context.close();
}
await writeFile(output+'/result.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results));
} finally {await browser.close();server?.kill();}
