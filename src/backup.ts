import { parseTripLibrary, TripLibraryError, type TripLibrary } from './trip-library';
import {portablePending,type PendingPurchase} from './pending-delivery';
import { REFUND_KEYS, hasValidRefund } from './refund';
import { dueDate, returnDueDate } from './deadline';
import type { Order } from './store';
import { MAX_PHOTO_BACKUP_BYTES, validatePackedReceiptPhotos, type PackedReceiptPhoto } from './receipt-photo-backup';
import { hasValidCompletion } from './completion';
import { validCalendarRevision } from './calendar-revision';
import { validReturnEvidenceUrl } from './return-evidence';
import {validDeadlineRequirement,validMerchantArrivalDeadline} from './deadline-requirement';
import { parsePortableTrip, TripBackupError } from './trip-backup';
import type { TripPlan } from './trip-plan';

export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
export const MAX_BACKUP_ORDERS = 10_000;
const LEGACY_ORDER_KEYS = ['id', 'merchant', 'orderNo', 'total', 'orderDate', 'windowStartDate', 'fixedDeadline', 'windowDays', 'windowSource', 'createdAt', ...REFUND_KEYS] as const;
const COMPLETED_ORDER_KEYS = [...LEGACY_ORDER_KEYS, 'completedAt'] as const;
const ORDER_KEYS = [...COMPLETED_ORDER_KEYS, 'completionKind'] as const;
const RETURN_EVIDENCE_ORDER_KEYS = [...ORDER_KEYS, 'returnEvidenceUrl'] as const;
const REQUIREMENT_ORDER_KEYS = [...RETURN_EVIDENCE_ORDER_KEYS, 'deadlineRequirement'] as const;
const ARRIVAL_ORDER_KEYS = [...REQUIREMENT_ORDER_KEYS, 'merchantArrivalDeadline'] as const;
const CALENDAR_ORDER_KEYS = [...ARRIVAL_ORDER_KEYS, 'calendarRevision', 'calendarPreviousArrivalDate'] as const;
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

function order(value: unknown, index: number, strict: boolean, version: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11): Order {
  const label = `Order ${index + 1}`;
  const row = object(value, label);
  if (!hasValidCompletion(row)) throw new BackupError(label + ' has an invalid completion record.');
  if (!validCalendarRevision(row as Order)) throw new BackupError(label + ' has invalid calendar update details.');
  if (strict && version < 6 && row.refundPayments !== undefined) throw new BackupError(label + ' contains payment history requiring backup version 6.');
  if (strict) onlyKeys(row, version === 1 ? LEGACY_ORDER_KEYS : version === 2 ? COMPLETED_ORDER_KEYS : version === 11 ? CALENDAR_ORDER_KEYS : version === 10 ? ARRIVAL_ORDER_KEYS : version >= 8 ? REQUIREMENT_ORDER_KEYS : version === 7 ? RETURN_EVIDENCE_ORDER_KEYS : ORDER_KEYS, label);
  if (row.returnEvidenceUrl !== undefined && !validReturnEvidenceUrl(row.returnEvidenceUrl)) throw new BackupError(label + ' has an invalid HTTPS return document link.');
  if(row.deadlineRequirement!==undefined&&!validDeadlineRequirement(row.deadlineRequirement))throw new BackupError(label+' has an invalid deadline requirement.');
  const id = text(row.id, `${label} ID`, 128);
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(id)) throw new BackupError(`${label} has an invalid ID.`);
  if (!isDate(row.orderDate)) throw new BackupError(`${label} has an invalid order date.`);
  if (row.windowStartDate !== undefined && !isDate(row.windowStartDate)) throw new BackupError(`${label} has an invalid confirmed return-clock start date.`);
  if (row.fixedDeadline !== undefined && (!isDate(row.fixedDeadline) || row.fixedDeadline >= '9999-12-31' || row.fixedDeadline !== returnDueDate({orderDate:row.orderDate, windowStartDate:row.windowStartDate as string|undefined, windowDays:row.windowDays as number}))) throw new BackupError(label + ' has an inconsistent confirmed deadline.');
  if (!Number.isSafeInteger(row.windowDays) || (row.windowDays as number) < 1 || (row.windowDays as number) > 3_700_000 ||
      !isDate(returnDueDate({ orderDate: row.orderDate, windowStartDate: row.windowStartDate as string | undefined, windowDays: row.windowDays as number }))) throw new BackupError(`${label} has an invalid return window.`);
  if (!validMerchantArrivalDeadline(row.merchantArrivalDeadline, row.deadlineRequirement as Order['deadlineRequirement'], returnDueDate({orderDate:row.orderDate as string,windowStartDate:row.windowStartDate as string|undefined,windowDays:row.windowDays as number}))) throw new BackupError(label + ' has an invalid or contradictory merchant arrival deadline.');
  if (!['policy', 'default', 'user'].includes(row.windowSource as string)) throw new BackupError(`${label} has an invalid window source.`);
  if (!hasValidRefund(row)) throw new BackupError(label + ' has invalid refund follow-up details.');
  // Always construct the approved shape. Additional local properties, including
  // an accidentally retained email, can never be serialized by export.
  return {
    id,
    ...(row.refundState === undefined ? {} : {refundState:row.refundState as Order['refundState'],refundAmount:row.refundAmount as string,refundFollowUpDate:row.refundFollowUpDate as string,refundNote:row.refundNote as string,refundUpdatedAt:row.refundUpdatedAt as string}),
    ...(row.refundPayments === undefined ? {} : {refundPayments: structuredClone(row.refundPayments) as Order['refundPayments']}),
    merchant: text(row.merchant, `${label} store`),
    orderNo: row.orderNo === undefined ? '' : text(row.orderNo, `${label} number`),
    total: row.total === undefined ? '' : text(row.total, `${label} total`),
    ...(row.returnEvidenceUrl === undefined ? {} : {returnEvidenceUrl:row.returnEvidenceUrl as string}),
    ...(row.deadlineRequirement === undefined ? {} : {deadlineRequirement:row.deadlineRequirement as Order['deadlineRequirement']}),
    ...(row.merchantArrivalDeadline === undefined ? {} : {merchantArrivalDeadline:row.merchantArrivalDeadline as string}),
    ...(row.calendarRevision === undefined ? {} : {calendarRevision:row.calendarRevision as number}),
    ...(row.calendarPreviousArrivalDate === undefined ? {} : {calendarPreviousArrivalDate:row.calendarPreviousArrivalDate as string}),
    orderDate: row.orderDate,
    ...(row.windowStartDate === undefined ? {} : { windowStartDate: row.windowStartDate }),
    ...(row.fixedDeadline === undefined ? {} : {fixedDeadline:row.fixedDeadline as string}),
    windowDays: row.windowDays as number,
    windowSource: row.windowSource as Order['windowSource'],
    createdAt: timestamp(row.createdAt, `${label} creation time`),
    ...(row.completionKind === undefined ? {} : { completionKind: row.completionKind as Order['completionKind'] }),
    ...(row.completedAt === undefined ? {} : { completedAt: timestamp(row.completedAt, `${label} completion time`) }),
  };
}

function orders(value: unknown, strict = true, version: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 = 11): Order[] {
  if (!Array.isArray(value) || value.length > MAX_BACKUP_ORDERS) throw new BackupError(`Expected at most ${MAX_BACKUP_ORDERS.toLocaleString('en-US')} saved orders.`);
  const seen = new Set<string>();
  return value.map((value, index) => {
    const row = order(value, index, strict, version);
    if (seen.has(row.id)) throw new BackupError(`Order ${index + 1} repeats an ID in this list.`);
    seen.add(row.id);
    return row;
  });
}

function document(rows: Order[], exportedAt: string, trip?: TripPlan | null, pending: PendingPurchase[] = [], tripLibrary?: TripLibrary | null, photos: PackedReceiptPhoto[] = []) {
  // Existing mainline formats: v1 orders/confirmed clocks, v2 prepared trip, v3 pending
  // deliveries, v4 named trips. Explicit return outcomes use v5 so old readers
  // refuse them instead of silently reopening a finished purchase. Dated refund
  // credits use v6. Return document links use v7, so older readers must refuse
  // rather than silently discard the shopper's return handoff.
  // The action required by a date uses v8 to retain shipment versus arrival meaning.
  return { schema: 'returnby.backup',
    version: rows.some(row => row.calendarRevision !== undefined || row.calendarPreviousArrivalDate !== undefined) ? 11 : rows.some(row => row.merchantArrivalDeadline !== undefined) || pending.some(row => !!row.fields.merchantArrivalDeadline) ? 10 : photos.length ? 9 : rows.some(row => row.deadlineRequirement !== undefined) || pending.some(row => !!row.fields.deadlineRequirement) ? 8
      : rows.some(row => row.returnEvidenceUrl !== undefined) || pending.some(row => !!row.fields.returnEvidenceUrl) ? 7
      : rows.some(row => row.refundPayments !== undefined) ? 6 : rows.some(row => row.completionKind !== undefined) ? 5
      : tripLibrary?.trips.length ? 4 : pending.length ? 3
      : trip || rows.some(row => row.completedAt !== undefined) ? 2 : 1,
    exportedAt, orders: rows, ...(trip ? { trip } : {}),
    ...(pending.length ? { pending } : {}),
    ...(tripLibrary?.trips.length ? { tripLibrary } : {}), ...(photos.length ? {photos} : {}) };
}

function fits(output: string) { return encoder.encode(output).byteLength <= MAX_BACKUP_BYTES; }

function portable(rows: Order[], message: string) {
  if (!fits(JSON.stringify(document(rows, SIZE_TIMESTAMP)) + '\n')) throw new BackupError(message);
}

export function exportBackup(current: unknown, now = new Date(), trip?: TripPlan | null, pending:PendingPurchase[] = [], tripLibrary?:TripLibrary|null, photos: PackedReceiptPhoto[] = []): string {
  const rows = orders(current, false);
  const checkedPhotos = validatePackedReceiptPhotos(photos, rows);
  const doc = document(rows, now.toISOString(), trip ? parsePortableTrip(trip) : null, portablePending(pending), tripLibrary ? parseTripLibrary(tripLibrary) : null, checkedPhotos);
  let output = JSON.stringify(doc, null, 2) + '\n';
  // Formatting must not make an otherwise portable tracker impossible to
  // back up again after restoration.
  const maxBytes = checkedPhotos.length ? MAX_PHOTO_BACKUP_BYTES : MAX_BACKUP_BYTES;
  if (encoder.encode(output).byteLength > maxBytes) output = JSON.stringify(doc) + '\n';
  if (encoder.encode(output).byteLength > maxBytes) throw new BackupError(checkedPhotos.length ? 'This backup exceeds 96 MiB with original photos. Save some originals separately.' : 'This backup is larger than the 5 MiB import limit.');
  return output;
}

export function parseBackupDocument(input: string): {orders: Order[]; trip: TripPlan | null; pending?:PendingPurchase[]; tripLibrary?:TripLibrary; photos?:PackedReceiptPhoto[]} {
  if (encoder.encode(input).byteLength > MAX_PHOTO_BACKUP_BYTES) throw new BackupError('Choose a backup no larger than 96 MiB.');
  let parsed: unknown;
  try { parsed = JSON.parse(input); } catch { throw new BackupError(encoder.encode(input).byteLength > MAX_BACKUP_BYTES ? 'Choose a backup no larger than 5 MiB.' : 'This file is not valid JSON. Choose a ReturnBy backup.'); }
  const doc = object(parsed, 'Backup');
  if (doc.schema !== 'returnby.backup' || (doc.version !== 1 && doc.version !== 2 && doc.version !== 3 && doc.version !== 4 && doc.version !== 5 && doc.version !== 6 && doc.version !== 7 && doc.version !== 8 && doc.version !== 9 && doc.version !== 10 && doc.version !== 11)) throw new BackupError('This backup format or version is not supported.');
  if ((doc.version < 9 || (doc.version >= 10 && !Array.isArray(doc.photos))) && encoder.encode(input).byteLength > MAX_BACKUP_BYTES) throw new BackupError('Choose a backup no larger than 5 MiB.');
  onlyKeys(doc, doc.version >= 9 ? ['schema','version','exportedAt','orders','trip','pending','tripLibrary','photos'] : doc.version >= 4 ? ['schema', 'version', 'exportedAt', 'orders', 'trip', 'pending', 'tripLibrary']
    : doc.version === 3 ? ['schema', 'version', 'exportedAt', 'orders', 'trip', 'pending']
    : doc.version === 2 ? ['schema', 'version', 'exportedAt', 'orders', 'trip']
    : ['schema', 'version', 'exportedAt', 'orders'], 'Backup');
  timestamp(doc.exportedAt, 'Backup export time');
  const rows = orders(doc.orders, true, doc.version === 9 ? 8 : doc.version);
  let photos: PackedReceiptPhoto[] = [];
  try { photos = validatePackedReceiptPhotos(doc.version >= 9 && doc.photos !== undefined ? doc.photos : [], rows); }
  catch (error) { throw new BackupError(error instanceof Error ? error.message : 'Unreadable receipt photograph.'); }
  if (doc.version === 9 && !photos.length) throw new BackupError('A photo backup must include at least one receipt photograph.');
  if (doc.version >= 10 && !photos.length && encoder.encode(input).byteLength > MAX_BACKUP_BYTES) throw new BackupError('Choose a backup without photos no larger than 5 MiB.');
  portable(rows, 'The normalized saved details would exceed the 5 MiB backup limit.');
  const trip = doc.trip === undefined ? null : parsePortableTrip(doc.trip);
  // A pre-release v3 lifecycle backup had no pending collection. Keep it
  // readable, alongside the published v3 pending-delivery documents.
  if(doc.version<10 && Array.isArray(doc.pending) && doc.pending.some(row => row && row.fields && !!row.fields.merchantArrivalDeadline)) throw new BackupError('An additional merchant receipt deadline requires backup version 10.');
  if(doc.version<8 && Array.isArray(doc.pending) && doc.pending.some(row => row && row.fields && Object.prototype.hasOwnProperty.call(row.fields,'deadlineRequirement'))) throw new BackupError('Pending deadline requirements require backup version 8.');
  const pending = doc.version === 3 && doc.pending === undefined && rows.some(row => row.completedAt !== undefined)
    ? [] : doc.version >= 3 ? portablePending(doc.pending === undefined && doc.version >= 4 ? [] : doc.pending) : [];
  const tripLibrary = doc.version === 4 ? parseTripLibrary(doc.tripLibrary)
    : doc.version >= 5 && doc.tripLibrary !== undefined ? parseTripLibrary(doc.tripLibrary) : undefined;
  if (!fits(JSON.stringify(document(rows, SIZE_TIMESTAMP, trip, pending, tripLibrary)) + '\n')) throw new BackupError('The normalized trip and orders exceed the 5 MiB backup limit.');
  return { orders: rows, trip, ...(doc.pending !== undefined || doc.version >= 4 ? { pending } : {}), ...(tripLibrary ? { tripLibrary } : {}), ...(photos.length ? {photos} : {}) };
}

export function parseBackup(input: string): Order[] {
  try { return parseBackupDocument(input).orders; }
  catch(error) { if(error instanceof TripBackupError || error instanceof TripLibraryError)throw new BackupError(error.message);throw error; }
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
    const changedFields = old ? CALENDAR_ORDER_KEYS.filter(key => JSON.stringify(old[key]) !== JSON.stringify(row[key])) : [];
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
