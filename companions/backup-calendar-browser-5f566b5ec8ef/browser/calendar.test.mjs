import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const original = await import('../original/tools/backup_calendar_model.mjs');
const m = await import('./calendar-model.mjs');
const at='2026-10-09T12:00:00.000Z';
const encoder=new TextEncoder();
const order=(id,extra={})=>({id,merchant:'Shop Ω <script>literal</script>\nline,;\\',orderNo:'A,;\\\n#',total:'12.34',orderDate:'2026-10-01',windowDays:30,windowSource:'user',createdAt:'2026-10-01T12:00:00.000Z',...extra});
const encode=(orders,extra={})=>encoder.encode(JSON.stringify({schema:'returnby.backup',version:2,exportedAt:at,orders,...extra}));
const inspect=(bytes=encode([order('one')]))=>m.inspectBackupFile(bytes,'literal <backup> Ω.json',at);
test('whole native admission keeps source order and completed/blocked states',async()=>{
 const b=encode([order('z'),order('done',{completedAt:at}),order('edge',{orderDate:'9999-12-30',windowDays:1}),order('a')]);
 const d=await inspect(b),n=original.inspectBackup(b,at);
 assert.deepEqual(d.rows.map(x=>[x.id,x.status,x.due,x.problem]),n.rows.map(x=>[x.id,x.status,x.due,x.problem]));
 assert.equal(d.source.sha256,n.source.sha256);assert.equal(d.total,4);assert.equal(d.eligible,2);
});
test('selected ICS equals unchanged accepted native model for version1/2 and native order',async()=>{
 for(const version of [1,2]){
  const b=encode([order('z'),order('a',{orderDate:'2026-09-01'}),order('unused')],{version});
  const d=await inspect(b),r=m.prepareCalendar(d,['z','a']),n=original.planBackupCalendar(b,['z','a'],at);
  assert.equal(r.content,n.content);assert.equal(r.filename,n.filename);assert.deepEqual(r.reminders,n.reminders);
  assert.deepEqual(r.reminders.map(x=>x.id),['a','z']);assert.match(r.content,/TRIGGER:-P3D/);
  assert.deepEqual(m.calendarDownload(d,['z','a'],r).bytes,encoder.encode(n.content));
 }
});
test('full invalid later row, duplicate identity and unknown field refuse before document',async()=>{
 for(const b of [encode([order('a'),order('b',{windowDays:0})]),encode([order('a'),order('a')]),encode([order('a')],{extra:true}),encoder.encode('{}'),new Uint8Array([0xff])])await assert.rejects(inspect(b));
});
test('byte and total-order limits remain original admission',async()=>{
 await assert.rejects(inspect(new Uint8Array(5*1024*1024+1)),/5 MiB/);
 await assert.rejects(inspect(encode(Array.from({length:2001},(_,i)=>order('id'+i)))),/2,000/);
 const d=await inspect(encode(Array.from({length:2000},(_,i)=>order('id'+i))));assert.equal(d.total,2000);
});
test('captured input is copied before digest await',async()=>{
 const b=encode([order('original')]);const hash=createHash('sha256').update(b).digest('hex');
 const promise=inspect(b);b.fill(0);const d=await promise;
 assert.equal(d.rows[0].id,'original');assert.equal(d.source.sha256,hash);
});
test('documents, reviews and caller selection are detached and recursively frozen',async()=>{
 const d=await inspect(),ids=['one'];const r=m.prepareCalendar(d,ids);ids[0]='changed';
 assert.throws(()=>{d.rows[0].merchant='changed';},TypeError);assert.throws(()=>{r.reminders[0].id='changed';},TypeError);
 assert.deepEqual(r.selectedIds,['one']);assert.ok(m.calendarDownload(d,['one'],r).bytes.length);
});
test('forged document/review and a different authentic same-byte document refuse',async()=>{
 const d=await inspect(),other=await inspect(),r=m.prepareCalendar(d,['one']);
 assert.throws(()=>m.prepareCalendar(structuredClone(d),['one']));
 assert.throws(()=>m.calendarDownload(d,['one'],structuredClone(r)));
 assert.throws(()=>m.calendarDownload(other,['one'],r));
});
test('download bytes are a fresh copy and preserve the complete authentic review',async()=>{
 const d=await inspect(),r=m.prepareCalendar(d,['one']),out=m.calendarDownload(d,['one'],r);
 out.bytes.fill(0);out.filename='changed';const next=m.calendarDownload(d,['one'],r);
 assert.deepEqual(next.bytes,encoder.encode(r.content));assert.equal(next.filename,r.filename);
});
test('completed blocked unknown duplicate and empty selected IDs all refuse',async()=>{
 const d=await inspect(encode([order('one'),order('done',{completedAt:at}),order('edge',{orderDate:'9999-12-30',windowDays:1})]));
 for(const ids of [[],['done'],['edge'],['unknown'],['one','one'],['one',1],[' one']])assert.throws(()=>m.prepareCalendar(d,ids));
});
test('ordinary selection change and A-B-A epoch changes retire a saved preview',async()=>{
 const d=await inspect(encode([order('one'),order('two')])),r=m.prepareCalendar(d,['one']);
 assert.throws(()=>m.calendarDownload(d,['two'],r));m.retireCalendarReview(d);m.retireCalendarReview(d);
 assert.throws(()=>m.calendarDownload(d,['one'],r));const next=m.prepareCalendar(d,['one']);assert.ok(m.calendarDownload(d,['one'],next).bytes.length);
});
test('refused preparation and new preview both retire previous preview',async()=>{
 const d=await inspect(),r=m.prepareCalendar(d,['one']);assert.throws(()=>m.prepareCalendar(d,[]));
 assert.throws(()=>m.calendarDownload(d,['one'],r));const r2=m.prepareCalendar(d,['one']);m.prepareCalendar(d,['one']);
 assert.throws(()=>m.calendarDownload(d,['one'],r2));
});
test('retired source cannot prepare or export, including same bytes selected again',async()=>{
 const d=await inspect(),r=m.prepareCalendar(d,['one']);m.retireBackup(d);
 assert.throws(()=>m.prepareCalendar(d,['one']));assert.throws(()=>m.calendarDownload(d,['one'],r));
 const next=await inspect();assert.throws(()=>m.calendarDownload(next,['one'],r));
});
test('canonical timestamp, byte type and filename boundaries are explicit',async()=>{
 const b=encode([order('one')]);
 for(const time of ['2026-02-30T12:00:00.000Z','2026-10-09','0999-01-01T00:00:00.000Z',null])await assert.rejects(m.inspectBackupFile(b,'a',time));
 await assert.rejects(m.inspectBackupFile([], 'a',at));await assert.rejects(m.inspectBackupFile(b,'x'.repeat(4097),at));
 const d=await m.inspectBackupFile(b,'x'.repeat(4096),at);assert.equal(d.source.name.length,4096);
});
test('empty backup is inspected without selecting an implicit event',async()=>{
 const d=await inspect(encode([]));assert.equal(d.total,0);assert.equal(d.eligible,0);assert.throws(()=>m.prepareCalendar(d,[]));
});
test('unchanged serializer output-size guard refuses a fully admitted oversized selection',async()=>{
 const rows=Array.from({length:300},(_,i)=>order('id'+i,{merchant:'x'.repeat(4096),orderNo:'y'.repeat(4096)}));
 const b=encode(rows);assert.ok(b.length<5*1024*1024);const d=await inspect(b);
 assert.throws(()=>m.prepareCalendar(d,rows.map(x=>x.id)),/4 MiB/);
});
