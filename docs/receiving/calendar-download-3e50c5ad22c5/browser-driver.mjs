import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

export const pause = ms => new Promise(resolve=>setTimeout(resolve,ms));
export async function waitFor(fn,label,limit=200) {
 let last;
 for(let i=0;i<limit;i++){try{if(await fn())return;}catch(e){last=e;}await pause(50);}
 throw new Error('Timed out: '+label+(last?' ('+last.message+')':''));
}
export async function launchBrowser(executable,report) {
 const profile=await mkdtemp(join('/dev/shm/hamon-returnby-calendar-3e50c5ad22c5/profiles','browser-'));
 const process=spawn(executable,['--headless=new','--no-sandbox','--disable-gpu','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--no-default-browser-check','--disk-cache-size=1048576','--media-cache-size=1048576','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
 let log='',launchError,socket,sequence=0,currentSession;
 const pending=new Map(),downloads=new Map();
 process.stderr.on('data',bytes=>{log=(log+bytes.toString()).slice(-12000);});
 process.on('error',e=>{launchError=e;});
 report.browserPid=process.pid;report.profile=profile;report.browserExecutable=executable;
 async function close(){
  for(const entry of pending.values()){clearTimeout(entry.timer);entry.reject(new Error('Browser closing'));}pending.clear();
  try{if(socket?.readyState===WebSocket.OPEN)await command('Browser.close',{},false);}catch{}
  if(process.exitCode===null&&process.signalCode===null){
   await Promise.race([new Promise(resolve=>process.once('exit',resolve)),pause(4000)]);
  }
  if(process.exitCode===null&&process.signalCode===null){
   process.kill('SIGTERM');await Promise.race([new Promise(resolve=>process.once('exit',resolve)),pause(2000)]);
  }
  if(process.exitCode===null&&process.signalCode===null){
   process.kill('SIGKILL');await new Promise(resolve=>process.once('exit',resolve));
  }
  socket?.close();
  await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100});
  report.cleanup={profileRemoved:true,browserExit:process.exitCode,browserSignal:process.signalCode};
  report.browserLog=log;
 }
 function command(method,params={},scoped=true){
  const id=++sequence;
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout '+method));},30000);
   pending.set(id,{resolve,reject,timer});
   socket.send(JSON.stringify({id,method,params,...(scoped&&currentSession?{sessionId:currentSession}:{})}));
  });
 }
 try{
  let port,endpoint;
  await waitFor(async()=>{
   if(launchError)throw launchError;
   if(process.exitCode!==null)throw new Error('Chromium exited '+process.exitCode+': '+log);
   [port,endpoint]=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).trim().split('\n');
   return port&&endpoint;
  },'installed Chromium startup',1200);
  socket=new WebSocket('ws://127.0.0.1:'+port+endpoint);
  socket.addEventListener('message',event=>{
   const m=JSON.parse(event.data);
   if(m.id){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}
   else if(m.method==='Runtime.exceptionThrown')report.pageErrors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
   else if(m.method==='Network.requestWillBeSent')report.requests.push({url:m.params.request.url,sessionId:m.sessionId});
   else if(m.method==='Browser.downloadWillBegin')downloads.set(m.params.guid,{...m.params,state:'started'});
   else if(m.method==='Browser.downloadProgress')downloads.set(m.params.guid,{...downloads.get(m.params.guid),...m.params});
  });
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  report.browser=await command('Browser.getVersion',{},false);
 }catch(e){await close();throw e;}
 async function evaluate(fn,...args){
  const expression='('+fn.toString()+')('+args.map(v=>JSON.stringify(v)).join(',')+')';
  const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
  return r.result.value;
 }
 async function open(url,{width=1280,height=1000,downloadPath,offline=true}={}){
  const {browserContextId}=await command('Target.createBrowserContext',{},false);
  if(downloadPath)await command('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath,browserContextId,eventsEnabled:true},false);
  const {targetId}=await command('Target.createTarget',{url:'about:blank',browserContextId},false);
  ({sessionId:currentSession}=await command('Target.attachToTarget',{targetId,flatten:true},false));
  for(const method of ['Page.enable','Runtime.enable','Network.enable','DOM.enable'])await command(method);
  if(offline)await command('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
  await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  await command('Page.navigate',{url});
  await waitFor(()=>evaluate(u=>document.URL===u&&document.readyState==='complete',url),'document load');
  return {targetId,sessionId:currentSession,browserContextId,url,width,height,offline};
 }
 async function key(name,modifiers=0){
  const code={Tab:9,Enter:13,Home:36,End:35,ArrowLeft:37,ArrowUp:38,ArrowRight:39,ArrowDown:40,Backspace:8,Escape:27,a:65}[name];
  assert.ok(code,'Mapped browser key '+name);
  for(const type of ['keyDown','keyUp'])await command('Input.dispatchKeyEvent',{type,key:name,code:name,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code,modifiers,...(name==='Enter'&&type==='keyDown'?{text:'\r',unmodifiedText:'\r'}:{})});
 }
 async function activate(selector){
  assert.ok(await evaluate(s=>!!document.querySelector(s),selector),'Missing control '+selector);
  await evaluate(s=>document.querySelector(s).focus(),selector);await key('Enter');
 }
 async function fill(selector,text){
  assert.ok(await evaluate(s=>!!document.querySelector(s),selector),'Missing control '+selector);
  await evaluate(s=>document.querySelector(s).focus(),selector);
  await key('a',2);await key('Backspace');
  if(text)await command('Input.insertText',{text});
 }
 async function chooseFile(selector,file){
  const {root}=await command('DOM.getDocument');
  const {nodeId}=await command('DOM.querySelector',{nodeId:root.nodeId,selector});
  assert.ok(nodeId,'File input '+selector);
  await command('DOM.setFileInputFiles',{nodeId,files:[file]});
 }
 return {command,evaluate,open,key,activate,fill,chooseFile,close,downloads};
}
