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
const chrome=spawn('/opt/google/chrome/chrome',['--headless=new','--no-sandbox','--disable-gpu','--no-proxy-server','--disable-dev-shm-usage','--remote-debugging-port=19458','--user-data-dir='+path.join(dir,'chrome'),'about:blank'],{stdio:'ignore'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));let ws;
try{
 let tabs;for(let n=0;n<60;n++){try{tabs=await fetch('http://127.0.0.1:19458/json').then(r=>r.json());break;}catch{await wait(100);}}
 assert.ok(tabs?.length);ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
 let next=0;const pending=new Map();ws.addEventListener('message',e=>{let j=JSON.parse(e.data);if(j.id){const p=pending.get(j.id);pending.delete(j.id);j.error?p.reject(Error(JSON.stringify(j.error))):p.resolve(j.result);}});
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 await cdp('Page.enable');await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});await cdp('Page.navigate',{url:app.url});
 for(let n=0;n<60;n++){if(await evaluate("!!document.getElementById('paste')"))break;await wait(100);}

 await wait(1000);
 const receipt=(merchant,no)=>merchant+'\nOrder #: '+no+'\nOrder date: November 10, 2026\nTotal: $42.00\nReturns within 30 days after delivery';
 for(const [merchant,no] of [['North Trail','A-100'],['Lake Books','B-200']]){
 await evaluate("document.getElementById('paste').value="+JSON.stringify(receipt(merchant,no))+";document.getElementById('find').click()");
 await wait(100);await evaluate("document.querySelector('#preview [name=merchant]').value="+JSON.stringify(merchant)+";document.getElementById('save-pending-delivery').click()");await wait(100);
 }

 assert.equal(await evaluate("JSON.parse(localStorage.getItem('returnby.pending-deliveries')).purchases.length"),2);
 await cdp('Page.reload');await wait(500);
 assert.equal(await evaluate("document.querySelectorAll('.pending-purchase').length"),2);
 await evaluate("window.downloaded=null;URL.createObjectURL=(blob)=>{blob.text().then(t=>window.downloaded=t);return 'blob:demo';};document.getElementById('backup-export').click()");
 await wait(200);const backup=await evaluate("window.downloaded");assert.ok(backup);assert.equal(JSON.parse(backup).pending.length,2);
 await evaluate("localStorage.clear()");await cdp('Page.reload');await wait(500);
 await evaluate("(()=>{const d=new DataTransfer();d.items.add(new File(["+JSON.stringify(backup)+"],'pending-backup.json',{type:'application/json'}));const input=document.getElementById('backup-file');input.closest('details').open=true;input.files=d.files;input.dispatchEvent(new Event('change'));})()");
 await wait(200);

 assert.match(await evaluate("document.getElementById('backup-pending').textContent"),/2 to add/);
 await evaluate("document.querySelector('#backup-pending button').click()");
 await wait(200);assert.equal(await evaluate("document.querySelectorAll('.pending-purchase').length"),2);
 await evaluate("document.querySelector('.pending-purchase button').click();document.querySelector('#preview [name=windowStartDate]').value='2026-11-12';document.getElementById('preview').requestSubmit()");
 await wait(200);assert.equal(await evaluate("document.getElementById('tracked-count').textContent"),'1');
 assert.equal(await evaluate("JSON.parse(localStorage.getItem('returnby.pending-deliveries')).purchases.length"),1);
 await evaluate("document.getElementById('pending-desk').scrollIntoView()");
 await writeFile(path.join(out,'pending-phone.png'),Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
 const evidence={status:'PASS',actions:['Kept two different purchases awaiting delivery','Reloaded both','Downloaded a pending-only backup','Restored into empty browser storage through file input','Confirmed delivery for one purchase while retaining the other'],backup:JSON.parse(backup),visible:await evaluate("document.body.innerText")};
 await writeFile(path.join(out,'evidence.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify({out,status:'PASS'}));
}finally{ws?.close();chrome.kill();await new Promise(r=>app.server.close(r));}
