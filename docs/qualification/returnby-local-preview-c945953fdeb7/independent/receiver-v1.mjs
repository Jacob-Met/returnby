import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import net from 'node:net';
import assert from 'node:assert/strict';
import {spawn, execFileSync} from 'node:child_process';

const BASE='/Users/me/Developer/returnby-local-preview-receiving-c945953fdeb7';
const INSTALL='/Users/me/Applications/ReturnBy-c945953fdeb7';
const ORIGIN='http://127.0.0.1:48643';
const CDPPORT=48644;
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const LAUNCH=path.join(INSTALL,'Launch ReturnBy.command');
const RUN=path.join(BASE,'run-v1');
const PROFILE=path.join(RUN,'profile');
const DOWNLOADS=path.join(RUN,'downloads');
const FLOOR=256*1024*1024;
const MEMFLOOR=2*1024*1024*1024;
const CAP=96*1024*1024;
const LOGCAP=8*1024*1024;
const START=Date.now();
const EXPECTED_ARCHIVE='45d5f732879ab0101295648c59c1955b5f8ec190aa4c44a42b46bc24a9b464e4';
const CONTRACT='e4c45a5cfb0ab5a80e7b04f853837147b6dcd9a35e1dbc9404782ab7a84cf0a8';
const env={...process.env,PYTHONDONTWRITEBYTECODE:'1'};
let server, browser, cdp, monitor, runtimeTimer, fatal;
let nextChild=0;
const children=[];
const r={schema:'returnby.mac.installed.receiving.v1',owner:'estate-c945953fdeb7/control_execution',
 started_at:new Date().toISOString(),install:INSTALL,origin:ORIGIN,
 contract_sha256:CONTRACT,entry:[LAUNCH,'--no-open'],
 limits:{disk_floor:FLOOR,memory_floor:MEMFLOOR,owned_cap:CAP,log_cap:LOGCAP,seconds:180},
 groups:[],guards:[],processes:[],process_census:[],downloads:[],requests:[],actions:[],exceptions:[],cleanup:[],terminal:null};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function evidence(name,value){fs.writeFileSync(path.join(RUN,name),JSON.stringify(value,null,2)+'\n');}
function save(){evidence('receipt.json',r);}
function files(root){
 const out={};
 if(!fs.existsSync(root))return out;
 const walk=d=>{for(const item of fs.readdirSync(d,{withFileTypes:true})){
  const p=path.join(d,item.name); const s=fs.lstatSync(p);
  if(s.isSymbolicLink()){out[path.relative(root,p)]={symlink:fs.readlinkSync(p),bytes:0};continue;}
  if(s.isDirectory())walk(p);
  else if(s.isFile())out[path.relative(root,p)]={bytes:s.size,sha256:sha(fs.readFileSync(p))};
 }};
 walk(root);return out;
}
function ownedSize(root){
 if(!fs.existsSync(root))return 0;
 let n=0;
 const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){
  const p=path.join(d,e.name);
  try{if(e.isDirectory())walk(p);else if(e.isFile())n+=fs.statSync(p).size;}catch(x){if(x.code!=='ENOENT')throw x;}
 }};
 walk(root);return n;
}
function capacity(label,record=true){
 const s=fs.statfsSync('/Users/me');
 const vm=execFileSync('/usr/bin/vm_stat',[],{encoding:'utf8',timeout:3000});
 const page=Number(vm.match(/page size of (\d+) bytes/)[1]);
 let pages=0;
 for(const name of ['free','inactive','speculative']){
  const m=vm.match(new RegExp('^Pages '+name+':\\s+(\\d+)\\.','m'));
  assert(m,'vm_stat missing '+name);pages+=Number(m[1]);
 }
 const obs={at:new Date().toISOString(),label,disk_free:s.bavail*s.bsize,memory_free_inactive_speculative:pages*page,owned_bytes:ownedSize(RUN)};
 if(record)r.guards.push(obs);
 assert(obs.disk_free>=FLOOR,'disk guard '+JSON.stringify(obs));
 assert(obs.memory_free_inactive_speculative>=MEMFLOOR,'memory guard '+JSON.stringify(obs));
 assert(obs.owned_bytes<CAP,'owned-output guard '+JSON.stringify(obs));
 return obs;
}
function processCensus(label){
 const groups=new Set(children.map(x=>x.rec.pid));
 const raw=execFileSync('/bin/ps',['-axo','pid=,ppid=,pgid=,command='],{encoding:'utf8',timeout:3000,maxBuffer:2*1024*1024});
 const entries=raw.split('\n').map(line=>{
  const m=line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/);
  return m?{pid:Number(m[1]),ppid:Number(m[2]),pgid:Number(m[3]),command:m[4]}:null;
 }).filter(x=>x&&(groups.has(x.pgid)||x.command.includes(PROFILE)));
 const observation={label,at:new Date().toISOString(),entries};
 r.process_census.push(observation);return entries;
}
async function requireOwnedClosed(label){
 await until(()=>processCensus(label).length===0,'owned browser/launcher process closure',8000);
}
async function freePort(port){
 return await new Promise((resolve,reject)=>{
  const s=net.createServer();
  s.once('error',reject);
  s.listen(port,'127.0.0.1',()=>s.close(e=>e?reject(e):resolve(true)));
 });
}
function launch(label,exe,args,opts={}){
 const i=++nextChild;
 const stdout=path.join(RUN,label+'-'+i+'.stdout'), stderr=path.join(RUN,label+'-'+i+'.stderr');
 const ofd=fs.openSync(stdout,'wx'), efd=fs.openSync(stderr,'wx');
 const child=spawn(exe,args,{cwd:INSTALL,env,detached:true,stdio:['ignore',ofd,efd],...opts});
 fs.closeSync(ofd);fs.closeSync(efd);
 const rec={label,program:exe,args,pid:child.pid,started_at:new Date().toISOString(),stdout:path.basename(stdout),stderr:path.basename(stderr)};
 r.processes.push(rec);children.push({child,rec});
 child.on('error',error=>{rec.spawn_error=String(error);});
 child.on('exit',(code,signal)=>{rec.exit_code=code;rec.signal=signal;rec.finished_at=new Date().toISOString();});
 return child;
}
async function waitExit(child,ms=8000){
 if(!child||child.exitCode!==null||child.signalCode!==null)return;
 await Promise.race([new Promise(resolve=>child.once('exit',resolve)),sleep(ms).then(()=>{throw Error('owned child did not exit '+child.pid);})]);
}
async function stop(child,signal='SIGINT'){
 if(child&&child.exitCode===null&&child.signalCode===null){child.kill(signal);await waitExit(child);}
}
async function http(url){
 const response=await fetch(url,{signal:AbortSignal.timeout(5000),redirect:'error'});
 const data=Buffer.from(await response.arrayBuffer());
 assert(data.length<=1024*1024,'HTTP body cap');
 return {status:response.status,data,headers:Object.fromEntries(response.headers)};
}
async function until(fn,label,ms=8000){
 const end=Date.now()+ms;let last;
 while(Date.now()<end){
  if(fatal)throw fatal;
  try{const result=await fn();if(result)return result;}catch(e){last=e;}
  await sleep(80);
 }
 throw Error(label+' timed out'+(last?': '+last.message:''));
}
class CDP{
 constructor(ws){this.ws=ws;this.id=0;this.pending=new Map();
  ws.addEventListener('message',e=>{
   const v=JSON.parse(String(e.data));
   if(v.id){const p=this.pending.get(v.id);if(p){clearTimeout(p.timer);this.pending.delete(v.id);v.error?p.reject(Error(JSON.stringify(v.error))):p.resolve(v.result);}return;}
   if(v.method==='Browser.downloadWillBegin'||v.method==='Browser.downloadProgress')r.downloads.push({method:v.method,...v.params});
   if(v.method==='Network.requestWillBeSent')r.requests.push({session:v.sessionId,url:v.params.request.url,method:v.params.request.method,type:v.params.type});
   if(v.method==='Runtime.exceptionThrown')r.exceptions.push(v.params.exceptionDetails);
   if(v.method==='Log.entryAdded'&&v.params.entry.level==='error')r.exceptions.push(v.params.entry);
   if(v.method==='Runtime.bindingCalled'&&v.params.name==='__c945InstalledInput')r.actions.push({session:v.sessionId,...JSON.parse(v.params.payload)});
  });
  ws.addEventListener('close',()=>{for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('CDP closed'));}this.pending.clear();});
 }
 static async connect(url){
  const ws=new WebSocket(url);
  await Promise.race([new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',()=>reject(Error('WebSocket connection failed')),{once:true});}),sleep(8000).then(()=>{throw Error('WebSocket open deadline');})]);
  return new CDP(ws);
 }
 call(method,params={},sessionId){
  return new Promise((resolve,reject)=>{
   const id=++this.id;
   const timer=setTimeout(()=>{this.pending.delete(id);reject(Error(method+' deadline'));},10000);
   this.pending.set(id,{resolve,reject,timer});
   this.ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
  });
 }
}
async function evaluate(sid,expression){
 const v=await cdp.call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sid);
 if(v.exceptionDetails)throw Error('browser evaluation: '+JSON.stringify(v.exceptionDetails));
 return v.result.value;
}
async function newPage(context){
 const target=await cdp.call('Target.createTarget',{url:'about:blank',...(context?{browserContextId:context}:{})});
 const {sessionId:sid}=await cdp.call('Target.attachToTarget',{targetId:target.targetId,flatten:true});
 for(const method of ['Page.enable','Runtime.enable','Network.enable','Log.enable'])await cdp.call(method,{},sid);
 await cdp.call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false},sid);
 await cdp.call('Emulation.setTimezoneOverride',{timezoneId:'UTC'},sid);
 await cdp.call('Runtime.addBinding',{name:'__c945InstalledInput'},sid);
 await cdp.call('Page.addScriptToEvaluateOnNewDocument',{source:"document.addEventListener('click',e=>__c945InstalledInput(JSON.stringify({kind:'click',trusted:e.isTrusted,id:e.target.id,text:e.target.textContent.slice(0,100)})),true);document.addEventListener('submit',e=>__c945InstalledInput(JSON.stringify({kind:'submit',trusted:e.isTrusted,id:e.target.id})),true);"},sid);
 return sid;
}
async function navigate(sid,suffix){
 const v=await cdp.call('Page.navigate',{url:ORIGIN+suffix},sid);assert(!v.errorText,v.errorText);
 await until(()=>evaluate(sid,"document.readyState==='complete'&&location.origin==="+JSON.stringify(ORIGIN)), 'page load');
}
async function click(sid,selector){
 const point=await evaluate(sid,"(()=>{const e=document.querySelector("+JSON.stringify(selector)+");if(!e||e.disabled)throw Error('missing/disabled control');e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();if(b.width<=0||b.height<=0)throw Error('hidden control');return {x:b.left+b.width/2,y:b.top+b.height/2};})()");
 await cdp.call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point},sid);
 await cdp.call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point},sid);
}
async function fill(sid,selector,text){
 await evaluate(sid,"(()=>{const e=document.querySelector("+JSON.stringify(selector)+");e.focus();e.select();})()");
 await cdp.call('Input.insertText',{text},sid);
 assert.equal(await evaluate(sid,"document.querySelector("+JSON.stringify(selector)+").value"),text);
}
async function rows(sid){return await evaluate(sid,"JSON.parse(localStorage.getItem('returnby.v1')||'[]')");}
async function screenshot(sid,name,selector){
 let params={format:'png',captureBeyondViewport:true};
 if(selector){
  const b=await evaluate(sid,"(()=>{const e=document.querySelector("+JSON.stringify(selector)+");const b=e.getBoundingClientRect();return {x:b.left+scrollX,y:b.top+scrollY,width:b.width,height:b.height,scale:1};})()");
  params.clip=b;
 }
 const {data}=await cdp.call('Page.captureScreenshot',params,sid);
 fs.writeFileSync(path.join(RUN,name),Buffer.from(data,'base64'));
}
function group(id,details){r.groups.push({id,passed:true,at:new Date().toISOString(),...details});save();console.log(id+' PASS');}
async function startServer(){
 capacity('before launcher');await freePort(48643);
 server=launch('launcher',LAUNCH,['--no-open']);
 await until(async()=>server.exitCode===null&&(await http(ORIGIN+'/index.html')).status===200,'installed launcher HTTP');
}
async function startBrowser(){
 capacity('before browser');await freePort(CDPPORT);
 browser=launch('chrome',CHROME,['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--disable-extensions','--metrics-recording-only','--mute-audio','--disable-breakpad','--disable-gpu','--disk-cache-size=1048576','--media-cache-size=1048576','--remote-debugging-address=127.0.0.1','--remote-debugging-port='+CDPPORT,'--user-data-dir='+PROFILE,'about:blank']);
 const version=await until(async()=>{if(browser.exitCode!==null)throw Error('Chrome exited before CDP');return JSON.parse((await http('http://127.0.0.1:'+CDPPORT+'/json/version')).data);},'owned Chrome CDP');
 cdp=await CDP.connect(version.webSocketDebuggerUrl);
 r.browser_versions??=[];r.browser_versions.push(await cdp.call('Browser.getVersion'));
 await cdp.call('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:DOWNLOADS,eventsEnabled:true});
}
async function closeBrowser(){
 processCensus('before browser close');
 if(cdp){try{await cdp.call('Browser.close');}catch(e){if(!String(e).includes('CDP closed'))throw e;}}
 await waitExit(browser);cdp=null;browser=null;
}
async function chooseBackup(sid,filename){
 const {root}=await cdp.call('DOM.getDocument',{},sid);
 const {nodeId}=await cdp.call('DOM.querySelector',{nodeId:root.nodeId,selector:'#backup-file'},sid);
 assert(nodeId,'real backup file input');
 await cdp.call('DOM.setFileInputFiles',{files:[filename],nodeId},sid);
 await until(()=>evaluate(sid,"!document.querySelector('#backup-preview').hidden"),'actual file preview');
}
async function main(){
 assert.equal(sha(fs.readFileSync(path.join(BASE,'CONTRACT.md'))),CONTRACT);
 assert(!fs.existsSync(RUN),'refuse existing receiving run');
 capacity('before materialization');
 fs.mkdirSync(RUN);fs.mkdirSync(DOWNLOADS);
 save();
 const seal=JSON.parse(fs.readFileSync(path.join(BASE,'preview-seal.json'),'utf8'));
 assert.equal(seal.archive.sha256,EXPECTED_ARCHIVE);
 r.inputs={contract:CONTRACT,driver:sha(fs.readFileSync(import.meta.filename)),seal:sha(fs.readFileSync(path.join(BASE,'preview-seal.json')))};
 r.installed_before=files(INSTALL);
 const packagePins={
  'Launch ReturnBy.command':'4674c1370f853ea3e7a01477581356c3ffd2fa900fd6ab69da2f647e39abb094',
  'serve.py':'cfd5cb07120cbfc5f74b0b458226138e28b2c94779e91caa889e5ea28a773a9e',
  'INSTALLATION.json':'2682fe1f6890693b9a70c3988accf1f17fcf9ad6eafcba9f2a2f9518461c4257',
  'site/BUILD-MANIFEST.json':'384deec2a8587f210f7a1d74e067f79dea42ca0f6141130a577e82fa6f9e3feb'
 };
 for(const [name,digest] of Object.entries(packagePins))assert.equal(r.installed_before[name]?.sha256,digest,'installed pin '+name);
 assert(Object.values(r.installed_before).every(x=>!x.symlink),'installed symlink refusal');
 const zips=Object.keys(r.installed_before).filter(x=>x.endsWith('.zip'));
 assert.equal(zips.length,1,'exactly one retained original archive');
 assert.equal(r.installed_before[zips[0]].bytes,26444);
 assert.equal(r.installed_before[zips[0]].sha256,EXPECTED_ARCHIVE);
 const zipBytes=fs.readFileSync(path.join(INSTALL,zips[0]));
 assert.equal(crypto.createHash('sha1').update(Buffer.from('blob '+zipBytes.length+'\0')).update(zipBytes).digest('hex'),'b62844474e965b5549c2dbf5eac3a435dae801ed');
 const manifest=JSON.parse(fs.readFileSync(path.join(INSTALL,'site','BUILD-MANIFEST.json'),'utf8'));
 assert.deepEqual(manifest,seal.manifest);
 for(const [name,pin] of Object.entries(seal.manifest.files)){assert.deepEqual(r.installed_before['site/'+name],{bytes:pin.bytes,sha256:pin.sha256});}
 await freePort(48643);
 const checkOut=execFileSync(LAUNCH,['--check'],{cwd:INSTALL,env,encoding:'utf8',timeout:10000,maxBuffer:1024*1024});
 r.check={exit:0,stdout:checkOut};
 await freePort(48643);assert.deepEqual(files(INSTALL),r.installed_before);
 monitor=setInterval(()=>{try{const obs=capacity('active',false);if(Date.now()-START>180000)throw Error('runtime limit');for(const x of fs.readdirSync(RUN))if(/\.(stdout|stderr)$/.test(x))assert(fs.statSync(path.join(RUN,x)).size<=LOGCAP,'log cap');}catch(e){fatal=e;for(const {child} of children)if(child.exitCode===null&&child.signalCode===null)child.kill('SIGTERM');}},1500);
 runtimeTimer=setTimeout(()=>{fatal=Error('180-second deadline');for(const {child} of children)if(child.exitCode===null&&child.signalCode===null)child.kill('SIGTERM');},180000);
 await startServer();
 const served=[];
 for(const [name,pin] of Object.entries(seal.manifest.files)){const v=await http(ORIGIN+'/'+name);assert.equal(v.status,200);assert.equal(v.data.length,pin.bytes);assert.equal(sha(v.data),pin.sha256);served.push({name,bytes:v.data.length,sha256:sha(v.data)});}
 assert.equal((await http(ORIGIN+'/not-an-asset-c945953fdeb7')).status,404);
 group('R1',{served,launcher_mode:'documented --no-open; private Chrome follows'});
 await startBrowser();let sid=await newPage();await navigate(sid,'/index.html');
 assert.deepEqual(await rows(sid),[]);
 await click(sid,"a[href='./manual-entry.html']");
 await until(()=>evaluate(sid,"document.readyState==='complete'&&!!document.querySelector('#manual-form')"),'manual entry route');
 await fill(sid,'#manual-merchant','Harbor <b>& Pine</b>');
 await fill(sid,'#manual-order-no','RCPT-1042 A');
 await fill(sid,'#manual-total','USD42.50');
 await fill(sid,'#manual-days','14');
 await evaluate(sid,"(()=>{const e=document.querySelector('#manual-date');e.value='2099-01-15';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()");
 r.actions.push({kind:'date-fill',value:'2099-01-15',trusted:false,method:'native date value and explicitly synthetic input/change; actual Review/Save clicks remain native'});
 assert.deepEqual(await rows(sid),[]);
 await click(sid,'#manual-review-button');
 await until(()=>evaluate(sid,"!document.querySelector('#manual-review').hidden"),'review visible');
 const review=await evaluate(sid,"Object.fromEntries(['due','merchant','orderDate','windowDays','orderNo','total'].map(x=>[x,document.querySelector('#review-'+x).textContent]))");
 assert.equal(review.due,'2099-01-29');assert.equal(review.merchant,'Harbor <b>& Pine</b>');assert.equal(review.windowDays,'14');assert.deepEqual(await rows(sid),[]);
 await screenshot(sid,'review.png','.manual-grid');
 await click(sid,'#manual-save');
 await until(()=>evaluate(sid,"!document.querySelector('#manual-success').hidden"),'confirmed save');
 const saved=(await rows(sid));assert.equal(saved.length,1);
 const order=saved[0];assert(order.id);assert(order.createdAt);
 for(const [k,v] of Object.entries({merchant:'Harbor <b>& Pine</b>',orderNo:'RCPT-1042 A',total:'USD42.50',orderDate:'2099-01-15',windowDays:14,windowSource:'user'}))assert.equal(order[k],v);
 r.saved_order=order;
 await click(sid,"#manual-success a");
 await until(()=>evaluate(sid,"document.readyState==='complete'&&!!document.querySelector('#tracked-count')"),'tracker navigation');
 assert.deepEqual(await rows(sid),saved);
 assert((await evaluate(sid,"document.querySelector('#list').textContent")).includes(order.merchant));
 await screenshot(sid,'tracker-saved.png','.ledger-panel');
 group('R2',{review,saved_order:order});
 await closeBrowser();await stop(server);server=null;await requireOwnedClosed('after first browser and server close');capacity('after first close');
 await startServer();await startBrowser();sid=await newPage();await navigate(sid,'/index.html');
 assert.deepEqual(await rows(sid),saved);
 assert.equal(await evaluate(sid,"document.querySelector('#tracked-count').textContent"),'1');
 group('R3',{same_profile:PROFILE,same_origin:ORIGIN,saved_order:order});
 assert.equal(r.downloads.filter(x=>x.method==='Browser.downloadWillBegin').length,0);
 await click(sid,'#backup-heading');
 await click(sid,'#backup-export');
 const download=await until(()=>r.downloads.find(x=>x.method==='Browser.downloadWillBegin'),'actual backup download');
 await until(()=>r.downloads.some(x=>x.method==='Browser.downloadProgress'&&x.guid===download.guid&&x.state==='completed'),'backup completion');
 const downloaded=path.join(DOWNLOADS,download.guid);
 const backupBytes=fs.readFileSync(downloaded);assert(backupBytes.length>0&&backupBytes.length<5*1024*1024);
 const backup=JSON.parse(backupBytes);assert.equal(backup.version,1);assert.deepEqual(backup.orders,saved);
 r.backup={native_path:downloaded,suggested_filename:download.suggestedFilename,bytes:backupBytes.length,sha256:sha(backupBytes),document:backup};
 const {browserContextId}=await cdp.call('Target.createBrowserContext',{disposeOnDetach:true});
 const restore=await newPage(browserContextId);await navigate(restore,'/index.html');assert.deepEqual(await rows(restore),[]);
 await click(restore,'#backup-heading');await chooseBackup(restore,downloaded);
 assert.equal(await evaluate(restore,"document.querySelector('#backup-summary').textContent"),'1 to add \u00b7 0 already saved \u00b7 0 conflicting');
 assert.deepEqual(await rows(restore),[]);
 await screenshot(restore,'backup-preview.png','.backup-panel');
 await click(restore,'#backup-apply');
 await until(()=>evaluate(restore,"document.querySelector('#backup-message').textContent.includes('Imported 1 order.')"),'backup UI import');
 assert.deepEqual(await rows(restore),saved);
 await navigate(restore,'/index.html');assert.deepEqual(await rows(restore),saved);
 await click(restore,'#backup-heading');await chooseBackup(restore,downloaded);
 assert.equal(await evaluate(restore,"document.querySelector('#backup-summary').textContent"),'0 to add \u00b7 1 already saved \u00b7 0 conflicting');
 assert.equal(await evaluate(restore,"document.querySelector('#backup-apply').disabled"),true);
 assert.deepEqual(await rows(restore),saved);
 group('R4',{backup:r.backup,restored_order:order,idempotent_import_disabled:true,file_input_route:'CDP DOM.setFileInputFiles with original actual native browser download'});
 await cdp.call('Target.disposeBrowserContext',{browserContextId});
 await closeBrowser();await stop(server);server=null;await requireOwnedClosed('after final browser and server close');
 r.installed_after=files(INSTALL);assert.deepEqual(r.installed_after,r.installed_before);
 assert.equal(r.exceptions.length,0,'browser page/console errors');
 const external=r.requests.filter(x=>!x.url.startsWith(ORIGIN+'/')&&!x.url.startsWith('blob:'+ORIGIN+'/')&&!x.url.startsWith('data:'));
 assert.deepEqual(external,[],'application off-origin requests');
 for(const p of r.processes)assert(p.finished_at,'owned child terminal record '+p.pid);
 capacity('final');
 group('R5',{installed_unchanged:true,owned_children_closed:true,external_requests:0,browser_errors:0});
 r.terminal={passed:true,finished_at:new Date().toISOString(),milliseconds:Date.now()-START};
}
try{await main();}
catch(error){r.terminal={passed:false,error:String(error.stack||error),finished_at:new Date().toISOString(),milliseconds:Date.now()-START};console.error(r.terminal.error);process.exitCode=1;}
finally{
 clearInterval(monitor);clearTimeout(runtimeTimer);
 if(cdp){try{await closeBrowser();r.cleanup.push('owned Chrome closed');}catch(e){r.cleanup.push({error:String(e),scope:'owned Chrome'});}}
 for(const {child,rec} of children){try{await stop(child,'SIGTERM');}catch(e){r.cleanup.push({pid:rec.pid,error:String(e)});}}
 if(fs.existsSync(RUN)){
  const remaining=processCensus('final cleanup observation');
  if(remaining.length){
   r.cleanup.push({scope:'owned processes',remaining});
   r.terminal={...r.terminal,passed:false,closure_error:'owned process census is not empty'};
   process.exitCode=1;
  }
  r.files=files(RUN);delete r.files['receipt.json'];r.file_manifest_excludes=['receipt.json (self)'];
  save();console.log(JSON.stringify({terminal:r.terminal,groups:r.groups.map(x=>x.id),receipt:path.join(RUN,'receipt.json')}));}
}
