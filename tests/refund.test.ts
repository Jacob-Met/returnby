import {describe,it,expect} from 'vitest';
import {planRefund,hasValidRefund} from '../src/refund';
import {exportBackup,parseBackup,planImport} from '../src/backup';
import {previewEdit,editDraft} from '../src/edit';
import type {Order} from '../src/store';
const order:Order={id:'r1',merchant:'Paper & Pine',orderNo:'P-42',orderDate:'2026-11-01',windowDays:30,windowSource:'user',createdAt:'2026-11-01T12:00:00Z'};
const draft={state:'awaiting' as const,amount:'£24.00',followUpDate:'2026-11-18',note:'Only the blue shirt was returned.'};
describe('refund follow-through',()=>{
 it('tracks a partial refund without changing the deadline or purchase total',()=>{const [next]=planRefund([order],order,draft);expect(next.orderDate).toBe(order.orderDate);expect(next.windowDays).toBe(30);expect(next.refundAmount).toBe('£24.00');expect(next.total).toBeUndefined();});
 it('survives export and strict import, and an edit preserves notes',()=>{const [next]=planRefund([order],order,draft);expect(parseBackup(exportBackup([next]))).toEqual([{...next,orderNo:'P-42',total:''}]);expect(previewEdit(next,{...editDraft(next),merchant:'Paper & Pine Outlet'}).order.refundNote).toBe(draft.note);});
 it('does not silently overwrite changed notes from another tab',()=>{const [next]=planRefund([order],order,draft);expect(()=>planRefund([next],order,draft)).toThrow(/changed/);});
 it('distinguishes received records during backup conflict review',()=>{const [pending]=planRefund([order],order,draft);const [received]=planRefund([pending],pending,{...draft,state:'received'});expect(planImport([pending],[received]).rows[0].changedFields).toContain('refundState');});
 it('rejects malformed dates, states and orphaned details',()=>{expect(()=>planRefund([order],order,{...draft,followUpDate:'2026-02-30'})).toThrow();expect(hasValidRefund({refundAmount:'£4'})).toBe(false);expect(hasValidRefund({})).toBe(true);});
 it('removes only refund tracking and allows reopening received status',()=>{const [pending]=planRefund([order],order,draft);const [received]=planRefund([pending],pending,{...draft,state:'received'});expect(planRefund([received],received,draft)[0].refundState).toBe('awaiting');expect(planRefund([received],received,null)[0]).toEqual(order);});
});
