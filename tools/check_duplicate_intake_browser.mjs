const {chromium}=await import(process.env.RETURNBY_PLAYWRIGHT || 'playwright');
import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const dir=process.env.EVIDENCE||'test-results/duplicate-intake';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/usr/local/bin/google-chrome'});const results=[];
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}});const page=await context.newPage();const errors=[],dialogs=[];let accept=false;
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push(d.message());await(accept?d.accept():d.dismiss());});
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:18974');
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('returnby.v1')||'[]'));
 async function fillManual(number='HH-880'){await page.locator('#manual-open').click();for(const[k,v]of Object.entries({merchant:'Harbor Hardware',orderNo:number,orderDate:'2026-11-01',windowStartDate:'2026-11-08',windowDays:'14'}))await page.locator(`#manual-form [name=${k}]`).fill(v);}
 await fillManual();await page.locator('#manual-form button[type=submit]').click();const original=await saved();assert.equal(original.length,1);
 await fillManual();await page.locator('#manual-form button[type=submit]').click();assert.deepEqual(await saved(),original);assert.equal(await page.locator('#manual-dialog').evaluate(e=>e.open),true);assert.equal(await page.locator('#manual-form [name=orderNo]').inputValue(),'HH-880');assert.match(dialogs.at(-1),/return by 2026-11-22/);
 await page.screenshot({path:`${dir}/cancelled-manual-${width}.png`});accept=true;await page.locator('#manual-form button[type=submit]').click();assert.equal((await saved()).length,2);assert.deepEqual((await saved())[0],original[0]);
 await page.locator('#paste').fill('Order confirmation\nOrder number HH-880\nOrder date November 1, 2026');await page.locator('#find').click();for(const[k,v]of Object.entries({merchant:'Harbor Hardware',orderNo:'HH-880',orderDate:'2026-11-01',windowStartDate:'2026-11-08',windowDays:'14'}))await page.locator(`#preview [name=${k}]`).fill(v);
 accept=false;await page.locator('#preview button[type=submit]').click();assert.equal((await saved()).length,2);assert.equal(await page.locator('#preview').isVisible(),true);assert.match(dialogs.at(-1),/2 saved returns/);accept=true;await page.locator('#preview button[type=submit]').click();assert.equal((await saved()).length,3);
 const count=dialogs.length;await fillManual('');await page.locator('#manual-form button[type=submit]').click();assert.equal((await saved()).length,4);assert.equal(dialogs.length,count);
 await page.reload();assert.equal((await saved()).length,4);assert.deepEqual(errors,[]);results.push({width,manualCancelRetainsDraft:true,explicitSeparatePreservesOriginal:true,emailDuplicateReview:true,unnumberedNoWarning:true,persistedReload:true,dialogs});await context.close();
}await writeFile(dir+'/result.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await browser.close();}
