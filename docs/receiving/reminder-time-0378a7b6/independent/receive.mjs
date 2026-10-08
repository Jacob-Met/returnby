import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'file:///D:/Hamon/worktrees/surgeon-trails-0378a7b6-proof/browser-tools/node_modules/playwright-core/index.mjs';
const root='D:/Hamon/worktrees/returnby-discovery-0378a7b6';
const out='D:/Hamon/worktrees/returnby-reminder-timing-0378a7b6-proof/independent-la7';
const fixed='2027-02-12T12:00:00.000Z', key='returnby.v1';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const record={id:'independent-kathmandu',merchant:'Atelier Élan, West; #7',orderNo:'WB\\77;A,β',orderDate:'2027-02-04',windowDays:10,windowSource:'user',createdAt:'2027-02-04T09:30:00.000Z'};
const other={id:'independent-second',merchant:'Cedar Paper',orderNo:'SECOND-11',orderDate:'2027-02-05',windowDays:30,windowSource:'policy',createdAt:'2027-02-05T11:00:00.000Z'};
const raw=JSON.stringify([record,other]);
fs.writeFileSync(out+'/received-records.json',raw+'\n');
function sourceMap(){return Object.fromEntries(execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean).map(p=>[p,sha(fs.readFileSync(path.join(root,p)))]));}
function distMap(){const r={};function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else r[path.relative(root,p)]=sha(fs.readFileSync(p));}}walk(root+'/dist');return r;}
const before=sourceMap(),distBefore=distMap();
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
assert.equal(head,'9585fc2d39de8b4af70abc9eada341220111159d');
const freeze=JSON.parse(fs.readFileSync(path.dirname(out)+'/source-freeze.json','utf8'));
for(const f of freeze.files)assert.equal(before[f.path],f.sha256,f.path);
const original=execFileSync('git',['show','1e662c387be5f66f8499fac7ec443f58d2198379:src/ics.ts'],{cwd:root});
fs.writeFileSync(out+'/original-ics.ts',original);
const ts=(await import(pathToFileURL(root+'/node_modules/typescript/lib/typescript.js'))).default;
fs.writeFileSync(out+'/original-ics.mjs',ts.transpileModule(original.toString('utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText);
const {buildIcs:originalIcs}=await import(pathToFileURL(out+'/original-ics.mjs'));
const expected=originalIcs({...record,due:'2027-02-14'},new Date(fixed));
fs.writeFileSync(out+'/expected-original.ics',expected);
const server=createServer((req,res)=>{
 const u=new URL(req.url,'http://local'),file=path.resolve(root+'/dist','.'+(u.pathname==='/'?'/index.html':u.pathname));
 if(!file.startsWith(path.resolve(root+'/dist')+path.sep)){res.writeHead(403).end();return}
 try{res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'})[path.extname(file)]??'application/octet-stream'}).end(fs.readFileSync(file));}catch{res.writeHead(404).end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const contexts=[];let browser;
const receipt={status:'running',head,driverSha256:sha(fs.readFileSync(import.meta.filename)),contractSha256:sha(fs.readFileSync(out+'/contract-before-candidate.json')),sourceBefore:before,distBefore,expectedOriginalSha256:sha(expected),checks:[],downloads:[],outsideRequests:[],pageErrors:[]};
async function newPage(zone,viewport={width:1120,height:900}){
 const context=await browser.newContext({timezoneId:zone,viewport,acceptDownloads:true});contexts.push(context);
 await context.addInitScript(({key,raw})=>{
  localStorage.setItem(key,raw);window.__applicationWrites=[];window.__storageEvents=[];
  const originalSet=Storage.prototype.setItem;
  Storage.prototype.setItem=function(k,v){if(!window.__receiverWriting)window.__applicationWrites.push({key:k,value:v});return originalSet.call(this,k,v)};
  window.addEventListener('storage',e=>window.__storageEvents.push({key:e.key,isTrusted:e.isTrusted,oldValue:e.oldValue,newValue:e.newValue}));
 },{key,raw});
 await context.route('**/*',route=>{const u=route.request().url();if(u.startsWith(origin+'/')||u.startsWith('blob:')||u.startsWith('data:'))return route.continue();receipt.outsideRequests.push(u);return route.abort()});
 const page=await context.newPage();page.on('pageerror',e=>receipt.pageErrors.push(String(e)));
 page.on('download',d=>receipt.downloads.push({suggestedFilename:d.suggestedFilename(),url:d.url()}));
 await page.clock.setFixedTime(new Date(fixed));
 await page.goto(origin);
 await page.locator('[data-reminder="'+record.id+'"]').waitFor();
 return {page,context};
}
async function mutate(page,value){await page.evaluate(({key,value})=>{window.__receiverWriting=true;try{localStorage.setItem(key,value)}finally{window.__receiverWriting=false}},{key,value})}
async function rawNow(page){return page.evaluate(key=>localStorage.getItem(key),key)}
async function open(page){await page.locator('[data-reminder="'+record.id+'"]').click();await page.locator('dialog.reminder-time').waitFor({state:'visible'})}
async function review(page,value){await page.locator('#reminder-local').fill(value);await page.locator('.reminder-form').getByRole('button',{name:'Review reminder',exact:true}).click()}
async function save(page,selector,name){
 const awaited=page.waitForEvent('download');await page.locator(selector).click();const download=await awaited;
 const file=path.resolve(out,name);await download.saveAs(file);assert.equal(await download.failure(),null);
 const bytes=fs.readFileSync(file);receipt.downloads.at(-1).sha256=sha(bytes);receipt.downloads.at(-1).bytes=bytes.length;
 return bytes.toString('utf8');
}
async function noWrites(page){assert.deepEqual(await page.evaluate(()=>window.__applicationWrites),[])}
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',headless:true,downloadsPath:path.resolve(out,'native-downloads')});
 receipt.browser=browser.version();
 let {page,context}=await newPage('Asia/Kathmandu');
 const originalFile=await save(page,'[data-ics="'+record.id+'"]','actual-original-three-day.ics');assert.equal(originalFile,expected);
 await page.locator('#paste').fill('Independent unsaved draft: Orchid shop\nOrder #KEEP-21 on 2027-02-03');
 await page.locator('#find').click();await page.locator('#preview [name="merchant"]').fill('Kept draft <orchid> & more');
 const draft=await page.locator('#preview').evaluate(f=>Object.fromEntries(new FormData(f)));
 await open(page);assert.equal(await page.locator('.reminder-cancel').evaluate(e=>e===document.activeElement),true);
 await review(page,'2027-02-13T21:20');
 assert.equal(await page.locator('.reminder-download').isEnabled(),true);
 const local=await page.locator('.reminder-local-review').textContent();assert.match(local,/2027-02-13 21:20/);assert.match(local,/Asia\/Kath?mandu|Asia\/Katmandu/);assert.match(local,/UTC\+05:45/);
 assert.equal(await page.locator('.reminder-utc').textContent(),'2027-02-13T15:35:00 UTC');
 assert.equal(await page.locator('.reminder-deadline').textContent(),'2027-02-14');
 const chosen=await save(page,'.reminder-download','actual-kathmandu.ics');
 assert.equal(chosen,expected.replace('TRIGGER:-P3D','TRIGGER;VALUE=DATE-TIME:20270213T153500Z'));
 assert.match(chosen,/SUMMARY:Return deadline: Atelier Élan\\, West\\; #7 #WB\\\\77\\;A\\,β/);
 assert.equal(await rawNow(page),raw);await noWrites(page);
 receipt.checks.push({name:'fractional-offset actual download and original serializer parity',local,alarm:'20270213T153500Z',entireOtherIcsBytesExact:true});
 await page.locator('#reminder-local').fill('2027-02-15T08:10');assert.equal(await page.locator('.reminder-download').isDisabled(),true);assert.equal(await page.locator('.reminder-review').isHidden(),true);
 await review(page,'2027-02-15T08:10');assert.equal(await page.locator('.reminder-late').isVisible(),true);
 const late=await save(page,'.reminder-download','actual-after-deadline.ics');
 assert.equal(late,expected.replace('TRIGGER:-P3D','TRIGGER;VALUE=DATE-TIME:20270215T022500Z'));
 await page.keyboard.press('Escape');assert.equal(await page.locator('dialog.reminder-time').isVisible(),false);
 assert.equal(await page.locator('[data-reminder="'+record.id+'"]').evaluate(e=>e===document.activeElement),true);
 assert.deepEqual(await page.locator('#preview').evaluate(f=>Object.fromEntries(new FormData(f))),draft);assert.equal(await rawNow(page),raw);await noWrites(page);
 receipt.checks.push({name:'approval retirement, late warning, unchanged deadline and Escape/draft/focus'});
 await open(page);await review(page,'2027-02-13T21:20');await mutate(page,JSON.stringify([other,record]));
 const count=receipt.downloads.length;await page.locator('.reminder-download').click();assert.equal(receipt.downloads.length,count);
 assert.match(await page.locator('.reminder-message').textContent(),/changed after this review opened/);assert.equal(await page.locator('.reminder-download').isDisabled(),true);
 await page.locator('.reminder-cancel').click();assert.equal(await rawNow(page),JSON.stringify([other,record]));
 await mutate(page,raw);await open(page);await review(page,'2027-02-13T21:20');await mutate(page,raw+'\n');await page.locator('.reminder-download').click();
 assert.equal(receipt.downloads.length,count);assert.match(await page.locator('.reminder-message').textContent(),/changed after this review opened/);await page.locator('.reminder-cancel').click();
 await mutate(page,raw);await open(page);await review(page,'2027-02-13T21:20');
 const peer=await context.newPage();await peer.goto(origin);await mutate(peer,JSON.stringify([other,record]));
 await page.waitForFunction(()=>document.querySelector('#reminder-local').disabled);
 assert.equal(await page.locator('.reminder-download').isDisabled(),true);assert.match(await page.locator('.reminder-message').textContent(),/Saved orders changed/);
 const events=await page.evaluate(()=>window.__storageEvents);assert(events.some(e=>e.key==='returnby.v1'&&e.isTrusted));await peer.close();await page.locator('.reminder-cancel').click();
 receipt.checks.push({name:'different order and whitespace stale refusal; real cross-tab event retirement',trustedStorageEvents:events.length,noNewDownloads:true});
 await mutate(page,JSON.stringify([record,{...other,id:record.id}]));await open(page);assert.equal(await page.locator('#reminder-local').isDisabled(),true);assert.match(await page.locator('.reminder-message').textContent(),/cannot be safely reviewed/);await page.locator('.reminder-cancel').click();
 await mutate(page,raw);await page.evaluate(()=>{window.__originalGet=Storage.prototype.getItem;Storage.prototype.getItem=function(){throw new DOMException('denied','SecurityError')}});
 await open(page);assert.equal(await page.locator('#reminder-local').isDisabled(),true);assert.match(await page.locator('.reminder-message').textContent(),/cannot be read/);await page.locator('.reminder-cancel').click();
 await page.evaluate(()=>{Storage.prototype.getItem=window.__originalGet});assert.equal(await rawNow(page),raw);await noWrites(page);
 receipt.checks.push({name:'duplicate admission and denied-read controls retain source'});
 await open(page);await review(page,'2027-02-13T21:20');await page.clock.setFixedTime(new Date('2027-02-14T00:00:00Z'));await page.locator('.reminder-download').click();
 assert.equal(receipt.downloads.length,count);assert.match(await page.locator('.reminder-message').textContent(),/later than the current time/);await page.locator('.reminder-cancel').click();
 receipt.checks.push({name:'actual final download rechecks elapsed clock'});
 ({page}=await newPage('America/New_York',{width:387,height:900}));
 await open(page);await review(page,'2027-03-14T02:30');assert.equal(await page.locator('.reminder-download').isDisabled(),true);assert.match(await page.locator('.reminder-message').textContent(),/does not exist/);
 await review(page,'2027-11-07T01:30');assert.equal(await page.locator('.reminder-download').isEnabled(),true);
 const repeated=await page.locator('.reminder-local-review').textContent();assert.match(repeated,/America\/New_York/);assert.match(repeated,/UTC−04:00/);
 assert.equal(await page.locator('.reminder-utc').textContent(),'2027-11-07T05:30:00 UTC');
 const folded=await save(page,'.reminder-download','actual-first-fold.ics');assert.equal(folded,expected.replace('TRIGGER:-P3D','TRIGGER;VALUE=DATE-TIME:20271107T053000Z'));
 const rect=await page.locator('dialog.reminder-time').boundingBox();assert(rect.x>=0&&rect.x+rect.width<=387.1);
 await page.screenshot({path:out+'/new-york-first-occurrence-phone.png',fullPage:true});
 await page.locator('.reminder-cancel').click();assert.equal(await rawNow(page),raw);await noWrites(page);
 receipt.checks.push({name:'different-year DST gap and first repeated occurrence; narrow viewport',local:repeated,rect});
 receipt.sourceAfter=sourceMap();receipt.distAfter=distMap();assert.deepEqual(receipt.sourceAfter,before);assert.deepEqual(receipt.distAfter,distBefore);assert.deepEqual(receipt.outsideRequests,[]);assert.deepEqual(receipt.pageErrors,[]);
 receipt.status='passed';console.log(JSON.stringify({status:receipt.status,checks:receipt.checks.length,actualDownloads:receipt.downloads.length,sourceLeaves:Object.keys(before).length,distLeaves:Object.keys(distBefore).length}));
}catch(error){receipt.status='failed';receipt.failure=error.stack;console.error(error);process.exitCode=1;}
finally{fs.writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');for(const c of contexts)await c.close();if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
