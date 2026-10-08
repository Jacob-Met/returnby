import { exportBackup, parseBackup, MAX_BACKUP_BYTES } from './backup';
import { dueDate } from './deadline';

export const MAX_SAVED_CSV_BYTES = MAX_BACKUP_BYTES;
export const SAVED_CSV_COLUMNS = Object.freeze([
  'Saved return ID', 'Store', 'Order number', 'Total (as entered)',
  'Order date', 'Return window (days)', 'Recorded window source',
  'Return deadline', 'Created at',
] as const);

export class SavedCsvError extends Error {}

export type SavedReturnsCsv = {
  content: string;
  filename: string;
  count: number;
  protectedCells: number;
  bytes: number;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

/** Build a read-only spreadsheet view of the current approved saved records. */
export function createSavedReturnsCsv(current: unknown, exportedAt = new Date()): SavedReturnsCsv {
  if (!Number.isFinite(exportedAt.getTime()) || exportedAt.getUTCFullYear() < 1000 || exportedAt.getUTCFullYear() > 9999) {
    throw new SavedCsvError('The CSV export timestamp could not be read.');
  }
  // Reuse the owner's complete admission and approved-field projection. Extra
  // local properties (including any accidental raw email) never reach this view.
  const saved = parseBackup(exportBackup(current, exportedAt));
  if (!saved.length) throw new SavedCsvError('Save a return before downloading a CSV.');
  const rows = saved.map(order => ({ order, due: dueDate(order.orderDate, order.windowDays) }))
    .sort((a, b) => compare(a.due, b.due) || compare(a.order.id, b.order.id));
  let protectedCells = 0;
  const cell = (value: string | number): string => {
    let text = String(value);
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text) || decoder.decode(encoder.encode(text)) !== text) {
      throw new SavedCsvError('Some saved text cannot be represented safely in CSV. Keep the JSON backup and correct that text before exporting.');
    }
    // CSV quoting alone does not stop a spreadsheet from treating an authored
    // value as a formula. Keep these cells literal and report the added prefix.
    if (/^[\s\u200b\ufeff]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) {
      text = "'" + text;
      protectedCells += 1;
    }
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const lines = [SAVED_CSV_COLUMNS.map(cell).join(',')];
  for (const { order, due } of rows) {
    lines.push([
      order.id, order.merchant, order.orderNo ?? '', order.total ?? '',
      order.orderDate, order.windowDays, order.windowSource, due, order.createdAt,
    ].map(cell).join(','));
  }
  const content = '\ufeff' + lines.join('\r\n') + '\r\n';
  const bytes = encoder.encode(content).byteLength;
  if (bytes > MAX_SAVED_CSV_BYTES) throw new SavedCsvError('This CSV is larger than 5 MiB. Keep the JSON backup.');
  return {
    content, bytes, count: rows.length, protectedCells,
    filename: `returnby-returns-${exportedAt.toISOString().slice(0, 10)}.csv`,
  };
}
