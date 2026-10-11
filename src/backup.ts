import type { Order } from './store';
import { MAX_SAVED_BYTES, parseSavedOrders, readSavedOrders, SAVED_ORDERS_KEY, type SavedSnapshot } from './trip-checklist';

export const BACKUP_FORMAT = 'returnby-backup';
export class BackupError extends Error {
  constructor(message: string) { super(message); this.name = 'BackupError'; }
}
export type Backup = Readonly<{ format: typeof BACKUP_FORMAT; version: 1; exportedAt: string; orders: readonly Readonly<Order>[] }>;
export type MergePlan = Readonly<{ snapshot: SavedSnapshot; orders: readonly Readonly<Order>[]; added: number; skipped: number; conflicts: readonly string[] }>;
const checkSize = (text: string): void => {
  if (new TextEncoder().encode(text).byteLength > MAX_SAVED_BYTES) throw new BackupError('This backup exceeds the 2 MiB limit. No saved orders have changed.');
};
function validTimestamp(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
export function parseBackup(text: string): Backup {
  checkSize(text);
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new BackupError('Choose a ReturnBy JSON backup. This file is not readable JSON.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BackupError('This file is not a ReturnBy backup.');
  const row = value as Record<string, unknown>;
  if (row.format !== BACKUP_FORMAT || row.version !== 1) throw new BackupError('Unsupported backup format or version. Nothing has been imported.');
  if (!validTimestamp(row.exportedAt)) throw new BackupError('The backup export timestamp is invalid. Nothing has been imported.');
  const orders = parseSavedOrders(JSON.stringify(row.orders) ?? '').orders;
  return Object.freeze({ format: BACKUP_FORMAT, version: 1, exportedAt: row.exportedAt, orders });
}
export function buildBackup(snapshot: SavedSnapshot, exportedAt = new Date().toISOString()): string {
  if (!validTimestamp(exportedAt)) throw new BackupError('A valid export timestamp is required.');
  // Re-admit public input and include only approved Order fields, never raw emails or unknown properties.
  const orders = parseSavedOrders(JSON.stringify(snapshot.orders)).orders;
  const text = JSON.stringify({ format: BACKUP_FORMAT, version: 1, exportedAt, orders }, null, 2);
  checkSize(text);
  return text;
}
export function planMerge(snapshot: SavedSnapshot, backup: Backup): MergePlan {
  const existing = parseSavedOrders(JSON.stringify(snapshot.orders)).orders;
  const incoming = parseSavedOrders(JSON.stringify(backup.orders)).orders;
  const byId = new Map(existing.map(order => [order.id, order]));
  const additions: Readonly<Order>[] = [];
  const conflicts: string[] = [];
  let skipped = 0;
  for (const order of incoming) {
    const sameId = byId.get(order.id);
    if (!sameId) additions.push(order);
    else if (JSON.stringify(sameId) === JSON.stringify(order)) skipped++;
    else conflicts.push(order.id);
  }
  // Validate limits on the complete resulting list as well as each input separately.
  const orders = parseSavedOrders(JSON.stringify([...existing, ...additions])).orders;
  return Object.freeze({ snapshot, orders, added: additions.length, skipped, conflicts: Object.freeze(conflicts) });
}
export function applyMerge(plan: MergePlan, storage: Pick<Storage, 'getItem' | 'setItem'>): number {
  if (plan.conflicts.length) throw new BackupError('Conflicting saved identifiers require review. No orders were imported or overwritten.');
  const current = readSavedOrders(storage);
  if (current.raw !== plan.snapshot.raw) throw new BackupError('Saved orders changed after preview. Refresh and preview this backup again before importing.');
  const orders = parseSavedOrders(JSON.stringify(plan.orders)).orders;
  if (plan.added === 0) return 0;
  try { storage.setItem(SAVED_ORDERS_KEY, JSON.stringify(orders)); }
  catch { throw new BackupError('Browser storage could not save the import. Free storage or allow this site to save data, then preview again.'); }
  return plan.added;
}
