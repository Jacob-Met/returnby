import { expect, test } from 'vitest';
import { requestedDeadline, ordersForDeadline } from '../src/trip-deadline-handoff';
import type { Order } from '../src/store';
const order = (id: string, date: string, start?: string): Order => ({
  id, merchant: id, orderDate: date, windowDays: 30, windowSource: 'user', createdAt: '2026-11-01T00:00:00Z',
  ...(start ? { windowStartDate: start } : {}),
});
test('handoff admits exactly one real supported date and carries no order data', () => {
  expect(requestedDeadline('?deadline=2026-12-01')).toBe('2026-12-01');
  for (const query of ['', '?deadline=2026-02-30', '?deadline=999-01-01', '?deadline=2026-12-01&deadline=2026-12-02', '?deadline=<script>']) expect(requestedDeadline(query)).toBeNull();
});
test('day selection uses current confirmed clocks and excludes moved deadlines', () => {
  const original = order('A', '2026-11-01');
  const delivery = order('B', '2026-10-27', '2026-11-01');
  const other = order('C', '2026-11-02');
  expect(ordersForDeadline([original, delivery, other], '2026-12-01').map(o => o.id)).toEqual(['A', 'B']);
  expect(ordersForDeadline([{...original, windowDays: 45}, delivery, other], '2026-12-01').map(o => o.id)).toEqual(['B']);
});
