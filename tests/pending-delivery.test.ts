import {test,expect} from 'vitest';
import {readPending,writePending,planPendingRestore,portablePending} from '../src/pending-delivery';
import {exportBackup,parseBackupDocument} from '../src/backup';
const storage=()=>{const data=new Map<string,string>();return {getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}};};
const row=(id:string)=>({id,updatedAt:'2026-11-10T12:00:00.000Z',fields:{merchant:'North Trail',orderNo:id,orderDate:'2026-11-10',windowDays:'30',total:'$42',windowStartDate:''}});
test('legacy pending review migrates alongside another purchase without retaining raw receipt',()=>{
 const s=storage();s.setItem('returnby.pending-delivery',JSON.stringify({...row('one').fields,rawEmail:'PRIVATE RAW'}));
 const initial=readPending(s);expect(initial.rows).toHaveLength(1);
 writePending(s,[...initial.rows,row('two')],initial.token);
 expect(readPending(s).rows).toHaveLength(2);expect(s.getItem('returnby.pending-delivery')).toBeNull();
 expect(JSON.stringify(readPending(s))).not.toContain('PRIVATE RAW');
});
test('stale pending editor cannot overwrite a second tab purchase',()=>{
 const s=storage(),a=readPending(s);writePending(s,[row('first')],a.token);
 expect(()=>writePending(s,[row('stale')],a.token)).toThrow(/changed/);
 expect(readPending(s).rows[0].id).toBe('first');
});
test('pending-only backup travels without creating deadlines and never replaces conflicting work',()=>{
 const rows=portablePending([row('first'),row('second')]);
 const file=exportBackup([],new Date('2026-11-10T12:00:00Z'),null,rows);
 const recovered=parseBackupDocument(file);expect(recovered.orders).toEqual([]);expect(recovered.pending).toEqual(rows);
 expect(planPendingRestore([],recovered.pending!).next).toEqual(rows);
 const changed={...rows[0],fields:{...rows[0].fields,merchant:'Changed store'}};
 expect(planPendingRestore([changed],rows).conflicts).toHaveLength(1);
 expect(planPendingRestore(rows,rows).additions).toHaveLength(0);
});
test('quota failure leaves prior pending purchase intact',()=>{
 const s=storage(),a=readPending(s);writePending(s,[row('first')],a.token);
 const before=readPending(s);s.setItem=()=>{throw Error('quota');};
 expect(()=>writePending(s,[...before.rows,row('second')],before.token)).toThrow(/quota/);
 expect(readPending(s)).toEqual(before);
});
test('return document survives pending delivery, backup and restoration without becoming a deadline',()=>{
 const url='https://returns.example/label?id=42&proof=a';
 const pending={...row('parcel'),fields:{...row('parcel').fields,returnEvidenceUrl:url}};
 const s=storage(), initial=readPending(s);
 writePending(s,[pending],initial.token);
 expect(readPending(s).rows[0].fields.returnEvidenceUrl).toBe(url);
 const exported=exportBackup([],new Date('2026-11-10T12:00:00Z'),null,readPending(s).rows);
 expect(JSON.parse(exported).version).toBe(7);
 const restored=parseBackupDocument(exported);
 expect(restored.orders).toEqual([]);
 expect(restored.pending?.[0].fields.returnEvidenceUrl).toBe(url);
 for(const unsafe of ['http://returns.example/label','javascript:alert(1)','https://user:pass@returns.example/label','https://returns.example\\evil.test/label']){
  expect(()=>portablePending([{...pending,fields:{...pending.fields,returnEvidenceUrl:unsafe}}])).toThrow(/HTTPS/);
 }
});
