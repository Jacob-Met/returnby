import { expect, test } from 'vitest';
import { isCompleted, isCompletionTimestamp, planCompletion, reviewedOpenReturn } from '../src/completion';
import { exportBackup, parseBackup, planImport } from '../src/backup';
import { calendarRows, initialCalendarSelection, planCalendarBatch } from '../src/calendar-batch';
import { planEdit } from '../src/edit';
import type { Order } from '../src/store';

const now = new Date('2026-10-08T12:34:56.000Z');
const order = (id = 'A', patch: Partial<Order> = {}): Order => ({
  id, merchant: 'Reviewed Shop', orderNo: 'REVIEWED-42', total: '$42.00', orderDate: '2026-10-01',
  windowDays: 45, windowSource: 'user', createdAt: '2026-10-01T09:10:11+03:00', ...patch,
});
const backup = (rows: unknown, version = 2) => JSON.stringify({ schema: 'returnby.backup', version, exportedAt: now.toISOString(), orders: rows });

test('complete and reopen preserve reviewed identity, field order, unrelated rows and source objects', () => {
  const original = Object.freeze({ ...order(), extension: Object.freeze({ retained: true }) });
  const other = Object.freeze(order('B'));
  const current = Object.freeze([other, original]);
  const before = JSON.stringify(current);
  const done = planCompletion(current, original, 'complete', now);
  expect(done.changed).toBe(true);
  expect(done.next[0]).toBe(other);
  expect(done.order).toEqual({ ...original, completedAt: now.toISOString() });
  expect(JSON.stringify(current)).toBe(before);
  expect(isCompleted(original)).toBe(false);
  const reopened = planCompletion(done.next, done.order, 'reopen', now);
  expect(reopened.order).toEqual(original);
  expect(reopened.next[0]).toBe(other);
  expect(JSON.stringify(reopened.order)).toBe(JSON.stringify(original));
  expect(done.order.completedAt).toBe(now.toISOString());
});

test('deliberate same-state repeats are no-write plans and keep the original completion time', () => {
  const completed = order('A', { completedAt: now.toISOString() });
  const same = planCompletion([completed], completed, 'complete', new Date('2026-10-09T01:00:00Z'));
  expect(same.changed).toBe(false);
  expect(same.order).toBe(completed);
  const open = order();
  expect(planCompletion([open], open, 'reopen', now)).toMatchObject({ changed: false, order: open });
});

test('stale, missing, duplicated and invalid completion targets refuse without a successor list', () => {
  const original = order();
  for (const current of [[], [order('B')], [original, original], [order('A', { total: '$9.00' })],
    [order('A', { completedAt: now.toISOString() })]]) {
    const before = JSON.stringify(current);
    expect(() => planCompletion(current, original, 'complete', now)).toThrow(/changed|selected/);
    expect(JSON.stringify(current)).toBe(before);
  }
  const invalid = order('A', { completedAt: 'not-a-date' });
  expect(() => planCompletion([invalid], invalid, 'reopen', now)).toThrow(/unsupported/);
  expect(() => planCompletion([original], original, 'complete', new Date(NaN))).toThrow(/date/);
});

test.each(['2026-02-30T12:00:00Z', '2026-10-08T24:00:00Z', '2026-10-08T12:34:56', '',
  '2026-10-08', '0999-10-08T12:00:00Z', '2026-10-08T12:00:00+25:00', null, false, 12])(
  'invalid completion time %s never becomes an open state', value => {
    expect(isCompletionTimestamp(value)).toBe(false);
    const row = { ...order(), completedAt: value };
    expect(isCompleted(row as Order)).toBe(true);
    expect(() => parseBackup(backup([order('B'), row]))).toThrow();
    expect(() => exportBackup([row], now)).toThrow();
  },
);

test('legacy active backups stay v1; completed v2 records survive approved projection and restore', () => {
  const active = order();
  expect(JSON.parse(exportBackup([active], now)).version).toBe(1);
  expect(parseBackup(backup([active], 1))).toEqual([active]);
  const done = order('B', { completedAt: '2026-10-08T15:34:56+03:00' });
  const output = exportBackup([active, { ...done, rawEmail: 'PRIVATE UNAPPROVED CONTENT' }], now);
  expect(output).not.toContain('PRIVATE');
  expect(JSON.parse(output).version).toBe(2);
  expect(parseBackup(output)).toEqual([active, done]);
  expect(planImport([], parseBackup(output)).next).toEqual([active, done]);
  expect(() => parseBackup(backup([done], 1))).toThrow(/unsupported fields/);
  expect(() => parseBackup(backup([{ ...done, arbitraryStatus: 'open' }]))).toThrow(/unsupported fields/);
  expect(() => parseBackup(backup([active], 3))).toThrow(/not supported/);
});

test('same-ID completion or reopening differences block the complete import instead of rewriting status', () => {
  const active = order();
  const done = { ...active, completedAt: now.toISOString() };
  for (const [saved, incoming] of [[active, done], [done, active], [done, { ...done, completedAt: '2026-10-09T12:00:00Z' }]]) {
    const plan = planImport([saved], [order('NEW'), incoming]);
    expect(plan.conflicts).toBe(1);
    expect(plan.rows[1].changedFields).toEqual(['completedAt']);
    expect(plan.next).toEqual([saved]);
  }
  expect(planImport([done], [done])).toMatchObject({ added: 0, skipped: 1, conflicts: 0, next: [done] });
});

test('both single and batch reminder plans refuse a selected return completed since review', () => {
  const active = order();
  const reviewed = calendarRows([active], '2026-10-08');
  const done = { ...active, completedAt: now.toISOString() };
  expect(() => reviewedOpenReturn([done], active)).toThrow(/changed/);
  expect(() => reviewedOpenReturn([done], done)).toThrow(/completed/);
  expect(() => planCalendarBatch([done], reviewed, ['A'], now)).toThrow(/changed or was removed/);
  expect(calendarRows([done], '2026-10-08')).toEqual([]);
  expect(initialCalendarSelection(reviewed, 'completed')).toEqual([]);
  const reopened = planCompletion([done], done, 'reopen', now).order;
  const after = planCalendarBatch([reopened], calendarRows([reopened], '2026-10-08'), ['A'], now);
  const before = planCalendarBatch([active], reviewed, ['A'], now);
  expect(after.content).toBe(before.content);
  expect(reviewedOpenReturn([reopened], reopened)).toBe(reopened);
});

test('the inherited editor preserves completed state and refuses an editor opened before completion', () => {
  const original = order();
  const done = { ...original, completedAt: now.toISOString() };
  const draft = { merchant: original.merchant, orderNo: original.orderNo!, total: '$51.00', orderDate: original.orderDate, windowDays: String(original.windowDays) };
  expect(() => planEdit([done], original, draft)).toThrow(/changed while you were editing/);
  const edited = planEdit([done], done, draft);
  expect(edited.next[0]).toEqual({ ...done, total: '$51.00' });
});
