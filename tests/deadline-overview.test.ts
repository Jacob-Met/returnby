import { describe, expect, it } from 'vitest';
import fixture from '../tools/fixtures/deadline-overview-cases.json';
import { MAX_BACKUP_BYTES, MAX_BACKUP_ORDERS } from '../src/backup';
import {
  buildDeadlineOverview, OVERVIEW_PAGE_SIZE, shiftOverviewMonth,
} from '../src/deadline-overview';
import type { Order } from '../src/store';

const today = '2026-10-08';
const order = (id: string, extra: Partial<Order> = {}): Order => ({
  id, merchant: 'Fictional store', orderNo: 'BOX-1', total: 'JPY 1200',
  orderDate: '2026-10-01', windowDays: 7, windowSource: 'user',
  createdAt: '2026-10-01T05:45:00+05:45', ...extra,
});
const records = (current: unknown, month = '2026-10') =>
  buildDeadlineOverview(current, month, today).days.flatMap(day => day.records);

describe('read-only saved-deadline month projection', () => {
  it.each(fixture.monthCases)('uses the fixed civil-month oracle for $month', sample => {
    const view = buildDeadlineOverview(fixture.backup.orders, sample.month, today);
    expect(view.days).toHaveLength(sample.days);
    expect(view.firstWeekday).toBe(sample.firstWeekday);
    expect(view.days.map(day => day.day)).toEqual(Array.from({ length: sample.days }, (_, i) => i + 1));
    expect(view.days.map(day => day.weekday)).toEqual(
      Array.from({ length: sample.days }, (_, i) => (sample.firstWeekday + i) % 7),
    );
    const counts = Object.fromEntries(view.days.filter(day => day.records.length)
      .map(day => [day.date, day.records.length]));
    expect(counts).toEqual(sample.counts);
    expect(view.activeDates).toBe(Object.keys(sample.counts).length);
    expect(view.monthTotal).toBe(Object.values(sample.counts).reduce<number>((sum, count) => sum + Number(count), 0));
    expect(view.total).toBe(43);
    expect(view.outsideMonth + view.monthTotal).toBe(view.total);
    expect(view.month).toBe(sample.month);
  });

  it('assigns all 43 frozen records exactly once to their independently authored deadline', () => {
    const months = [...new Set(Object.values(fixture.expectedDue).map(date => date.slice(0, 7)))];
    const result = months.flatMap(month => records(fixture.backup.orders, month));
    expect(result).toHaveLength(fixture.backup.orders.length);
    expect(new Set(result.map(row => row.order.id)).size).toBe(fixture.backup.orders.length);
    expect(Object.fromEntries(result.map(row => [row.order.id, row.due]))).toEqual(fixture.expectedDue);
    expect(result.find(row => row.order.id === fixture.backup.orders[1].id)?.due).toBe('9999-12-31');
  });

  it('detaches approved saved fields without rewriting literal text, amounts or timestamps', () => {
    const literal = order('literal', {
      merchant: ' 海 <img src=x onerror=alert(1)> Café 😀\nSecond line ',
      orderNo: '\uFEFF#箱,"A"', total: 'JPY 1234\nnot converted',
    });
    const current = [{ ...literal, pastedEmail: 'Must not appear in this view' }];
    Object.freeze(current[0]); Object.freeze(current);
    const [row] = records(current);
    expect(row.order).toEqual(literal);
    expect(Object.keys(row.order)).toEqual(fixture.nativeKeys);
    expect(row.order).not.toBe(current[0]);
    expect(row.order).not.toHaveProperty('pastedEmail');
    expect(current[0].pastedEmail).toBe('Must not appear in this view');
    const mutable = [order('snapshot')];
    const accepted = records(mutable)[0];
    mutable[0].merchant = 'Changed later';
    mutable[0].windowDays = 20;
    expect(accepted.order.merchant).toBe('Fictional store');
    expect(accepted.order.windowDays).toBe(7);
    expect(accepted.due).toBe('2026-10-08');
  });

  it('retains the native empty optional-field projection', () => {
    const saved = order('empty', { merchant: '', orderNo: undefined, total: undefined });
    const [row] = records([saved]);
    expect(row.order).toEqual({ ...saved, orderNo: '', total: '' });
    expect(row.order.merchant).toBe('');
    expect(saved.orderNo).toBeUndefined();
    expect(saved.total).toBeUndefined();
  });

  it('retains all 31 same-day records in stable identity order for bounded pages', () => {
    const shuffled = [...fixture.backup.orders].reverse();
    const view = buildDeadlineOverview(shuffled, '2026-11', today);
    const cluster = view.days.find(day => day.date === '2026-11-15')!.records;
    expect(OVERVIEW_PAGE_SIZE).toBe(fixture.pageSize);
    expect(cluster.map(row => row.order.id)).toEqual(fixture.clusterIds);
    expect(cluster.slice(0, OVERVIEW_PAGE_SIZE)).toHaveLength(20);
    expect(cluster.slice(OVERVIEW_PAGE_SIZE)).toHaveLength(11);
    expect(shuffled.map(row => row.id)).toEqual([...fixture.backup.orders].reverse().map(row => row.id));
  });

  it('uses the unchanged native urgency boundaries for the accepted local civil date', () => {
    const current = [-1, 0, 2, 3, 7, 8].map(left =>
      order('left-' + (left + 1), { windowDays: left + 7 }));
    expect(records(current).map(row => [row.left, row.status])).toEqual([
      [-1, 'expired'], [0, 'urgent'], [2, 'urgent'],
      [3, 'soon'], [7, 'soon'], [8, 'ok'],
    ]);
  });

  it('keeps honest empty and outside-month counts instead of suggesting missing data', () => {
    const empty = buildDeadlineOverview([], '2026-11', today);
    expect(empty.total).toBe(0);
    expect(empty.monthTotal).toBe(0);
    expect(empty.activeDates).toBe(0);
    expect(empty.outsideMonth).toBe(0);
    expect(empty.days.every(day => day.records.length === 0)).toBe(true);
    const other = buildDeadlineOverview([order('october')], '2026-11', today);
    expect(other.total).toBe(1);
    expect(other.monthTotal).toBe(0);
    expect(other.outsideMonth).toBe(1);
    expect(other.label).toBe('November 2026');
  });

  it('accepts the native 10,000-record collection and refuses the next record as a whole', () => {
    const current = Array.from({ length: MAX_BACKUP_ORDERS }, (_, i) => order('saved-' + i));
    expect(records(current)).toHaveLength(MAX_BACKUP_ORDERS);
    expect(() => records([...current, order('one-too-many')])).toThrow(/10,000/);
    expect(current).toHaveLength(MAX_BACKUP_ORDERS);
  });

  it('applies the native full-collection byte limit even when large records are outside the month', () => {
    const current = Array.from({ length: 500 }, (_, i) =>
      order('large-' + i, { merchant: '海'.repeat(4096) }));
    expect(new TextEncoder().encode(JSON.stringify(current)).byteLength).toBeGreaterThan(MAX_BACKUP_BYTES);
    const before = current.map(row => row.merchant);
    expect(() => records(current, '2026-11')).toThrow(/5 MiB/);
    expect(current.map(row => row.merchant)).toEqual(before);
  });

  it.each([
    { orderDate: '2026-02-30' }, { orderDate: '0999-12-31' }, { orderDate: '2026-1-1' },
    { windowDays: 0 }, { windowDays: -1 }, { windowDays: 1.5 }, { windowDays: Infinity },
    { orderDate: '9999-12-30', windowDays: 2 },
    { id: '' }, { id: 'bad\nidentity' }, { merchant: 'x'.repeat(4097) },
    { createdAt: '2026-10-01T12:00:00' }, { createdAt: '2026-02-30T12:00:00Z' },
  ])('refuses a late invalid record without returning a partial projection: %j', extra => {
    const current = [order('valid'), order('bad', extra)];
    const before = structuredClone(current);
    expect(() => buildDeadlineOverview(current, '2026-11', today)).toThrow();
    expect(current).toEqual(before);
  });

  it('refuses malformed collections and duplicate saved identities even outside the chosen month', () => {
    for (const input of [null, {}, '[]', [null], [order('same'), order('same')]]) {
      expect(() => buildDeadlineOverview(input, '2026-11', today)).toThrow();
    }
  });

  it.each(['', '2026-1', '0999-12', '10000-01', '2026-00', '2026-13', '2026-10-01'])(
    'refuses an unsupported requested month %j', month => {
      expect(() => buildDeadlineOverview([], month, today)).toThrow(/month/i);
      expect(() => shiftOverviewMonth(month, 1)).toThrow(/month/i);
    },
  );

  it('refuses an invalid urgency date before presenting a snapshot', () => {
    for (const invalid of ['', '2026-02-30', '0999-10-08', '2026-10-08T00:00:00Z']) {
      expect(() => buildDeadlineOverview([order('valid')], '2026-10', invalid)).toThrow(/current date/);
    }
  });

  it('crosses year boundaries in either direction and stops at the exact native range', () => {
    expect(shiftOverviewMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftOverviewMonth('2027-01', -1)).toBe('2026-12');
    expect(shiftOverviewMonth('1000-01', -1)).toBeNull();
    expect(shiftOverviewMonth('9999-12', 1)).toBeNull();
    expect(shiftOverviewMonth('1000-01', 1)).toBe('1000-02');
    expect(shiftOverviewMonth('9999-12', -1)).toBe('9999-11');
    expect(() => shiftOverviewMonth('2026-10', 0 as 1)).toThrow(/navigation/);
  });
});
