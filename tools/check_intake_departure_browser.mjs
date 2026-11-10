import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.EVIDENCE || '/tmp/astra-marlin-82d1/departure-evidence';
await mkdir(out,{recursive:true});
const url=process.env.BASE_URL || 'http://127.0.0.1:18984';
const server=process.env.BASE_URL?null:spawn('python3',['-m','http.server','18984','--bind','127.0.0.1','--directory','dist']);
const browser=await chromium.launch({executablePath:'/usr/local/bin/google-chrome',headless:true,args:['--no-sandbox']});
const result=[];
try {
for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}});
 const page=await context.newPage();
 await page.goto(url);
 let dialogs=0;page.on('dialog',async d=>{assert.equal(d.type(),'beforeunload');dialogs++;await d.dismiss();});
 // Negative control: blank app can navigate, after actual activation.
 await page.locator('#paste').click();
 await page.goto(url+'/trip-checklist.html');
 assert.equal(dialogs,0);
 await page.goto(url);
 await page.locator('#paste').fill('Private receipt draft\nStore: Paper Moon\nOrder date: 2026-11-10');
 await page.goto(url+'/trip-checklist.html').catch(()=>{});
 assert.equal(dialogs,1);assert.equal(await page.locator('#paste').inputValue(),'Private receipt draft\nStore: Paper Moon\nOrder date: 2026-11-10');
 await page.locator('#find').click();
 await page.locator('#preview [name=merchant]').fill('Paper Moon');
 await page.locator('#preview [name=orderDate]').fill('2026-11-10');
 await page.locator('#preview [name=windowStartDate]').fill('2026-11-12');
 await page.locator('#preview [name=windowDays]').fill('14');
 // A parsed review remains protected after raw receipt text is cleared.
 await page.locator('#paste').fill('');
 await page.goto(url+'/trip-checklist.html').catch(()=>{});
 assert.equal(dialogs,2);assert.equal(await page.locator('#preview [name=windowStartDate]').inputValue(),'2026-11-12');
 await page.screenshot({path:out+'/review-'+width+'.png',fullPage:true});
 // Refused save retains the review and warning.
 await page.evaluate(()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new Error('refused');};});
 await page.locator('#preview button[type=submit]').click();
 await page.goto(url+'/trip-checklist.html').catch(()=>{});
 assert.equal(dialogs,3);
 await page.evaluate(()=>{Storage.prototype.setItem=window.originalSet;});
 await page.locator('#preview button[type=submit]').click();
 await page.goto(url+'/trip-checklist.html');
 assert.equal(dialogs,3);
 await page.goto(url);
 assert.match(await page.locator('#list').innerText(),/Paper Moon/);
 // Existing manual receipt protection survives closing its dialog.
 await page.locator('#manual-open').click();
 await page.locator('#manual-form [name=merchant]').fill('Other receipt');
 await page.locator('#manual-close').click();
 await page.goto(url+'/trip-checklist.html').catch(()=>{});
 assert.equal(dialogs,4);
 result.push({width,blankNavigation:true,pastedDraftRetained:true,reviewAndClockRetained:true,failedSaveRetained:true,savedNavigationUnblocked:true,closedManualDraftRetained:true});
 await context.close();
}
await writeFile(out+'/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();server?.kill();}
