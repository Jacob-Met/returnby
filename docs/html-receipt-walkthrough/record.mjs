const {chromium}=await import(process.env.RETURNBY_PLAYWRIGHT || 'playwright');
import {spawn} from 'node:child_process';import {mkdir,writeFile,readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const dir=process.env.RETURNBY_CAPTURE_DIR; if(!dir || !process.env.RETURNBY_APP_DIR) throw Error('Set RETURNBY_CAPTURE_DIR and RETURNBY_APP_DIR');await mkdir(dir+'/raw',{recursive:true});
await writeFile(dir+'/SAMPLE-Willow-HTML.eml','From: Sample Orders <orders@example.invalid>\r\nSubject: FICTIONAL SAMPLE receipt WF-6341\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\n\r\n<html><body><h1>Fictional sample receipt</h1><p>Merchant: Willow &amp; Finch</p><table><tr><td>Order number:</td><td>WF-6341</td></tr><tr><td>Order date:</td><td>November 8, 2026</td></tr><tr><td>Total:</td><td>$83.40</td></tr></table><p>Sample linen shirt. Sample return policy: 14 days from order date.</p></body></html>');
const server=spawn('python3',['-m','http.server','18974','--bind','127.0.0.1','--directory',process.env.RETURNBY_APP_DIR]);
const b=await chromium.launch({executablePath:process.env.RETURNBY_CHROME || '/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
const c=await b.newContext({viewport:{width:1366,height:900},recordVideo:{dir:dir+'/raw',size:{width:1366,height:900}},acceptDownloads:true});
const p=await c.newPage(), errors=[];p.on('pageerror',e=>errors.push(e.message));const stages=[];const zero=Date.now();const pause=ms=>p.waitForTimeout(ms);const mark=t=>stages.push({time:(Date.now()-zero)/1000,text:t});
const move=async l=>{await l.scrollIntoViewIfNeeded();const r=await l.boundingBox();await p.mouse.move(r.x+r.width/2,r.y+r.height/2,{steps:15});};
try{
await p.goto('http://127.0.0.1:18974/batch-intake.html');
mark('FICTIONAL SAMPLE / Actual released app / Silent walkthrough\nImport a local HTML-only exported email receipt.');await pause(3500);
await move(p.locator('#batch-files'));await p.locator('#batch-files').setInputFiles(dir+'/SAMPLE-Willow-HTML.eml');const card=p.locator('[data-draft]');await card.waitFor();await card.scrollIntoViewIfNeeded();
mark('HTML receipt becomes editable fields.\nCheck every field before saving; nothing is saved yet.');await pause(5000);
await card.locator('summary').click();await card.locator('pre').scrollIntoViewIfNeeded();mark('Read the extracted receipt, including its sample 14-day return policy.\nHTML is treated as text; this is not an inbox connection.');await pause(5000);
await card.locator('summary').click();await move(card.locator('[name=windowDays]'));await card.locator('[name=windowDays]').fill('14');
mark('Correct the return window to match the sample policy.\nThis walkthrough uses a fictional merchant, not a verified retailer rule.');await pause(4000);
await move(card.locator('[data-reviewed]'));await card.locator('[data-reviewed]').check();await p.locator('#batch-preview').click();await p.locator('#batch-final').scrollIntoViewIfNeeded();assert.equal(await p.evaluate(()=>localStorage.getItem('returnby.v1')),null);
mark('Review the selected order and deadline.\nOnly the final Save reviewed orders button stores it.');await pause(5000);await move(p.locator('#batch-save'));await p.locator('#batch-save').click();await p.waitForFunction(()=>JSON.parse(localStorage.getItem('returnby.v1')||'[]').length===1);await pause(2500);
await p.goto('http://127.0.0.1:18974/index.html');await p.locator('#return-search').scrollIntoViewIfNeeded();await move(p.locator('#return-search'));await p.locator('#return-search').pressSequentially('WF-6341',{delay:150});
mark('Find the saved return by its order number.\nSearch narrows the tracker; calendar selection follows the date filter.');await pause(5000);
await p.locator('#calendar-open').click();mark('Choose the saved return for a calendar reminder.\nDownload a real .ics file to import into your own calendar.');await pause(4500);
const cd=p.waitForEvent('download');await move(p.locator('#calendar-download'));await p.locator('#calendar-download').click();await(await cd).saveAs(dir+'/sample-reminder.ics');await pause(2500);if(await p.locator('#calendar-cancel').isVisible())await p.locator('#calendar-cancel').click();
await p.locator('#backup-heading').click();await p.locator('#backup-export').scrollIntoViewIfNeeded();mark('Download a backup of the approved order details.\nThe original receipt body is not included.');await pause(4500);
const bd=p.waitForEvent('download');await move(p.locator('#backup-export'));await p.locator('#backup-export').click();await(await bd).saveAs(dir+'/sample-backup.json');
assert.match(await readFile(dir+'/sample-reminder.ics','utf8'),/BEGIN:VEVENT/);const backup=await readFile(dir+'/sample-backup.json','utf8');assert.match(backup,/WF-6341/);assert.doesNotMatch(backup,/Sample linen shirt/);assert.deepEqual(errors,[]);
mark('Saved locally. Calendar and backup files downloaded.\nHTML receipt release: intake plus saved-order search.');await pause(4500);
const end=(Date.now()-zero)/1000;await writeFile(dir+'/capture.json',JSON.stringify({stages,end,errors,release:'returnby-html-receipt-2026-11-10',zipSha256:'1feaf0cd6d4698323c00b7bf17d385a1dc1052b987ea6fbdc28d52a7620e4699'},null,2));
await c.close();console.log(JSON.stringify({video:await p.video().path(),end,stages:stages.length,errors}));}finally{await b.close();server.kill();}
