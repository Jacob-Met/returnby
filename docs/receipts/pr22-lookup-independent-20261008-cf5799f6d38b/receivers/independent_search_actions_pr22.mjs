import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer,request as httpRequest} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join,relative,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url),puppeteer=require('puppeteer');
const source=resolve(process.argv[2]),output=resolve(process.argv[3]);
await mkdir(output,{recursive:false});
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=(...a)=>execFileSync('git',a,{cwd:source,encoding:'utf8'}).trim();
const receipt={source,tree:git('write-tree'),fixture:'fictional saved records, fixed UTC clock; real production build and browser',checks:[],errors:[],external:[],server:[],proxyRefusals:[]};
const base={total:'$20',windowDays:30,windowSource:'user',createdAt:'2026-09-11T12:00:00.000Z'};
const records=[{...base,id:'earlier',merchant:'Basket & Co',orderNo:'ONE',orderDate:'2026-09-11'},{...base,id:'later',merchant:'Basket & Co',orderNo:'TWO',orderDate:'2026-09-15'}];
const server=createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');const file=resolve(source,'dist',u.pathname==='/'?'index.html':'.'+decodeURIComponent(u.pathname));if(relative(resolve(source,'dist'),file).startsWith('..')){res.writeHead(403).end();return;}const b=await readFile(file);receipt.server.push({path:u.pathname,sha256:sha(b),bytes:b.length});res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(b);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port;
const proxy=createServer((req,res)=>{let target;try{target=new URL(req.url);}catch{res.writeHead(400).end();return;}if(target.origin!==url){receipt.proxyRefusals.push(target.origin);res.writeHead(403).end();return;}const up=httpRequest(target,{method:req.method,headers:req.headers},incoming=>{res.writeHead(incoming.statusCode,incoming.headers);incoming.pipe(res);});up.on('error',()=>res.end());req.pipe(up);});
proxy.on('connect',(req,socket)=>{socket.on('error',()=>{});receipt.proxyRefusals.push(req.url);socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');});
await new Promise(r=>proxy.listen(0,'127.0.0.1',r));
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,userDataDir:join(output,'profile'),args:['--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--disable-features=MediaRouter,OptimizationHints','--proxy-server=http://127.0.0.1:'+proxy.address().port,'--proxy-bypass-list=<-loopback>']});
receipt.runtime={node:process.version,chrome:await browser.version(),platform:process.platform,arch:process.arch,puppeteer:require('puppeteer/package.json').version};
async function page(){const p=await browser.newPage();await p.emulateTimezone('UTC');await p.setViewport({width:1365,height:950});await p.setRequestInterception(true);p.on('request',r=>{if(!r.url().startsWith(url+'/')&&!/^(blob:|data:)/.test(r.url())){receipt.external.push(r.url());r.abort();}else r.continue();});p.on('pageerror',e=>receipt.errors.push(String(e)));await p.evaluateOnNewDocument(records=>{const NativeDate=Date;window.clock=NativeDate.parse('2026-10-08T12:00:00Z');window.Date=class extends NativeDate{constructor(...a){if(a.length)super(...a);else super(window.clock);}static now(){return window.clock;}};const set=Storage.prototype.setItem;set.call(localStorage,'returnby.v1',JSON.stringify(records));window.writes=[];window.failedWrites=0;window.failWrite=false;window.externalSave=value=>set.call(localStorage,'returnby.v1',JSON.stringify(value));Storage.prototype.setItem=function(k,v){if(k==='returnby.v1'&&window.failWrite){window.failedWrites++;throw new DOMException('Independent authored quota refusal','QuotaExceededError');}const result=set.call(this,k,v);window.writes.push({k,v});return result;};},records);await p.goto(url,{waitUntil:'networkidle0'});await p.waitForSelector('#order-search');await p.click('#filter-due');return p;}
async function check(name,fn){try{const evidence=await fn();receipt.checks.push({name,pass:true,evidence});}catch(e){receipt.checks.push({name,pass:false,error:String(e.stack||e),evidence:e.evidence});}console.log(JSON.stringify(receipt.checks.at(-1)));}
const ids=p=>p.$$eval('#list [data-del]',nodes=>nodes.map(n=>n.dataset.del));
const saved=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('returnby.v1')));
async function query(p,value){await p.$eval('#order-search',(n,value)=>{n.value=value;n.dispatchEvent(new Event('input',{bubbles:true}));},value);}
async function fillDraft(p,merchant='New literal [.*] shop',orderNo='LIT-42'){
 await p.click('#sample');
 await p.$eval('#paste',n=>{n.value='Keep this reviewed intake until Save succeeds';});
 await p.$eval('#preview',(form,data)=>{for(const [name,value] of Object.entries(data)){const n=form.elements.namedItem(name);n.value=value;n.dispatchEvent(new Event('input',{bubbles:true}));}}, {merchant,orderNo,total:'$55.00',orderDate:'2026-10-04',windowDays:'10'});
}
async function submit(p){await p.click('#preview button[type="submit"]');}
try{
 await check('literal-query-finds-only-the-new-reviewed-save',async()=>{const p=await page();try{
  await query(p,'[.*]');assert.deepEqual(await ids(p),[]);assert.deepEqual(await saved(p),records);
  await fillDraft(p);await submit(p);
  const current=await saved(p);assert.equal(current.length,3);assert.deepEqual(current.slice(0,2),records);
  const added=current[2];assert(!records.some(r=>r.id===added.id));assert.equal(added.merchant,'New literal [.*] shop');assert.equal(added.orderNo,'LIT-42');assert.equal(added.orderDate,'2026-10-04');assert.equal(added.windowDays,10);
  assert.deepEqual(await ids(p),[added.id]);assert.equal(await p.$eval('#order-search',n=>n.value),'[.*]');
  assert.deepEqual(await p.$$eval('#tracked-count,#soon-count,#expired-count',ns=>ns.map(n=>n.textContent)),['3','3','0']);
  assert.equal(await p.$eval('#preview',n=>n.hidden),true);
  await query(p,'shop LIT');assert.deepEqual(await ids(p),[]);await query(p,'lit-42');assert.deepEqual(await ids(p),[added.id]);
  const writes=await p.evaluate(()=>window.writes.length);assert.equal(writes,1);assert.deepEqual(await saved(p),current);
  return {newId:added.id,literalQueryMatches:1,crossFieldQueryMatches:0,savedRecords:current.length,storageWrites:writes};
 }finally{await p.close();}});
 await check('clear-review-retains-query-and-later-save-repopulates-it',async()=>{const p=await page();try{
  await query(p,'two');assert.deepEqual(await ids(p),['later']);await fillDraft(p,'Basket new shop','TWO-NEW');
  p.once('dialog',d=>d.dismiss());await p.click('#clear');assert.deepEqual(await saved(p),records);assert.deepEqual(await ids(p),['later']);assert.equal(await p.$eval('#order-search',n=>n.value),'two');assert.equal(await p.$eval('#preview',n=>n.hidden),false);assert.equal(await p.evaluate(()=>window.writes.length),0);
  p.once('dialog',d=>d.accept());await p.click('#clear');assert.deepEqual(await saved(p),[]);assert.deepEqual(await ids(p),[]);assert.equal(await p.$eval('#order-search',n=>n.value),'two');assert.equal(await p.$eval('#filter-due',n=>n.getAttribute('aria-pressed')),'true');assert.match(await p.$eval('#search-status',n=>n.textContent),/0 of 0/);
  await submit(p);const current=await saved(p);assert.equal(current.length,1);assert.equal(current[0].orderNo,'TWO-NEW');assert(!records.some(r=>r.id===current[0].id));assert.deepEqual(await ids(p),[current[0].id]);assert.equal(await p.$eval('#order-search',n=>n.value),'two');assert.equal(await p.evaluate(()=>window.writes.length),2);
  return {cancelledClearWrites:0,approvedClearScope:records.map(r=>r.id),queryRetained:true,newId:current[0].id,totalStorageWrites:2};
 }finally{await p.close();}});
 if(process.argv[4]==='composition')await check('filtered-save-quota-refusal-retains-draft-and-retry-preserves-current-records',async()=>{const p=await page();try{
  await query(p,'[.*]');await fillDraft(p);
  const external={...base,id:'unseen',merchant:'Outside addition',orderNo:'OTHER',orderDate:'2026-09-15'};
  await p.evaluate(next=>{window.externalSave(next);window.failWrite=true;},[...records,external]);
  await submit(p);assert.deepEqual(await saved(p),[...records,external]);assert.deepEqual(await ids(p),[]);assert.equal(await p.$eval('#preview',n=>n.hidden),false);assert.equal(await p.$eval('#preview [name="orderNo"]',n=>n.value),'LIT-42');assert.equal(await p.$eval('#paste',n=>n.value),'Keep this reviewed intake until Save succeeds');assert.equal(await p.$eval('#order-search',n=>n.value),'[.*]');assert.match(await p.$eval('#storage-error',n=>n.textContent),/Couldn't save/);assert.equal(await p.evaluate(()=>window.writes.length),0);assert.equal(await p.evaluate(()=>window.failedWrites),1);
  await p.evaluate(()=>{window.failWrite=false;});await submit(p);
  const current=await saved(p);assert.equal(current.length,4);assert.deepEqual(current.slice(0,3),[...records,external]);assert.equal(current[3].orderNo,'LIT-42');assert.deepEqual(await ids(p),[current[3].id]);assert.equal(await p.$eval('#order-search',n=>n.value),'[.*]');assert.equal(await p.evaluate(()=>window.writes.length),1);
  return {refusedWriteAttempts:1,successfulWrites:1,unseenAdditionPreserved:true,retainedSavedIds:current.slice(0,3).map(r=>r.id),newId:current[3].id};
 }finally{await p.close();}});
 await check('actual-app-has-no-runtime-errors-or-external-requests',async()=>{assert.deepEqual(receipt.errors,[]);assert.deepEqual(receipt.external,[]);return {appErrors:0,externalRequests:0};});

}finally{await browser.close();await new Promise(r=>proxy.close(r));await new Promise(r=>server.close(r));receipt.passed=receipt.checks.filter(c=>c.pass).length;receipt.failed=receipt.checks.filter(c=>!c.pass).length;receipt.receiver_sha256=sha(await readFile(new URL(import.meta.url)));await writeFile(join(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({output,tree:receipt.tree,passed:receipt.passed,failed:receipt.failed,errors:receipt.errors,external:receipt.external}));}
process.exitCode=receipt.failed?1:0;
