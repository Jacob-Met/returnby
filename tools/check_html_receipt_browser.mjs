const {chromium}=await import(process.env.RETURNBY_PLAYWRIGHT || 'playwright');
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=spawn('python3',['-m','http.server','18953','--bind','127.0.0.1','--directory',process.env.BUILD||'dist']);
await new Promise(r=>setTimeout(r,700));
const browser=await chromium.launch({executablePath:process.env.RETURNBY_CHROME || '/usr/local/bin/google-chrome',headless:true,args:['--no-sandbox']});
const html='<html><head><script>window.EMAIL_RAN=true</script><link rel="stylesheet" href="https://tracker.example.test/a"></head><body><div style="display:none">Order #WRONG-1</div><h1>Store: Cedar &amp; Finch</h1><table><tr><td>Order number:</td><td>CF-2048</td></tr><tr><td>Order date:</td><td>2026-11-01</td></tr><tr><td>Total:</td><td>&pound;52.00</td></tr></table><img src="https://tracker.example.test/pixel"></body></html>';
await mkdir('/tmp/tern9a52-html-evidence',{recursive:true});
try{
for (const width of [1440,390]) {
const page=await browser.newPage({viewport:{width,height:900},acceptDownloads:true});
const external=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:18953'))external.push(r.url());});
await page.goto('http://127.0.0.1:18953/batch-intake.html');
await page.locator('#batch-files').setInputFiles({name:'cedar-receipt.eml',mimeType:'message/rfc822',buffer:Buffer.from('Content-Type: text/html; charset=utf-8\r\n\r\n'+html)});
await page.locator('[data-field=orderNo]').waitFor();
assert.equal(await page.locator('[data-field=orderNo]').inputValue(),'CF-2048');
assert.equal(await page.locator('[data-field=merchant]').inputValue(),'Cedar & Finch');
assert.equal(await page.locator('[data-field=total]').inputValue(),'£52.00');
await page.screenshot({path:'/tmp/tern9a52-html-evidence/review-'+width+'.png',fullPage:true});
await page.locator('[data-reviewed]').check();
await page.locator('#batch-preview').click();await page.locator('#batch-save').click();
assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('returnby.v1'))[0].orderNo),'CF-2048');
await page.goto('http://127.0.0.1:18953/');
const downloadPromise=page.waitForEvent('download');await page.locator('[data-ics]').click();const download=await downloadPromise;
await download.saveAs('/tmp/tern9a52-html-evidence/reminder-'+width+'.ics');
assert.equal(await page.evaluate(()=>window.EMAIL_RAN),undefined);assert.deepEqual(external,[]);
await page.close();
}console.log('PASS actual HTML .eml file->review->save->calendar desktop/mobile; no external requests or scripts');
}finally{await browser.close();server.kill();}
