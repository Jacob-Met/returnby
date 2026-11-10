import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const dir=await mkdtemp(path.join(tmpdir(),'settletrace-capture-'));
const out=path.resolve(process.argv[2]||'artifacts/pending-course');await mkdir(out,{recursive:true});
const root=path.resolve(process.env.RETURNBY_BUILD||'dist');const server=createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html');res.end(await readFile(root+(p==='/'?'/index.html':p)))}catch{res.writeHead(404).end()}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const app={server,url:'http://127.0.0.1:'+server.address().port};
const chrome=spawn('/opt/google/chrome/chrome',['--headless=new','--no-sandbox','--disable-gpu','--no-proxy-server','--disable-dev-shm-usage','--remote-debugging-port=19459','--user-data-dir='+path.join(dir,'chrome'),'about:blank'],{stdio:'ignore'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));let ws;
try{
 let tabs;for(let n=0;n<60;n++){try{tabs=await fetch('http://127.0.0.1:19459/json').then(r=>r.json());break;}catch{await wait(100);}}
 assert.ok(tabs?.length);ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
 let next=0;const pending=new Map();ws.addEventListener('message',e=>{let j=JSON.parse(e.data);if(j.id){const p=pending.get(j.id);pending.delete(j.id);j.error?p.reject(Error(JSON.stringify(j.error))):p.resolve(j.result);}});
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 await cdp('Page.enable');await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});await cdp('Page.navigate',{url:app.url});
 for(let n=0;n<60;n++){if(await evaluate("!!document.getElementById('paste')"))break;await wait(100);}

 await wait(1000);

 const base='From: Birch Trail\nOrder #: C-2100\nOrder date: November 10, 2026\nTotal: $42.00\n';
 const open=async text=>{await evaluate("document.getElementById('paste').value="+JSON.stringify(text)+";document.getElementById('find').click()");await wait(100);};
 await open(base+'Returns within 21 days after delivery.');
 assert.equal(await evaluate("document.querySelector('#preview [name=windowDays]').value"),'21');
 assert.match(await evaluate("document.querySelector('.receipt-policy-evidence').textContent"),/21 days/);
 await evaluate("document.getElementById('preview').requestSubmit()");
 assert.equal(await evaluate("document.getElementById('tracked-count').textContent"),'0');
 await evaluate("document.querySelector('#preview [name=windowStartDate]').value='2026-11-12';document.getElementById('preview').requestSubmit()");
 assert.match(await evaluate("document.getElementById('list').textContent"),/2026-12-03/);
 await cdp('Page.reload');await wait(500);assert.match(await evaluate("document.getElementById('list').textContent"),/2026-12-03/);
 await open(base.replace('C-2100','C-2200')+'Returns within 30 days. Electronics returns within 14 days.');
 assert.equal(await evaluate("document.querySelector('#preview [name=windowDays]').value"),'');
 await evaluate("document.getElementById('preview').requestSubmit()");
 assert.equal(await evaluate("document.getElementById('tracked-count').textContent"),'1');
 await evaluate("document.querySelector('.receipt-policy-evidence').scrollIntoView({block:'center'})");
 await writeFile(path.join(out,'policy-conflict-phone.png'),Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await evaluate("document.querySelector('#preview [name=windowDays]').value='14';document.getElementById('preview').requestSubmit()");
 assert.equal(await evaluate("document.getElementById('tracked-count').textContent"),'2');
 await cdp('Page.navigate',{url:app.url+'/batch-intake.html'});await wait(700);
 await evaluate("document.getElementById('batch-paste').value="+JSON.stringify(base.replace('C-2100','C-2300')+'Returns within 21 days after delivery.')+";document.getElementById('batch-add').click()");
 assert.equal(await evaluate("document.querySelector('[data-field=windowDays]').value"),'21');
 await evaluate("document.querySelector('[data-reviewed]').click()");
 assert.match(await evaluate("document.getElementById('batch-error').textContent"),/delivery/);
 await evaluate("const clock=document.querySelector('[data-field=windowStartDate]');clock.value='2026-11-15';clock.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-reviewed]').click();document.getElementById('batch-preview').click()");
 assert.match(await evaluate("document.getElementById('batch-final-orders').textContent"),/2026-12-06/);
 await evaluate("document.getElementById('batch-save').click()");
 assert.match(await evaluate("document.getElementById('batch-success').textContent"),/1 reviewed/);
 await evaluate("document.getElementById('batch-paste').value="+JSON.stringify(base.replace('C-2100','C-2400')+'Returns within 21 business days.')+";document.getElementById('batch-add').click()");
 assert.equal(await evaluate("document.querySelector('[data-field=windowDays]').value"),'');
 assert.match(await evaluate("document.querySelector('.receipt-policy-evidence').textContent"),/non-calendar-day/);
 await evaluate("document.querySelector('.receipt-policy-evidence').scrollIntoView({block:'center'})");
 await writeFile(path.join(out,'policy-batch-phone.png'),Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await writeFile(path.join(out,'evidence.json'),JSON.stringify({status:'PASS',actions:['21-day receipt overrides fallback without confirming delivery','Missing delivery blocks save','Confirmed Nov12 produces Dec3 and survives reload','30/14-day conflict stays blank and unsaved until shopper enters14','Batch21-day receipt needs actual clock and saves Dec6','Business-day receipt stays blank'],visible:await evaluate("document.body.innerText")},null,2));
 console.log(JSON.stringify({out,status:'PASS'}));
}finally{ws?.close();chrome.kill();await new Promise(r=>app.server.close(r));}
