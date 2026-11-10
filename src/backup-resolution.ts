import { exportBackup, planImport, type ImportRow } from './backup';
import type { Order } from './store';
import { completionLabel, isCompleted } from './completion';

export type BackupChoice = 'keep' | 'replace';
export type ResolvedImportRow = Omit<ImportRow, 'action'> & {
  action: ImportRow['action'] | 'keep' | 'replace';
  current?: Order;
};
export function planResolvedImport(current: unknown, incoming: unknown, choices: ReadonlyMap<string, BackupChoice> = new Map()) {
  const base = planImport(current, incoming);
  const saved: Order[] = JSON.parse(base.snapshot);
  const byId = new Map(saved.map(order => [order.id, order]));
  const rows: ResolvedImportRow[] = base.rows.map(row => row.action !== 'conflict' ? row : {
    ...row, current: byId.get(row.order.id), action: choices.get(row.order.id) || 'conflict',
  });
  const replacements = new Map(rows.filter(row => row.action === 'replace').map(row => [row.order.id, row.order]));
  // Unreviewed differences stay current. The UI states this before explicit Apply.
  const next = [...saved.map(order => replacements.get(order.id) || order),
    ...rows.filter(row => row.action === 'add').map(row => row.order)];
  exportBackup(next, new Date('2000-01-01T00:00:00Z'));
  return {
    ...base, rows, next,
    conflicts: rows.filter(row => row.action === 'conflict').length,
    replaced: replacements.size,
    kept: rows.filter(row => row.action === 'keep').length,
  };
}
export type ResolvedImportPlan = ReturnType<typeof planResolvedImport>;

const labels: Record<string,string> = {
  fixedDeadline: 'Confirmed return-by date', completionKind: 'Return outcome', completedAt: 'Outcome recorded',
  merchant: 'Store', orderNo: 'Order number', total: 'Purchase total',
  orderDate: 'Purchase date', windowStartDate: 'Confirmed return clock starts',
  windowDays: 'Return window (days)', windowSource: 'Return rule source',
  createdAt: 'Purchase record created', refundState: 'Refund status',
  refundAmount: 'Expected refund', refundFollowUpDate: 'Next refund check',
  refundNote: 'Refund notes', refundUpdatedAt: 'Refund last updated',
};
export const backupFieldLabel = (key: string) => labels[key] || key.replace(/([A-Z])/g, ' $1');
export function backupFieldValue(order: Order, key: string): string {
  if (key === 'completionKind') return isCompleted(order) ? completionLabel(order) : 'Active';
  if (key === 'completedAt' && !isCompleted(order)) return 'Not finished';
  const value = (order as unknown as Record<string, unknown>)[key];
  if (value === undefined || value === '') return 'Not recorded';
  if (key === 'refundState') return value === 'received' ? 'Received — checked by you' : 'Awaiting refund';
  if (key === 'windowSource') return value === 'user' ? 'Your rule' : value === 'policy' ? 'Saved store rule' : 'Fallback estimate';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}
