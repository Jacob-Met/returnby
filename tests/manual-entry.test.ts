import { expect, test, vi, afterEach } from 'vitest';
import { reviewReceipt, planReceiptSave } from '../src/manual-entry';
import { load, save, type Order } from '../src/store';
const identity = {id:'receipt-43',createdAt:'2026-10-09T03:00:00.000Z'};
const draft = {merchant:'Receipt <&> 東京',orderNo:"A'42",total:'2750 JPY',orderDate:'2026-10-09',windowDays:'30'};
const existing: Order & {extension:unknown} = {...identity,id:'EXISTING',merchant:'Other',orderDate:'2026-01-01',windowDays:14,windowSource:'policy',extension:{nested:['keep',1]},};
afterEach(()=>vi.unstubAllGlobals());
test('literal receipt facts and manually fixed month boundary appear in review',()=>{
 const r=reviewReceipt(draft,identity);
 expect(r.draft).toEqual(draft);
 expect(r.due).toBe('2026-11-08');
 expect(r.order).toEqual({...identity,merchant:'Receipt <&> 東京',orderNo:"A'42",total:'2750 JPY',orderDate:'2026-10-09',windowDays:30,windowSource:'user'});
});
test('known store and familiar duration still belong to the user',()=>{
 expect(reviewReceipt({...draft,merchant:'Amazon'},identity).order.windowSource).toBe('user');
});
test('leap-day review uses existing helper',()=>{
 expect(reviewReceipt({...draft,orderDate:'2024-02-28',windowDays:'2'},identity).due).toBe('2024-03-01');
});
test('input draft is copied and not mutated',()=>{
 const input={...draft};const r=reviewReceipt(input,identity);input.total='changed';
 expect(r.draft.total).toBe('2750 JPY');expect(r.order.total).toBe('2750 JPY');
});
for(const days of ['', '0','1.5','1e2','3700001'])test('invalid manual window remains refused '+JSON.stringify(days),()=>{
 expect(()=>reviewReceipt({...draft,windowDays:days},identity)).toThrow();
});
test('optional metadata can be blank without invented policy',()=>{
 const r=reviewReceipt({...draft,merchant:'',orderNo:'',total:''},identity);
 expect(r.order.merchant).toBe('');expect(r.order.windowSource).toBe('user');
});
test('fresh append preserves order, extras, omissions and original row references',()=>{
 const review=reviewReceipt(draft,identity);const current=[existing,{...existing,id:'REMOTE',extension:{afterPreview:true}}];
 const result=planReceiptSave(current,review.order);
 expect(result.alreadySaved).toBe(false);expect(result.next.slice(0,2)).toEqual(current);
 expect(result.next[0]).toBe(existing);expect(current).toHaveLength(2);expect(result.next[2]).toEqual(review.order);
});
test('same identity and exact saved record need no duplicate write',()=>{
 const r=reviewReceipt(draft,identity);const current=[existing,JSON.parse(JSON.stringify(r.order))];
 const result=planReceiptSave(current,r.order);
 expect(result.alreadySaved).toBe(true);expect(result.next).toBe(current);
});
test('same identity with changed details refuses overwrite',()=>{
 const r=reviewReceipt(draft,identity);const current=[{...r.order,total:'Changed elsewhere'}];
 expect(()=>planReceiptSave(current,r.order)).toThrow(/different/);expect(current[0].total).toBe('Changed elsewhere');
});
test('multiple identity matches refuse even if both look identical',()=>{
 const r=reviewReceipt(draft,identity);expect(()=>planReceiptSave([r.order,r.order],r.order)).toThrow(/more than once/);
});
test('same facts with another identity remain a separate receipt',()=>{
 const r=reviewReceipt(draft,identity);expect(planReceiptSave([{...r.order,id:'OTHER'}],r.order).next).toHaveLength(2);
});
test('real accepted store writer appends latest changes and retains full raw fields',()=>{
 let raw=JSON.stringify([existing]);vi.stubGlobal('localStorage',{getItem:()=>raw,setItem:(_k:string,v:string)=>{raw=v;}});
 const r=reviewReceipt(draft,identity);raw=JSON.stringify([{...existing,merchant:'Corrected',extension:{latest:true}},{...existing,id:'REMOTE'}]);
 const before=JSON.parse(raw);save(planReceiptSave(load(),r.order).next);
 expect(JSON.parse(raw).slice(0,2)).toEqual(before);expect(JSON.parse(raw)[2]).toEqual(r.order);
});
test('uncertain write retry recognizes the exact first receipt without appending',()=>{
 const r=reviewReceipt(draft,identity);let raw=JSON.stringify([existing]);let writes=0;
 vi.stubGlobal('localStorage',{getItem:()=>raw,setItem:(_k:string,v:string)=>{raw=v;writes++;throw Error('AFTER_WRITE');}});
 expect(()=>save(planReceiptSave(load(),r.order).next)).toThrow('AFTER_WRITE');
 const retry=planReceiptSave(load(),r.order);
 expect(retry.alreadySaved).toBe(true);expect(retry.next).toHaveLength(2);expect(writes).toBe(1);
});
