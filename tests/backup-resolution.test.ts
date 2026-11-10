import { expect, test } from 'vitest';
import { planResolvedImport } from '../src/backup-resolution';
import { planImport } from '../src/backup';
import type { Order } from '../src/store';
const order = (id: string): Order => ({id,merchant:id,orderNo:id,total:'£42',orderDate:'2026-11-02',windowDays:30,windowSource:'user',createdAt:'2026-11-02T12:00:00Z'});
const awaiting = {...order('coat'),refundState:'awaiting' as const,refundAmount:'£28',refundNote:'Returned scarf',refundFollowUpDate:'2026-11-16',refundUpdatedAt:'2026-11-03T12:00:00Z'};
const received = {...awaiting,refundState:'received' as const,refundNote:'Bank checked',refundUpdatedAt:'2026-11-10T12:00:00Z'};
test('new purchases can be explicitly applied while unreviewed differences stay current',()=>{
 const current=[awaiting,order('local-only')], incoming=[received,order('new')];
 const plan=planResolvedImport(current,incoming);
 expect(plan.conflicts).toBe(1);expect(plan.added).toBe(1);expect(plan.replaced).toBe(0);
 expect(plan.next.map(o=>o.id)).toEqual(['coat','local-only','new']);
 expect(plan.next[0].refundState).toBe('awaiting');
 expect(planImport(current,incoming).next).toHaveLength(2);
});
test('explicit use-backup replaces the complete reviewed purchase and preserves others',()=>{
 const plan=planResolvedImport([awaiting,order('local-only')],[received,order('new')],new Map([['coat','replace']]));
 expect(plan.replaced).toBe(1);expect(plan.conflicts).toBe(0);expect(plan.next[0]).toEqual(received);
 expect(plan.next[1].id).toBe('local-only');
});
test('keep-current permits additions and never silently merges refund money or notes',()=>{
 const plan=planResolvedImport([awaiting],[{...received,total:'£94'},order('new')],new Map([['coat','keep']]));
 expect(plan.kept).toBe(1);expect(plan.next[0]).toEqual(awaiting);expect(plan.next).toHaveLength(2);
});
test('a changed current purchase changes the review snapshot even with same choice',()=>{
 const choices=new Map([['coat','replace' as const]]);
 const before=planResolvedImport([awaiting],[received],choices);
 const after=planResolvedImport([{...awaiting,refundNote:'New home note'}],[received],choices);
 expect(after.snapshot).not.toBe(before.snapshot);
});
