const {chromium}=await import(process.env.RETURNBY_PLAYWRIGHT || 'playwright');
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const output=process.env.EVIDENCE || '/tmp/astra-fir-6bab/csv-evidence';
await mkdir(output,{recursive:true});
const url=process.env.BASE_URL || 'http://127.0.0.1:18976';
const server=process.env.BASE_URL ? null : spawn('python3',['-m','http.server','18976','--bind','127.0.0.1','--directory',process.env.BUILD || 'dist']);
const browser=await chromium.launch({executablePath:'/usr/local/bin/google-chrome',headless:true,args:['--no-sandbox']});
try {
for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900},acceptDownloads:true});
 const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(let attempt=0;;attempt++){try{await page.goto(url);break;}catch(e){if(attempt>20)throw e;await new Promise(r=>setTimeout(r,100));}}
 await page.locator('#manual-open').click();
 const f=page.locator('#manual-form');
 for(const [name,value] of Object.entries({merchant:'Pine, Paper & Co',orderDate:'2026-11-01',windowDays:'30',orderNo:'00042',total:'EUR 42.50',windowStartDate:'2026-11-08'}))await f.locator('[name='+name+']').fill(value);
 await f.locator('button[type=submit]').click();
 await page.locator('#paste').fill('Private unsaved email');
 await page.locator('#return-search').fill('does not match');
 const before=await page.evaluate(()=>localStorage.getItem('returnby.v1'));
 assert.equal(await page.locator('#backup-heading').evaluate(e=>e.parentElement.open),false);
 await page.locator('#saved-returns-csv').scrollIntoViewIfNeeded();
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#saved-returns-csv').click()]);
 await download.saveAs(output+'/saved-'+width+'.csv');
 const csv=await readFile(output+'/saved-'+width+'.csv','utf8');
 assert(csv.includes('"2026-12-08","2026-11-08","Confirmed start date"'));
 assert(csv.includes('"Pine, Paper & Co","00042"')); assert(!csv.includes('Private unsaved'));
 assert.equal(await page.locator('#paste').inputValue(),'Private unsaved email');
 assert.equal(await page.evaluate(()=>localStorage.getItem('returnby.v1')),before);
 await page.screenshot({path:output+'/csv-'+width+'.png'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.evaluate(()=>{window.realGet=Storage.prototype.getItem;Storage.prototype.getItem=function(){throw Error('Controlled read failure')}});
 await page.locator('#saved-returns-csv').click();
 assert.match(await page.locator('#saved-csv-message').innerText(),/Could not download/);
 await page.evaluate(()=>{Storage.prototype.getItem=window.realGet});
 const [retry]=await Promise.all([page.waitForEvent('download'),page.locator('#saved-returns-csv').click()]);
 await retry.saveAs(output+'/retry-'+width+'.csv');
 assert.equal(await readFile(output+'/retry-'+width+'.csv','utf8'),csv);
 assert.deepEqual(errors,[]); await context.close();
}
await writeFile(output+'/result.json',JSON.stringify({result:'PASS',viewports:[1440,390],nativeDownloads:4,checks:['manual saved confirmed clock','filtered-out saved purchase exported','unsaved intake preserved','storage unchanged','read refusal and retry','no horizontal overflow','no page errors']},null,2));
console.log('PASS: actual confirmed-clock CSV downloads, desktop and phone');
}finally{await browser.close();server?.kill();}
