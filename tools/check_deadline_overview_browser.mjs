#!/usr/bin/env node
/** Actual saved-return review -> read-only monthly deadline overview receiving.
 * Uses Node 22's built-in CDP WebSocket and the installed system Chrome.
 */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {spawn} from "node:child_process";
import {createServer} from "node:http";
import {readFile,writeFile,mkdir,mkdtemp,rm,readdir,lstat} from "node:fs/promises";
import {dirname,extname,join,resolve,sep} from "node:path";
import {fileURLToPath} from "node:url";
const argv=process.argv.slice(2);
const option=(name,fallback)=>argv.includes(name)?argv[argv.indexOf(name)+1]:fallback;
const project=resolve(option("--project",join(dirname(fileURLToPath(import.meta.url)),"..")));
const build=resolve(option("--build",join(project,"dist")));
const executable=option("--browser","google-chrome");
const output=resolve(option("--output",join(project,"deadline-overview-receiving")));
const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
await mkdir(output);
const downloadPath=join(output,"downloads");await mkdir(downloadPath);
const profile=await mkdtemp(join(output,"chrome-"));
const fixture=JSON.parse(await readFile(join(project,"tools/fixtures/deadline-overview-cases.json"),"utf8"));
const report={schema:"returnby.deadline-overview-browser.v1",status:"running",project,build,executable,
  node:process.version,checkout:process.env.GITHUB_SHA??null,claim:"https://github.com/Jacob-Met/returnby/issues/26",
  checks:[],artifacts:[],requests:[],externalRequests:[],serverRequests:[],
  sourceSha256:{},buildSha256:{},sourceUnchanged:false,
  observer:"Real native Review/Save, backup-file chooser/import, other-tab Edit/Save and calendar download. Instrumented Storage records writes; explicit confined read/corruption faults are labeled.",
  visualBoundary:"Actual browser screenshots are preserved. Direct pixel inspection is a separate receiving claim."};
const sourcePaths=[
  "src/backup-ui.ts",
  "src/backup.css",
  "src/backup.ts",
  "src/calendar-batch-ui.ts",
  "src/calendar-batch.css",
  "src/calendar-batch.ts",
  "src/deadline.ts",
  "src/edit-ui.ts",
  "src/edit.css",
  "src/edit.ts",
  "src/ics.ts",
  "src/main.ts",
  "src/parse.ts",
  "src/policy.ts",
  "src/samples.ts",
  "src/store.ts",
  "src/style.css",
  "src/deadline-overview.ts",
  "src/deadline-overview-ui.ts",
  "src/deadline-overview-entry.ts",
  "src/deadline-overview.css",
  "tests/deadline-overview.test.ts",
  "data/policies.json",
  "index.html",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "tools/fixtures/deadline-overview-cases.json",
  "tools/check_deadline_overview_browser.mjs",
  ".github/workflows/deadline-overview-browser.yml"
];
const candidateOnly=new Set(["src/deadline-overview.ts","src/deadline-overview-ui.ts","src/deadline-overview-entry.ts","src/deadline-overview.css","tests/deadline-overview.test.ts"]);
async function sourceHashes(){
  const result={};
  for(const path of sourcePaths){
    try{result[path]=hash(await readFile(join(project,path)));}
    catch(error){if(error.code==="ENOENT"&&candidateOnly.has(path))result[path]=null;else throw error;}
  }
  return result;
}
async function buildHashes(directory,prefix=""){
  const result={};
  for(const item of await readdir(directory,{withFileTypes:true})){
    const name=prefix+item.name;
    if(item.isDirectory())Object.assign(result,await buildHashes(join(directory,item.name),name+"/"));
    else if(item.isFile())result[name]=hash(await readFile(join(directory,item.name)));
    else throw new Error("Unexpected nonregular build artifact: "+name);
  }
  return result;
}
report.sourceSha256=await sourceHashes();
const sourceBefore={...report.sourceSha256};
report.buildSha256=await buildHashes(build);
const downloads=new Map(),pageErrors=[],pending=new Map();
let browser,socket,sessionId,appSession,otherSession,browserLog="",sequence=0,pageRequests=[],expectedDialog=false;
const fileChoosers=new Map();
const sleep=milliseconds=>new Promise(resolve_=>setTimeout(resolve_,milliseconds));
const server=createServer(async(request,response)=>{
  try{
    const pathname=decodeURIComponent(new URL(request.url,"http://localhost").pathname);
    report.serverRequests.push({method:request.method,path:pathname});
    if(request.method!=="GET"){response.writeHead(405).end();return;}
    const filename=resolve(build,pathname==="/"?"index.html":"."+pathname);
    if(!filename.startsWith(build+sep)){response.writeHead(403).end();return;}
    const bytes=await readFile(filename);
    const mime={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",
      ".css":"text/css",".json":"application/json",".wasm":"application/wasm",
      ".svg":"image/svg+xml",".zip":"application/zip"}[extname(filename)]||"application/octet-stream";
    response.writeHead(200,{"Content-Type":mime,"Cache-Control":"no-store"}).end(bytes);
  }catch{response.writeHead(404).end("Missing build file.");}
});
await new Promise(resolve_=>server.listen(0,"127.0.0.1",resolve_));
const base="http://127.0.0.1:"+server.address().port;
async function waitFor(check, label, attempts = 300) {
  let lastError;
  for (let step = 0; step < attempts; step++) {
    try { if (await check()) return; } catch (error) { lastError = error; }
    await sleep(100);
  }
  throw new Error('Timed out: ' + label + (lastError ? ' (' + lastError.message + ')' : ''));
}
function command(method, params = {}, scoped = true) {
  const id = ++sequence;
  return new Promise((resolve_, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id); reject(new Error('CDP timeout: ' + method));
    }, 15000);
    pending.set(id, {resolve: resolve_, reject, timer});
    socket.send(JSON.stringify({id, method, params, ...(scoped && sessionId ? {sessionId: typeof scoped === "string" ? scoped : sessionId} : {})}));
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description
    ?? result.exceptionDetails.text);
  return result.result.value;
}
async function key(key_, code, virtualKey, modifiers = 0) {
  for (const type of ['keyDown', 'keyUp']) {
    await command('Input.dispatchKeyEvent', {type, key: key_, code,
      windowsVirtualKeyCode: virtualKey, nativeVirtualKeyCode: virtualKey, modifiers,
      ...(key_ === 'Enter' && type === 'keyDown' ? {text: '\r', unmodifiedText: '\r'} : {})});
  }
}
async function activate(selector) {
  const exists = await evaluate('(() => { const node = document.querySelector(' +
    JSON.stringify(selector) + '); if (!node || node.matches(":disabled") || !node.getClientRects().length) return false; ' +
    'node.scrollIntoView({block:"center"}); node.focus(); return true; })()');
  assert.ok(exists, 'Available keyboard control: ' + selector);
  await key('Enter', 'Enter', 13);
}
async function click(selector) {
  const box = await evaluate('(() => { const node = document.querySelector(' +
    JSON.stringify(selector) + '); if (!node || node.matches(":disabled")) return null; ' +
    'node.scrollIntoView({block:"center"}); const b = node.getBoundingClientRect(); ' +
    'return {x:b.x+b.width/2,y:b.y+b.height/2,width:b.width,height:b.height}; })()');
  assert.ok(box && box.width > 0 && box.height > 0, 'Visible pointer control: ' + selector);
  for (const type of ['mousePressed', 'mouseReleased']) {
    await command('Input.dispatchMouseEvent', {type, x: box.x, y: box.y,
      button: 'left', clickCount: 1});
  }
}
async function textInput(selector, value) {
  await evaluate('(() => {const node=document.querySelector(' + JSON.stringify(selector) +
    '); if(!node) throw new Error("Missing input"); node.scrollIntoView({block:"center"}); node.focus();})()');
  await key('a', 'KeyA', 65, 2);
  await command('Input.insertText', {text: value});
  assert.equal(await evaluate('document.querySelector(' + JSON.stringify(selector) + ').value'), value);
}
async function navigate(url, readySelector, width = 1280, height = 1000) {
  await command('Emulation.setEmulatedMedia', {media: ''});
  await command('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false});
  pageRequests = [];
  await command('Page.navigate', {url});
  await waitFor(() => evaluate('document.URL === ' + JSON.stringify(url) +
    ' && document.readyState === "complete" && !!document.querySelector(' +
    JSON.stringify(readySelector) + ')'), 'actual page ' + url);
}
async function saveArtifact(name, bytes, details = {}) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  assert.ok(buffer.length <= 2 * 1024 * 1024, 'Bounded artifact: ' + name);
  await writeFile(join(output, name), buffer);
  const value = {name, bytes: buffer.length, sha256: hash(buffer), ...details};
  report.artifacts.push(value);
  return value;
}
async function screenshot(name, selector = null) {
  if (selector) await evaluate('document.querySelector(' + JSON.stringify(selector) +
    ').scrollIntoView({block:"start"})');
  const {data} = await command('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  return saveArtifact(name, Buffer.from(data, 'base64'), {kind: 'actual Chrome screenshot'});
}
const passed = name => { report.checks.push(name); console.log('PASS ' + name); };

async function downloaded(button, name) {
  const prior = new Set(downloads.keys());
  await activate(button);
  let actual;
  await waitFor(() => {
    actual = [...downloads.values()].find(value => !prior.has(value.guid) && value.state === 'completed');
    return !!actual;
  }, 'actual download ' + name);
  const bytes = await readFile(join(downloadPath, actual.guid));
  await saveArtifact(name, bytes, {kind: 'actual browser download',
    suggestedFilename: actual.suggestedFilename});
  return {bytes, file: join(output, name), suggestedFilename: actual.suggestedFilename};
}


const OBSERVER="(() => {"+
  "const get=Storage.prototype.getItem,set=Storage.prototype.setItem,remove=Storage.prototype.removeItem,clear=Storage.prototype.clear;"+
  "const p=window.__overviewReceiver={writes:[],readFailure:false};"+
  "p.rawGet=()=>get.call(localStorage,'returnby.v1');"+
  "p.rawSet=value=>set.call(localStorage,'returnby.v1',value);"+
  "Storage.prototype.getItem=function(key){if(p.readFailure&&String(key)==='returnby.v1')throw new DOMException('Authored saved-read refusal','SecurityError');return Reflect.apply(get,this,[key]);};"+
  "Storage.prototype.setItem=function(key,value){if(String(key)==='returnby.v1')p.writes.push({method:'setItem',bytes:String(value).length});return Reflect.apply(set,this,[key,value]);};"+
  "Storage.prototype.removeItem=function(key){if(String(key)==='returnby.v1')p.writes.push({method:'removeItem'});return Reflect.apply(remove,this,[key]);};"+
  "Storage.prototype.clear=function(){p.writes.push({method:'clear'});return Reflect.apply(clear,this,[]);};"+
  "})();";
const inPage=(fn,...args)=>evaluate("("+fn.toString()+")(..."+JSON.stringify(args)+")");
const raw=()=>evaluate("window.__overviewReceiver.rawGet()");
const writes=()=>evaluate("window.__overviewReceiver.writes.length");
const saved=async()=>JSON.parse(await raw()??"[]");
async function newPage(){
  const {targetId}=await command("Target.createTarget",{url:"about:blank"},false);
  ({sessionId}=await command("Target.attachToTarget",{targetId,flatten:true},false));
  await command("Page.enable");await command("Runtime.enable");await command("Network.enable");
  await command("Fetch.enable",{patterns:[{urlPattern:"http*"}]});
  await command("Page.setInterceptFileChooserDialog",{enabled:true});
  await command("Page.addScriptToEvaluateOnNewDocument",{source:OBSERVER});
  await command("Emulation.setTimezoneOverride",{timezoneId:"UTC"});
  return sessionId;
}
async function field(selector,value){
  await inPage((s,v)=>{
    const element=document.querySelector(s);
    if(!element||element.matches(":disabled"))throw new Error("Unavailable native form input: "+s);
    element.value=String(v);
    element.dispatchEvent(new Event("input",{bubbles:true}));
    element.dispatchEvent(new Event("change",{bubbles:true}));
  },selector,value);
  assert.equal(await inPage(s=>document.querySelector(s).value,selector),String(value));
}
async function draftState(){
  return inPage(()=>{
    const form=document.querySelector("#preview"),edit=document.querySelector("#edit-form"),backup=document.querySelector("#backup-preview");
    const values=node=>node?[...node.querySelectorAll("input,textarea,select")].map(e=>[e.name||e.id,e.value,e.checked]):[];
    return {paste:document.querySelector("#paste").value,previewHidden:form.hidden,preview:values(form),
      previewSource:form.dataset.source,previewDays:form.dataset.days,
      backupHidden:backup.hidden,backup:backup.innerHTML,
      filter:[...document.querySelectorAll(".filter-row button")].map(e=>[e.id,e.getAttribute("aria-pressed")]),
      editorOpen:document.querySelector("#edit-dialog").open,editor:values(edit)};
  });
}
async function chooseFile(selector,path){
  fileChoosers.delete(sessionId);
  await click(selector);
  await waitFor(()=>fileChoosers.has(sessionId),"native file chooser: "+selector);
  const event=fileChoosers.get(sessionId);fileChoosers.delete(sessionId);
  assert.ok(event.backendNodeId,"Native file picker supplied the input node");
  await command("DOM.setFileInputFiles",{backendNodeId:event.backendNodeId,files:[path]});
}
async function overviewReady(){
  await waitFor(()=>inPage(()=>!document.querySelector("#overview-content").hidden
    &&document.querySelector("#overview-error").hidden),"accepted monthly overview");
}
async function setMonth(month){
  await field("#overview-month",month);await overviewReady();
  assert.equal(await inPage(()=>document.querySelector("#overview-month-title").dataset.month),month);
}
async function monthData(){
  return inPage(()=>({
    month:document.querySelector("#overview-month-title").dataset.month,
    heading:document.querySelector("#overview-month-title").textContent,
    pads:document.querySelectorAll("#overview-days [data-overview-pad]").length,
    dates:[...document.querySelectorAll("#overview-days [data-overview-date]")].map(e=>({
      date:e.dataset.overviewDate,count:Number(e.querySelector(".overview-day-count").textContent),
      label:e.getAttribute("aria-label"),selected:e.getAttribute("aria-pressed")
    })),
    summary:document.querySelector("#overview-month-summary").textContent,
    snapshot:document.querySelector("#overview-snapshot").textContent,
    selected:document.querySelector("#overview-selected-title").dataset.date,
    previousDisabled:document.querySelector("#overview-month-previous").matches(":disabled"),
    nextDisabled:document.querySelector("#overview-month-next").matches(":disabled"),
  }));
}
async function expectMonth(test){
  const data=await monthData();
  assert.equal(data.month,test.month);assert.equal(data.dates.length,test.days);
  assert.equal(data.pads,test.firstWeekday,"Monday-first weekday alignment: "+test.month);
  const counts={};
  for(let i=0;i<test.days;i++){
    assert.equal(data.dates[i].date,test.month+"-"+String(i+1).padStart(2,"0"));
    assert.equal(data.dates[i].count,test.counts[data.dates[i].date]??0);
    if(data.dates[i].count)counts[data.dates[i].date]=data.dates[i].count;
    assert.ok(data.dates[i].label.includes(data.dates[i].date),"Full civil date remains accessible");
  }
  assert.deepEqual(counts,test.counts);
}
async function selectDate(date){
  await activate('[data-overview-date="'+date+'"]');
  assert.equal(await inPage(()=>document.querySelector("#overview-selected-title").dataset.date),date);
}
async function displayedRows(){
  return inPage(()=>[...document.querySelectorAll("#overview-records [data-overview-id]")].map(node=>({
    id:node.dataset.overviewId,
    fields:Object.fromEntries([...node.querySelectorAll("[data-overview-field]")].map(field=>[field.dataset.overviewField,field.textContent])),
  })));
}
const compare=(a,b)=>a<b?-1:a>b?1:0;
function expectedRows(rows,deadlines){
  return rows.map(order=>({id:order.id,fields:Object.fromEntries([
    ...fixture.nativeKeys.map(key=>[key,String(order[key]??"")===""?"Not recorded":String(order[key])]),
    ["due",deadlines[order.id]],
  ])})).sort((a,b)=>compare(a.id,b.id));
}
async function readonlyAction(action, label){
  const beforeRaw=await raw(),beforeWrites=await writes(),beforeDraft=await draftState();
  await action();
  assert.equal(await raw(),beforeRaw,label+": exact saved bytes");
  assert.equal(await writes(),beforeWrites,label+": zero saved-storage write attempts");
  assert.deepEqual(await draftState(),beforeDraft,label+": draft/editor/import/filter state");
}
async function importBackup(path,count){
  if(!await inPage(()=>document.querySelector("#backup-heading").parentElement.open))
    await activate("#backup-heading");
  await chooseFile("#backup-file",path);
  await waitFor(()=>inPage(()=>!document.querySelector("#backup-preview").hidden
    &&!document.querySelector("#backup-apply").matches(":disabled")),"native reviewed backup preview");
  await activate("#backup-apply");
  await waitFor(async()=>(await saved()).length===count,"native whole backup import");
}
async function checkPhone(){
  const geometry=await inPage(()=>({
    overflow:document.documentElement.scrollWidth>innerWidth,
    panel:document.querySelector("#deadline-overview").getBoundingClientRect().toJSON(),
    grid:document.querySelector("#overview-days").getBoundingClientRect().toJSON(),
    buttons:[...document.querySelectorAll("#overview-days [data-overview-date]")].map(n=>n.getBoundingClientRect().toJSON()),
    injected:typeof window.monthInjected,
  }));
  assert.equal(geometry.overflow,false,"No phone horizontal overflow");
  assert.ok(geometry.panel.x>=0&&geometry.panel.right<=390.5,"Overview fits the phone");
  assert.ok(geometry.buttons.every(b=>b.width>=43.5&&b.height>=43.5),"Native date targets remain at least 44px");
  assert.equal(geometry.injected,"undefined","Authored markup remains literal");
}

async function printReceivingBundle() {
  const rendered = [
    "native-saved-records.json", "authored-return-backup.json", "pending-backup.json",
    "edited-native-saved-records.json", "selected-day-records.json", "unchanged-calendar.ics",
    "overview-desktop.png", "overview-phone.png", "selected-day-phone.png", "refusal-phone.png",
  ];  if (report.status === "passed")
    for (const name of rendered) assert.ok(report.artifacts.some(item => item.name === name),
      "A successful run must retain its fixed rendering fixture: " + name);
  const names = [...rendered, "failed-state.png"].filter(name =>
    report.artifacts.some(item => item.name === name));
  names.push("receiving-report.json");
  const files = [];
  let total = 0;
  for (const name of names.sort()) {
    const filename = join(output, name);
    const info = await lstat(filename);
    assert.ok(info.isFile() && !info.isSymbolicLink(), "Bundle fixture must be a regular file: " + name);
    assert.ok(info.size <= 2 * 1024 * 1024, "Bundle fixture exceeds 2 MiB: " + name);
    const bytes = await readFile(filename);
    assert.equal(bytes.length, info.size, "Bundle fixture changed while being read: " + name);
    const digest = hash(bytes), expected = report.artifacts.find(item => item.name === name);
    if (expected) {
      assert.equal(bytes.length, expected.bytes, "Bundle fixture size differs from actual artifact: " + name);
      assert.equal(digest, expected.sha256, "Bundle fixture digest differs from actual artifact: " + name);
    }
    total += bytes.length;
    assert.ok(total <= 2 * 1024 * 1024, "Receiving packet exceeds 2 MiB; refusing to truncate evidence.");
    files.push({path: name, bytes: bytes.length, sha256: digest, base64: bytes.toString("base64")});
  }
  const payload = Buffer.from(JSON.stringify({version: 1, files}), "utf8");
  assert.ok(payload.length <= 4 * 1024 * 1024, "Serialized receiving packet exceeds 4 MiB.");
  const encoded = payload.toString("base64"), chunks = [];
  for (let offset = 0; offset < encoded.length; offset += 4096)
    chunks.push(encoded.slice(offset, offset + 4096));
  console.log("RETURNBY_DEADLINE_OVERVIEW_BUNDLE_BEGIN " + JSON.stringify({
    bytes: payload.length, sha256: hash(payload), chunks: chunks.length}));
  for (let index = 0; index < chunks.length; index++)
    console.log("RETURNBY_DEADLINE_OVERVIEW_BUNDLE_CHUNK " + index + " " + chunks[index]);
  console.log("RETURNBY_DEADLINE_OVERVIEW_BUNDLE_END");
}

try {
  browser=spawn(executable,["--headless=new","--disable-gpu","--no-sandbox","--no-first-run",
    "--disable-background-networking","--disable-component-update","--disable-sync","--disable-default-apps",
    "--disable-features=Translate,MediaRouter,OptimizationHints","--metrics-recording-only",
    "--remote-debugging-port=0","--user-data-dir="+profile,"about:blank"],{stdio:["ignore","ignore","pipe"]});
  browser.stderr.on("data",chunk=>{browserLog=(browserLog+chunk.toString()).slice(-24000);});
  browser.on("error",error=>{browserLog+=String(error);});
  let active;
  await waitFor(async()=>{active=(await readFile(join(profile,"DevToolsActivePort"),"utf8")).trim().split("\n");return active.length===2;},"system Chrome");
  socket=new WebSocket("ws://127.0.0.1:"+active[0]+active[1]);
  socket.addEventListener("message",event=>{
    const message=JSON.parse(event.data);
    if(message.id){
      const request=pending.get(message.id);if(!request)return;
      pending.delete(message.id);clearTimeout(request.timer);
      if(message.error)request.reject(new Error(message.error.message));else request.resolve(message.result);
    } else if(message.method==="Browser.downloadWillBegin"||message.method==="Browser.downloadProgress"){
      const value=message.params;downloads.set(value.guid,{...downloads.get(value.guid),...value});
    } else if(message.method==="Runtime.exceptionThrown"){
      pageErrors.push(message.params.exceptionDetails.exception?.description??message.params.exceptionDetails.text);
    } else if(message.method==="Fetch.requestPaused"){
      const request=message.params.request;
      const allowed=request.method==="GET"&&new URL(request.url).origin===base;
      if(!allowed)report.externalRequests.push({url:request.url,method:request.method});
      void command(allowed?"Fetch.continueRequest":"Fetch.failRequest",
        {requestId:message.params.requestId,...(!allowed?{errorReason:"BlockedByClient"}:{})},
        message.sessionId).catch(error=>pageErrors.push(error.message));
    } else if(message.method==="Network.requestWillBeSent"){
      pageRequests.push(message.params.request.url);
      report.requests.push({url:message.params.request.url,method:message.params.request.method});
    } else if(message.method==="Page.fileChooserOpened"){
      fileChoosers.set(message.sessionId,message.params);
    } else if(message.method==="Page.javascriptDialogOpening"){
      const accept=expectedDialog&&message.params.type==="confirm"&&message.params.message==="Delete all saved returns?";
      expectedDialog=false;
      if(!accept)pageErrors.push("Unexpected native dialog: "+message.params.message);
      void command("Page.handleJavaScriptDialog",{accept},message.sessionId).catch(error=>pageErrors.push(error.message));
    }
  });
  await new Promise((resolve_,reject)=>{socket.addEventListener("open",resolve_,{once:true});socket.addEventListener("error",reject,{once:true});});
  report.browser=await command("Browser.getVersion",{},false);
  await command("Browser.setDownloadBehavior",{behavior:"allowAndName",downloadPath,eventsEnabled:true},false);
  appSession=await newPage();

  await navigate(base+"/","#sample",1280,1000);
  assert.equal(await raw(),null,"Fresh receiving profile starts without saved returns");
  for(const input of fixture.primaryInputs){
    await activate("#sample");
    await textInput('#preview [name="merchant"]',input.merchant);
    await textInput('#preview [name="orderNo"]',input.orderNo);
    await textInput('#preview [name="total"]',input.total);
    await field('#preview [name="orderDate"]',input.orderDate);
    await field('#preview [name="windowDays"]',input.windowDays);
    const before=(await saved()).length;
    await activate('#preview button[type="submit"]');
    await waitFor(async()=>(await saved()).length===before+1,"actual native reviewed Save");
    const row=(await saved()).at(-1);
    for(const key of ["merchant","orderNo","total","orderDate","windowDays"])assert.equal(row[key],input[key]);
    assert.equal(row.windowSource,"user");
    assert.match(row.id,/^[a-z0-9-]+$/i);assert.ok(Number.isFinite(Date.parse(row.createdAt)));
  }
  const primary=await saved(),primaryDue=Object.fromEntries(primary.map((row,index)=>[row.id,fixture.primaryInputs[index].due]));
  assert.equal(primary.length,3);assert.equal(await writes(),3,"Three native Save writes");
  await saveArtifact("native-saved-records.json",JSON.stringify(primary,null,2)+"\n",{kind:"actual native Review/Save results"});
  passed("actual existing review/save produces three exact independent orders with native IDs and creation times");

  await activate("#sample");
  await textInput('#preview [name="merchant"]',"Unsubmitted trip draft <keep> 😀");
  await textInput("#paste","Fictional unsaved email text: keep this draft private to the intake.");
  const unsubmitted=await draftState();
  assert.equal(unsubmitted.previewHidden,false);
  report.originalBoundary={nativeRecords:primary,expectedDue:primaryDue,
    overviewControls:await inPage(()=>[...document.querySelectorAll("#deadline-overview-open")].map(n=>({id:n.id,text:n.textContent}))),
    meaning:"Native Review/Save succeeded before the independently frozen monthly-overview action is required."};
  passed("the native unsaved intake remains available before opening the separate planning view");
  assert.equal(report.originalBoundary.overviewControls.length,1,"Missing monthly saved-deadline overview entrypoint");

  await readonlyAction(async()=>{
    await activate("#deadline-overview-open");await overviewReady();await setMonth("2026-10");
    await expectMonth({month:"2026-10",days:31,firstWeekday:3,counts:{"2026-10-08":2,"2026-10-09":1}});
    await selectDate("2026-10-08");
    assert.deepEqual(await displayedRows(),expectedRows(primary.filter(x=>primaryDue[x.id]==="2026-10-08"),primaryDue));
    await selectDate("2026-10-07");assert.deepEqual(await displayedRows(),[]);
    await selectDate("2026-10-08");
    await key("ArrowRight","ArrowRight",39);
    assert.equal(await inPage(()=>document.activeElement?.dataset.overviewDate),"2026-10-09");
    assert.equal((await monthData()).selected,"2026-10-09");
    assert.deepEqual(await displayedRows(),expectedRows([primary[1]],primaryDue));
    await key("Home","Home",36);
    assert.equal((await monthData()).selected,"2026-10-05");
    await key("End","End",35);
    assert.equal((await monthData()).selected,"2026-10-11");
    await selectDate("2026-10-08");
    const data=await monthData();assert.match(data.snapshot,/snapshot/i);assert.match(data.snapshot,/refresh/i);
    await screenshot("overview-desktop.png","#deadline-overview-open");
  },"initial month/day and native keyboard selection");
  assert.deepEqual(await draftState(),unsubmitted);
  passed("monthly counts, exact chosen-day records, empty days and keyboard selection preserve storage and intake state");

  const backupBytes=JSON.stringify(fixture.backup,null,2)+"\n";
  await saveArtifact("authored-return-backup.json",backupBytes,{kind:"frozen fictional backup consumed by native file picker"});
  await importBackup(join(output,"authored-return-backup.json"),primary.length+fixture.backup.orders.length);
  const allExpected=[...primary,...fixture.backup.orders],allDue={...primaryDue,...fixture.expectedDue};
  assert.deepEqual(await saved(),allExpected,"Native backup import retains the complete authored approved records");
  report.monthCases=[];
  await readonlyAction(async()=>{
    for(const timezone of fixture.timezones){
      await command("Emulation.setTimezoneOverride",{timezoneId:timezone});
      assert.equal(await inPage(()=>Intl.DateTimeFormat().resolvedOptions().timeZone),timezone);
      for(const test of fixture.monthCases){
        await setMonth(test.month);await expectMonth(test);
        const bounds=await monthData();
        assert.equal(bounds.previousDisabled,test.month==="1000-01");
        assert.equal(bounds.nextDisabled,test.month==="9999-12");
        report.monthCases.push({timezone,month:test.month,days:bounds.dates.length,firstWeekday:bounds.pads});
      }
    }
    await command("Emulation.setTimezoneOverride",{timezoneId:"UTC"});
    await setMonth("2026-12");await activate("#overview-month-next");await overviewReady();
    await expectMonth(fixture.monthCases.find(x=>x.month==="2027-01"));
    await activate("#overview-month-previous");await overviewReady();
    await expectMonth(fixture.monthCases.find(x=>x.month==="2026-12"));
    await activate("#overview-today");await overviewReady();
    const today=await inPage(()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");});
    assert.equal((await monthData()).month,today.slice(0,7));assert.equal((await monthData()).selected,today);
  },"frozen civil-date/month/year/timezone cases");
  passed("native backup file admission feeds exact month, leap, century, year and date-range boundaries in three real browser timezones");

  let clusterProjection=[];
  await readonlyAction(async()=>{
    await setMonth("2026-11");await selectDate("2026-11-15");
    const cluster=fixture.backup.orders.filter(x=>fixture.clusterIds.includes(x.id));
    const ordered=expectedRows(cluster,allDue);
    assert.deepEqual(await displayedRows(),ordered.slice(0,fixture.pageSize));
    assert.equal(await inPage(()=>document.querySelector("#overview-record-previous").matches(":disabled")),true);
    assert.equal(await inPage(()=>document.querySelector("#overview-record-next").matches(":disabled")),false);
    assert.match(await inPage(()=>document.querySelector("#overview-record-page").textContent),/1/);
    clusterProjection.push(...await displayedRows());
    await activate("#overview-record-next");
    assert.deepEqual(await displayedRows(),ordered.slice(fixture.pageSize));
    assert.equal(await inPage(()=>document.querySelector("#overview-record-next").matches(":disabled")),true);
    assert.equal(await inPage(()=>document.activeElement.id),"overview-record-previous");
    clusterProjection.push(...await displayedRows());
    await activate("#overview-record-previous");
    assert.deepEqual(await displayedRows(),ordered.slice(0,fixture.pageSize));
    assert.equal(await inPage(()=>document.activeElement.id),"overview-record-next");
    assert.equal(await inPage(()=>document.querySelectorAll("#overview-records img,#overview-records script").length),0);
    assert.equal(await inPage(()=>typeof window.monthInjected),"undefined");
  },"paged literal selected-day records");
  await saveArtifact("selected-day-records.json",JSON.stringify(clusterProjection,null,2)+"\n",{kind:"all 31 actual visible record projections across native pages"});
  passed("all 31 same-day records remain reachable in bounded pages with exact Unicode, markup, multiline values and keyboard focus");

  const pendingBackup={...fixture.backup,orders:[{...fixture.backup.orders[0],id:"pending-only",merchant:"Pending preview stays uncommitted"}]};
  await saveArtifact("pending-backup.json",JSON.stringify(pendingBackup,null,2)+"\n",{kind:"authored pending native backup preview, never applied"});
  await chooseFile("#backup-file",join(output,"pending-backup.json"));
  await waitFor(()=>inPage(()=>!document.querySelector("#backup-preview").hidden),"pending native import review");
  const pendingDraft=await draftState();
  assert.equal((await saved()).some(x=>x.id==="pending-only"),false);
  await setMonth("2026-10");await selectDate("2026-10-08");
  const priorSnapshot=(await monthData()).snapshot,priorRaw=await raw(),priorWrites=await writes();
  otherSession=await newPage();await navigate(base+"/","#sample",1280,1000);
  assert.equal(await raw(),priorRaw,"Second tab uses the exact same saved origin");
  await activate('[data-edit="'+primary[0].id+'"]');
  await waitFor(()=>inPage(()=>document.querySelector("#edit-dialog").open),"real other-tab editor");
  await textInput("#edit-merchant","Edited return trip <keep> 😀");
  await textInput("#edit-total","USD 10.50");
  await field("#edit-order-date","2026-10-01");await field("#edit-window-days",9);
  await activate("#edit-save");
  await waitFor(()=>inPage(()=>!document.querySelector("#edit-dialog").open),"real other-tab Save changes");
  const changed=await saved(),edited=changed.find(x=>x.id===primary[0].id);
  assert.equal(edited.createdAt,primary[0].createdAt);assert.equal(edited.orderDate,"2026-10-01");
  assert.equal(edited.windowDays,9);assert.equal(edited.merchant,"Edited return trip <keep> 😀");
  assert.equal(changed.length,allExpected.length);
  assert.equal(await writes(),1,"The explicit native editor performs the only other-tab write");
  await saveArtifact("edited-native-saved-records.json",JSON.stringify(changed,null,2)+"\n",{kind:"actual second-tab Edit/Save result"});
  sessionId=appSession;
  assert.equal((await monthData()).snapshot,priorSnapshot,"The view keeps its explicitly labeled snapshot until refresh");
  assert.equal((await monthData()).dates.find(x=>x.date==="2026-10-08").count,2);
  assert.equal(await writes(),priorWrites,"A second-tab event causes no hidden overview write");
  await readonlyAction(async()=>{
    await activate("#overview-refresh");await overviewReady();
    await expectMonth({month:"2026-10",days:31,firstWeekday:3,counts:{"2026-10-08":1,"2026-10-09":1,"2026-10-10":1}});
    assert.equal((await monthData()).selected,"2026-10-08","Refresh retains the selected civil day");
    await selectDate("2026-10-10");
    assert.deepEqual(await displayedRows(),expectedRows([edited],{[edited.id]:"2026-10-10"}));
  },"actual second-tab edit and explicit fresh snapshot");
  assert.deepEqual(await draftState(),pendingDraft,"Overview refresh leaves uncommitted backup and intake review intact");
  passed("a real other-tab edit stays separate until explicit refresh, then moves the same saved identity without committing pending drafts");

  const goodRaw=await raw(),goodWrites=await writes(),goodDraft=await draftState();
  await command("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:false});
  await inPage(()=>{window.__overviewReceiver.readFailure=true;});
  await activate("#overview-refresh");
  await waitFor(()=>inPage(()=>!document.querySelector("#overview-error").hidden),"authored saved-read refusal");
  assert.equal(await inPage(()=>document.querySelector("#overview-content").hidden),true,"Refusal hides the complete accepted overview");
  assert.match(await inPage(()=>document.querySelector("#overview-error").textContent),/read|load|refus/i);
  assert.equal(await raw(),goodRaw);assert.equal(await writes(),goodWrites);
  assert.deepEqual(await draftState(),goodDraft);
  await screenshot("refusal-phone.png","#deadline-overview-open");
  await inPage(()=>{window.__overviewReceiver.readFailure=false;});
  await activate("#overview-refresh");await overviewReady();
  assert.equal((await monthData()).selected,"2026-10-10");
  assert.deepEqual(await displayedRows(),expectedRows([edited],{[edited.id]:"2026-10-10"}));
  const malformed=JSON.parse(goodRaw);malformed.at(-1).windowDays=0;
  await inPage(value=>window.__overviewReceiver.rawSet(value),JSON.stringify(malformed));
  const malformedRaw=await raw(),beforeMalformedWrites=await writes();
  await activate("#overview-refresh");
  await waitFor(()=>inPage(()=>!document.querySelector("#overview-error").hidden),"late malformed record refusal");
  assert.equal(await inPage(()=>document.querySelector("#overview-content").hidden),true);
  assert.equal(await inPage(()=>document.querySelector("#overview-snapshot").textContent),"","No accepted-snapshot label survives malformed input");
  assert.equal(await raw(),malformedRaw);assert.equal(await writes(),beforeMalformedWrites);
  assert.deepEqual(await draftState(),goodDraft);
  await inPage(value=>window.__overviewReceiver.rawSet(value),goodRaw);
  await activate("#overview-refresh");await overviewReady();
  assert.equal(await raw(),goodRaw);assert.equal(await writes(),goodWrites);
  assert.deepEqual(await draftState(),goodDraft);
  report.refusals={read:"Authored Storage.getItem failure in this fresh profile only.",
    malformed:"Authored last-row windowDays=0; original native stored bytes restored after refusal.",
    noOverviewWrite:true,fullCollectionRefused:true};
  passed("saved-read and late-record failures refuse the entire overview, retain drafts and allow explicit unchanged-data retry");

  await readonlyAction(async()=>{
    await setMonth("2026-11");await selectDate("2026-11-15");
    await checkPhone();await screenshot("overview-phone.png","#deadline-overview-open");
    await screenshot("selected-day-phone.png","#overview-selected-title");
    const wrap=await inPage(()=>[...document.querySelectorAll("#overview-records [data-overview-field]")].map(n=>({
      field:n.dataset.overviewField,whiteSpace:getComputedStyle(n).whiteSpace,
      width:n.getBoundingClientRect().width,parent:n.parentElement.getBoundingClientRect().width,
    })));
    assert.ok(wrap.every(x=>x.whiteSpace==="pre-wrap"&&x.width<=x.parent+1),"Literal values wrap within the record column");
    const calendar=await downloaded('[data-ics="'+primary[1].id+'"]',"unchanged-calendar.ics");
    const unfolded=calendar.bytes.toString("utf8").replace(/\r\n /g,"");
    assert.ok(unfolded.includes("UID:"+primary[1].id+"@returnby\r\n"));
    assert.ok(unfolded.includes("DTSTART;VALUE=DATE:20261009\r\n"));
    assert.ok(unfolded.includes("DTEND;VALUE=DATE:20261010\r\n"));
    assert.ok(unfolded.includes("TRIGGER:-P3D\r\n"));
  },"phone view and original unchanged calendar handoff");
  passed("the 390px month/day view keeps usable date targets and literal wrapped fields while the original calendar download stays intact");

  expectedDialog=true;await activate("#clear");
  await waitFor(async()=>(await saved()).length===0,"explicit native confirmed Clear");
  const clearWrites=await writes(),clearDraft=await draftState(),emptyRaw=await raw();
  await activate("#overview-refresh");await overviewReady();
  assert.ok((await monthData()).dates.every(x=>x.count===0));assert.deepEqual(await displayedRows(),[]);
  assert.match(await inPage(()=>document.querySelector("#overview-month-summary").textContent),/0/);
  assert.equal(await raw(),emptyRaw);assert.equal(await writes(),clearWrites);
  assert.deepEqual(await draftState(),clearDraft);
  assert.deepEqual(report.externalRequests,[]);assert.deepEqual(pageErrors,[]);
  report.finalNativeSavedRecords=await saved();
  report.storageWrites=await inPage(()=>window.__overviewReceiver.writes);
  assert.equal(report.storageWrites.length,5,"Only three native Save, one native backup Import and one confirmed Clear write in the first tab");
  passed("an explicitly cleared tracker becomes an honest empty month with no additional write or application/network error");
  report.status="passed";

}catch(error){
  report.status="failed";report.error=error.stack??String(error);report.browserLog=browserLog;
  if(sessionId){try{
    report.lastPage=await inPage(()=>({url:location.href,focus:document.activeElement?.outerHTML,text:document.body?.innerText.slice(0,16000)}));
    await screenshot("failed-state.png");
  }catch{}}
  console.error(report.error);process.exitCode=1;
}finally{
  if(socket?.readyState===WebSocket.OPEN){try{await command("Browser.close",{},false);}catch{}}
  socket?.close();for(const request of pending.values())clearTimeout(request.timer);
  if(browser&&browser.exitCode===null)browser.kill("SIGTERM");
  server.closeAllConnections();await new Promise(resolve_=>server.close(resolve_));
  await sleep(300);await rm(profile,{recursive:true,force:true});await rm(downloadPath,{recursive:true,force:true});
  report.sourceUnchanged=JSON.stringify(await sourceHashes())===JSON.stringify(sourceBefore);
  if(!report.sourceUnchanged){report.status="failed";process.exitCode=1;}
  report.pageErrors=pageErrors;report.totalArtifactBytes=report.artifacts.reduce((sum,item)=>sum+item.bytes,0);
  if(report.totalArtifactBytes>2*1024*1024){report.status="failed";report.artifactLimitExceeded=true;process.exitCode=1;}
  await writeFile(join(output,"receiving-report.json"),JSON.stringify(report,null,2)+"\n");
  try{await printReceivingBundle();}
  catch(error){
    report.status="failed";report.bundleError=error.stack??String(error);process.exitCode=1;
    await writeFile(join(output,"receiving-report.json"),JSON.stringify(report,null,2)+"\n");
    console.error(report.bundleError);
  }
  console.log("RETURNBY_DEADLINE_OVERVIEW_RESULT "+report.status.toUpperCase()+" checks="+report.checks.length+
    " artifacts="+report.artifacts.length+" source_unchanged="+report.sourceUnchanged);
  console.log("RETURNBY_DEADLINE_OVERVIEW_RECEIPT "+JSON.stringify(report));
}
