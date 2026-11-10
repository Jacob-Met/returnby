const {chromium}=await import(process.env.RETURNBY_PLAYWRIGHT || 'playwright');
import {spawn} from 'node:child_process';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const out='/tmp/astra-wren-52d1/numeric-evidence';await mkdir(out,{recursive:true});
const server=spawn('python3',['-m','http.server','18976','--bind','127.0.0.1','--directory','dist']);
const browser=await chromium.launch({executablePath:'/usr/local/bin/google-chrome',headless:true,args:['--no-sandbox']});
const results=[];
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}});const page=await context.newPage();await page.goto('http://127.0.0.1:18976');
 await page.locator('#paste').fill('From: John Lewis <orders@johnlewis.com>\nOrder date: 05/11/2026\nTotal: £79.00');await page.locator('#find').click();
 assert.equal(await page.locator('#preview [name=orderDate]').inputValue(),'');assert.match(await page.locator('#preview').innerText(),/5 November 2026 or 11 May 2026/);
 await page.locator('#preview button[type=submit]').click();assert.equal(await page.evaluate(()=>localStorage.getItem('returnby.v1')),null);
 await page.locator('#preview').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/ambiguous-'+width+'.png'});
 await page.locator('#preview [name=orderDate]').fill('2026-11-05');assert.match(await page.locator('#intake-deadline').innerText(),/2026-12-05/);await page.locator('#preview button[type=submit]').click();assert.match(await page.locator('#list').innerText(),/2026-12-05/);
 await page.goto('http://127.0.0.1:18976/batch-intake.html');await page.locator('#batch-paste').fill('From: John Lewis\nOrder date: 11/05/2026\nTotal: £79.00');await page.locator('#batch-add').click();
 assert.equal(await page.locator('[data-field=orderDate]').inputValue(),'');assert.match(await page.locator('#batch-drafts').innerText(),/could mean/);
 await page.locator('[data-reviewed]').click();assert.equal(await page.locator('[data-reviewed]').isChecked(),false);
 await page.locator('[data-field=orderDate]').fill('2026-05-11');await page.locator('[data-reviewed]').check();await page.locator('#batch-preview').click();await page.locator('#batch-save').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('returnby.v1')));assert.equal(saved.length,2);assert.equal(saved[1].orderDate,'2026-05-11');
 results.push({width,ambiguousNotSaved:true,explicitCorrection:true,singleDeadline:'2026-12-05',batchReview:true});await context.close();
}await writeFile(out+'/result.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await browser.close();server.kill();}
