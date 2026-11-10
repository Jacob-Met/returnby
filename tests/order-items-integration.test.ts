import { test as itemRestoreTest, expect as itemRestoreExpect } from 'vitest';
import { planResolvedImport, backupFieldLabel, backupFieldValue } from '../src/backup-resolution';
import { expect, test } from 'vitest';
import { exportBackup, parseBackup, planImport } from '../src/backup';
import { hasValidCompletion, planCompletion } from '../src/completion';
import { calendarRows, planSingleCalendar } from '../src/calendar-batch';
import { createChecklist, parseSavedOrders, renderChecklist } from '../src/trip-checklist';
import { alignTripPlan, orderSignature, planOrder, type TripPlan } from '../src/trip-plan';
import { planItemEdit, type OrderItem } from '../src/order-items';
import type { Order } from '../src/store';

const now = new Date('2026-11-10T19:00:00Z');
const purchase: Order = { id: 'PN-82', merchant: 'Harbor Supply', orderNo: 'HS-1042', total: '$147.00', orderDate: '2026-11-01', windowStartDate: '2026-11-05', windowDays: 30, windowSource: 'user', createdAt: '2026-11-02T10:00:00Z' };
const items: OrderItem[] = [
  { id: 'shirts', name: 'Blue linen shirt / M', quantity: 3, returned: 1, kept: 1 },
  { id: 'cup', name: 'Travel cup <small>', quantity: 1, returned: 0, kept: 0 },
];

test('partial item decisions remain portable, remindable and printable at the confirmed deadline', () => {
  const partial = planItemEdit([purchase], purchase, items, now).order;
  const backup = exportBackup([partial], now);
  expect(JSON.parse(backup).version).toBe(5);
  const restored = parseBackup(backup);
  expect(restored[0]).toEqual(partial);
  expect(planImport(restored, parseBackup(backup))).toMatchObject({ added: 0, skipped: 1, conflicts: 0 });
  expect(planSingleCalendar(restored, restored[0], now).content).toContain('20261205');
  const sheet = renderChecklist(createChecklist(parseSavedOrders(JSON.stringify(restored)), [purchase.id], '2026-12-01'));
  expect(sheet).toContain('1 × Blue linen shirt / M');
  expect(sheet).not.toContain('3 × Blue');
  expect(sheet).toContain('1 × Travel cup &lt;small&gt;');
  expect(sheet).toContain('2026-12-05');
});

test('whole-order finish respects earlier item decisions and removes only completed work from planning', () => {
  const partial = planItemEdit([purchase], purchase, items, now).order;
  const finished = planCompletion([partial], partial, 'returned', now).order;
  expect(finished.completionKind).toBe('mixed');
  expect(finished.items![0]).toMatchObject({ returned: 2, kept: 1 });
  expect(hasValidCompletion(finished)).toBe(true);
  expect(calendarRows([finished], '2026-11-10')).toEqual([]);
  expect(() => createChecklist(parseSavedOrders(JSON.stringify([finished])), [purchase.id], '2026-11-11')).toThrow(/History/);
  const reopened = planCompletion([finished], finished, 'reopen', now).order;
  expect(reopened.items).toEqual(items.map(item => ({ ...item, returned: 0, kept: 0 })));
  expect(hasValidCompletion(reopened)).toBe(true);
  expect(planSingleCalendar([reopened], reopened, now).content).toContain('20261205');
});

test('backup conflicts name item changes instead of treating every structurally equal array as different', () => {
  const partial = planItemEdit([purchase], purchase, items, now).order;
  const updated = planItemEdit([partial], partial, [{ ...items[0], kept: 2 }, items[1]], now).order;
  const plan = planImport([partial], [updated]);
  expect(plan.conflicts).toBe(1);
  expect(plan.rows[0].changedFields).toEqual(['items']);
  expect(plan.next).toEqual([partial]);
});

test('backups already exported by the confirmed-clock build keep their version1 start date', () => {
  const legacyFile = { schema: 'returnby.backup', version: 1, exportedAt: now.toISOString(), orders: [purchase] };
  expect(parseBackup(JSON.stringify(legacyFile))[0].windowStartDate).toBe('2026-11-05');
});

test('restored item quantities cannot turn closed history into active work silently', () => {
  const closed = planCompletion([purchase], purchase, 'returned', now).order;
  const bad = { ...closed, items };
  expect(hasValidCompletion(bad)).toBe(false);
  expect(() => exportBackup([bad], now)).toThrow(/completion/);
  const partial = planItemEdit([purchase], purchase, items, now).order;
  const file = JSON.parse(exportBackup([partial], now));
  file.version = 3;
  expect(() => parseBackup(JSON.stringify(file))).toThrow(/unsupported fields/);
});

test('new item quantities require repacking without discarding the shoppers trip notes', () => {
  const partial = planItemEdit([purchase], purchase, items, now).order;
  const plan: TripPlan = { version: 1, tripDate: '2026-11-12', orders: [{ ...planOrder(partial), packed: true, receiptReady: true, instructionsChecked: true, notes: 'Use the east entrance.' }] };
  const changed = planItemEdit([partial], partial, [{ ...items[0], returned: 0 }, items[1]], now).order;
  const aligned = alignTripPlan(plan, parseSavedOrders(JSON.stringify([changed])));
  expect(aligned.changed).toEqual(['Harbor Supply']);
  expect(aligned.plan.orders[0]).toMatchObject({ packed: false, receiptReady: true, instructionsChecked: false, notes: 'Use the east entrance.' });
  expect(orderSignature(purchase)).toBe(JSON.stringify([purchase.merchant, purchase.orderNo, purchase.orderDate, purchase.windowStartDate, purchase.windowDays, purchase.windowSource, purchase.createdAt]));
});

test('item backup export removes extra local receipt data without losing reviewed quantities', () => {
  const partial = planItemEdit([purchase], purchase, items, now).order;
  const unsafe = { ...partial, rawEmail: 'PRIVATE EMAIL', items: partial.items!.map(item => ({ ...item, rawReceipt: 'PRIVATE RECEIPT' })) };
  const exported = exportBackup([unsafe], now);
  expect(exported).not.toContain('PRIVATE');
  expect(parseBackup(exported)[0].items).toEqual(items);
});

itemRestoreTest('reviewed backup replacement exposes and retains item outcomes as a complete purchase', () => {
 const current = {id:'reviewed-items',merchant:'Harbour',orderDate:'2026-11-05',windowDays:30,windowSource:'user' as const,createdAt:'2026-11-05T10:00:00.000Z',items:[{id:'shirt',name:'Blue linen shirt',quantity:3,returned:1,kept:1}]};
 const incoming = {...current,items:[{...current.items[0],returned:2}],completionKind:'mixed' as const,completedAt:'2026-11-10T10:00:00.000Z'};
 const unresolved=planResolvedImport([current],[incoming]);
 itemRestoreExpect(unresolved.conflicts).toBe(1);
 itemRestoreExpect(unresolved.next[0].completedAt).toBeUndefined();
 itemRestoreExpect(backupFieldLabel('items')).toBe('Item decisions');
 itemRestoreExpect(backupFieldValue(current,'items')).toContain('1 still open · 1 returned · 1 kept');
 itemRestoreExpect(backupFieldValue(incoming,'items')).toContain('Blue linen shirt: 3 bought, 2 returned, 1 kept, 0 still open');
 itemRestoreExpect(backupFieldValue(incoming,'completionKind')).toBe('Returned & kept');
 const accepted=planResolvedImport([current],[incoming],new Map([['reviewed-items','replace']]));
 itemRestoreExpect(accepted.replaced).toBe(1);
 itemRestoreExpect(accepted.next[0]).toMatchObject(incoming);
});
