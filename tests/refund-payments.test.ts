import {describe,it,expect} from 'vitest';
import {parseRefundMoney,refundBalance,validRefundPayments,type RefundPayments} from '../src/refund-payments';
import {planRefund} from '../src/refund';
import {exportBackup,parseBackup,planImport} from '../src/backup';
import {planResolvedImport,backupFieldValue} from '../src/backup-resolution';
import {previewEdit,editDraft} from '../src/edit';
import type {Order} from '../src/store';
const order:Order={id:'harbour-credits',merchant:'Harbour',orderDate:'2026-11-02',windowDays:30,windowSource:'user',createdAt:'2026-11-02T10:00:00Z'};
const payments:RefundPayments={currency:'GBP',expectedCents:7250,credits:[{id:'first',date:'2026-11-10',amountCents:2000,note:'First bank credit'}]};
const draft={state:'awaiting' as const,amount:'GBP 72.50',followUpDate:'2026-11-18',note:'Two parcels returned',payments};
const saved=()=>planRefund([order],order,draft,new Date('2026-11-10T12:00:00Z'))[0];
describe('recorded partial refund credits',()=>{
 it('adds exact cents and keeps the unreceived balance awaiting',()=>{
  expect(parseRefundMoney('0.10')+parseRefundMoney('0.20')).toBe(30);
  const s=saved();expect(refundBalance(s.refundPayments!)).toEqual({received:2000,remaining:5250,extra:0});expect(s.refundState).toBe('awaiting');
  const second={...payments,credits:[...payments.credits,{id:'second',date:'2026-11-12',amountCents:5250,note:'Second parcel'}]};
  const complete=planRefund([s],s,{...draft,payments:second})[0];
  expect(complete.refundState).toBe('awaiting');expect(refundBalance(complete.refundPayments!).remaining).toBe(0);
  expect(planRefund([complete],complete,{...draft,state:'received',payments:second})[0].refundState).toBe('received');
 });
 it('does not let an incomplete refund be labelled received or its currency be silently changed',()=>{
  const s=saved();expect(()=>planRefund([s],s,{...draft,state:'received'})).toThrow(/outstanding/);
  expect(()=>planRefund([s],s,{...draft,payments:{...payments,currency:'USD'}})).toThrow(/currency/);
 });
 it('correction/removal changes only the reviewed payment history and refuses stale saves',()=>{
  const s=saved();const edited={...payments,credits:[{...payments.credits[0],amountCents:1750,note:'Corrected bank amount'}]};
  const next=planRefund([s],s,{...draft,payments:edited})[0];
  expect(refundBalance(next.refundPayments!).remaining).toBe(5500);
  expect(s.refundPayments!.credits[0].amountCents).toBe(2000);
  expect(()=>planRefund([next],s,draft)).toThrow(/changed/);
  const removed=planRefund([next],next,{...draft,payments:{...edited,credits:[]}})[0];
  expect(refundBalance(removed.refundPayments!).remaining).toBe(7250);
 });
 it('retains legacy text and notes without requiring conversion',()=>{
  const legacy=planRefund([order],order,{state:'awaiting',amount:'£42.50 promised less postage',followUpDate:'',note:'Store will confirm'} as const)[0];
  expect(parseBackup(exportBackup([legacy]))[0].refundAmount).toBe('£42.50 promised less postage');
  expect(legacy.refundPayments).toBeUndefined();
 });
 it('exports version6 with complete dated credits and restores identical records without false conflicts',()=>{
  const s=saved();const json=exportBackup([s]);expect(JSON.parse(json).version).toBe(6);
  const restored=parseBackup(json);expect(restored[0].refundPayments).toEqual(payments);
  expect(planImport([s],restored).skipped).toBe(1);
  expect(backupFieldValue(restored[0],'refundPayments')).toContain('still owed GBP 52.50');
  const old=JSON.parse(json);old.version=5;expect(()=>parseBackup(JSON.stringify(old))).toThrow(/version 6/);
 });
 it('makes different credit histories an explicit whole-purchase backup choice',()=>{
  const s=saved();const changed=planRefund([s],s,{...draft,payments:{...payments,credits:[]}})[0];
  const plan=planImport([s],[changed]);expect(plan.conflicts).toBe(1);expect(plan.rows[0].changedFields).toContain('refundPayments');
  expect(planResolvedImport([s],[changed],new Map([[s.id,'keep']])).next[0].refundPayments).toEqual(payments);
  expect(planResolvedImport([s],[changed],new Map([[s.id,'replace']])).next[0].refundPayments!.credits).toEqual([]);
 });
 it('preserves payments through purchase edits and removes them only with explicit stop tracking',()=>{
  const s=saved();expect(previewEdit(s,{...editDraft(s),merchant:'Harbour Outfitters'}).order.refundPayments).toEqual(payments);
  const cleared=planRefund([s],s,null)[0];expect(cleared.refundPayments).toBeUndefined();expect(cleared.merchant).toBe('Harbour');
 });
 it('rejects invalid recorded dates, duplicated entry identities, and rounded input',()=>{
  expect(()=>parseRefundMoney('1.999')).toThrow();
  expect(validRefundPayments({...payments,credits:[{...payments.credits[0],date:'2026-02-30'}]})).toBe(false);
  expect(validRefundPayments({...payments,credits:[payments.credits[0],payments.credits[0]]})).toBe(false);
 });
});
