import {chromium} from '/tmp/astra-marlin-82d1/judge/node_modules/playwright/index.mjs';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:19027/';
const out='/tmp/astra-kestrel-b6a904df3c/returnby-replacement-judge';
await mkdir(out,{recursive:true});
const server=spawn('python3',['-m','http.server','19027','--bind','127.0.0.1','--directory','/tmp/astra-marlin-82d1/replacement/dist'],{stdio:'ignore'});
let browser;const result={judge:'astra-kestrel-b6a904df3c',source:'cb29ecc9e76cedd4316b8b85f750364afa5576c7',receipt:'Fictional Cedar Outfitters purchase, actual compiled application',courses:[]};
try {
for(let i=0;i<30;i++){try{if((await fetch(base)).ok)break;}catch{} await new Promise(r=>setTimeout(r,100));}
browser=await chromium.launch({executablePath:'/usr/local/bin/google-chrome',headless:true,args:['--no-sandbox']});
for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900},timezoneId:'America/Los_Angeles'});
 const page=await context.newPage();page.setDefaultTimeout(8000);
 let departure=0,confirms=0;
 page.on('dialog',async dialog=>{if(dialog.type()==='beforeunload')departure++;else confirms++;await dialog.dismiss();});
 await page.goto(base);
 await page.locator('#paste').fill('Thanks for shopping at Cedar Outfitters!\nOrder #CDR-72814\nOrder date: November 1, 2026\nDelivery date: November 6, 2026\nTotal: $57.98\nReturn this purchase within 14 days of delivery.');
 await page.locator('#find').click();
 const fillReview=async()=>{for(const [name,value] of Object.entries({merchant:'Cedar Outfitters',orderDate:'2026-11-01',windowStartDate:'2026-11-06',orderNo:'CDR-72814',total:'$57.98',windowDays:'14'}))await page.locator('#preview [name='+name+']').fill(value);};
 const values=()=>page.locator('#preview input').evaluateAll(es=>Object.fromEntries(es.map(e=>[e.name,e.value])));
 await fillReview();const corrected=await values();
 await page.screenshot({path:out+'/corrected-'+width+'.png',fullPage:true});
 await page.getByRole('link',{name:'Prepare a return-trip checklist →'}).click().catch(e=>{if(!/net::ERR_ABORTED|interrupted|Timeout/.test(String(e)))throw e;});
 assert.equal(departure,1);assert.deepEqual(await values(),corrected);assert.equal(page.url(),base);
 await page.reload({timeout:4000}).catch(e=>{if(!/net::ERR_ABORTED|interrupted|Timeout/.test(String(e)))throw e;});
 assert.equal(departure,2);assert.deepEqual(await values(),corrected);
 const storedBeforeSave=await page.evaluate(()=>Object.keys(localStorage));
 await page.locator('#find').click();
 const afterReparse=await values();const reparsePreserves=JSON.stringify(afterReparse)===JSON.stringify(corrected);
 await page.screenshot({path:out+'/reparse-'+width+'.png',fullPage:true});
 await fillReview();await page.getByRole('link',{name:'Load a fictional example'}).click();
 const afterExample=await values();const examplePreserves=JSON.stringify(afterExample)===JSON.stringify(corrected);
 await fillReview();await page.locator('#paste').fill('');
 await page.locator('#preview button[type=submit]').click();
 const savedText=await page.locator('#list').innerText();
 assert.match(savedText,/Cedar Outfitters/);
 await page.getByRole('link',{name:'Prepare a return-trip checklist →'}).click();
 assert.match(page.url(),/trip-checklist/);
 assert.equal(departure,2);
 await page.goto(base);assert.match(await page.locator('#list').innerText(),/Cedar Outfitters/);
 const stored=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])));
 await page.screenshot({path:out+'/saved-'+width+'.png',fullPage:true});
 result.courses.push({width,departureCancelledRetains:true,reloadCancelledRetains:true,storedBeforeSave,reparsePreserves,afterReparse,examplePreserves,afterExample,confirms,savedThenReopened:true,savedText,stored});
 await context.close();
}
assert.ok(result.courses.every(c=>c.reparsePreserves && c.examplePreserves && c.confirms===2)); result.verdict='Actual corrected intake is retained after cancelled departure, reload, reparse and sample replacement; exact date basis saves and reopens.';
await writeFile(out+'/judgment.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(e){result.error=String(e);await writeFile(out+'/failure.json',JSON.stringify(result,null,2));console.error(e);process.exitCode=1;}finally{await browser?.close();server.kill();}
