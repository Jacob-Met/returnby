import { describe, expect, it } from 'vitest';
import type { Order } from '../src/store';
import {
  assertSnapshotCurrent, buildChecklistHtml, ChecklistError, createChecklist,
  isSupportedDate, MAX_SAVED_BYTES, parseSavedOrders, readSavedOrders,
  renderChecklist, SAVED_ORDERS_KEY, tripTiming,
} from '../src/trip-checklist';

const base: Order = {
  id: 'demo-policy', merchant: 'Fictional Trail Shop', orderNo: 'DEMO-104',
  total: '$64.00', orderDate: '2026-10-03', windowDays: 30,
  windowSource: 'policy', createdAt: '2026-10-08T12:00:00.000Z',
};
const other: Order = {
  ...base, id: 'demo-default', merchant: 'Fictional Paper & Home',
  orderNo: 'EU-29', total: '€29,50', orderDate: '2026-09-25',
  windowDays: 14, windowSource: 'default',
};
const third: Order = {
  ...base, id: 'demo-user', merchant: 'Unused Fictional Order',
  total: '¥3,200', windowSource: 'user',
};
const snapshot = () => parseSavedOrders(JSON.stringify([base, other, third]));
const rawOrder = (changes: Record<string, unknown>) => JSON.stringify([{ ...base, ...changes }]);

describe('read-only saved-order admission', () => {
  it('reads exactly the existing key, keeping raw bytes and all three source attributions', () => {
    const raw = JSON.stringify([base, other, third], null, 2);
    const keys: string[] = [];
    const result = readSavedOrders({ getItem: key => { keys.push(key); return raw; } });
    expect(keys).toEqual([SAVED_ORDERS_KEY]);
    expect(result.raw).toBe(raw);
    expect(result.orders.map(order => order.windowSource)).toEqual(['policy', 'default', 'user']);
    expect(result.orders).toEqual([base, other, third]);
    expect(Object.isFrozen(result.orders[0])).toBe(true);
  });
  it('distinguishes absent storage from malformed empty data', () => {
    expect(parseSavedOrders(null).orders).toEqual([]);
    expect(parseSavedOrders('[]').orders).toEqual([]);
    expect(() => parseSavedOrders('')).toThrow('not readable JSON');
  });
  it('makes a storage access failure actionable without trying any write', () => {
    expect(() => readSavedOrders({ getItem: () => { throw new DOMException('blocked', 'SecurityError'); } }))
      .toThrow('Allow this site to read browser storage');
  });
  it.each(['{', '{}', 'null', '[null]', '[[]]'])('refuses unreadable list %s without dropping it', raw => {
    expect(() => parseSavedOrders(raw)).toThrow(ChecklistError);
  });
  it('refuses duplicate IDs instead of selecting the wrong order', () => {
    expect(() => parseSavedOrders(JSON.stringify([base, { ...other, id: base.id }]))).toThrow('repeated identifier');
  });
  it.each([
    { id: '' }, { merchant: 12 }, { total: { value: 64 } }, { orderNo: null },
    { windowSource: 'guessed' }, { createdAt: null },
    { windowDays: 0 }, { windowDays: -1 }, { windowDays: 2.5 },
    { windowDays: Number.MAX_SAFE_INTEGER }, { orderDate: '2026-02-30' },
    { orderDate: '0099-01-01' }, { orderDate: '9999-12-31', windowDays: 1 },
  ])('refuses unsupported stored facts %j', changes => {
    expect(() => parseSavedOrders(rawOrder(changes))).toThrow(ChecklistError);
  });
  it('refuses a JSON numeric overflow in the saved window', () => {
    const raw = rawOrder({ windowDays: 30 }).replace('"windowDays":30', '"windowDays":1e400');
    expect(() => parseSavedOrders(raw)).toThrow('cannot calculate');
  });
  it('retains optional missing fields and blank merchant rather than inventing facts', () => {
    const order = { ...base } as Partial<Order>;
    delete order.orderNo; delete order.total; order.merchant = '';
    const result = parseSavedOrders(JSON.stringify([order]));
    const html = renderChecklist(createChecklist(result, [base.id], '2026-10-10', '2026-10-08'));
    expect(html.match(/Not recorded/g)).toHaveLength(3);
    expect(html).not.toContain('$0');
  });
  it('limits actual UTF-8 bytes and record count before rendering', () => {
    expect(() => parseSavedOrders(' '.repeat(MAX_SAVED_BYTES + 1))).toThrow('2 MiB');
    expect(() => parseSavedOrders(JSON.stringify(Array.from({ length: 2001 }, (_, i) => ({ ...base, id: String(i) })))))
      .toThrow('2,000');
    expect(() => parseSavedOrders(rawOrder({ merchant: 'x'.repeat(4097) }))).toThrow('merchant');
  });
});

describe('trip selection and unchanged date arithmetic', () => {
  it('selects only requested IDs, orders by deadline, preserves raw money strings and does not mutate records', () => {
    const source = snapshot();
    const before = JSON.stringify(source);
    const plan = createChecklist(source, [base.id, other.id], '2026-10-10', '2026-10-08');
    expect(plan.orders.map(item => [item.order.id, item.order.total, item.due])).toEqual([
      [other.id, '€29,50', '2026-10-09'], [base.id, '$64.00', '2026-11-02'],
    ]);
    expect(plan.orders.map(item => item.tripTiming)).toEqual([
      '1 day after the calculated deadline', '23 days before the calculated deadline',
    ]);
    expect(JSON.stringify(source)).toBe(before);
    expect(Object.isFrozen(plan.orders)).toBe(true);
  });
  it.each([{ ids: [] }, { ids: [base.id, base.id] }, { ids: ['missing'] }])('requires a nonempty unique current selection $ids', ({ ids }) => {
    expect(() => createChecklist(snapshot(), ids, '2026-10-10')).toThrow(ChecklistError);
  });
  it.each(['', '2026-2-03', '2026-02-29', '2026-13-01', '0099-01-01', '2026-10-08T12:00:00Z'])('rejects trip date %s', date => {
    expect(() => createChecklist(snapshot(), [base.id], date)).toThrow(ChecklistError);
  });
  it('supports leap days and the tracker’s date round trip', () => {
    expect(isSupportedDate('2028-02-29')).toBe(true);
    expect(isSupportedDate('0100-01-01')).toBe(false);
    expect(isSupportedDate('1000-01-01')).toBe(true);
    expect(isSupportedDate('9999-12-31')).toBe(true);
    const orders = parseSavedOrders(rawOrder({ orderDate: '2028-02-28', windowDays: 1 }));
    expect(createChecklist(orders, [base.id], '2028-02-29', '2028-02-28').orders[0].due).toBe('2028-02-29');
  });
  it('describes before/on/after without declaring return eligibility', () => {
    expect(tripTiming('2026-10-10', '2026-10-09')).toBe('1 day before the calculated deadline');
    expect(tripTiming('2026-10-10', '2026-10-10')).toBe('On the calculated deadline');
    expect(tripTiming('2026-10-10', '2026-10-12')).toBe('2 days after the calculated deadline');
  });
});

describe('preview freshness and printable artifact', () => {
  it('requires byte-identical current storage and refuses changes, even semantically identical reformatting', () => {
    const loaded = snapshot();
    expect(() => assertSnapshotCurrent(loaded, { getItem: () => loaded.raw })).not.toThrow();
    for (const raw of [null, '[]', JSON.stringify([base, other, third], null, 2)]) {
      expect(() => assertSnapshotCurrent(loaded, { getItem: () => raw })).toThrow('Refresh saved orders');
    }
    expect(() => assertSnapshotCurrent(loaded, { getItem: () => { throw new Error('blocked'); } })).toThrow('could not be read');
  });
  it('produces a self-contained escaped HTML document with the same reviewed sheet and blank checks', () => {
    const hostile = { ...base, merchant: '<script>window.sideEffect=1</script>', orderNo: 'A"><img src=x onerror=alert(1)>', total: 'USD 10 & EUR 7\n"quoted"' };
    const loaded = parseSavedOrders(JSON.stringify([hostile, other, third]));
    const plan = createChecklist(loaded, [base.id, other.id], '2026-10-10', '2026-10-08');
    const sheet = renderChecklist(plan);
    const html = buildChecklistHtml(plan);
    expect(html.startsWith('<!doctype html>\n')).toBe(true);
    expect(html).toContain(sheet);
    expect(html).toContain('&lt;script&gt;window.sideEffect=1&lt;/script&gt;');
    expect(html).toContain('A&quot;&gt;&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('USD 10 &amp; EUR 7\n&quot;quoted&quot;');
    expect(html).toContain('Saved policy window');
    expect(html).toContain('Saved default window');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<input');
    expect(html).not.toContain('src=' + '"');
    expect(html).not.toContain('Unused Fictional Order');
    expect(html).not.toContain(third.total);
    expect(html).not.toContain(base.createdAt);
    expect(html.match(/class="blank-check"/g)).toHaveLength(6);
    expect(html).toContain('does not confirm that a return is eligible');
    expect(html).toContain('not refund estimates');
    expect(html).toContain('@media print');
    expect(html).toContain('break-inside:avoid');
  });
  it('keeps the user-adjusted source label on an explicitly selected order', () => {
    expect(buildChecklistHtml(createChecklist(snapshot(), [third.id], '2026-10-10', '2026-10-08')))
      .toContain('30 days · User-adjusted window');
  });
});
