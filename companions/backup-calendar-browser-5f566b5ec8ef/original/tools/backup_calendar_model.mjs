import { createHash } from 'node:crypto';
import { registerHooks } from 'node:module';

// Existing browser modules use extensionless TypeScript imports. Resolve only
// those modules, only while admitting this consumer's original dependency graph.
const sourceRoot = new URL('../src/', import.meta.url).href;
const names = new Set(['./backup', './deadline', './calendar-batch', './ics', './completion', './store']);
const hook = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith(sourceRoot) && names.has(specifier)) {
      return nextResolve(specifier + '.ts', context);
    }
    return nextResolve(specifier, context);
  },
});
let parseBackup, calendarRows, planCalendarBatch;
try {
  ({ parseBackup } = await import('../src/backup.ts'));
  ({ calendarRows, planCalendarBatch } = await import('../src/calendar-batch.ts'));
} finally {
  hook.deregister();
}

const MAX_BYTES = 5 * 1024 * 1024;
const sha256 = value => createHash('sha256').update(value).digest('hex');
const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

function checkedTime(at) {
  if (typeof at !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(at)) {
    throw new Error('Use a canonical UTC timestamp: YYYY-MM-DDTHH:mm:ss.sssZ, years 1000–9999.');
  }
  const stamp = new Date(at);
  if (!Number.isFinite(stamp.getTime()) || stamp.toISOString() !== at) {
    throw new Error('The calendar timestamp is not a valid date and time.');
  }
  return stamp;
}

function admitted(bytes, at) {
  const stamp = checkedTime(at);
  if (!(bytes instanceof Uint8Array)) throw new Error('Backup input must be UTF-8 bytes.');
  if (bytes.byteLength > MAX_BYTES) throw new Error('Choose a backup no larger than 5 MiB.');
  // TextDecoder preserves an initial BOM here so the unchanged decoder decides
  // its admission, just as for a literal leading BOM in a chosen backup.
  const text = decoder.decode(bytes);
  const orders = parseBackup(text);
  const reviewed = calendarRows(orders, at.slice(0, 10));
  const document = JSON.parse(text);
  const byId = new Map(reviewed.map(row => [row.order.id, row]));
  const rows = orders.map((order, index) => {
    const completed = order.completedAt !== undefined;
    const row = byId.get(order.id);
    return {
      position: index + 1,
      id: order.id,
      merchant: order.merchant,
      orderNo: order.orderNo,
      orderDate: order.orderDate,
      windowDays: order.windowDays,
      windowSource: order.windowSource,
      completedAt: completed ? order.completedAt : null,
      status: completed ? 'completed' : row.problem ? 'blocked' : 'eligible',
      due: completed ? null : row.due,
      problem: completed ? 'This return is completed.' : row.problem,
    };
  });
  const inspection = {
    format: 'returnby.backup-calendar-inspection/1',
    source: { sha256: sha256(bytes), bytes: bytes.byteLength, version: document.version, exportedAt: document.exportedAt },
    at,
    total: rows.length,
    eligible: rows.filter(row => row.status === 'eligible').length,
    completed: rows.filter(row => row.status === 'completed').length,
    blocked: rows.filter(row => row.status === 'blocked').length,
    rows,
  };
  return { stamp, orders, reviewed, inspection };
}

/** Inspect one complete backup without changing its bytes or any saved state. */
export function inspectBackup(bytes, at) {
  return admitted(bytes, at).inspection;
}

/** Prepare selected reminders using the unchanged calendar admission/serializer. */
export function planBackupCalendar(bytes, ids, at) {
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 2000 ||
      ids.some(id => typeof id !== 'string' || id.length > 128 || !/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(id)) ||
      new Set(ids).size !== ids.length) {
    throw new Error('Choose 1–2,000 distinct saved IDs.');
  }
  const { stamp, orders, reviewed, inspection } = admitted(bytes, at);
  const planned = planCalendarBatch(orders, reviewed, ids, stamp);
  return { inspection, content: planned.content, reminders: planned.reminders, filename: planned.filename };
}
