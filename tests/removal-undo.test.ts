import { expect, test } from 'vitest';
import { captureRemoval, planUndoRemoval } from '../src/removal-undo';
import type { Order } from '../src/store';

const order = (id: string): Order => ({ id, merchant: 'Fictional Shop', orderNo: `#${id}`,
  orderDate: '2026-10-01', windowDays: 45, windowSource: 'user', createdAt: '2026-10-01T15:00:00Z' });

test('restores only the captured return among the latest unrelated records', () => {
  const removed = order('removed');
  const capture = captureRemoval(removed, 1);
  const current = [order('new'), { ...order('edited'), windowDays: 60 }];
  const before = structuredClone(current);
  expect(planUndoRemoval(current, capture)).toEqual({
    kind: 'restore', orders: [current[0], removed, current[1]], order: removed,
  });
  expect(current).toEqual(before);
  expect(planUndoRemoval([], capture)).toEqual({ kind: 'restore', orders: [removed], order: removed });
});

test('snapshot keeps original reviewed data and nested stored fields after mutation', () => {
  const removed = { ...order('original'), extra: { notes: ['before'], flags: { a: true } } };
  const original = structuredClone(removed);
  const capture = captureRemoval(removed, 0);
  removed.id = 'mutated'; removed.extra.notes[0] = 'after'; removed.extra.flags.a = false;
  expect(Object.isFrozen(capture)).toBe(true);
  expect(planUndoRemoval([], capture)).toEqual({ kind: 'restore', orders: [original], order: original });
});

test('an exact existing record needs no insertion even with reordered JSON properties', () => {
  const removed = { ...order('existing'), extension: { a: [1, { x: 2, y: 3 }], b: true } };
  const existing = Object.fromEntries(Object.entries(removed).reverse()) as typeof removed;
  existing.extension = { b: true, a: [1, { y: 3, x: 2 }] };
  expect(planUndoRemoval([existing], captureRemoval(removed, 0))).toEqual({ kind: 'present', order: existing });
});

test('changed same-ID records and duplicates block restoration without mutation', () => {
  const removed = { ...order('same'), extension: { a: 1 } };
  const capture = captureRemoval(removed, 0);
  for (const current of [
    [{ ...removed, total: '' }],
    [{ ...removed, extension: { a: 2 } }],
    [removed, structuredClone(removed)],
  ]) {
    const before = structuredClone(current);
    expect(planUndoRemoval(current, capture)).toEqual({ kind: 'conflict' });
    expect(current).toEqual(before);
  }
});

test('planning repeatedly does not consume or alias the recovery after a failed save', () => {
  const original = order('kept');
  const capture = captureRemoval(original, 1);
  const first = planUndoRemoval([order('remote-one')], capture);
  if (first.kind !== 'restore') throw Error('Expected missing return');
  first.order.merchant = 'Not committed';
  const later = [order('remote-two'), order('remote-three')];
  expect(planUndoRemoval(later, capture)).toEqual({ kind: 'restore', orders: [later[0], original, later[1]], order: original });
});

test('the capture requires a real nonnegative storage position', () => {
  for (const index of [-1, 0.5, NaN, Infinity]) expect(() => captureRemoval(order('x'), index)).toThrow(RangeError);
});
