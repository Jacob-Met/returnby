import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const server=spawn('python3',['-m','http.server','18988','--bind','127.0.0.1','--directory','dist']);
const browser=await chromium.launch({executablePath:'/usr/local/bin/google-chrome',headless:true,args:['--no-sandbox']});
const results=[];
try{
for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:900}});
 await page.goto('http://127.0.0.1:18988');
 let choice=false;const prompts=[];
 page.on('dialog',async dialog=>{prompts.push({type:dialog.type(),message:dialog.message()});await(choice?dialog.accept():dialog.dismiss());});
 await page.locator('#sample').click();
 assert.equal(prompts.length,0);
 await page.locator('#preview [name=merchant]').fill('My corrected store');
 await page.locator('#preview [name=windowStartDate]').fill('2026-11-15');
 await page.locator('#preview [name=windowDays]').fill('47');
 const before=await page.locator('#preview').evaluate(f=>JSON.stringify([...new FormData(f)]));
 await page.locator('#find').click();
 assert.equal(prompts.length,1);assert.equal(await page.locator('#preview').evaluate(f=>JSON.stringify([...new FormData(f)])),before);
 await page.locator('#paste').press('Control+Enter');
 assert.equal(prompts.length,2);assert.equal(await page.locator('#preview').evaluate(f=>JSON.stringify([...new FormData(f)])),before);
 const raw=await page.locator('#paste').inputValue();
 await page.locator('#sample').click();
 assert.equal(prompts.length,3);assert.equal(await page.locator('#paste').inputValue(),raw);
 assert.equal(await page.locator('#preview').evaluate(f=>JSON.stringify([...new FormData(f)])),before);
 choice=true;await page.locator('#find').click();
 assert.equal(prompts.length,4);assert.notEqual(await page.locator('#preview [name=merchant]').inputValue(),'My corrected store');
 await page.locator('#find').click();assert.equal(prompts.length,4);
 await page.locator('#sample').click();assert.equal(prompts.length,5);assert.notEqual(await page.locator('#paste').inputValue(),raw);
 assert.equal(await page.evaluate(()=>localStorage.getItem('returnby.v1')),null);
 results.push({width,cancelFindRetainsCorrections:true,cancelKeyboardRetainsCorrections:true,cancelSampleRetainsRawAndReview:true,acceptedReplacement:true,unchangedReparseNoPrompt:true,noTrackerAutosave:true});
 await page.close();
}
console.log(JSON.stringify(results));
}finally{await browser.close();server.kill();}
