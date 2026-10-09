import { parseBackup, MAX_BACKUP_BYTES } from '../original/src/backup.ts';
import { calendarRows, planCalendarBatch } from '../original/src/calendar-batch.ts';

const documents = new WeakMap();
const reviews = new WeakMap();
const encoder = new TextEncoder();
const freeze = value => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
function timestamp(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
      || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new Error('The review timestamp must be a valid canonical UTC time, years 1000–9999.');
  }
  return value;
}
function current(document) {
  const state = documents.get(document);
  if (!state) throw new Error('Choose and inspect a backup again before preparing reminders.');
  return state;
}
function selection(ids) {
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 2000
      || ids.some(id => typeof id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(id))
      || new Set(ids).size !== ids.length) throw new Error('Choose 1–2,000 distinct eligible saved IDs.');
  return [...ids];
}

/** Copy bytes before awaiting their digest. Native complete admission is unchanged. */
export async function inspectBackupFile(input, name, at) {
  if (!(input instanceof Uint8Array)) throw new Error('Choose UTF-8 backup bytes.');
  if (input.byteLength > MAX_BACKUP_BYTES) throw new Error('Choose a backup no larger than 5 MiB.');
  if (typeof name !== 'string' || name.length > 4096) throw new Error('The source filename is unsupported.');
  timestamp(at);
  const bytes = new Uint8Array(input);
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  const orders = parseBackup(text);
  const nativeRows = calendarRows(orders, at.slice(0, 10));
  const byId = new Map(nativeRows.map(row => [row.order.id, row]));
  const envelope = JSON.parse(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const source = { name, bytes: bytes.byteLength,
    sha256: Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join(''),
    version: envelope.version, exportedAt: envelope.exportedAt };
  const rows = orders.map((order, index) => {
    const completed = order.completedAt !== undefined;
    const native = byId.get(order.id);
    return { position: index + 1, ...order,
      status: completed ? 'completed' : native.problem ? 'blocked' : 'eligible',
      due: completed ? null : native.due,
      problem: completed ? 'This return is completed.' : native.problem };
  });
  const document = freeze({ kind: 'returnby.backup-calendar-browser/1', source, at, rows,
    total: rows.length, eligible: rows.filter(row => row.status === 'eligible').length,
    completed: rows.filter(row => row.status === 'completed').length,
    blocked: rows.filter(row => row.status === 'blocked').length });
  documents.set(document, { orders, nativeRows, epoch: 0 });
  return document;
}
export function retireCalendarReview(document) {
  const state = documents.get(document);
  if (state) state.epoch += 1;
}
export function retireBackup(document) {
  documents.delete(document);
}
export function prepareCalendar(document, ids) {
  const state = current(document);
  // Every preparation, including a refusal, retires an earlier review.
  state.epoch += 1;
  const selected = selection(ids);
  const planned = planCalendarBatch(state.orders, state.nativeRows, selected, new Date(document.at));
  const review = freeze({ source: document.source, at: document.at, selectedIds: selected,
    reminders: structuredClone(planned.reminders), filename: planned.filename,
    bytes: encoder.encode(planned.content).byteLength, content: planned.content });
  reviews.set(review, { document, epoch: state.epoch, ids: selected });
  return review;
}
export function calendarDownload(document, ids, review) {
  const state = current(document);
  const selected = selection(ids);
  const binding = reviews.get(review);
  if (!binding || binding.document !== document || binding.epoch !== state.epoch
      || selected.length !== binding.ids.length || selected.some((id, i) => id !== binding.ids[i])) {
    throw new Error('This selection changed. Preview the current reminders again before downloading.');
  }
  return { filename: review.filename, bytes: encoder.encode(review.content) };
}
