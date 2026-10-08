import { daysLeft, dueDate, todayISO } from './deadline';
import { buildIcsCalendar, type CalendarReminder } from './ics';
import type { Order } from './store';
import { isCompleted } from './completion';

export type CalendarFilter = 'all' | 'due' | 'expired' | 'completed';
export type CalendarRow = {
  order: Order;
  due: string | null;
  left: number | null;
  problem: string | null;
};

export class CalendarBatchError extends Error {}

const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const MAX_CALENDAR_BYTES = 4 * 1024 * 1024;
const sizeError = () => new CalendarBatchError('This calendar is larger than 4 MiB. Select fewer returns.');

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1000) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function reminder(order: Order): CalendarReminder {
  if (isCompleted(order)) throw new CalendarBatchError('This return is completed. Reopen it before creating a new reminder.');
  if (typeof order.id !== 'string' || !order.id.length || order.id.length > 4096
      || /[\u0000-\u001f\u007f]/.test(order.id) || decoder.decode(encoder.encode(order.id)) !== order.id) {
    throw new CalendarBatchError('This return has an unsupported calendar identity.');
  }
  if (typeof order.merchant !== 'string' || order.merchant.length > 4096
      || (order.orderNo !== undefined && (typeof order.orderNo !== 'string' || order.orderNo.length > 4096))) {
    throw new CalendarBatchError('Store and order number must each be at most 4,096 characters.');
  }
  if (!isCalendarDate(order.orderDate)) {
    throw new CalendarBatchError('Correct the order date before exporting this return.');
  }
  if (!Number.isSafeInteger(order.windowDays) || order.windowDays < 1 || order.windowDays > 3_700_000) {
    throw new CalendarBatchError('Correct the return window to a positive whole number of days.');
  }
  const due = dueDate(order.orderDate, order.windowDays);
  if (!isCalendarDate(due) || !isCalendarDate(dueDate(due, 1))) {
    throw new CalendarBatchError('The calendar deadline must be before 9999-12-31.');
  }
  return { id: order.id, merchant: order.merchant, orderNo: order.orderNo, due };
}

/** Freeze the reviewed fields. Invalid records remain visible but unselectable. */
export function calendarRows(orders: readonly Order[], today = todayISO()): CalendarRow[] {
  if (orders.length > 2000) throw new CalendarBatchError('Export supports up to 2,000 saved returns at a time.');
  if (!isCalendarDate(today)) throw new CalendarBatchError('The current calendar date could not be read.');
  const counts = new Map<string, number>();
  for (const order of orders) counts.set(order.id, (counts.get(order.id) ?? 0) + 1);
  return orders.filter(value => !isCompleted(value)).map(value => {
    const order = { ...value };
    try {
      if (counts.get(order.id) !== 1) throw new CalendarBatchError('More than one saved return uses this calendar identity.');
      const { due } = reminder(order);
      return { order, due, left: daysLeft(due, today), problem: null };
    } catch (error) {
      return { order, due: null, left: null, problem: error instanceof Error ? error.message : 'This return cannot be exported.' };
    }
  }).sort((a, b) => compare(a.due ?? '~~~~', b.due ?? '~~~~') || compare(a.order.id, b.order.id));
}

export function initialCalendarSelection(rows: readonly CalendarRow[], filter: CalendarFilter): string[] {
  return rows.filter(row => !row.problem && (filter === 'all'
    || (filter === 'due' && row.left! >= 0 && row.left! <= 7)
    || (filter === 'expired' && row.left! < 0))).map(row => row.order.id);
}

const fingerprint = (order: Order) => JSON.stringify([
  order.id, order.merchant, order.orderNo ?? '', order.orderDate, order.windowDays,
]);

/** Recheck exactly the selected returns against storage before producing bytes. */
export function planCalendarBatch(
  current: readonly Order[], reviewed: readonly CalendarRow[], selectedIds: readonly string[], stamp = new Date(),
) {
  if (!selectedIds.length) throw new CalendarBatchError('Select at least one return to download.');
  const selected = new Set(selectedIds);
  if (selected.size !== selectedIds.length) throw new CalendarBatchError('A return cannot be included twice in one calendar.');
  if (!Number.isFinite(stamp.getTime()) || stamp.getUTCFullYear() < 1000 || stamp.getUTCFullYear() > 9999) {
    throw new CalendarBatchError('The calendar timestamp could not be read.');
  }
  const fresh = calendarRows(current, stamp.toISOString().slice(0, 10));
  for (const id of selected) {
    const before = reviewed.filter(row => row.order.id === id);
    const after = fresh.filter(row => row.order.id === id);
    if (before.length !== 1 || before[0].problem) throw new CalendarBatchError('A selected return was not ready for export. Reload and review it.');
    if (after.length !== 1 || after[0].problem || fingerprint(before[0].order) !== fingerprint(after[0].order)) {
      throw new CalendarBatchError('A selected return changed or was removed. Reload saved returns and review the selection before downloading.');
    }
  }
  const reminders = fresh.filter(row => selected.has(row.order.id)).map(row => reminder(row.order));
  // The title occurs in SUMMARY and the alarm DESCRIPTION. Escaping and line
  // folding cannot shorten these UTF-8 values, so reject a clearly oversized
  // selection before the serializer performs its per-character folding.
  const minimumBytes = reminders.reduce((bytes, value) => bytes + encoder.encode(value.id).byteLength
    + 2 * encoder.encode(`Return deadline: ${value.merchant || 'order'}${value.orderNo ? ' #' + value.orderNo : ''}`).byteLength, 0);
  if (minimumBytes > MAX_CALENDAR_BYTES) throw sizeError();
  const content = buildIcsCalendar(reminders, stamp);
  if (encoder.encode(content).byteLength > MAX_CALENDAR_BYTES) throw sizeError();
  return { content, count: reminders.length, reminders, filename: `returnby-reminders-${stamp.toISOString().slice(0, 10)}.ics` };
}
