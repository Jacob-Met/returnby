import { expect, test } from 'vitest';
import { finishItemQuantities, hasValidItemState, itemTotals, parseOrderItems, planItemEdit, type ItemOrder, type OrderItem } from '../src/order-items';

const now = new Date('2026-11-10T19:00:00Z');
const base: ItemOrder = { id: 'order-1', merchant: 'Harbor Supply', orderNo: 'H-125', orderDate: '2026-11-01', windowStartDate: '2026-11-04', windowDays: 30, windowSource: 'user', total: '$120.00', createdAt: '2026-11-02T12:00:00Z' };
const line = (id: string, quantity = 1, returned = 0, kept = 0): OrderItem => ({ id, name: 'Cotton shirt ' + id, quantity, returned, kept });

test('a partial return keeps the original deadline active and preserves another purchase', () => {
  const other = { ...base, id: 'other', total: '$19.00' };
  const plan = planItemEdit([base, other], base, [line('a', 3, 1, 1)], now);
  expect(itemTotals(plan.order.items!)).toEqual({ quantity: 3, returned: 1, kept: 1, open: 1 });
  expect(plan.order.completedAt).toBeUndefined();
  expect(plan.order).toMatchObject({ id: base.id, windowStartDate: '2026-11-04', windowDays: 30, total: '$120.00' });
  expect(plan.next[1]).toBe(other);
  expect(hasValidItemState(plan.order)).toBe(true);
});

test('the final mixed decision moves the purchase to truthful mixed history', () => {
  const partial = planItemEdit([base], base, [line('a', 3, 1, 1)], now).order;
  const done = planItemEdit([partial], partial, [line('a', 3, 1, 2)], now).order;
  expect(done).toMatchObject({ completedAt: now.toISOString(), completionKind: 'mixed' });
  const renamed = planItemEdit([done], done, [{ ...done.items![0], name: 'Blue cotton shirt' }], new Date('2026-11-11T19:00:00Z')).order;
  expect(renamed.completedAt).toBe(now.toISOString());
  expect(hasValidItemState(renamed)).toBe(true);
});

test.each(['returned', 'kept'] as const)('all quantities %s produce that outcome', kind => {
  const item = { ...line('one', 2), [kind]: 2 };
  const result = planItemEdit([base], base, [item], now).order;
  expect(result.completionKind).toBe(kind);
  expect(hasValidItemState(result)).toBe(true);
});

test('correcting one decided item reopens the original purchase without erasing other decisions', () => {
  const done = planItemEdit([base], base, [line('a', 2, 1, 1), line('b', 1, 1)], now).order;
  const corrected = planItemEdit([done], done, [line('a', 2, 0, 1), line('b', 1, 1)], now).order;
  expect(corrected.completedAt).toBeUndefined();
  expect(corrected.completionKind).toBeUndefined();
  expect(corrected.items![1].returned).toBe(1);
  expect(itemTotals(corrected.items!).open).toBe(1);
});

test('a second-tab deadline correction cannot be overwritten by an older item review', () => {
  const updated = { ...base, windowDays: 14 };
  expect(() => planItemEdit([updated], base, [line('a')], now)).toThrow(/changed while/);
  expect(updated.windowDays).toBe(14);
});

test('whole-order decisions resolve only the remaining quantities', () => {
  const items = [line('a', 4, 1, 1), line('b', 1, 0, 1)];
  const returned = finishItemQuantities(items, 'returned');
  expect(returned).toEqual([line('a', 4, 3, 1), line('b', 1, 0, 1)]);
  expect(items[0]).toEqual(line('a', 4, 1, 1));
});

test.each([
  [line('a', 2, 2, 1)],
  [line('a', 1.5)],
  [line('a', 2, -1)],
  [{ ...line('a'), name: ' ' }],
  [line('a'), line('a')],
].map(items => ({ items })))('rejects impossible receipt quantities before saving', ({ items }) => {
  expect(() => parseOrderItems(items)).toThrow();
});

test('stored item facts cannot silently contradict active versus history status', () => {
  expect(hasValidItemState({ items: [line('a', 2, 1, 1)] })).toBe(false);
  expect(hasValidItemState({ items: [line('a', 2, 1, 0)], completedAt: now.toISOString(), completionKind: 'returned' })).toBe(false);
  expect(hasValidItemState({ items: [line('a', 2, 1, 1)], completedAt: now.toISOString(), completionKind: 'kept' })).toBe(false);
  expect(hasValidItemState({ completionKind: 'mixed', completedAt: now.toISOString() })).toBe(false);
});

test('item export admits only named fields and unchanged item reviews do not request a write', () => {
  const extra = { ...line('a'), rawEmail: 'PRIVATE RECEIPT' };
  expect(parseOrderItems([extra], false)[0]).not.toHaveProperty('rawEmail');
  expect(() => parseOrderItems([extra])).toThrow(/unsupported fields/);
  const saved = planItemEdit([base], base, [line('a')], now).order;
  expect(planItemEdit([saved], saved, saved.items, now).changed).toBe(false);
});
