const {chromium}=await import(process.env.RETURNBY_PLAYWRIGHT || 'playwright');
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.EVIDENCE||'/tmp/astra-wren-52d1/refund-evidence';
await mkdir(out,{recursive:true});
const server=process.env.BASE_URL?null:spawn('python3',['-m','http.server','18974','--bind','127.0.0.1','--directory',process.env.BUILD||'dist']);
const url=process.env.BASE_URL||'http://127.0.0.1:18974';
const browser=await chromium.launch({executablePath:'/usr/local/bin/google-chrome',headless:true,args:['--no-sandbox']});
const results=[];
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900},acceptDownloads:true});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(let n=0;;n++){try{await page.goto(url);break;}catch(e){if(n>15)throw e;await new Promise(r=>setTimeout(r,100));}}
 await page.locator('#manual-open').click();const manual=page.locator('#manual-form');
 await manual.locator('[name=merchant]').fill('Paper & Pine');await manual.locator('[name=orderDate]').fill('2026-11-01');await manual.locator('[name=windowDays]').fill('30');await manual.locator('[name=orderNo]').fill('PAPER-42');await manual.locator('[name=total]').fill('£84.00');await manual.locator('[type=submit]').click();
 await page.locator('#list [data-refund]').click();const f=page.locator('#refund-form');
 await f.locator('[name=amount]').fill('£24.00');await f.locator('[name=followUpDate]').fill('2026-11-09');await f.locator('[name=note]').fill('Blue shirt only. Drop-off reference PP-821. Store asked me to check after 7 days.');
 await page.screenshot({path:out+'/dialog-'+width+'.png'});
 await page.evaluate(()=>{window.oldSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new Error('full');};});
 await f.locator('[type=submit]').click();assert.match(await page.locator('#refund-error').innerText(),/not saved/);assert.equal(await f.locator('[name=amount]').inputValue(),'£24.00');
 await page.evaluate(()=>Storage.prototype.setItem=window.oldSet);await f.locator('[type=submit]').click();
 assert.equal(await page.locator('#refund-count').innerText(),'1');assert.match(await page.locator('#refund-pending').innerText(),/Follow up now/);
 await page.reload();await page.locator('#refunds').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/pending-'+width+'.png'});
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('returnby.v1')));
 assert.equal(saved[0].total,'£84.00');assert.equal(saved[0].windowDays,30);assert.equal(saved[0].refundAmount,'£24.00');
 await page.locator('#refund-pending [data-refund]').click();await f.locator('[name=note]').fill('My draft must not replace a newer update.');
 await page.evaluate(()=>{const rows=JSON.parse(localStorage.getItem('returnby.v1'));rows[0].refundNote='Newer merchant reference';localStorage.setItem('returnby.v1',JSON.stringify(rows));});
 await f.locator('[type=submit]').click();assert.match(await page.locator('#refund-error').innerText(),/changed/);await page.locator('#refund-close').click();await page.reload();
 await page.locator('#refund-pending [data-refund]').click();await f.locator('[name=state]').selectOption('received');await f.locator('[type=submit]').click();
 assert.equal(await page.locator('#refund-count').innerText(),'0');await page.locator('#refund-history summary').click();assert.match(await page.locator('#refund-received').innerText(),/Received · last updated/);
 await page.locator('#refund-received [data-refund]').click();await f.locator('[name=state]').selectOption('awaiting');await f.locator('[type=submit]').click();
 await page.locator('#backup-heading').click();const dl=page.waitForEvent('download');await page.locator('#backup-export').click();const backup=await readFile(await (await dl).path(),'utf8');
 const destination=await browser.newContext({viewport:{width,height:900}});const receiver=await destination.newPage();await receiver.goto(url);await receiver.locator('#backup-heading').click();await receiver.locator('#backup-file').setInputFiles({name:'refund-backup.json',mimeType:'application/json',buffer:Buffer.from(backup)});await receiver.locator('#backup-apply').click();assert.equal(await receiver.locator('#refund-count').innerText(),'1');assert.match(await receiver.locator('#refund-pending').innerText(),/Newer merchant reference/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
 results.push({width,manualPurchase:true,partialAmount:true,persistedReload:true,writeRefusalRetry:true,staleConflict:true,receivedAndReopen:true,backupNewBrowser:true,noOverflow:true});await destination.close();await context.close();
}await writeFile(out+'/result.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await browser.close();server?.kill();}
