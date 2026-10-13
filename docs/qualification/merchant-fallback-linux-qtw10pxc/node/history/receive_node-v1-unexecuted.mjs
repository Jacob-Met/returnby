/* UNEXECUTED Node browser receiver v1. Public Playwright API only.
Original Python failure is preserved. No source/build rewrite or installation.
Exact nanosecond timestamps in frozen Python manifests are parsed as decimal strings.
*/
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import net from 'node:net';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {isDeepStrictEqual} from 'node:util';
const ROOT=fs.realpathSync(process.argv[2]), VARIANT=process.argv[3];
function requireGate(c,m){if(!c) throw new Error(m);}
requireGate(['original','candidate'].includes(VARIANT),'variant');
requireGate(path.dirname(ROOT)==='/home/jacob' && path.basename(ROOT).startsWith('hamon-returnby-linux-qtw10pxc-'),'owned root');
const OUT=path.join(ROOT,'browser-node-'+VARIANT), SOURCE=path.join(ROOT,VARIANT), DIST=path.join(SOURCE,'dist');
fs.mkdirSync(OUT);
const now=()=>new Date().toISOString();
const identity=b=>({bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex'),git_blob:crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex')});
const pin=p=>identity(fs.readFileSync(p));
function parseExactManifest(text){
  // Only unquoted integer values at the known mtime_ns key are converted.
  return JSON.parse(text.replace(/("mtime_ns"\s*:\s*)(-?\d+)(?=\s*[,}])/g,'$1"$2"'));
}
function readJSON(p,exactTime=false){const s=fs.readFileSync(p,'utf8');return exactTime?parseExactManifest(s):JSON.parse(s);}
function save(name,value){fs.writeFileSync(path.join(OUT,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});}
function regular(p){const s=fs.lstatSync(p);requireGate(s.isFile()&&!s.isSymbolicLink(),'nonregular file '+p);return s;}
function noRedirects(p){let q=path.resolve(p);for(;;){requireGate(!fs.lstatSync(q).isSymbolicLink(),'redirect '+q);const parent=path.dirname(q);if(parent===q)break;q=parent;}}
function boundFile(root,relative){
 requireGate(typeof relative==='string' && relative!=='' && !relative.includes('\\') && !path.posix.isAbsolute(relative) && relative.split('/').every(p=>p!==''&&p!=='.'&&p!=='..'),'invalid relative path');
 const p=path.join(root,...relative.split('/'));noRedirects(p);regular(p);
 requireGate(fs.realpathSync(p).startsWith(fs.realpathSync(root)+path.sep),'file containment');return p;
}
function regularTree(root,mode=false){
 noRedirects(root);const rows=[];
 function visit(dir){for(const name of fs.readdirSync(dir).sort()){const p=path.join(dir,name),s=fs.lstatSync(p);requireGate(!s.isSymbolicLink(),'link in regular tree');if(s.isDirectory())visit(p);else{requireGate(s.isFile(),'nonregular tree entry');const b=fs.readFileSync(p);const r={path:path.relative(root,p).split(path.sep).join('/'),bytes:b.length,sha256:identity(b).sha256};if(mode)r.mode=s.mode&0o7777;rows.push(r);}}}
 visit(root);return rows.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
}
function assets(root){return Object.fromEntries(regularTree(root).map(r=>[r.path,{bytes:r.bytes,sha256:r.sha256}]));}
const receipt={format:'returnby-node-browser-receiver-v1',variant:VARIANT,started_at:now(),checks:[],cases:[],network:[],console:[],page_errors:[],http:[],lifecycle:{contexts:[],cleanup_errors:[]},network_scope:'Observed page/context HTTP(S) requests only; not an OS-wide Chromium network audit.'};
function check(name,actual,expected){const passed=isDeepStrictEqual(actual,expected);receipt.checks.push({name,actual,expected,passed});return passed;}
function same(a,b,m){requireGate(isDeepStrictEqual(a,b),m);}
let CONTRACT,PROFILE;
function validate(){
 const inputPath=path.join(ROOT,'INPUT.json'),contractPath=path.join(ROOT,'CONTRACT.json'),stagePath=path.join(ROOT,'STAGED-SOURCE.json'),buildPath=path.join(ROOT,'BUILD-'+VARIANT+'.json'),depPath=path.join(ROOT,'DEPENDENCIES.json'),profilePath=path.join(ROOT,'NODE-BROWSER-PROFILE.json'),inventoryPath=path.join(ROOT,'NODE-TOOLCHAIN-READONLY.json'),copyPath=path.join(ROOT,'NODE-DRIVER-COPY.json');
 requireGate(pin(inputPath).git_blob==='98a434fe34dd6e175a64d0396d079cadf6f779b7','input Git identity');
 requireGate(pin(contractPath).git_blob==='6b410f82313611ec9d1a81d0c53a835ac76a03f1','contract Git identity');
 requireGate(pin(profilePath).git_blob==='e23bb4224084ca8612fe52c8fc757e8bfa2b03e9','Node profile Git identity');
 requireGate(pin(inventoryPath).git_blob==='a5f2f1554773ac4da0927117277f38b63d43e9d4','Node inventory Git identity');
 const inp=readJSON(inputPath),contract=readJSON(contractPath),profile=readJSON(profilePath),stage=readJSON(stagePath,true),build=readJSON(buildPath,true),deps=readJSON(depPath),inventory=readJSON(inventoryPath),copy=readJSON(copyPath);
 same(profile.fixtures,contract.fixtures,'changed fixtures');same(profile.browser.expected_original_only_mismatch_names,contract.browser_plan.expected_original_only_mismatch_names,'changed original expectation');
 requireGate(profile.base_contract_git_blob===pin(contractPath).git_blob&&profile.source_input_git_blob===pin(inputPath).git_blob,'profile intake link');
 same(pin(path.join(ROOT,profile.prior_failure.path)),{bytes:profile.prior_failure.bytes,sha256:profile.prior_failure.sha256,git_blob:profile.prior_failure.git_blob},'prior Python failure changed');
 requireGate(stage.accepted===true&&build.accepted===true&&build.manifests_unchanged===true&&build.source_unchanged===true,'stage/build acceptance');
 same(build.input,pin(inputPath),'build input pin');same(build.staged_manifest,pin(stagePath),'build stage pin');
 same(stage.input,pin(inputPath),'staged input pin');same(stage.contract,pin(contractPath),'staged contract pin');
 const expected=inp[VARIANT],staged=stage[VARIANT];
 for(const field of ['commit','tree']){same(expected[field],contract[VARIANT][field],'contract source '+field);same(staged[field],expected[field],'stage source '+field);same(build['source_'+field],expected[field],'build source '+field);}
 requireGate(build.variant===VARIANT,'build variant');same(build.commands.map(r=>r.name),['tsc','vite'],'build sequence');requireGate(build.commands.every(r=>r.exit_code===0),'build exits');
 const db=build.dependencies;requireGate(['accepted','shared_unchanged','copied_original_files_unchanged','aliases_unchanged'].every(k=>db[k]===true),'build dependencies');
 same({path:'DEPENDENCIES.json',...pin(depPath)},db.manifest,'dependency manifest pin');requireGate(deps.accepted===true,'dependency accepted');
 same(deps.before,deps.copied,'dependency copied bytes/modes');same(deps.before,deps.source_after,'dependency preservation');
 for(const k of ['before','copied','source_after'])same(deps.aliases[k],contract.dependencies.aliases,'dependency aliases');
 requireGate(build.node.path==='/usr/bin/node'&&build.node.version==='v22.22.1','build Node');
 const rows=new Map(staged.files.map(r=>[r.path,r])),expectedRows=new Map(expected.files.map(r=>[r.path,r]));
 requireGate(rows.size===staged.files.length&&expectedRows.size===expected.files.length&&rows.size===(VARIANT==='original'?27:28),'source projection counts');
 same([...rows.keys()].sort(),[...expectedRows.keys()].sort(),'source paths');
 requireGate(expectedRows.get('src/parse.ts').git_blob===contract[VARIANT].parser_blob,'parser source');
 const source=[];
 for(const relative of [...rows.keys()].sort()){
  const expectedRow=expectedRows.get(relative),row=rows.get(relative),bodyRecord=inp.blobs[expectedRow.git_blob];
  requireGate(expectedRow.mode==='100644'&&bodyRecord.encoding==='base64','source input mode/encoding');
  const encoded=bodyRecord.content.replace(/\s/g,'');requireGate(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded),'source Base64');
  const body=Buffer.from(encoded,'base64'),bodyPin=identity(body);requireGate(bodyPin.git_blob===expectedRow.git_blob,'source body Git');
  same({bytes:row.bytes,sha256:row.sha256,git_blob:row.git_blob},bodyPin,'staged row');
  const p=boundFile(SOURCE,relative);same(pin(p),bodyPin,'actual source bytes');
  const mtime=fs.statSync(p,{bigint:true}).mtimeNs.toString();requireGate(typeof row.mtime_ns==='string'&&/^\d+$/.test(row.mtime_ns)&&mtime===row.mtime_ns,'exact source mtime');
  source.push({path:relative,...bodyPin,mtime_ns:mtime});
 }
 const dist=assets(DIST);requireGate(Object.hasOwn(dist,'index.html')&&Object.hasOwn(dist,'trip-checklist.html'),'both build HTML entries');same(dist,build.dist,'bound dist');
 requireGate(copy.accepted===true&&copy.preserved_unchanged===true&&copy.shared_unchanged===true,'Node copy acceptance');
 same(copy.profile,pin(profilePath),'Node profile pin');same(copy.inventory,pin(inventoryPath),'Node inventory pin');
 requireGate(copy.source===profile.toolchain.source&&copy.copy===path.join(ROOT,profile.toolchain.copy),'Node dependency locations');
 requireGate(inventory.files===455&&inventory.bytes===12133249&&inventory.aliases.length===0,'Node inventory closure');
 same(copy.before,inventory.regular_files,'Node observed closure');same(copy.before,copy.copied,'Node copied closure');same(copy.before,copy.source_after,'Node shared closure');same(copy.metadata_before,copy.metadata_after,'Node metadata preservation');same(copy.preserved_before,copy.preserved_after,'Node prior record preservation');
 const currentOwned=regularTree(copy.copy,true),currentShared=regularTree(copy.source+'/playwright',true).map(r=>({...r,path:'playwright/'+r.path})).concat(regularTree(copy.source+'/playwright-core',true).map(r=>({...r,path:'playwright-core/'+r.path}))).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 same(currentOwned,copy.copied,'actual owned Node closure');same(currentShared,copy.before,'actual shared Node closure');
 for(const [key,want] of Object.entries(copy.metadata_before)){same(pin(inventory.metadata[key].path),want,'shared Node metadata '+key);}
 for(const [relative,want] of Object.entries(copy.preserved_before)){
  const p=boundFile(ROOT,relative);same({...pin(p),mtime_ns:fs.statSync(p,{bigint:true}).mtimeNs.toString()},want,'preserved earlier record '+relative);
 }
 for(const name of ['playwright','playwright-core'])requireGate(readJSON(path.join(copy.copy,name,'package.json')).version==='1.55.0','Node package version');
 const manifests={};for(const p of [inputPath,contractPath,stagePath,buildPath,depPath,profilePath,inventoryPath,copyPath])manifests[path.basename(p)]=pin(p);
 return {contract,profile,source,dist,manifests,node_toolchain:{files:currentOwned.length,bytes:currentOwned.reduce((n,r)=>n+r.bytes,0),owned:currentOwned,shared:currentShared}};
}
function procIdentity(pid){const p='/proc/'+pid,raw=fs.readFileSync(p+'/stat','utf8'),tail=raw.slice(raw.lastIndexOf(')')+1).trim().split(/\s+/);return {pid,uid:fs.statSync(p).uid,start_ticks:tail[19],argv:fs.readFileSync(p+'/cmdline').toString().split('\0').filter(Boolean)};}
function bounded(promise,ms,label){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label+' timed out')),ms);})]).finally(()=>clearTimeout(timer));}
async function listenerClosed(port){return await new Promise(resolve=>{let done=false;const socket=net.createConnection({host:'127.0.0.1',port});const finish=value=>{if(!done){done=true;socket.destroy();resolve(value);}};socket.setTimeout(1000,()=>finish(false));socket.once('connect',()=>finish(false));socket.once('error',err=>finish(err.code==='ECONNREFUSED'));});}
let before=null,httpServer=null,httpPort=null,httpListening=false,browserServer=null,browser=null,child=null,childExit=null,childExitRecord=null,wsPort=null;
const contexts=[],httpSockets=new Set();
try{
 requireGate(process.platform==='linux'&&os.hostname()==='hamon-thinkpad'&&process.getuid()===1000&&os.userInfo().username==='jacob','host identity');
 requireGate(process.execPath==='/usr/bin/node'&&process.version==='v22.22.1','Node identity');
 requireGate(!process.env.NODE_OPTIONS&&!process.env.NODE_PATH,'unexpected Node injection environment');
 const stat=fs.statfsSync(ROOT,{bigint:true}),free=stat.bavail*stat.bsize;requireGate(free>=2n*1024n**3n,'capacity floor');receipt.capacity_before=free.toString();
 before=validate();CONTRACT=before.contract;PROFILE=before.profile;
 receipt.environment={host:os.hostname(),uid:process.getuid(),user:os.userInfo().username,node:process.version,executable:process.execPath};
 receipt.source=CONTRACT[VARIANT];receipt.before=before;
 const tmp=path.join(OUT,'tmp');fs.mkdirSync(tmp);fs.mkdirSync(path.join(OUT,'downloads'));
 process.env.TMPDIR=tmp;process.env.TEMP=tmp;process.env.TMP=tmp;
 const ownRequire=createRequire(path.join(ROOT,PROFILE.toolchain.copy,'playwright','package.json'));
 const {chromium}=ownRequire(path.join(ROOT,PROFILE.toolchain.copy,'playwright'));
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.woff':'font/woff','.woff2':'font/woff2','.ico':'image/x-icon'};
 httpServer=http.createServer((req,res)=>{
  try{
   const relative=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).replace(/^\//,'')||'index.html';
   receipt.http.push({at:now(),method:req.method,path:req.url});
   if(!['GET','HEAD'].includes(req.method)||!Object.hasOwn(before.dist,relative)){res.writeHead(404);res.end();return;}
   const p=boundFile(DIST,relative),body=fs.readFileSync(p);res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream','Content-Length':body.length,'Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:body);
  }catch(error){receipt.http.push({error:String(error)});res.writeHead(500);res.end();}
 });
 httpServer.on('connection',socket=>{httpSockets.add(socket);socket.on('close',()=>httpSockets.delete(socket));});
 await bounded(new Promise((resolve,reject)=>{httpServer.once('error',reject);httpServer.listen(0,'127.0.0.1',resolve);}),5000,'HTTP listen');
 httpListening=true;httpPort=httpServer.address().port;const origin='http://127.0.0.1:'+httpPort;receipt.origin=origin;
 browserServer=await chromium.launchServer({executablePath:PROFILE.device.chrome_path,headless:true,chromiumSandbox:true,host:'127.0.0.1',port:0,args:['--disable-extensions','--disable-background-networking'],timeout:20000});
 child=browserServer.process();requireGate(child&&Number.isInteger(child.pid),'owned BrowserServer child');
 childExit=new Promise(resolve=>{if(child.exitCode!==null||child.signalCode!==null){childExitRecord={code:child.exitCode,signal:child.signalCode};resolve(childExitRecord);}else child.once('exit',(code,signal)=>{childExitRecord={code,signal};resolve(childExitRecord);});});
 const identityBefore=procIdentity(child.pid);requireGate(identityBefore.uid===1000,'owned child uid');receipt.lifecycle.browser=identityBefore;
 requireGate(!identityBefore.argv.some(arg=>['--no-sandbox','--disable-setuid-sandbox'].includes(arg.split('=',1)[0])),'actual sandbox-disable flag');
 const ws=new URL(browserServer.wsEndpoint());requireGate(ws.protocol==='ws:'&&ws.hostname==='127.0.0.1','own WS endpoint');wsPort=Number(ws.port);receipt.lifecycle.websocket={host:ws.hostname,port:wsPort};
 browser=await chromium.connect(browserServer.wsEndpoint(),{timeout:20000});
 receipt.browser_version=browser.version();requireGate(browser.version()===PROFILE.device.chrome_version,'browser version');
 const cdp=await browser.newBrowserCDPSession();const processes=(await cdp.send('SystemInfo.getProcessInfo')).processInfo,main=processes.filter(x=>x.type==='browser');requireGate(main.length===1&&Number(main[0].id)===child.pid,'CDP browser is not the owned child');same(procIdentity(child.pid),identityBefore,'owned child identity drift');await cdp.detach();receipt.lifecycle.browser.cdp_pid=Number(main[0].id);
 for(const fixture of CONTRACT.fixtures){
  const item={id:fixture.id,input:fixture.text,manual_merchant:fixture.manual_merchant};receipt.cases.push(item);
  const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true,timezoneId:'UTC'}),state={case:fixture.id,status:'open'};contexts.push({context,state});receipt.lifecycle.contexts.push(state);context.setDefaultTimeout(10000);
  try{
   await context.route('**/*',async route=>{const request=route.request(),u=new URL(request.url()),allowed=['http:','https:'].includes(u.protocol)&&u.origin===origin;receipt.network.push({case:fixture.id,url:request.url(),method:request.method(),allowed});if(allowed)await route.continue();else await route.abort();});
   const page=await context.newPage();page.on('console',msg=>receipt.console.push({type:msg.type(),text:msg.text()}));page.on('pageerror',err=>receipt.page_errors.push(String(err)));
   await page.goto(origin+'/index.html',{waitUntil:'networkidle'});const key=fixture.id+'.';
   check(key+'initial_saved_storage',await page.evaluate(()=>localStorage.getItem('returnby.v1')),null);
   await page.locator('#paste').fill(fixture.text);await page.locator('#find').click();await page.locator('#preview').waitFor({state:'visible'});
   const actual={};for(const name of ['merchant','orderDate','orderNo','total'])actual[name]=await page.locator('#preview [name='+name+']').inputValue();
   actual.days=Number(await page.locator('#preview [name=windowDays]').inputValue());actual.source=await page.locator('#preview').getAttribute('data-source');actual.highlighted=await page.locator('#preview [name=merchant]').evaluate(el=>el.closest('label').classList.contains('missing'));item.preview=actual;
   for(const [field,want] of Object.entries(fixture.preview))check(key+'preview.'+field,actual[field],want);
   check(key+'preview_does_not_save',await page.evaluate(()=>localStorage.getItem('returnby.v1')),null);
   check(key+'source_label',await page.locator('#src').innerText(),fixture.preview.source==='default'?'No store match: editable 30-day fallback.':'Store rule from the local policy table; confirm with the retailer.');
   if(fixture.id==='embedded-alias'){const shot=path.join(OUT,VARIANT+'-embedded-preview-desktop.png');await page.screenshot({path:shot,fullPage:true});item.preview_screenshot=pin(shot);}
   if(fixture.manual_merchant!==null)await page.locator('#preview [name=merchant]').fill(fixture.manual_merchant);
   await page.locator('#preview button[type=submit]').click();await page.locator('#preview').waitFor({state:'hidden'});
   const raw=await page.evaluate(()=>localStorage.getItem('returnby.v1')),orders=JSON.parse(raw);item.saved_raw=raw;check(key+'one_saved_order',orders.length,1);requireGate(orders.length===1,'unambiguous saved order');const order=orders[0];
   check(key+'approved_keys',Object.keys(order).sort(),['id','merchant','orderNo','total','orderDate','windowDays','windowSource','createdAt'].sort());
   for(const [field,want] of Object.entries({...fixture.saved,orderDate:fixture.preview.orderDate,orderNo:fixture.preview.orderNo,total:fixture.preview.total}))check(key+'saved.'+field,order[field],want);
   check(key+'paste_not_persisted',raw.includes(fixture.text),false);check(key+'paste_cleared',await page.locator('#paste').inputValue(),'');
   check(key+'card_merchant',await page.locator('#list .card .order-head strong').innerText(),fixture.saved.merchant);
   check(key+'card_due',await page.locator('#list .return-by').innerText(),'RETURN BY '+fixture.due);
   await page.reload({waitUntil:'networkidle'});check(key+'reload_exact_storage',await page.evaluate(()=>localStorage.getItem('returnby.v1')),raw);check(key+'reload_card_due',await page.locator('#list .return-by').innerText(),'RETURN BY '+fixture.due);
   if(fixture.calendar_download){
    const pending=page.waitForEvent('download');await page.locator('#list button[data-ics]').click();const download=await pending,target=path.join(OUT,'downloads',fixture.id+'.ics');await download.saveAs(target);
    const body=fs.readFileSync(target),text=body.toString('utf8'),unfolded=text.replaceAll('\r\n ',''),title='Return deadline: '+fixture.saved.merchant+' #'+fixture.preview.orderNo;
    const next=new Date(fixture.due+'T00:00:00Z');next.setUTCDate(next.getUTCDate()+1);
    const expectedLines=['UID:'+order.id+'@returnby','DTSTART;VALUE=DATE:'+fixture.due.replaceAll('-',''),'DTEND;VALUE=DATE:'+next.toISOString().slice(0,10).replaceAll('-',''),'SUMMARY:'+title,'DESCRIPTION:'+title,'TRIGGER:-P3D'];
    item.download={suggested_filename:download.suggestedFilename(),path:target,...pin(target),text};
    for(const line of expectedLines)check(key+'calendar.'+line.split(':',1)[0],unfolded.split('\r\n').includes(line),true);
    check(key+'calendar_one_event',unfolded.split('\r\n').filter(x=>x==='BEGIN:VEVENT').length,1);check(key+'calendar_crlf_only',body.includes(10)&&!text.replaceAll('\r\n','').includes('\n'),true);check(key+'download_preserves_storage',await page.evaluate(()=>localStorage.getItem('returnby.v1')),raw);
    if(VARIANT==='candidate'){await page.setViewportSize({width:390,height:844});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const geometry=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));item.narrow_geometry=geometry;check(key+'narrow_no_horizontal_overflow',geometry.scrollWidth<=geometry.width,true);const shot=path.join(OUT,'candidate-embedded-saved-narrow.png');await page.screenshot({path:shot,fullPage:true});item.narrow_screenshot=pin(shot);}
   }
   save(fixture.id+'.json',item);
  }finally{try{await bounded(context.close(),10000,'context close');state.status='completed';}catch(error){state.status='error';state.error=String(error.stack||error);throw error;}}
 }
 check('no_foreign_page_requests',receipt.network.filter(x=>!x.allowed).length,0);check('no_page_exceptions',receipt.page_errors,[]);check('no_console_errors',receipt.console.filter(x=>x.type==='error'),[]);
}catch(error){receipt.receiver_error=String(error.stack||error);console.error(receipt.receiver_error);}
finally{
 async function cleanup(name,operation,needed=true){if(!needed){receipt.lifecycle[name]='not-created';return;}try{await bounded(Promise.resolve().then(operation),10000,name);receipt.lifecycle[name]='completed';}catch(error){receipt.lifecycle[name]='error';receipt.lifecycle.cleanup_errors.push({operation:name,error:String(error.stack||error)});}}
 for(const {context,state} of contexts)if(state.status==='open'){try{await bounded(context.close(),10000,'remaining context close');state.status='completed';}catch(error){state.status='error';state.error=String(error.stack||error);}}
 await cleanup('browser_client_close',()=>browser.close(),browser!==null);
 await cleanup('browser_server_close',()=>browserServer.close(),browserServer!==null);
 if(childExit){await cleanup('owned_child_exit',async()=>{const result=await bounded(childExit,5000,'child exit');receipt.lifecycle.child_exit=result;requireGate(result.code===0&&result.signal===null,'owned browser did not exit cleanly');});}
 else receipt.lifecycle.owned_child_exit='not-created';
 await cleanup('http_server_close',()=>new Promise((resolve,reject)=>{httpServer.close(error=>error?reject(error):resolve());httpServer.closeIdleConnections();}),httpServer!==null);
 if(httpPort!==null)receipt.lifecycle.http_listener_closed=await listenerClosed(httpPort);
 if(wsPort!==null)receipt.lifecycle.websocket_listener_closed=await listenerClosed(wsPort);
 receipt.lifecycle.http_active_sockets=httpSockets.size;
 const required=['browser_client_close','browser_server_close','owned_child_exit','http_server_close'];
 const cleanupOK=required.every(k=>receipt.lifecycle[k]==='completed')&&contexts.every(x=>x.state.status==='completed')&&receipt.lifecycle.cleanup_errors.length===0;
 check('required_cleanup_completed',cleanupOK,true);check('http_listener_closed',receipt.lifecycle.http_listener_closed,true);check('websocket_listener_closed',receipt.lifecycle.websocket_listener_closed,true);check('http_sockets_closed',httpSockets.size,0);
 if(before){try{const after=validate();receipt.after=after;check('staged_source_unchanged',after.source,before.source);check('built_assets_unchanged',after.dist,before.dist);check('binding_manifests_unchanged',after.manifests,before.manifests);check('node_toolchain_unchanged',after.node_toolchain,before.node_toolchain);}catch(error){receipt.postflight_error=String(error.stack||error);}}
 receipt.completed_cases=receipt.cases.filter(c=>fs.existsSync(path.join(OUT,c.id+'.json'))).length;
 receipt.passed=receipt.checks.filter(x=>x.passed).length;receipt.failed=receipt.checks.length-receipt.passed;receipt.finished_at=now();
 receipt.lifecycle.verified=cleanupOK&&receipt.lifecycle.http_listener_closed===true&&receipt.lifecycle.websocket_listener_closed===true&&httpSockets.size===0;
 receipt.receiver_complete=!receipt.receiver_error&&!receipt.postflight_error&&receipt.lifecycle.verified&&receipt.completed_cases===3;
 receipt.product_pass=receipt.receiver_complete&&receipt.failed===0;
 save('RECEIVING.json',receipt);console.log(JSON.stringify({variant:VARIANT,receiver_complete:receipt.receiver_complete,product_pass:receipt.product_pass,passed:receipt.passed,failed:receipt.failed,completed_cases:receipt.completed_cases,receipt:path.join(OUT,'RECEIVING.json'),pin:pin(path.join(OUT,'RECEIVING.json'))}));
 process.exitCode=receipt.product_pass?0:1;
}
