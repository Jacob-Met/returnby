import { REFUND_KEYS, hasValidRefund } from './refund';
import { dueDate, returnDueDate } from './deadline';
import type { Order } from './store';
import { parsePortableTrip, TripBackupError } from './trip-backup';
import type { TripPlan } from './trip-plan';

export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
export const MAX_BACKUP_ORDERS = 10_000;
const ORDER_KEYS = ['id', 'merchant', 'orderNo', 'total', 'orderDate', 'windowStartDate', 'windowDays', 'windowSource', 'createdAt', ...REFUND_KEYS] as const;
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

function order(value: unknown, index: number, strict: boolean): Order {
  const label = `Order ${index + 1}`;
  const row = object(value, label);
  if (strict) onlyKeys(row, ORDER_KEYS, label);
  const id = text(row.id, `${label} ID`, 128);
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(id)) throw new BackupError(`${label} has an invalid ID.`);
  if (!isDate(row.orderDate)) throw new BackupError(`${label} has an invalid order date.`);
  if (row.windowStartDate !== undefined && !isDate(row.windowStartDate)) throw new BackupError(`${label} has an invalid confirmed return-clock start date.`);
  if (!Number.isSafeInteger(row.windowDays) || (row.windowDays as number) < 1 || (row.windowDays as number) > 3_700_000 ||
      !isDate(returnDueDate({ orderDate: row.orderDate, windowStartDate: row.windowStartDate as string | undefined, windowDays: row.windowDays as number }))) throw new BackupError(`${label} has an invalid return window.`);
  if (!['policy', 'default', 'user'].includes(row.windowSource as string)) throw new BackupError(`${label} has an invalid window source.`);
  if (!hasValidRefund(row)) throw new BackupError(label + ' has invalid refund follow-up details.');
  // Always construct the approved shape. Additional local properties, including
  // an accidentally retained email, can never be serialized by export.
  return {
    id,
    ...(row.refundState === undefined ? {} : {refundState:row.refundState as Order['refundState'],refundAmount:row.refundAmount as string,refundFollowUpDate:row.refundFollowUpDate as string,refundNote:row.refundNote as string,refundUpdatedAt:row.refundUpdatedAt as string}),
    merchant: text(row.merchant, `${label} store`),
    orderNo: row.orderNo === undefined ? '' : text(row.orderNo, `${label} number`),
    total: row.total === undefined ? '' : text(row.total, `${label} total`),
    orderDate: row.orderDate,
    ...(row.windowStartDate === undefined ? {} : { windowStartDate: row.windowStartDate }),
    windowDays: row.windowDays as number,
    windowSource: row.windowSource as Order['windowSource'],
    createdAt: timestamp(row.createdAt, `${label} creation time`),
  };
}

function orders(value: unknown, strict = true): Order[] {
  if (!Array.isArray(value) || value.length > MAX_BACKUP_ORDERS) throw new BackupError(`Expected at most ${MAX_BACKUP_ORDERS.toLocaleString('en-US')} saved orders.`);
  const seen = new Set<string>();
  return value.map((value, index) => {
    const row = order(value, index, strict);
    if (seen.has(row.id)) throw new BackupError(`Order ${index + 1} repeats an ID in this list.`);
    seen.add(row.id);
    return row;
  });
}

function document(rows: Order[], exportedAt: string, trip?: TripPlan | null) {
  return { schema: 'returnby.backup', version: trip ? 2 : 1, exportedAt, orders: rows, ...(trip ? {trip} : {}) };
}

function fits(output: string) { return encoder.encode(output).byteLength <= MAX_BACKUP_BYTES; }

function portable(rows: Order[], message: string) {
  if (!fits(JSON.stringify(document(rows, SIZE_TIMESTAMP)) + '\n')) throw new BackupError(message);
}

export function exportBackup(current: unknown, now = new Date(), trip?: TripPlan | null): string {
  const doc = document(orders(current, false), now.toISOString(), trip ? parsePortableTrip(trip) : null);
  let output = JSON.stringify(doc, null, 2) + '\n';
  // Formatting must not make an otherwise portable tracker impossible to
  // back up again after restoration.
  if (!fits(output)) output = JSON.stringify(doc) + '\n';
  if (!fits(output)) throw new BackupError('This backup is larger than the 5 MiB import limit.');
  return output;
}

export function parseBackupDocument(input: string): {orders: Order[]; trip: TripPlan | null} {
  if (encoder.encode(input).byteLength > MAX_BACKUP_BYTES) throw new BackupError('Choose a backup no larger than 5 MiB.');
  let parsed: unknown;
  try { parsed = JSON.parse(input); } catch { throw new BackupError('This file is not valid JSON. Choose a ReturnBy backup.'); }
  const doc = object(parsed, 'Backup');
  if (doc.schema !== 'returnby.backup' || (doc.version !== 1 && doc.version !== 2)) throw new BackupError('This backup format or version is not supported.');
  onlyKeys(doc, doc.version === 2 ? ['schema', 'version', 'exportedAt', 'orders', 'trip'] : ['schema', 'version', 'exportedAt', 'orders'], 'Backup');
  timestamp(doc.exportedAt, 'Backup export time');
  const rows = orders(doc.orders);
  portable(rows, 'The normalized saved details would exceed the 5 MiB backup limit.');
  const trip = doc.version === 2 ? parsePortableTrip(doc.trip) : null;
  if (!fits(JSON.stringify(document(rows, SIZE_TIMESTAMP, trip)) + '\n')) throw new BackupError('The normalized trip and orders exceed the 5 MiB backup limit.');
  return {orders:rows, trip};
}

export function parseBackup(input: string): Order[] {
  try { return parseBackupDocument(input).orders; }
  catch(error) { if(error instanceof TripBackupError)throw new BackupError(error.message);throw error; }
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
