'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Frozen receiving contract from #29 comment6064323405 and #32's field contract.
// All records are fictional. Source modules and saved state are never patched.
function cases(checklist, completion) {
  const {parseSavedOrders, createChecklist, buildChecklistHtml, assertSnapshotCurrent, readSavedOrders} = checklist;
  const open = (id = 'OPEN-A') => ({id, merchant:'Fixture <海> & Shop', orderNo:'A-123', total:'$12.34',
    orderDate:'2026-10-01', windowDays:30, windowSource:'user', createdAt:'2026-10-01T12:00:00.000Z'});
  const done = (id = 'DONE-B') => ({...open(id), completedAt:'2026-10-08T12:34:56.000Z'});
  const trip = snapshot => createChecklist(snapshot, snapshot.orders.map(o=>o.id), '2026-10-10', '2026-10-08');
  const refuse = (fn, code) => assert.throws(fn, e=>e instanceof checklist.ChecklistError && e.code===code);
  return [
    ['mixed collection offers only open returns without changing saved bytes', () => {
      const raw=JSON.stringify([done(), open()]); const snapshot=parseSavedOrders(raw);
      assert.deepEqual(snapshot.orders.map(o=>o.id), ['OPEN-A']); assert.equal(snapshot.raw,raw);
      assert.equal(JSON.parse(raw)[0].completedAt,done().completedAt);
      assert(Object.isFrozen(snapshot) && Object.isFrozen(snapshot.orders) && Object.isFrozen(snapshot.orders[0]));
    }],
    ['completed-only list is empty for planning, not erased from storage', () => {
      const raw=JSON.stringify([done()]); const snapshot=parseSavedOrders(raw);
      assert.equal(snapshot.orders.length,0); assert.equal(snapshot.raw,raw);
      refuse(()=>createChecklist(snapshot,['DONE-B'],'2026-10-10'),'selection');
    }],
    ['all supported completion timestamp forms remain excluded', () => {
      for(const completedAt of ['2026-10-08T12:34:56Z','2026-10-08T12:34:56.1Z',
        '2026-10-08T12:34:56.123-07:00','2026-10-08T12:34:56+05:45']) {
        assert.equal(completion.isCompletionTimestamp(completedAt),true);
        assert.equal(parseSavedOrders(JSON.stringify([{...done(),completedAt}])).orders.length,0);
      }
    }],
    ['malformed completion markers reject the entire list', () => {
      for(const completedAt of [null,'',false,0,{},[],'not-a-date','2026-02-30T12:00:00Z',
        '2026-10-08T12:00:00','2026-10-08T24:00:00Z']) {
        assert.equal(completion.isCompletionTimestamp(completedAt),false);
        refuse(()=>parseSavedOrders(JSON.stringify([open(), {...done(),completedAt}])),'data');
      }
    }],
    ['completed rows still undergo every existing admission control', () => {
      for(const patch of [{merchant:1},{orderDate:'2026-02-30'},{windowDays:0},{windowSource:'other'},
        {id:''},{createdAt:null},{total:[]},{orderNo:4}]) {
        refuse(()=>parseSavedOrders(JSON.stringify([open(),{...done(),...patch}])),'data');
      }
      refuse(()=>parseSavedOrders(JSON.stringify([open(),done('OPEN-A')])),'data');
      refuse(()=>parseSavedOrders(JSON.stringify([done(),done()])),'data');
    }],
    ['completed entries count toward the original count and byte limits', () => {
      refuse(()=>parseSavedOrders(JSON.stringify(Array.from({length:2001},(_,i)=>done(String(i))))),'data');
      const raw=JSON.stringify([done()])+' '.repeat(checklist.MAX_SAVED_BYTES);
      refuse(()=>parseSavedOrders(raw),'data');
    }],
    ['direct selection cannot bypass completed admission', () => {
      const snapshot={raw:JSON.stringify([done()]),orders:[done()]};
      refuse(()=>createChecklist(snapshot,['DONE-B'],'2026-10-10'),'selection');
    }],
    ['late native completion retires the exact old download snapshot', () => {
      const original=open(); let raw=JSON.stringify([original]); let writes=0;
      const reader={getItem(){return raw;},setItem(){writes++;throw Error('must not write');}};
      const snapshot=readSavedOrders(reader); const before=buildChecklistHtml(trip(snapshot));
      const plan=completion.planCompletion([original],original,'complete',new Date('2026-10-08T12:34:56Z'));
      assert(plan.changed); raw=JSON.stringify(plan.next);
      refuse(()=>assertSnapshotCurrent(snapshot,reader),'stale');
      assert.equal(readSavedOrders(reader).orders.length,0);
      const reopened=completion.planCompletion(plan.next,plan.order,'reopen');
      raw=JSON.stringify(reopened.next); const refreshed=readSavedOrders(reader);
      assert.equal(buildChecklistHtml(trip(refreshed)),before); assert.equal(writes,0);
    }],
    ['read refusal preserves the snapshot and explicit retry receives completion', () => {
      const raw=JSON.stringify([open()]); const snapshot=parseSavedOrders(raw);
      refuse(()=>assertSnapshotCurrent(snapshot,{getItem(){throw Error('blocked');}}),'storage');
      assert.equal(snapshot.raw,raw); assert.equal(snapshot.orders[0].id,'OPEN-A');
      const retry=readSavedOrders({getItem(){return JSON.stringify([done('OPEN-A')]);}});
      assert.equal(retry.orders.length,0);
    }],
    ['open selection keeps literal fields, deadline and downloadable document', () => {
      const row=open(); const raw=JSON.stringify([row]); const snapshot=parseSavedOrders(raw);
      assert.deepEqual(snapshot.orders,[row]); const value=trip(snapshot);
      assert.equal(value.orders[0].due,'2026-10-31');
      const html=buildChecklistHtml(value);
      assert(html.startsWith('<!doctype html>\n')); assert(html.endsWith('</body></html>\n'));
      assert(html.includes('Fixture &lt;海&gt; &amp; Shop')); assert(html.includes('A-123'));
      assert(html.includes('2026-10-31')); assert(!html.includes('completedAt'));
      assert.doesNotThrow(()=>assertSnapshotCurrent(snapshot,{getItem(){return raw;}}));
    }],
    ['missing and undefined completion keep the exact legacy open projection', () => {
      const row=open(); const expected=parseSavedOrders(JSON.stringify([row]));
      assert.deepEqual(parseSavedOrders(JSON.stringify([{...row,completedAt:undefined}])).orders,expected.orders);
      assert.equal(parseSavedOrders(null).orders.length,0);
      assert.equal(parseSavedOrders('[]').orders.length,0);
    }],
    ['unrelated changes still require review rather than weaken freshness', () => {
      const snapshot=parseSavedOrders(JSON.stringify([open(),done()]));
      const changed=JSON.stringify([open(),done(),open('OTHER')]);
      refuse(()=>assertSnapshotCurrent(snapshot,{getItem(){return changed;}}),'stale');
      const fresh=parseSavedOrders(changed); assert.deepEqual(fresh.orders.map(o=>o.id),['OPEN-A','OTHER']);
      refuse(()=>createChecklist(fresh,[], '2026-10-10'),'selection');
      refuse(()=>createChecklist(fresh,['OPEN-A','OPEN-A'],'2026-10-10'),'selection');
    }],
  ];
}
module.exports={cases};
if(require.main===module) {
  const root=path.resolve(process.argv[2]);
  const checklist=require(path.join(root,'trip-checklist.js'));
  const completion=require(path.join(root,'completion.js'));
  const results=cases(checklist,completion).map(([name,run])=>{
    try{run();return{name,pass:true};}catch(error){return{name,pass:false,error:error.message};}
  });
  console.log(JSON.stringify({node:process.version,source:root,
    receiver_sha256:crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),
    passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,results},null,2));
}
