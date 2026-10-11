import { describe, expect, it } from 'vitest';
import { applyMerge, BACKUP_FORMAT, BackupError, buildBackup, parseBackup, planMerge } from '../src/backup';
import { MAX_SAVED_BYTES, parseSavedOrders, SAVED_ORDERS_KEY } from '../src/trip-checklist';
import type { Order } from '../src/store';
const a: Order = { id: 'a', merchant: 'Fictional Trail', orderNo: 'A-104', total: '€29,50', orderDate: '2026-10-03', windowDays: 30, windowSource: 'user', createdAt: '2026-10-03T00:00:00.000Z' };
const b: Order = { ...a, id: 'b', merchant: 'Paper & Home', windowSource: 'default' };
const c: Order = { ...a, id: 'c', windowSource: 'policy' };
const stamp = '2026-10-10T23:00:00.000Z';
const snapshot = (orders: Order[] = []) => parseSavedOrders(JSON.stringify(orders));
const file = (orders: Order[] = [a], changes: Record<string, unknown> = {}) => JSON.stringify({ format: BACKUP_FORMAT, version: 1, exportedAt: stamp, orders, ...changes });
const store = (raw: string | null) => ({ raw, writes: 0, getItem(key: string) { expect(key).toBe(SAVED_ORDERS_KEY); return this.raw; }, setItem(key: string, value: string) { expect(key).toBe(SAVED_ORDERS_KEY); this.raw = value; this.writes++; } });

describe('portable approved-field backup', () => {
  it('round trips Unicode, literal currency, dates and window attribution', () => {
    const text = buildBackup(snapshot([a, b, c]), stamp);
    const backup = parseBackup(text);
    expect(backup.orders).toEqual([a, b, c]);
    expect(backup.exportedAt).toBe(stamp);
    expect(Object.isFrozen(backup.orders[0])).toBe(true);
  });
  it('exports an empty list as a valid backup', () => { expect(parseBackup(buildBackup(snapshot(), stamp)).orders).toEqual([]); });
  it('never exports unrecognized fields such as pasted email', () => {
    const source = parseSavedOrders(JSON.stringify([{ ...a, rawEmail: 'private original body', extra: { sensitive: true } }]));
    expect(buildBackup(source, stamp)).not.toContain('private original body');
    expect(buildBackup(source, stamp)).not.toContain('sensitive');
  });
  it('strips unknown fields from incoming orders rather than persisting them', () => {
    expect(parseBackup(file([{ ...a, rawEmail: 'not retained' } as Order])).orders).toEqual([a]);
  });
  it.each(['', '{', 'null', '[]', '12', '"file"'])('rejects invalid file %s', text => { expect(() => parseBackup(text)).toThrow(); });
  it.each([{ format: 'other' }, { version: 2 }, { version: '1' }, { exportedAt: '' }, { exportedAt: '2026-02-30T00:00:00.000Z' }, { orders: null }, { orders: {} }])('rejects invalid envelope %j', change => { expect(() => parseBackup(file([a], change))).toThrow(); });
  it.each([{ orderDate: '2026-02-30' }, { windowDays: -1 }, { windowDays: 1.5 }, { windowSource: 'guessed' }, { merchant: null }, { id: '' }])('refuses invalid saved fields %j', changes => { expect(() => parseBackup(file([{ ...a, ...changes } as Order]))).toThrow(); });
  it('checks actual UTF-8 bytes before JSON parsing', () => { expect(() => parseBackup('é'.repeat(MAX_SAVED_BYTES / 2 + 1))).toThrow('2 MiB'); });
  it('rejects duplicate identifiers inside a backup', () => { expect(() => parseBackup(file([a, a]))).toThrow('repeated identifier'); });
  it('requires a valid export timestamp when exporting', () => { expect(() => buildBackup(snapshot([a]), 'not-a-date')).toThrow(BackupError); });
});

describe('non-destructive merge preview and confirmation', () => {
  it('previews without writing or mutating the original snapshot', () => {
    const source = snapshot([a]); const before = JSON.stringify(source);
    const plan = planMerge(source, parseBackup(file([a, b])));
    expect(plan.added).toBe(1); expect(plan.skipped).toBe(1); expect(plan.conflicts).toEqual([]);
    expect(plan.orders).toEqual([a, b]); expect(JSON.stringify(source)).toBe(before);
    expect(Object.isFrozen(plan)).toBe(true);
  });
  it('appends new records in one write and leaves existing fields intact', () => {
    const source = snapshot([a]); const disk = store(source.raw);
    expect(applyMerge(planMerge(source, parseBackup(file([b, c]))), disk)).toBe(2);
    expect(disk.writes).toBe(1); expect(JSON.parse(disk.raw!)).toEqual([a, b, c]);
  });
  it('repeated restore is idempotent and does not make a write for exact duplicates', () => {
    const source = snapshot([a]); const disk = store(source.raw);
    expect(applyMerge(planMerge(source, parseBackup(file([a]))), disk)).toBe(0);
    expect(disk.raw).toBe(source.raw); expect(disk.writes).toBe(0);
  });
  it('blocks the entire import on an identifier conflict, including otherwise new records', () => {
    const source = snapshot([a]); const disk = store(source.raw);
    const plan = planMerge(source, parseBackup(file([{ ...a, windowDays: 14 }, b])));
    expect(plan.conflicts).toEqual(['a']);
    expect(() => applyMerge(plan, disk)).toThrow('Conflicting');
    expect(disk.writes).toBe(0); expect(disk.raw).toBe(source.raw);
  });
  it('handles equivalent records regardless of JSON property order', () => {
    const reversed = Object.fromEntries(Object.entries(a).reverse()) as Order;
    expect(planMerge(snapshot([a]), parseBackup(file([reversed]))).skipped).toBe(1);
  });
  it('rejects a stale preview without writing', () => {
    const source = snapshot([a]); const disk = store(JSON.stringify([a, c]));
    expect(() => applyMerge(planMerge(source, parseBackup(file([b]))), disk)).toThrow('changed after preview');
    expect(disk.writes).toBe(0); expect(JSON.parse(disk.raw!)).toEqual([a, c]);
  });
  it('can import into absent browser storage', () => {
    const source = parseSavedOrders(null); const disk = store(null);
    expect(applyMerge(planMerge(source, parseBackup(file([a]))), disk)).toBe(1);
    expect(JSON.parse(disk.raw!)).toEqual([a]);
  });
  it('refuses malformed existing storage instead of repairing or replacing it', () => {
    const source = snapshot([a]); const disk = store('{malformed');
    expect(() => applyMerge(planMerge(source, parseBackup(file([b]))), disk)).toThrow();
    expect(disk.writes).toBe(0); expect(disk.raw).toBe('{malformed');
  });
  it('reports quota denial without claiming success', () => {
    const source = snapshot([a]); let attempted = 0;
    const disk = { getItem: () => source.raw, setItem: () => { attempted++; throw new DOMException('quota', 'QuotaExceededError'); } };
    expect(() => applyMerge(planMerge(source, parseBackup(file([b]))), disk)).toThrow('could not save');
    expect(attempted).toBe(1); expect(disk.getItem()).toBe(source.raw);
  });
  it('reports denied storage reads without trying a write', () => {
    let writes = 0;
    expect(() => applyMerge(planMerge(snapshot(), parseBackup(file([a]))), { getItem: () => { throw Error('denied'); }, setItem: () => { writes++; } })).toThrow('could not be read');
    expect(writes).toBe(0);
  });
  it('enforces the 2000-record combined limit before confirmation', () => {
    const source = snapshot(Array.from({ length: 2000 }, (_, i) => ({ ...a, id: 'existing-' + i })));
    expect(() => planMerge(source, parseBackup(file([b])))).toThrow('2,000');
  });
});
