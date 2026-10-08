import { describe, expect, test } from 'vitest';
import { BackupError, exportBackup, MAX_BACKUP_BYTES, MAX_BACKUP_ORDERS, parseBackup, planImport } from '../src/backup';
import type { Order } from '../src/store';

const now = new Date('2026-10-08T12:00:00.000Z');
const order = (id = 'A', patch: Partial<Order> = {}): Order => ({
  id, merchant: 'Fictional Shop', orderNo: 'AB-12', total: '$42.00', orderDate: '2026-10-01',
  windowDays: 30, windowSource: 'default', createdAt: '2026-10-01T09:10:11.000Z', ...patch,
});
const file = (rows: unknown, patch = {}) => JSON.stringify({
  schema: 'returnby.backup', version: 1, exportedAt: now.toISOString(), orders: rows, ...patch,
});

test('round trip preserves reviewed order fields, original IDs, dates and every window source', () => {
  const rows = (['policy', 'default', 'user'] as const).map((windowSource, i) => order(`order-${i}`, {
    windowSource, windowDays: i === 2 ? 47 : 30, merchant: 'Étoile & 家具', createdAt: '2026-10-01T12:10:11+03:00',
  }));
  const exported = JSON.parse(exportBackup(rows, now));
  expect(exported).toMatchObject({ schema: 'returnby.backup', version: 1, exportedAt: now.toISOString() });
  expect(parseBackup(exportBackup(rows, now))).toEqual(rows);
  expect(rows[2].windowSource).toBe('user');
});

test('export has an explicit field allowlist and cannot serialize accidentally retained raw email or credentials', () => {
  const output = exportBackup([{ ...order(), rawEmail: 'SECRET EMAIL BODY', credentials: { token: 'SECRET TOKEN' } }], now);
  expect(output).not.toContain('SECRET');
  expect(Object.keys(JSON.parse(output).orders[0]).sort()).toEqual(Object.keys(order()).sort());
  expect(parseBackup(output)).toEqual([order()]);
});

test('empty backups work and omitted optional details normalize deterministically', () => {
  expect(parseBackup(exportBackup([], now))).toEqual([]);
  const { total: _total, orderNo: _number, ...withoutOptional } = order();
  const result = planImport([withoutOptional], [order('A', { total: '', orderNo: '' })]);
  expect(result).toMatchObject({ added: 0, skipped: 1, conflicts: 0 });
  expect(parseBackup(file([withoutOptional]))).toEqual([order('A', { total: '', orderNo: '' })]);
});

test('an accepted near-limit backup can be exported again using compact JSON', () => {
  const rows = Array.from({ length: 8000 }, (_, i) => order(`order-${i}`, { merchant: 'M'.repeat(425), orderNo: '', total: '' }));
  const input = file(rows);
  expect(new TextEncoder().encode(input).byteLength).toBeLessThan(MAX_BACKUP_BYTES);
  expect(new TextEncoder().encode(JSON.stringify(JSON.parse(input), null, 2)).byteLength).toBeGreaterThan(MAX_BACKUP_BYTES);
  const output = exportBackup(parseBackup(input), now);
  expect(new TextEncoder().encode(output).byteLength).toBeLessThanOrEqual(MAX_BACKUP_BYTES);
  expect(parseBackup(output)).toEqual(rows);
});

test('normalizing omitted fields cannot admit a file that will no longer fit in a backup', () => {
  const rows = Array.from({ length: 8000 }, (_, i) => {
    const { total: _total, orderNo: _number, ...row } = order(`order-${i}`, { merchant: 'M'.repeat(495) });
    return row;
  });
  const input = file(rows);
  expect(new TextEncoder().encode(input).byteLength).toBeLessThan(MAX_BACKUP_BYTES);
  expect(() => parseBackup(input)).toThrow(/normalized.*5 MiB/);
});

test('two individually portable trackers cannot merge beyond the backup byte limit', () => {
  const rows = (prefix: string) => Array.from({ length: 5000 }, (_, i) => order(`${prefix}-${i}`, { merchant: 'M'.repeat(425), orderNo: '', total: '' }));
  const current = parseBackup(exportBackup(rows('saved'), now));
  const incoming = parseBackup(exportBackup(rows('incoming'), now));
  expect(() => planImport(current, incoming)).toThrow(/combined.*5 MiB/);
  expect(current).toHaveLength(5000);
});

describe('untrusted files are rejected completely', () => {
  test.each([
    ['unknown version', file([order()], { version: 2 })],
    ['string version', file([order()], { version: '1' })],
    ['foreign schema', file([order()], { schema: 'something-else' })],
    ['unknown root field', file([order()], { rawEmail: 'unexpected' })],
    ['missing export time', file([order()], { exportedAt: undefined })],
    ['non-array orders', file({ 0: order() })],
    ['null root', 'null'], ['array root', '[]'], ['broken JSON', '{bad'],
    ['duplicated IDs', file([order(), order()])],
    ['unknown order field', file([order(), { ...order('B'), rawEmail: 'unexpected' }])],
  ])('%s', (_name, input) => expect(() => parseBackup(input)).toThrow(BackupError));

  test.each([
    ['impossible date', { orderDate: '2026-02-30' }], ['non-leap day', { orderDate: '2025-02-29' }],
    ['missing date', { orderDate: undefined }], ['time in date', { orderDate: '2026-10-01T00:00:00Z' }],
    ['unsupported early year', { orderDate: '0999-12-31' }], ['overflow due date', { orderDate: '9999-12-31' }],
    ['zero days', { windowDays: 0 }], ['negative days', { windowDays: -1 }],
    ['fractional days', { windowDays: 1.5 }], ['string days', { windowDays: '30' }],
    ['boolean days', { windowDays: true }], ['huge days', { windowDays: 3_700_001 }],
    ['unknown attribution', { windowSource: 'verified-by-retailer' }], ['missing attribution', { windowSource: undefined }],
    ['invalid creation date', { createdAt: '2026-02-30T12:00:00Z' }],
    ['timestamp without timezone', { createdAt: '2026-10-01T12:00:00' }],
    ['24-hour timestamp', { createdAt: '2026-10-01T24:00:00Z' }],
    ['bad timezone', { createdAt: '2026-10-01T12:00:00+25:00' }],
    ['empty ID', { id: '' }], ['unsafe ID', { id: '<script>' }], ['too-long ID', { id: 'x'.repeat(129) }],
    ['numeric merchant', { merchant: 12 }], ['oversized text', { merchant: 'x'.repeat(4097) }],
    ['object total', { total: { amount: 12 } }], ['null order number', { orderNo: null }],
  ])('%s in a later row cannot yield a partial result', (_name, patch) => {
    expect(() => parseBackup(file([order(), { ...order('B'), ...patch }]))).toThrow(BackupError);
  });
});

test('size and count limits cover UTF-8 bytes, export, incoming and combined trackers', () => {
  expect(() => parseBackup('é'.repeat(MAX_BACKUP_BYTES / 2 + 1))).toThrow(/5 MiB/);
  const tooMany = Array.from({ length: MAX_BACKUP_ORDERS + 1 }, (_, i) => order(String(i)));
  expect(() => parseBackup(file(tooMany))).toThrow(/10,000/);
  expect(() => exportBackup(tooMany, now)).toThrow(/10,000/);
  expect(() => planImport(tooMany.slice(0, MAX_BACKUP_ORDERS), [order('extra')])).toThrow(/combined/);
  expect(() => exportBackup(Array.from({ length: 450 }, (_, i) => order(String(i), { merchant: '家'.repeat(4096) })), now)).toThrow(/5 MiB/);
});

test('new orders append in file order and repeat imports skip identical IDs without mutation', () => {
  const current = Object.freeze([Object.freeze(order('existing'))]);
  const incoming = Object.freeze([Object.freeze(order('B')), Object.freeze(order('existing')), Object.freeze(order('A'))]);
  const plan = planImport(current, incoming);
  expect(plan).toMatchObject({ added: 2, skipped: 1, conflicts: 0 });
  expect(plan.rows.map(row => row.action)).toEqual(['add', 'skip', 'add']);
  expect(plan.next.map(row => row.id)).toEqual(['existing', 'B', 'A']);
  expect(planImport(plan.next, incoming)).toMatchObject({ added: 0, skipped: 3, conflicts: 0 });
  expect(current).toHaveLength(1);
});

test.each([
  ['merchant', 'Different Store'], ['orderNo', 'Other order'], ['total', '$99.00'],
  ['orderDate', '2026-10-02'], ['windowDays', 31], ['windowSource', 'user'], ['createdAt', '2026-10-02T09:10:11Z'],
] as const)('same ID with changed %s blocks the entire payload without overwriting', (field, value) => {
  const current = [order()];
  const plan = planImport(current, [order('new'), { ...order(), [field]: value }]);
  expect(plan).toMatchObject({ added: 1, skipped: 0, conflicts: 1, next: current });
  expect(plan.rows[1]).toMatchObject({ action: 'conflict', changedFields: [field] });
  expect(current).toEqual([order()]);
});

test('existing invalid, duplicated or unknown data is never silently replaced during import', () => {
  for (const current of [null, {}, [order(), order()], [{ ...order(), windowSource: 'foreign' }], [{ ...order(), extra: 1 }]]) {
    expect(() => planImport(current, [order('new')])).toThrow(BackupError);
  }
});

test('calendar leap-day boundaries remain valid', () => {
  expect(parseBackup(file([order('leap', { orderDate: '2024-02-29', windowDays: 1 })]))[0].orderDate).toBe('2024-02-29');
});
