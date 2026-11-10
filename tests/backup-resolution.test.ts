import { expect, test } from 'vitest';
import { planResolvedImport, backupFieldLabel, backupFieldValue } from '../src/backup-resolution';
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


test.each(['returned', 'kept'] as const)('an unreviewed older active copy never reopens a %s purchase', completionKind => {
 const finished: Order = {...received, completionKind, completedAt:'2026-11-10T13:45:00Z', windowStartDate:'2026-11-04'};
 const active: Order = {...awaiting, windowStartDate:'2026-11-04'};
 const plan = planResolvedImport([finished], [active, order('new')]);
 expect(plan.conflicts).toBe(1);
 expect(plan.rows[0].changedFields).toEqual(expect.arrayContaining(['completionKind','completedAt','refundState']));
 expect(plan.rows[0].current).toEqual(finished);
 expect(plan.next).toEqual([finished, order('new')]);
 expect(plan.replaced).toBe(0);
});

test.each(['returned', 'kept'] as const)('choosing current keeps the complete %s record and refund', completionKind => {
 const finished: Order = {...received, completionKind, completedAt:'2026-11-10T13:45:00Z', windowStartDate:'2026-11-04'};
 const plan = planResolvedImport([finished], [awaiting], new Map([['coat','keep']]));
 expect(plan.kept).toBe(1);
 expect(plan.conflicts).toBe(0);
 expect(plan.next).toEqual([finished]);
});

test.each(['returned', 'kept'] as const)('only explicit replacement reopens a %s purchase from an active backup', completionKind => {
 const finished: Order = {...received, completionKind, completedAt:'2026-11-10T13:45:00Z'};
 const plan = planResolvedImport([finished], [awaiting], new Map([['coat','replace']]));
 expect(plan.replaced).toBe(1);
 expect(plan.next).toEqual([awaiting]);
 expect(plan.next[0]).not.toHaveProperty('completionKind');
 expect(plan.next[0]).not.toHaveProperty('completedAt');
 expect(plan.next[0].refundState).toBe('awaiting');
 expect(finished.completedAt).toBe('2026-11-10T13:45:00Z');
});

test.each(['returned', 'kept'] as const)('incoming %s history requires a choice and retains its exact outcome time', completionKind => {
 const finished: Order = {...received, completionKind, completedAt:'2026-11-10T13:45:00Z', windowStartDate:'2026-11-04'};
 const unreviewed = planResolvedImport([awaiting], [finished]);
 expect(unreviewed.conflicts).toBe(1);
 expect(unreviewed.next).toEqual([awaiting]);
 expect(planResolvedImport([awaiting], [finished], new Map([['coat','keep']])).next).toEqual([awaiting]);
 const replaced = planResolvedImport([awaiting], [finished], new Map([['coat','replace']]));
 expect(replaced.next).toEqual([finished]);
 expect(replaced.next[0].refundNote).toBe('Bank checked');
});

test('same completion time with a changed outcome is a reviewed conflict, not an identical record', () => {
 const returned: Order = {...awaiting, completionKind:'returned', completedAt:'2026-11-10T13:45:00Z'};
 const kept: Order = {...returned, completionKind:'kept'};
 const plan = planResolvedImport([returned], [kept]);
 expect(plan.conflicts).toBe(1);
 expect(plan.rows[0].changedFields).toEqual(['completionKind']);
 expect(plan.next).toEqual([returned]);
 expect(planResolvedImport([returned],[kept],new Map([['coat','replace']])).next).toEqual([kept]);
});

test('closing a purchase after preview changes the snapshot used to reject stale backup choices', () => {
 const choice = new Map([['coat','replace' as const]]);
 const before = planResolvedImport([awaiting], [received], choice);
 const finished: Order = {...awaiting, completionKind:'returned', completedAt:'2026-11-10T13:45:00Z'};
 const after = planResolvedImport([finished], [received], choice);
 expect(after.snapshot).not.toBe(before.snapshot);
 expect(after.rows[0].current).toEqual(finished);
});


test('backup comparison names active, explicit and legacy completion honestly', () => {
 const active=order('coat');
 const legacy: Order={...active,completedAt:'2026-11-10T13:45:00Z'};
 expect(backupFieldLabel('completionKind')).toBe('Return outcome');
 expect(backupFieldLabel('completedAt')).toBe('Outcome recorded');
 expect(backupFieldValue(active,'completionKind')).toBe('Active');
 expect(backupFieldValue(active,'completedAt')).toBe('Not finished');
 expect(backupFieldValue(legacy,'completionKind')).toBe('Completed');
 expect(backupFieldValue(legacy,'completedAt')).toBe('2026-11-10T13:45:00Z');
 expect(backupFieldValue({...legacy,completionKind:'returned'},'completionKind')).toBe('Returned');
 expect(backupFieldValue({...legacy,completionKind:'kept'},'completionKind')).toBe('Kept');
});
