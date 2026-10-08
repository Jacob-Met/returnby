(async function receiver(){
 const fs=await import('node:fs/promises'),path=await import('node:path'),http=await import('node:http'),cp=await import('node:child_process'),crypto=await import('node:crypto'),{default:assert}=await import('node:assert/strict');
 const root=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]),chrome=process.env.CHROME_PATH||'/snap/bin/chromium';
 await fs.mkdir(out,{recursive:false});await fs.mkdir(path.join(out,'downloads'));
 const result={schema:'returnby.trip-notes.browser.v1',started_at:new Date().toISOString(),runtime:process.version,checks:[],errors:[],external_requests:[],fixture:'Authored fictional saved orders in a new private profile only'};
 const h=b=>crypto.createHash('sha256').update(b).digest('hex'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const wait=async(fn,label)=>{for(let i=0;i<120;i++){const v=await fn();if(v)return v;await sleep(100);}throw Error('Timed out: '+label)};
 let server,child,c;
 class CDP {
  constructor(ws){this.ws=ws;this.next=1;this.pending=new Map();this.listeners=[];ws.onmessage=e=>{const msg=JSON.parse(e.data);if(msg.id){const p=this.pending.get(msg.id);if(p){this.pending.delete(msg.id);msg.error?p.reject(Error(JSON.stringify(msg.error))):p.resolve(msg.result)}}else for(const f of this.listeners)f(msg)};}
  send(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=this.next++;this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));})}
 }
 const mark=(name,details={})=>result.checks.push({name,passed:true,...details});
 const fixture=JSON.stringify([{id:'notes-one',merchant:'Fictional Harbor Shop',orderNo:'DEMO-71',total:'€19,95',orderDate:'2026-10-01',windowDays:30,windowSource:'user',createdAt:'2026-10-01T12:00:00Z'},{id:'notes-two',merchant:'Fictional Hill Shop',orderNo:'DEMO-72',total:'$12',orderDate:'2026-10-02',windowDays:14,windowSource:'policy',createdAt:'2026-10-02T12:00:00Z'}]);
 try{
  const dist=path.join(root,'dist');
  server=http.createServer(async(req,res)=>{try{const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,'')||'index.html';const p=path.resolve(dist,rel);if(!p.startsWith(dist+path.sep))throw Error('outside');const b=await fs.readFile(p);res.writeHead(200,{'Content-Type':({'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(p)]||'application/octet-stream'});res.end(b)}catch{res.writeHead(404);res.end()}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  const profile=path.join(out,'profile');child=cp.spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
  let stderr='';child.stderr.on('data',b=>{stderr+=b.toString()});child.on('error',e=>result.errors.push(String(e)));
  const port=await wait(async()=>{try{return(await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]}catch{return false}},'owned Chrome startup');
  const version=await(await fetch('http://127.0.0.1:'+port+'/json/version')).json();result.browser=version.Browser;
  const ws=new WebSocket(version.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});c=new CDP(ws);
  c.listeners.push(msg=>{if(msg.method==='Runtime.exceptionThrown')result.errors.push(msg.params.exceptionDetails.text);if(msg.method==='Fetch.requestPaused'){const url=msg.params.request.url,allowed=url.startsWith(origin+'/')||url.startsWith('file:')||url.startsWith('data:')||url.startsWith('blob:');if(!allowed)result.external_requests.push(url);c.send(allowed?'Fetch.continueRequest':'Fetch.failRequest',{requestId:msg.params.requestId,...(allowed?{}:{errorReason:'BlockedByClient'})},msg.sessionId).catch(e=>result.errors.push(String(e)));}});
  await c.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:path.join(out,'downloads'),eventsEnabled:true});
  const create=async()=>{
   const {targetId}=await c.send('Target.createTarget',{url:'about:blank'}),{sessionId}=await c.send('Target.attachToTarget',{targetId,flatten:true});
   await c.send('Runtime.enable',{},sessionId);await c.send('Page.enable',{},sessionId);await c.send('Network.enable',{},sessionId);await c.send('Fetch.enable',{patterns:[{urlPattern:'*'}]},sessionId);
   await c.send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false},sessionId);
   return sessionId;
  };
  const s=await create();
  const ev=async(expression,session=s)=>{const r=await c.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},session);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const click=async(selector)=>{const p=await ev('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');if(!e)throw Error("Missing "+'+JSON.stringify(selector)+');e.scrollIntoView({block:"center"});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()');await c.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p},s);await c.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p},s);};
  const fill=async(selector,text)=>{await click(selector);await c.send('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',modifiers:2},s);await c.send('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',modifiers:2},s);await c.send('Input.insertText',{text},s);};
  const init='if(location.protocol==="http:"){const set=Storage.prototype.setItem;set.call(localStorage,"returnby.v1",'+JSON.stringify(fixture)+');window.__writes=[];for(const name of ["setItem","removeItem","clear"]){const f=Storage.prototype[name];Storage.prototype[name]=function(...args){window.__writes.push([name,...args]);return f.apply(this,args)}}}';
  await c.send('Page.addScriptToEvaluateOnNewDocument',{source:init},s);await c.send('Page.navigate',{url:origin+'/trip-checklist.html'},s);
  await wait(()=>ev('document.querySelectorAll(".order-choice").length===2'),'saved order page');
  assert.equal(await ev('localStorage.getItem("returnby.v1")'),fixture);mark('existing saved records load unchanged');
  assert.equal(await ev('Boolean(document.querySelector("#trip-notes"))'),true,'user-facing typed trip note field is present');
  assert.equal(await ev('document.querySelector("#trip-notes").value'),'');assert.equal(await ev('document.querySelector("#trip-note-count").textContent'),'0 / 1000');
  await click('input[value="notes-one"]');
  await ev('document.querySelector("#trip-date").value="2026-10-10";document.querySelector("#trip-date").dispatchEvent(new Event("input",{bubbles:true}))');
  const note='Bring the blue bag 🧾\nDesk <B> & side entrance.';
  await fill('#trip-notes',note);assert.equal(await ev('document.querySelector("#trip-notes").value'),note);assert.equal(await ev('document.querySelector("#trip-note-count").textContent'),Array.from(note).length+' / 1000');
  await click('#preview-trip');assert.equal(await ev('document.querySelector(".sheet-trip-notes p").textContent'),note);assert.equal(await ev('document.querySelector("#download-checklist").disabled'),false);mark('real keyboard entry and preview preserve literal Unicode and separate notes');
  await fill('#trip-notes','Updated pickup at 15:00.');assert.equal(await ev('document.querySelector("#download-checklist").disabled'),true);assert.equal(await ev('document.querySelector("#checklist-preview").hidden'),true);
  await click('#clear-selection');assert.equal(await ev('document.querySelector("#trip-notes").value'),'Updated pickup at 15:00.');await click('input[value="notes-one"]');await click('#preview-trip');mark('note edits retire prior export; clearing and reselecting keeps the draft');
  await fill('#trip-notes','🧾'.repeat(1001));await click('#preview-trip');assert.equal(await ev('document.querySelector("#download-checklist").disabled'),true);assert.match(await ev('document.querySelector("#trip-notice").textContent'),/1,000/);
  await fill('#trip-notes',note);await click('#preview-trip');mark('over-limit Unicode notes refuse export and valid correction recovers');
  await c.send('Emulation.setDeviceMetricsOverride',{width:320,height:900,deviceScaleFactor:1,mobile:false},s);
  assert.equal(await ev('document.documentElement.scrollWidth<=innerWidth'),true);
  let shot=await c.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true},s);await fs.writeFile(path.join(out,'notes-320.png'),Buffer.from(shot.data,'base64'));mark('320px notes field and preview remain within page');
  await click('#download-checklist');
  const downloaded=await wait(async()=>{const names=await fs.readdir(path.join(out,'downloads'));return names.find(n=>n.endsWith('.html'))},'physical HTML download');
  const bytes=await fs.readFile(path.join(out,'downloads',downloaded)),html=bytes.toString('utf8');
  assert(html.includes('Desk &lt;B&gt; &amp; side entrance.'));assert(!html.includes('Fictional Hill Shop'));assert(!html.includes('<script'));result.download={name:downloaded,bytes:bytes.length,sha256:h(bytes)};mark('physical self-contained download includes selected facts and typed notes',result.download);
  const offline=await create();await c.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0},offline);await c.send('Page.navigate',{url:'file://'+path.join(out,'downloads',downloaded)},offline);
  await wait(()=>ev('Boolean(document.querySelector(".sheet-trip-notes"))',offline),'offline file');
  assert.equal(await ev('document.querySelector(".sheet-trip-notes p").textContent',offline),note);
  await c.send('Emulation.setEmulatedMedia',{media:'print'},offline);assert.equal(await ev('getComputedStyle(document.querySelector(".sheet-open-help")).display',offline),'none');assert.equal(await ev('document.querySelectorAll("script,iframe,link,form").length',offline),0);
  shot=await c.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true},offline);await fs.writeFile(path.join(out,'notes-offline-print.png'),Buffer.from(shot.data,'base64'));mark('download reopens offline with identical notes and existing print guidance');
  await ev('const original=Storage.prototype.setItem;localStorage.setItem("returnby.v1",JSON.stringify([]));window.__writes.pop()');await click('#download-checklist');assert.equal(await ev('document.querySelector("#download-checklist").disabled'),true);assert.match(await ev('document.querySelector("#trip-notice").textContent'),/Saved orders changed/);mark('saved-order change still refuses stale note-bearing download');
  await ev('localStorage.setItem("returnby.v1",'+JSON.stringify(fixture)+');window.__writes.pop()');await click('#refresh-orders');assert.equal(await ev('document.querySelector("#trip-notes").value'),'');assert.equal(await ev('document.querySelector("#trip-note-count").textContent'),'0 / 1000');assert.equal(await ev('document.querySelectorAll("input[type=checkbox]:checked").length'),0);assert.equal(await ev('document.querySelector("#download-checklist").disabled'),true);assert.equal(await ev('localStorage.getItem("returnby.v1")'),fixture);assert.deepEqual(await ev('window.__writes'),[]);mark('explicit refresh clears plan notes; checklist performs no storage writes');
  assert.deepEqual(result.errors,[]);assert.deepEqual(result.external_requests,[]);result.status='passed';
  result.chrome_stderr=stderr;
 }catch(error){result.status='failed';result.error=error.stack;process.exitCode=1;}
 finally{
  if(c){try{await c.send('Browser.close')}catch{}c.ws.close();}
  if(child){await Promise.race([new Promise(r=>child.once('exit',r)),sleep(3000)]);if(child.exitCode===null)child.kill();}
  if(server)await new Promise(r=>server.close(r));
  const profile=path.join(out,'profile');try{await fs.rm(profile,{recursive:true,force:false});result.owned_profile_removed=true}catch(e){if(e.code!=='ENOENT')result.cleanup_error=String(e)}
  result.finished_at=new Date().toISOString();await fs.writeFile(path.join(out,'receipt.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,checks:result.checks.length,error:result.error,receipt:path.join(out,'receipt.json'),download:result.download}));
 }
})();
