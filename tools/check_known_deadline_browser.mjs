const {chromium}=await import(process.env.RETURNBY_PLAYWRIGHT || 'playwright');
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const output=process.env.EVIDENCE || '/tmp/astra-fir-6bab/known-evidence';await mkdir(output,{recursive:true});
const url=process.env.BASE_URL || 'http://127.0.0.1:18980';
const server=process.env.BASE_URL?null:spawn('python3',['-m','http.server','18980','--bind','127.0.0.1','--directory',process.env.BUILD || 'dist']);
const browser=await chromium.launch({executablePath:'/usr/local/bin/google-chrome',headless:true,args:['--no-sandbox']});
try {
for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true});const page=await context.newPage();
 for(let n=0;;n++){try{await page.goto(url);break;}catch(e){if(n>20)throw e;await new Promise(r=>setTimeout(r,100));}}
 await page.locator('#manual-open').click();const form=page.locator('#manual-form');
 await form.locator('[name=merchant]').fill('Holiday Gift Store');
 await form.locator('[name=orderDate]').fill('2026-11-10');
 await form.locator('.known-deadline summary').click();await page.locator('#manual-form-known-date').fill('2027-01-08');
 await form.locator('.known-deadline button').click();
 assert.equal(await form.locator('[name=windowDays]').inputValue(),'59');
 assert.equal(await page.locator('#manual-deadline').innerText(),'Return by 2027-01-08');
 await form.locator('[name=windowStartDate]').fill('2026-11-14');
 assert.equal(await form.locator('[name=windowDays]').inputValue(),'55');
 assert.equal(await page.locator('#manual-deadline').innerText(),'Return by 2027-01-08');
 await page.screenshot({path:output+'/known-'+width+'.png'});
 await form.locator('button[type=submit]').click();
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('returnby.v1')));
 assert.equal(saved[0].windowDays,55);assert.equal(saved[0].windowStartDate,'2026-11-14');
 await page.reload();assert.match(await page.locator('#list').innerText(),/2027-01-08/);
 await page.locator('[data-edit]').first().click();const edit=page.locator('#edit-form');
 await edit.locator('.known-deadline summary').click();await page.locator('#edit-form-known-date').fill('2027-01-15');await edit.locator('.known-deadline button').click();
 assert.equal(await page.locator('#edit-proposed-deadline').innerText(),'2027-01-15');
 await edit.locator('[name=windowDays]').fill('20');
 assert.equal(await page.locator('#edit-proposed-deadline').innerText(),'2026-12-04');
 await edit.locator('.known-deadline button').click();
 assert.equal(await page.locator('#edit-proposed-deadline').innerText(),'2027-01-15');
 await page.locator('#edit-save').click();
 await page.locator('#backup-heading').click();
 const [csv]=await Promise.all([page.waitForEvent('download'),page.locator('#saved-returns-csv').click()]);await csv.saveAs(output+'/known-'+width+'.csv');
 assert((await readFile(output+'/known-'+width+'.csv','utf8')).includes('"2027-01-15"'));
 const [backup]=await Promise.all([page.waitForEvent('download'),page.locator('#backup-export').click()]);await backup.saveAs(output+'/backup-'+width+'.json');
 const data=JSON.parse(await readFile(output+'/backup-'+width+'.json','utf8'));assert.equal(data.orders[0].windowDays,62);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await context.close();
}
await writeFile(output+'/result.json',JSON.stringify({result:'PASS',viewports:[1440,390],checks:['fixed deadline to custom window','delivery change keeps confirmed date','save/reload retains date','edit confirmed deadline','manual days releases date','CSV and backup fidelity']},null,2));console.log('PASS known deadline manual/edit/save/reload/CSV/backup at desktop and phone');
}finally{await browser.close();server?.kill();}
