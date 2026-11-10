import { alignTripPlan, emptyTripPlan, planOrder } from '../src/trip-plan';
import { captureRemoval, planUndoRemoval } from '../src/removal-undo';
import { expect, test } from 'vitest';
import { completionLabel, hasValidCompletion, planCompletion } from '../src/completion';
import { exportBackup, parseBackup, planImport } from '../src/backup';
import { calendarRows, planSingleCalendar } from '../src/calendar-batch';
import { buildDeadlineOverview } from '../src/deadline-overview';
import { parseSavedOrders, createChecklist } from '../src/trip-checklist';
import { previewEdit } from '../src/edit';
import type { Order } from '../src/store';

const now = new Date('2026-11-10T10:30:00Z');
const order = (id: string): Order => ({ id, merchant: 'North Coast Outfitters', orderNo: 'NC-' + id, total: '$68.00',
  orderDate: '2026-11-01', windowDays: 30, windowSource: 'user', createdAt: '2026-11-02T09:00:00Z' });

test.each(['returned', 'kept'] as const)('%s stays closed after backup, import and an unrelated edit, then reopens with the same reminder', kind => {
  const original = order('coat');
  const other = order('boots');
  const initialReminder = planSingleCalendar([original, other], original, now).content;
  const closed = planCompletion([original, other], original, kind, now);
  expect(closed.order).toMatchObject({ id: 'coat', completionKind: kind, completedAt: now.toISOString() });
  expect(completionLabel(closed.order)).toBe(kind === 'returned' ? 'Returned' : 'Kept');
  const backup = exportBackup(closed.next, now);
  expect(JSON.parse(backup).version).toBe(3);
  const restored = planImport([], parseBackup(backup)).next;
  expect(restored).toEqual(closed.next);
  expect(calendarRows(restored, '2026-11-10').map(row => row.order.id)).toEqual(['boots']);
  expect(() => planSingleCalendar(restored, original, now)).toThrow();
  expect(buildDeadlineOverview(restored, '2026-12', '2026-11-10')).toMatchObject({ total: 1, monthTotal: 1 });
  const snapshot = parseSavedOrders(JSON.stringify(restored));
  expect(() => createChecklist(snapshot, ['coat'], '2026-11-11')).toThrow(/History/);
  expect(createChecklist(snapshot, ['boots'], '2026-11-11').orders.map(row => row.order.id)).toEqual(['boots']);
  const edited = previewEdit(restored[0], { merchant: original.merchant, orderNo: original.orderNo!, total: '$62.00',
    orderDate: original.orderDate, windowDays: '30' }).order;
  expect(edited).toMatchObject({ completionKind: kind, completedAt: now.toISOString() });
  const reopened = planCompletion([edited, other], edited, 'reopen', now);
  expect(reopened.order).not.toHaveProperty('completedAt');
  expect(reopened.order).not.toHaveProperty('completionKind');
  expect(reopened.order).toMatchObject({ id: original.id, createdAt: original.createdAt, orderDate: original.orderDate, windowDays: original.windowDays });
  expect(planSingleCalendar(reopened.next, reopened.order, now).content).toBe(initialReminder);
});

test('a backup cannot silently lose the distinction between returned and kept', () => {
  const original = order('A');
  const returned = planCompletion([original], original, 'returned', now).order;
  const kept = { ...returned, completionKind: 'kept' as const };
  const conflict = planImport([returned], [kept, order('B')]);
  expect(conflict).toMatchObject({ conflicts: 1, next: [returned] });
  expect(conflict.rows[0].changedFields).toEqual(['completionKind']);
  const file = JSON.parse(exportBackup([returned], now));
  file.version = 2;
  expect(() => parseBackup(JSON.stringify(file))).toThrow(/unsupported fields/);
  expect(completionLabel({})).toBe('Completed');
});

test.each([
  { completionKind: 'returned' },
  { completedAt: now.toISOString(), completionKind: 'refunded' },
  { completedAt: 'not a date', completionKind: 'kept' },
])('contradictory closure records cannot become active orders during migration', marker => {
  const malformed = { ...order('A'), ...marker };
  expect(hasValidCompletion(malformed)).toBe(false);
  expect(() => exportBackup([malformed], now)).toThrow(/completion/);
  expect(() => parseSavedOrders(JSON.stringify([malformed]))).toThrow(/completion/);
});

test('a confirmed delivery clock survives finishing, portable history and reopening', () => {
  const delivered = { ...order('delivered'), windowStartDate: '2026-11-06', windowDays: 14 };
  const before = planSingleCalendar([delivered], delivered, now).content;
  expect(before).toContain('20261120');
  const activeBackup = exportBackup([delivered], now);
  expect(JSON.parse(activeBackup).version).toBe(2);
  expect(parseBackup(activeBackup)[0].windowStartDate).toBe('2026-11-06');
  const closed = planCompletion([delivered], delivered, 'returned', now);
  const portable = parseBackup(exportBackup(closed.next, now));
  expect(portable[0]).toMatchObject({ windowStartDate: '2026-11-06', completionKind: 'returned' });
  const tripSnapshot = parseSavedOrders(JSON.stringify(portable));
  expect(tripSnapshot.orders[0].windowStartDate).toBe('2026-11-06');
  expect(calendarRows(portable, '2026-11-10')).toEqual([]);
  const reopened = planCompletion(portable, portable[0], 'reopen', now);
  expect(planSingleCalendar(reopened.next, reopened.order, now).content).toBe(before);
});

test('finishing retires a saved trip selection but preserves packing notes through removal undo and reopening', () => {
  const original = order('trip-coat');
  const entry = { ...planOrder(original), packed: true, notes: 'Bring the QR code to the service desk.' };
  const trip = { ...emptyTripPlan('2026-11-11'), orders: [entry] };
  const closed = planCompletion([original], original, 'returned', now).order;
  const aligned = alignTripPlan(trip, parseSavedOrders(JSON.stringify([closed])));
  expect(aligned.plan.orders[0]).toMatchObject({ selected: false, packed: true, notes: entry.notes });
  expect(aligned.unavailable).toHaveLength(1);
  const removal = captureRemoval(closed, 0);
  const restored = planUndoRemoval([], removal);
  expect(restored.kind).toBe('restore');
  if (restored.kind !== 'restore') throw new Error('Expected an actual restored record');
  expect(restored.order).toEqual(closed);
  expect(calendarRows(restored.orders, '2026-11-10')).toEqual([]);
  const reopened = planCompletion(restored.orders, restored.order, 'reopen', now);
  const ready = alignTripPlan(aligned.plan, parseSavedOrders(JSON.stringify(reopened.next)));
  expect(ready.unavailable).toEqual([]);
  expect(ready.plan.orders[0]).toMatchObject({ selected: false, packed: true, notes: entry.notes });
});
