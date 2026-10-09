import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const root='D:/HAMON/returnby-backup-calendar-browser-peer-coordination-5f566b5ec8ef';
const source='D:/HAMON/returnby-backup-calendar-browser-5f566b5ec8ef/source';
const out=path.join(root,'receiver-first');fs.mkdirSync(out,{recursive:false});
const sha=x=>createHash('sha256').update(x).digest('hex');
const relative=['browser/calendar-model.mjs','browser/calendar-ui.mjs','original/tools/backup_calendar_model.mjs','original/src/backup.ts','original/src/calendar-batch.ts','original/src/ics.ts','original/src/deadline.ts','original/src/completion.ts','original/src/store.ts'];
const pins=()=>Object.fromEntries(relative.map(x=>[x,sha(fs.readFileSync(path.join(source,x)))]));
const before=pins();
assert.equal(before['browser/calendar-model.mjs'],'bb99ef6728644452f43a49f3bb7f81ed9246603e5b198e76490507c5bceae827');
assert.equal(before['browser/calendar-ui.mjs'],'afc1f56cde65c320c5a75eba00710335d3a6a774c7e5fdd46daba3f7b6face32');
const native=await import(pathToFileURL(path.join(source,'original/tools/backup_calendar_model.mjs')));
const model=await import(pathToFileURL(path.join(source,'browser/calendar-model.mjs')));
const {inspectBackupFile,prepareCalendar,calendarDownload,retireCalendarReview,retireBackup}=model;
const enc=new TextEncoder(),dec=new TextDecoder();
const at='2026-11-01T05:30:45.123Z';
const merchant='Étoile, dépôt; \\line\n店'.repeat(5);
const order=(id,date,days,extra={})=>({id,merchant,orderNo:'A,1;\\2\nline',total:'19.00',orderDate:date,windowDays:days,windowSource:'user',createdAt:'2026-01-01T00:00:00.000Z',...extra});
const fixture={schema:'returnby.backup',version:2,exportedAt:'2026-10-09T10:00:00.000Z',orders:[
 order('z.last','2026-11-01',4),
 order('completed','2026-09-01',30,{completedAt:'2026-10-01T12:34:00.000Z'}),
 order('year-edge','9999-12-30',1),
 order('a.first','2026-10-31',2)]};
const bytes=enc.encode(JSON.stringify(fixture));
fs.writeFileSync(path.join(out,'fixture.json'),bytes);
const receipt={schema:'returnby.peer.actual-caller/1',actor:'chatgpt:5f566b5ec8ef:coordination',started_utc:new Date().toISOString(),runtime:process.version,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,offset_minutes:new Date(at).getTimezoneOffset(),at,source_pins:before,checks:[],failure:null};
function check(name,detail){receipt.checks.push({name,passed:true,detail});fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify(receipt,null,2)+'\n');}
function frozen(x){if(x&&typeof x==='object'){assert(Object.isFrozen(x));for(const y of Object.values(x))frozen(y);}}
try{
 const document=await inspectBackupFile(bytes,'literal<&>.json',at);
 const original=native.inspectBackup(bytes,at);
 assert.deepEqual(document.rows.map(x=>[x.id,x.position,x.status,x.due]),original.rows.map(x=>[x.id,x.position,x.status,x.due]));
 assert.deepEqual(document.rows.map(x=>x.id),['z.last','completed','year-edge','a.first']);
 assert.deepEqual(document.rows.map(x=>x.status),['eligible','completed','blocked','eligible']);
 assert.equal(document.total,4);assert.equal(document.eligible,2);assert.equal(document.completed,1);assert.equal(document.blocked,1);
 for(const id of ['completed','year-edge','unknown'])assert.throws(()=>prepareCalendar(document,[id]));
 frozen(document);
 check('mixed identity preserves all source positions; blocked/completed/unknown cannot prepare',{rows:document.rows.map(x=>({id:x.id,position:x.position,status:x.status,due:x.due}))});

 const ids=['z.last','a.first'];
 const planned=native.planBackupCalendar(bytes,ids,at);
 const review=prepareCalendar(document,ids);const download=calendarDownload(document,ids,review);
 assert.equal(dec.decode(download.bytes),planned.content);assert.equal(download.filename,planned.filename);assert.deepEqual(review.reminders,planned.reminders);
 assert.deepEqual(review.reminders.map(x=>x.id),['a.first','z.last']);
 assert.equal((planned.content.match(/BEGIN:VEVENT\r\n/g)||[]).length,2);
 assert.equal((planned.content.match(/TRIGGER:-P3D\r\n/g)||[]).length,2);
 assert.equal((planned.content.match(/DTSTAMP:20261101T053045Z\r\n/g)||[]).length,2);
 assert(planned.content.split('\r\n').every(line=>enc.encode(line).length<=75));
 fs.writeFileSync(path.join(out,'native.ics'),planned.content);
 fs.writeFileSync(path.join(out,'browser-model.ics'),download.bytes);
 frozen(review);
 check('selected output exact accepted-native ICS parity with literal UTF8/folding/dates/alarm',{sha256:sha(download.bytes),bytes:download.bytes.length,filename:download.filename,reminders:review.reminders});

 const same=await inspectBackupFile(bytes,'literal<&>.json',at);
 assert.deepEqual(same,document);assert.notEqual(same,document);
 assert.throws(()=>calendarDownload(same,ids,review));assert.throws(()=>prepareCalendar(structuredClone(document),ids));
 assert.throws(()=>calendarDownload(document,ids,structuredClone(review)));
 const spaced=enc.encode(JSON.stringify(fixture,null,1)+'\n');const spacedDoc=await inspectBackupFile(spaced,'literal<&>.json',at);
 assert.notEqual(spacedDoc.source.sha256,document.source.sha256);assert.equal(spacedDoc.source.sha256,sha(spaced));assert.equal(spacedDoc.source.bytes,spaced.length);
 const spacedReview=prepareCalendar(spacedDoc,ids);assert.equal(dec.decode(calendarDownload(spacedDoc,ids,spacedReview).bytes),planned.content);
 check('authentic separate document/review identities and exact raw-whitespace byte provenance',{first:document.source,spaced:spacedDoc.source});

 const nativeCrypto=globalThis.crypto;
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');
 let release,entered;
 const started=new Promise(resolve=>{entered=resolve;});
 const gate=new Promise(resolve=>{release=resolve;});
 let pending;
 try{
  Object.defineProperty(globalThis,'crypto',{configurable:true,value:{subtle:{digest:async(algorithm,value)=>{entered();await gate;return nativeCrypto.subtle.digest(algorithm,value);}}}});
  const input=new Uint8Array(bytes);pending=inspectBackupFile(input,'delayed.json',at);
  await started;input.fill(0);release();const delayed=await pending;
  assert.equal(delayed.source.sha256,sha(bytes));assert.equal(delayed.source.bytes,bytes.length);
  assert.deepEqual(delayed.rows,document.rows);
  const delayedReview=prepareCalendar(delayed,ids);
  assert.equal(dec.decode(calendarDownload(delayed,ids,delayedReview).bytes),planned.content);
  check('actual digest delayed before caller byte overwrite retains one admitted snapshot',{hash:delayed.source.sha256,input_after_sha256:sha(input)});
 }finally{release?.();if(descriptor)Object.defineProperty(globalThis,'crypto',descriptor);else delete globalThis.crypto;}

 const mutableIds=[...ids];const freshReview=prepareCalendar(document,mutableIds);
 mutableIds[0]='year-edge';
 assert.deepEqual(freshReview.selectedIds,ids);assert.throws(()=>calendarDownload(document,mutableIds,freshReview));
 const first=calendarDownload(document,ids,freshReview);first.bytes.fill(0);
 const second=calendarDownload(document,ids,freshReview);assert.equal(dec.decode(second.bytes),planned.content);assert.notEqual(first.bytes,second.bytes);
 assert.throws(()=>{freshReview.reminders[0].merchant='wrong';},TypeError);
 assert.throws(()=>{document.rows[0].id='wrong';},TypeError);
 check('caller arrays and returned bytes cannot change frozen review or next download',{second_sha256:sha(second.bytes)});

 retireCalendarReview(document);
 assert.throws(()=>calendarDownload(document,ids,freshReview));
 const b=prepareCalendar(document,['a.first']);retireCalendarReview(document);
 const aAgain=prepareCalendar(document,ids);
 assert.throws(()=>calendarDownload(document,ids,freshReview));assert.throws(()=>calendarDownload(document,['a.first'],b));
 assert.equal(dec.decode(calendarDownload(document,ids,aAgain).bytes),planned.content);
 assert.throws(()=>prepareCalendar(document,['a.first','a.first']));
 assert.throws(()=>calendarDownload(document,ids,aAgain));
 const current=prepareCalendar(document,ids);retireBackup(document);
 assert.throws(()=>prepareCalendar(document,ids));assert.throws(()=>calendarDownload(document,ids,current));
 const independent=prepareCalendar(same,ids);assert.equal(dec.decode(calendarDownload(same,ids,independent).bytes),planned.content);
 check('A→B→A, refused preparation and document retirement reject old reviews without retiring another document');

 const corrupt=structuredClone(fixture);corrupt.orders.push({...order('late','2026-10-01',1),windowDays:0});
 await assert.rejects(inspectBackupFile(enc.encode(JSON.stringify(corrupt)),'invalid-late.json',at));
 await assert.rejects(inspectBackupFile(new Uint8Array([0x7b,0xff,0x7d]),'invalid-utf8.json',at));
 assert.equal(dec.decode(calendarDownload(same,ids,independent).bytes),planned.content);
 check('invalid late record and invalid UTF8 refuse completely; independent admitted document remains usable');
}catch(error){receipt.failure={name:error.name,message:error.message,stack:error.stack};}
finally{
 receipt.source_unchanged=JSON.stringify(pins())===JSON.stringify(before);receipt.finished_utc=new Date().toISOString();
 if(!receipt.source_unchanged&&!receipt.failure)receipt.failure={message:'Source changed'};
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify({checks:receipt.checks.length,failure:receipt.failure,unchanged:receipt.source_unchanged,timezone:receipt.timezone,runtime:receipt.runtime}));
 process.exitCode=receipt.failure?1:0;
}
