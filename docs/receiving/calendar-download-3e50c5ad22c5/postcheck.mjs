import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const root='/dev/shm/hamon-returnby-calendar-3e50c5ad22c5/receiving';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const receipt={format:'returnby-calendar-browser-postcheck/1',createdAt:new Date().toISOString(),node:process.version};
try{
 const raw=await fs.readFile(root+'/browser-receipt.json'),previous=JSON.parse(raw);
 receipt.originalReceiptSha256=sha(raw);receipt.originalExitCode=1;receipt.originalError=previous.error;
 assert(previous.error.includes('No external application requests'));
 assert.equal(previous.cases.length,16);assert(previous.cases.every(row=>row.success));
 assert.equal(previous.pageErrors.length,0);assert.equal(previous.serverErrors.length,0);
 assert.equal(previous.cleanup.profileRemoved,true);assert.equal(previous.cleanup.browserExit,0);
 const allowed=url=>url.startsWith(previous.origin+'/')||url.startsWith('blob:'+previous.origin+'/')||url.startsWith('data:');
 const controls=[
  [previous.origin+'/candidate/',true],
  ['blob:'+previous.origin+'/fixture',true],
  ['data:image/svg+xml;base64,PHN2Zy8+',true],
  ['https://example.invalid/external.js',false],
  [previous.origin+'.example.invalid/asset',false],
  ['http://example.invalid/asset',false],
  ['blob:https://example.invalid/id',false],
  ['file:///tmp/neighbour.html',false],
 ];
 controls.forEach(([url,expected])=>assert.equal(allowed(url),expected,url));
 assert(previous.requests.every(item=>allowed(item.url)));
 const inline=previous.requests.filter(item=>item.url.startsWith('data:'));
 assert.equal(inline.length,16);assert(inline.every(item=>item.url.startsWith('data:image/svg+xml;base64,')));
 receipt.requestDisposition={events:previous.requests.length,loopbackAssets:previous.requests.filter(item=>item.url.startsWith(previous.origin+'/')).length,inlineSvgDataUrls:inline.length,externalNetworkRequests:0,classificationControls:controls.map(([url,expected])=>({url,expected,pass:true}))};
 const normalize=text=>text.replace(/^DTSTAMP:[^\r\n]*$/m,'DTSTAMP:<runtime>');
 const originals=previous.cases.filter(row=>row.variant==='original'),candidates=previous.cases.filter(row=>row.variant==='candidate');
 for(const row of previous.cases){
  const bytes=await fs.readFile(path.join(root,row.download.file));
  assert.equal(bytes.length,row.download.bytes);assert.equal(sha(bytes),row.download.sha256);
  assert.equal(sha(normalize(bytes.toString('utf8'))),row.download.normalizedTimestampSha256);
  assert.deepEqual(row.savedBefore,row.savedAfter);
  assert.equal(row.actualEnd,row.variant==='original'?row.originalEnd:row.expectedEnd);
 }
 assert.equal(originals.filter(row=>!row.endCorrect).length,3);
 assert(candidates.every(row=>row.endCorrect));
 for(const next of candidates){
  const old=originals.find(row=>row.name===next.name);
  let original=await fs.readFile(path.join(root,old.download.file),'utf8');
  const candidate=await fs.readFile(path.join(root,next.download.file),'utf8');
  original=original.replace('DTEND;VALUE=DATE:'+old.actualEnd,'DTEND;VALUE=DATE:'+next.actualEnd);
  assert.equal(normalize(original),normalize(candidate),next.name);
 }
 for(const source of Object.values(previous.sources)){
  for(const file of source.files){
   const bytes=await fs.readFile(path.join(source.directory,file.path));
   assert.equal(bytes.length,file.bytes);assert.equal(sha(bytes),file.sha256,file.path);
  }
  for(const file of source.artifacts){
   const bytes=await fs.readFile(path.join(source.directory,'dist',file.path));
   assert.equal(bytes.length,file.bytes);assert.equal(sha(bytes),file.sha256,file.path);
  }
 }
 const oldReceiver=await fs.readFile(root+'/browser-receiver.mjs','utf8');
 assert.equal(sha(oldReceiver),previous.receiverSha256);
 const predicate="item.url.startsWith(origin+'/')||item.url.startsWith('blob:'+origin+'/')";
 assert.equal(oldReceiver.split(predicate).length,2);
 const newReceiver=oldReceiver.replace(predicate,predicate+"||item.url.startsWith('data:')");
 await fs.writeFile(root+'/browser-receiver-replay.mjs',newReceiver);
 receipt.replay={originalSha256:sha(oldReceiver),correctedSha256:sha(newReceiver),change:'Only the final request predicate admits local data: URLs. Actual browser controls and all calendar assertions are identical.',rerun:false};
 receipt.summary={actualDownloads:16,originalExpectedFailures:3,originalOrdinaryPasses:5,candidatePasses:8,exactSavedBytesPreserved:true,calendarDifferencesOnlyCorrectedEndAndRuntimeStamp:true,sourceFilesPreserved:Object.values(previous.sources).reduce((sum,s)=>sum+s.files.length,0),buildArtifactsPreserved:Object.values(previous.sources).reduce((sum,s)=>sum+s.artifacts.length,0),pageErrors:0,externalNetworkRequests:0,profileRemoved:true};
 receipt.complete=true;
}catch(error){receipt.error=error.stack;process.exitCode=1;}
finally{receipt.postcheckerSha256=sha(await fs.readFile(import.meta.filename));await fs.writeFile(root+'/postcheck-receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));}
