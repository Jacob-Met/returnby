import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const root='/dev/shm/hamon-returnby-calendar-3e50c5ad22c5';
const evidence=path.join(root,'receiving');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const report={format:'returnby-calendar-browser-receiving/1',createdAt:new Date().toISOString(),node:process.version,pageErrors:[],requests:[],serverErrors:[],cases:[],scope:'Independent saved-order Calendar download receiving on exact original/candidate builds. No application source changes or calendar-provider import.'};
const fixtures=[
 {name:'apia-skipped-date',zone:'Pacific/Apia',orderDate:'2011-12-28',due:'2011-12-29',end:'20111230',originalEnd:'20111231'},
 {name:'kwajalein-skipped-date',zone:'Pacific/Kwajalein',orderDate:'1993-08-19',due:'1993-08-20',end:'19930821',originalEnd:'19930822'},
 {name:'kiritimati-skipped-date',zone:'Pacific/Kiritimati',orderDate:'1994-12-29',due:'1994-12-30',end:'19941231',originalEnd:'19950101'},
 {name:'utc-historical-control',zone:'UTC',orderDate:'2011-12-28',due:'2011-12-29',end:'20111230',originalEnd:'20111230'},
 ...['Pacific/Apia','Pacific/Kwajalein','Pacific/Kiritimati','UTC'].map((zone,index)=>({name:'modern-control-'+index,zone,orderDate:'2026-10-07',due:'2026-10-08',end:'20261009',originalEnd:'20261009'}))
];
let browser,server;
async function verifyFiles(directory,manifest){for(const file of manifest){const bytes=await fs.readFile(path.join(directory,file.path));assert.equal(bytes.length,file.bytes,file.path+' size');assert.equal(sha(bytes),file.sha256,file.path+' SHA256');}}
try{
 report.receiverSha256=sha(await fs.readFile(import.meta.filename));
 const build=JSON.parse(await fs.readFile(path.join(evidence,'build-receipt.json'),'utf8'));
 assert.equal(build.complete,true,'Exact original and candidate builds completed');
 report.buildReceiptSha256=sha(await fs.readFile(path.join(evidence,'build-receipt.json')));
 report.sources=Object.fromEntries(Object.entries(build.sources).map(([name,item])=>[name,{commit:item.commit,tree:item.tree,directory:item.directory,files:item.before,artifacts:item.artifacts}]));
 for(const source of Object.values(report.sources)){await verifyFiles(source.directory,source.files);await verifyFiles(path.join(source.directory,'dist'),source.artifacts);}
 const donor='/dev/shm/hamon-normal-modes-receiving-3e50c5ad22c5/browser-driver.mjs';
 const originalDriver=await fs.readFile(donor,'utf8');
 const driver=originalDriver.replace("mkdtemp(join(tmpdir(),'normal-modes-runtime-3e50-'))","mkdtemp(join('"+root+"/profiles','browser-'))");
 assert.notEqual(driver,originalDriver,'Own profile-directory substitution');
 await fs.mkdir(path.join(root,'profiles'),{recursive:true});
 await fs.writeFile(path.join(evidence,'browser-driver.mjs'),driver);
 report.driver={donor,donorSha256:sha(originalDriver),ownedSha256:sha(driver),change:'Only mkdtemp profile parent/prefix moves to owned /dev/shm namespace.'};
 const {launchBrowser,waitFor}=await import('./browser-driver.mjs');
 server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost'),match=/^\/(original|candidate)\/(.*)$/.exec(url.pathname);
   if(!match)throw new Error('Unserved path '+url.pathname);
   const base=path.join(report.sources[match[1]].directory,'dist');
   const file=path.resolve(base,decodeURIComponent(match[2]||'index.html'));
   if(!file.startsWith(base+path.sep))throw new Error('Out-of-root path');
   const bytes=await fs.readFile(file);
   const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'}[path.extname(file)]||'application/octet-stream';
   res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(bytes);
  }catch(error){report.serverErrors.push({url:req.url,error:error.message});res.writeHead(404);res.end('Not found');}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 report.origin=origin;
 browser=await launchBrowser('/snap/chromium/current/usr/lib/chromium-browser/chrome',report);
 for(const variant of ['original','candidate']){
  for(const [index,fixture] of fixtures.entries()){
   const row={variant,...fixture,index};report.cases.push(row);
   const downloads=path.join(evidence,'physical-downloads',variant,fixture.name);
   await fs.mkdir(downloads,{recursive:true});
   let tab;
   try{
    tab=await browser.open('about:blank',{downloadPath:downloads,offline:false});
    await browser.command('Emulation.setTimezoneOverride',{timezoneId:fixture.zone});
    const fixedId='3e50c5ad-22c5-4a11-aaaa-'+String(index+1).padStart(12,'0');
    await browser.command('Page.addScriptToEvaluateOnNewDocument',{source:'Object.defineProperty(globalThis.crypto,"randomUUID",{configurable:true,value:()=>'+JSON.stringify(fixedId)+'});\n//# sourceURL=receiving-fixed-uuid.js'});
    const url=origin+'/'+variant+'/';
    await browser.command('Page.navigate',{url});
    await waitFor(()=>browser.evaluate(()=>document.readyState==='complete'&&!!document.querySelector('#list .empty')),'actual original application startup',1000);
    row.resolvedZone=await browser.evaluate(()=>Intl.DateTimeFormat().resolvedOptions().timeZone);
    assert.equal(row.resolvedZone,fixture.zone,'Browser timezone applied');
    const merchant='Receiving Fixture Shop',orderNo='CAL-'+String(index+1);
    const email='From: '+merchant+'\nOrder # '+orderNo+'\nOrder date: '+fixture.orderDate+'\nTotal: $123.45\n';
    await browser.fill('#paste',email);await browser.activate('#find');
    await waitFor(()=>browser.evaluate(()=>!document.querySelector('#preview').hidden),'review visible');
    const review=await browser.evaluate(()=>Object.fromEntries([...new FormData(document.querySelector('#preview'))]));
    assert.equal(review.orderDate,fixture.orderDate,'Parsed order date');
    assert.equal(review.merchant,merchant,'Literal fictional merchant');
    await browser.fill('#preview [name=windowDays]','1');
    await browser.activate('#preview button[type=submit]');
    await waitFor(()=>browser.evaluate(()=>document.querySelectorAll('#list [data-ics]').length===1),'saved Calendar action',1000);
    const before=await browser.evaluate(()=>({storage:Object.fromEntries(Object.entries(localStorage)),deadline:document.querySelector('.return-by').textContent,uid:document.querySelector('[data-ics]').dataset.ics,tracked:document.querySelector('#tracked-count').textContent}));
    assert.equal(before.tracked,'1');assert.equal(before.uid,fixedId);
    assert.equal(before.deadline,'RETURN BY '+fixture.due,'Visible saved deadline');
    const oldDownloads=new Set(browser.downloads.keys());
    await browser.activate('#list [data-ics]');
    let download;
    await waitFor(()=>{download=[...browser.downloads.values()].find(item=>!oldDownloads.has(item.guid)&&item.state==='completed');return !!download;},'real completed Calendar download',1000);
    const bytes=await fs.readFile(path.join(downloads,download.guid));
    const raw=bytes.toString('utf8'),unfolded=raw.replace(/\r\n[ \t]/g,'');
    const field=name=>{const match=new RegExp('^'+name+':([^\\r\\n]*)','m').exec(unfolded);assert(match,'Calendar field '+name);return match[1];};
    const actualEnd=field('DTEND;VALUE=DATE');
    assert.equal(field('DTSTART;VALUE=DATE'),fixture.due.replaceAll('-',''),'Calendar start matches visible deadline');
    assert.equal(field('UID'),fixedId+'@returnby','Native saved identity in actual download');
    assert.equal(field('SUMMARY'),'Return deadline: '+merchant+' #'+review.orderNo);
    assert.equal(field('TRIGGER'),'-P3D','Unchanged three-day alarm');
    assert(!/(^|[^\r])\n/.test(raw),'ICS physical file uses CRLF');
    assert(raw.split('\r\n').every(line=>Buffer.byteLength(line)<=75),'Physical calendar lines bounded to75 UTF-8 bytes');
    const after=await browser.evaluate(()=>({storage:Object.fromEntries(Object.entries(localStorage)),deadline:document.querySelector('.return-by').textContent,uid:document.querySelector('[data-ics]').dataset.ics,tracked:document.querySelector('#tracked-count').textContent}));
    assert.deepEqual(after,before,'Download preserves exact saved bytes and visible deadline');
    const named=path.join(evidence,'downloads',variant+'-'+fixture.name+'.ics');
    await fs.mkdir(path.dirname(named),{recursive:true});await fs.writeFile(named,bytes);
    const normalized=raw.replace(/^DTSTAMP:[^\r\n]*$/m,'DTSTAMP:<runtime>');
    Object.assign(row,{success:true,expectedEnd:fixture.end,actualEnd,endCorrect:actualEnd===fixture.end,expectedOriginalFailure:variant==='original'&&fixture.originalEnd!==fixture.end,uuidFixture:fixedId,download:{guid:download.guid,suggestedFilename:download.suggestedFilename,bytes:bytes.length,sha256:sha(bytes),file:path.relative(evidence,named),normalizedTimestampSha256:sha(normalized)},savedBefore:before,savedAfter:after});
    assert.equal(actualEnd,variant==='original'?fixture.originalEnd:fixture.end,'Expected negative/candidate outcome');
    if(index===0){const shot=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const image=Buffer.from(shot.data,'base64');await fs.writeFile(path.join(evidence,variant+'-apia.png'),image);row.screenshot={path:variant+'-apia.png',bytes:image.length,sha256:sha(image)};}
   }catch(error){row.success=false;row.error=error.stack;}
   finally{if(tab)await browser.command('Target.disposeBrowserContext',{browserContextId:tab.browserContextId},false);}
   await fs.writeFile(path.join(evidence,'browser-progress.json'),JSON.stringify(report,null,2)+'\n');
  }
 }
 const originals=report.cases.filter(row=>row.variant==='original'),candidates=report.cases.filter(row=>row.variant==='candidate');
 assert(report.cases.every(row=>row.success),'All receiving interactions/invariants passed');
 assert.equal(originals.filter(row=>!row.endCorrect).length,3,'Three exact original negative controls');
 assert(candidates.every(row=>row.endCorrect),'All candidate downloaded end dates correct');
 for(const candidate of candidates){
  const original=originals.find(row=>row.name===candidate.name);
  let oldRaw=await fs.readFile(path.join(evidence,original.download.file),'utf8');
  const newRaw=await fs.readFile(path.join(evidence,candidate.download.file),'utf8');
  oldRaw=oldRaw.replace('DTEND;VALUE=DATE:'+original.actualEnd,'DTEND;VALUE=DATE:'+candidate.actualEnd);
  assert.equal(newRaw.replace(/^DTSTAMP:[^\r\n]*$/m,'DTSTAMP:<runtime>'),oldRaw.replace(/^DTSTAMP:[^\r\n]*$/m,'DTSTAMP:<runtime>'),'Only corrected DTEND and runtime stamp differ: '+candidate.name);
 }
 assert.equal(report.pageErrors.length,0,'No application page errors');
 assert.equal(report.serverErrors.length,0,'All application resources served');
 assert(report.requests.every(item=>item.url.startsWith(origin+'/')||item.url.startsWith('blob:'+origin+'/')||item.url.startsWith('data:')),'No external application requests');
 for(const source of Object.values(report.sources)){await verifyFiles(source.directory,source.files);await verifyFiles(path.join(source.directory,'dist'),source.artifacts);}
 report.summary={actualDownloads:report.cases.length,original:{cases:originals.length,expectedFailures:3,ordinaryPasses:originals.length-3},candidate:{cases:candidates.length,passes:candidates.length},sourceAndBuildBytesPreserved:true,exactStoredBytesPreserved:true,ordinaryCalendarsEquivalent:true};
 report.complete=true;
}catch(error){report.error=error.stack;process.exitCode=1;}
finally{
 if(browser)try{await browser.close();}catch(error){report.cleanupError=error.stack;process.exitCode=1;}
 if(server)await new Promise(resolve=>server.close(resolve));
 await fs.writeFile(path.join(evidence,'browser-receipt.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({complete:report.complete,summary:report.summary,error:report.error,cases:report.cases.map(row=>({variant:row.variant,name:row.name,success:row.success,actualEnd:row.actualEnd,error:row.error}))}));
}
