import { dueDate } from './deadline';
import type { Order } from './store';

export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
export const MAX_BACKUP_ORDERS = 10_000;
const LEGACY_ORDER_KEYS = ['id', 'merchant', 'orderNo', 'total', 'orderDate', 'windowDays', 'windowSource', 'createdAt'] as const;
const ORDER_KEYS = [...LEGACY_ORDER_KEYS, 'completedAt'] as const;
const encoder = new TextEncoder();
// Ordinary ISO export timestamps are always 24 bytes. Use the same envelope
// when checking portability without changing any saved record timestamps.
const SIZE_TIMESTAMP = '2000-01-01T00:00:00.000Z';

export class BackupError extends Error {}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BackupError(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

function onlyKeys(value: Record<string, unknown>, keys: readonly string[], label: string) {
  if (Object.keys(value).some(key => !keys.includes(key))) throw new BackupError(`${label} contains unsupported fields.`);
}

function text(value: unknown, label: string, limit = 4096): string {
  if (typeof value !== 'string' || value.length > limit) throw new BackupError(`${label} must be text of at most ${limit} characters.`);
  return value;
}

function isDate(value: unknown): value is string {
  // Native deadline/calendar formatting requires a four-digit numeric year.
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1000) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function timestamp(value: unknown, label: string): string {
  const s = text(value, label, 35);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(s) ||
      !isDate(s.slice(0, 10)) || !Number.isFinite(Date.parse(s)) || Number(s.slice(11, 13)) > 23) {
    throw new BackupError(`${label} must be a valid timestamp with a timezone.`);
  }
  return s;
}

function order(value: unknown, index: number, strict: boolean, version: 1 | 2): Order {
  const label = `Order ${index + 1}`;
  const row = object(value, label);
  if (strict) onlyKeys(row, version === 1 ? LEGACY_ORDER_KEYS : ORDER_KEYS, label);
  const id = text(row.id, `${label} ID`, 128);
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(id)) throw new BackupError(`${label} has an invalid ID.`);
  if (!isDate(row.orderDate)) throw new BackupError(`${label} has an invalid order date.`);
  if (!Number.isSafeInteger(row.windowDays) || (row.windowDays as number) < 1 || (row.windowDays as number) > 3_700_000 ||
      !isDate(dueDate(row.orderDate, row.windowDays as number))) throw new BackupError(`${label} has an invalid return window.`);
  if (!['policy', 'default', 'user'].includes(row.windowSource as string)) throw new BackupError(`${label} has an invalid window source.`);
  // Always construct the approved shape. Additional local properties, including
  // an accidentally retained email, can never be serialized by export.
  return {
    id,
    merchant: text(row.merchant, `${label} store`),
    orderNo: row.orderNo === undefined ? '' : text(row.orderNo, `${label} number`),
    total: row.total === undefined ? '' : text(row.total, `${label} total`),
    orderDate: row.orderDate,
    windowDays: row.windowDays as number,
    windowSource: row.windowSource as Order['windowSource'],
    createdAt: timestamp(row.createdAt, `${label} creation time`),
    ...(row.completedAt === undefined ? {} : { completedAt: timestamp(row.completedAt, `${label} completion time`) }),
  };
}

function orders(value: unknown, strict = true, version: 1 | 2 = 2): Order[] {
  if (!Array.isArray(value) || value.length > MAX_BACKUP_ORDERS) throw new BackupError(`Expected at most ${MAX_BACKUP_ORDERS.toLocaleString('en-US')} saved orders.`);
  const seen = new Set<string>();
  return value.map((value, index) => {
    const row = order(value, index, strict, version);
    if (seen.has(row.id)) throw new BackupError(`Order ${index + 1} repeats an ID in this list.`);
    seen.add(row.id);
    return row;
  });
}

function document(rows: Order[], exportedAt: string) {
  // Keep open-only backups readable by older versions. A completed record must
  // never be imported by an older reader as an ordinary active deadline.
  return { schema: 'returnby.backup', version: rows.some(row => row.completedAt !== undefined) ? 2 : 1, exportedAt, orders: rows };
}

function fits(output: string) { return encoder.encode(output).byteLength <= MAX_BACKUP_BYTES; }

function portable(rows: Order[], message: string) {
  if (!fits(JSON.stringify(document(rows, SIZE_TIMESTAMP)) + '\n')) throw new BackupError(message);
}

export function exportBackup(current: unknown, now = new Date()): string {
  const doc = document(orders(current, false), now.toISOString());
  let output = JSON.stringify(doc, null, 2) + '\n';
  // Formatting must not make an otherwise portable tracker impossible to
  // back up again after restoration.
  if (!fits(output)) output = JSON.stringify(doc) + '\n';
  if (!fits(output)) throw new BackupError('This backup is larger than the 5 MiB import limit.');
  return output;
}

export function parseBackup(input: string): Order[] {
  if (encoder.encode(input).byteLength > MAX_BACKUP_BYTES) throw new BackupError('Choose a backup no larger than 5 MiB.');
  let parsed: unknown;
  try { parsed = JSON.parse(input); } catch { throw new BackupError('This file is not valid JSON. Choose a ReturnBy backup.'); }
  const doc = object(parsed, 'Backup');
  if (doc.schema !== 'returnby.backup' || (doc.version !== 1 && doc.version !== 2)) throw new BackupError('This backup format or version is not supported.');
  onlyKeys(doc, ['schema', 'version', 'exportedAt', 'orders'], 'Backup');
  timestamp(doc.exportedAt, 'Backup export time');
  const rows = orders(doc.orders, true, doc.version);
  portable(rows, 'The normalized saved details would exceed the 5 MiB backup limit.');
  return rows;
}

export type ImportRow = { order: Order; action: 'add' | 'skip' | 'conflict'; changedFields: string[] };
export type ImportPlan = {
  rows: ImportRow[];
  added: number;
  skipped: number;
  conflicts: number;
  snapshot: string;
  next: Order[];
};

export function planImport(current: unknown, incoming: unknown): ImportPlan {
  const saved = orders(current);
  const imported = orders(incoming);
  const byId = new Map(saved.map(row => [row.id, row]));
  const rows: ImportRow[] = imported.map(row => {
    const old = byId.get(row.id);
    const changedFields = old ? ORDER_KEYS.filter(key => old[key] !== row[key]) : [];
    return { order: row, action: !old ? 'add' : changedFields.length ? 'conflict' : 'skip', changedFields };
  });
  const additions = rows.filter(row => row.action === 'add').map(row => row.order);
  if (saved.length + additions.length > MAX_BACKUP_ORDERS) throw new BackupError(`The combined tracker would exceed ${MAX_BACKUP_ORDERS.toLocaleString('en-US')} orders.`);
  const conflicts = rows.filter(row => row.action === 'conflict').length;
  const next = conflicts ? saved : [...saved, ...additions];
  if (!conflicts && additions.length) portable(next, 'The combined tracker would exceed the 5 MiB backup limit.');
  return {
    rows, added: additions.length, skipped: rows.filter(row => row.action === 'skip').length, conflicts,
    snapshot: JSON.stringify(saved),
    // A conflicted plan is never a partial-import payload.
    next,
  };
}
