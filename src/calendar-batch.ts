import { daysLeft, dueDate, returnDueDate, todayISO } from './deadline';
import { buildIcsCalendar, buildCancelledIcs, type CalendarReminder } from './ics';
import { deadlineCalendarTitle, validMerchantArrivalDeadline } from './deadline-requirement';
import type { Order } from './store';
import { isCompleted } from './completion';
import { DEFAULT_ALERT_SETTINGS, localCalendarDate, planCalendarAlert, type CalendarAlertSettings } from './calendar-alert';

export type CalendarFilter = 'all' | 'due' | 'expired' | 'completed';
export type CalendarRow = {
  order: Order;
  due: string | null;
  left: number | null;
  problem: string | null;
};

export class CalendarBatchError extends Error {}
export class CalendarAlertExpiredError extends CalendarBatchError {
  constructor() { super('An alert time or calendar day has passed while you reviewed. The times are refreshed; review them and download again.'); }
}

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
  if (order.windowStartDate !== undefined && !isCalendarDate(order.windowStartDate)) {
    throw new CalendarBatchError('Correct the confirmed return-clock start date before exporting this return.');
  }
  if (!Number.isSafeInteger(order.windowDays) || order.windowDays < 1 || order.windowDays > 3_700_000) {
    throw new CalendarBatchError('Correct the return window to a positive whole number of days.');
  }
  const due = returnDueDate(order);
  if (!isCalendarDate(due) || !isCalendarDate(dueDate(due, 1))) {
    throw new CalendarBatchError('The calendar deadline must be before 9999-12-31.');
  }
  if (order.fixedDeadline !== undefined && order.fixedDeadline !== due) throw new CalendarBatchError('Review the fixed deadline before exporting this return.');
  if (!validMerchantArrivalDeadline(order.merchantArrivalDeadline, order.deadlineRequirement, due)) throw new CalendarBatchError('Correct the second merchant arrival cutoff before exporting this return.');
  return { ...(order.merchantArrivalDeadline ? {merchantArrivalDeadline:order.merchantArrivalDeadline} : {}), ...(order.fixedDeadline ? {fixedDeadline:order.fixedDeadline} : {}), ...(order.deadlineRequirement ? {deadlineRequirement:order.deadlineRequirement} : {}), id: order.id, merchant: order.merchant, orderNo: order.orderNo, due, ...(order.calendarRevision ? {calendarRevision:order.calendarRevision} : {}), ...(order.windowStartDate ? {confirmedStartDate: order.windowStartDate} : {}) };
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
  order.id, order.merchant, order.orderNo ?? '', order.orderDate, order.windowStartDate ?? '', order.windowDays, order.fixedDeadline ?? '', order.deadlineRequirement ?? '', order.merchantArrivalDeadline ?? '',
]);

/** Recheck exactly the selected returns against storage before producing bytes. */
export function planCalendarBatch(
  current: readonly Order[], reviewed: readonly CalendarRow[], selectedIds: readonly string[], stamp = new Date(),
  alertSettings: CalendarAlertSettings = DEFAULT_ALERT_SETTINGS, reviewedAt = stamp,
) {
  if (!selectedIds.length) throw new CalendarBatchError('Select at least one return to download.');
  const selected = new Set(selectedIds);
  if (selected.size !== selectedIds.length) throw new CalendarBatchError('A return cannot be included twice in one calendar.');
  if (!Number.isFinite(stamp.getTime()) || stamp.getUTCFullYear() < 1000 || stamp.getUTCFullYear() > 9999) {
    throw new CalendarBatchError('The calendar timestamp could not be read.');
  }
  const fresh = calendarRows(current, localCalendarDate(stamp));
  for (const id of selected) {
    const before = reviewed.filter(row => row.order.id === id);
    const after = fresh.filter(row => row.order.id === id);
    if (before.length !== 1 || before[0].problem) throw new CalendarBatchError('A selected return was not ready for export. Reload and review it.');
    if (after.length !== 1 || after[0].problem || fingerprint(before[0].order) !== fingerprint(after[0].order)) {
      throw new CalendarBatchError('A selected return changed or was removed. Reload saved returns and review the selection before downloading.');
    }
  }
  const reminders = fresh.filter(row => selected.has(row.order.id)).map(row => {
    const value = reminder(row.order);
    const alert = planCalendarAlert(value.due, alertSettings, reviewedAt);
    if (alert.at && new Date(alert.at).getTime() <= stamp.getTime()) throw new CalendarAlertExpiredError();
    const arrivalAlert = value.merchantArrivalDeadline ? planCalendarAlert(value.merchantArrivalDeadline, alertSettings, reviewedAt) : null;
    if (arrivalAlert?.at && new Date(arrivalAlert.at).getTime() <= stamp.getTime()) throw new CalendarAlertExpiredError();
    return { ...value, alertAt: alert.at, ...(arrivalAlert ? {merchantArrivalAlertAt:arrivalAlert.at} : {}) };
  });
  // The title occurs in SUMMARY and the alarm DESCRIPTION. Escaping and line
  // folding cannot shorten these UTF-8 values, so reject a clearly oversized
  // selection before the serializer performs its per-character folding.
  const minimumBytes = reminders.reduce((bytes, value) => bytes + encoder.encode(value.id).byteLength
    + 2 * encoder.encode(`${deadlineCalendarTitle(value.deadlineRequirement)}: ${value.merchant || 'order'}${value.orderNo ? ' #' + value.orderNo : ''}`).byteLength, 0);
  if (minimumBytes > MAX_CALENDAR_BYTES) throw sizeError();
  const content = buildIcsCalendar(reminders, stamp);
  if (encoder.encode(content).byteLength > MAX_CALENDAR_BYTES) throw sizeError();
  return { content, count: reminders.length + reminders.filter(row => !!row.merchantArrivalDeadline).length, reminders, filename: `returnby-reminders-${stamp.toISOString().slice(0, 10)}.ics` };
}

/** Single-card downloads share the reviewed batch path, including freshness,
 * date validity and event-size admission. Other cards may change independently.
 */
export function planSingleCalendar(current: readonly Order[], reviewed: Order, stamp = new Date()) {
  const matches = current.filter(order => order.id === reviewed.id);
  if (matches.length !== 1) {
    throw new CalendarBatchError('This saved return changed or was removed. Review the refreshed tracker before downloading.');
  }
  const plan = planCalendarBatch(matches, calendarRows([reviewed]), [reviewed.id], stamp);
  return { ...plan, filename: `return-${(reviewed.merchant || 'order').replace(/\W+/g, '-')}.ics` };
}

/**
 * Record the dates placed in downloaded files, not an assertion that a third
 * party actually imported them. Preserve older dates for manual cleanup.
 */
export function recordCalendarDownloads(current: readonly Order[], reminders: readonly CalendarReminder[]): Order[] {
  const byId = new Map<string, CalendarReminder>();
  for (const reminder of reminders) {
    if (byId.has(reminder.id)) throw new CalendarBatchError('A return cannot be included twice in a calendar download.');
    byId.set(reminder.id, reminder);
  }
  const add = (dates: string[] | undefined, value: string | undefined) => {
    const list = dates ? [...dates] : [];
    if (value && !list.includes(value)) list.push(value);
    if (list.length > 128) throw new CalendarBatchError('Calendar date history is full. First confirm old calendar events are removed, then clear the old dates from the tracker.');
    return list.length ? list : undefined;
  };
  const seen = new Set<string>();
  const next = current.map(order => {
    const reminder = byId.get(order.id);
    if (!reminder) return order;
    if (seen.has(order.id) || isCompleted(order) || returnDueDate(order) !== reminder.due ||
        order.merchantArrivalDeadline !== reminder.merchantArrivalDeadline) {
      throw new CalendarBatchError('A selected return changed before its calendar history could be saved. Reload and try again.');
    }
    seen.add(order.id);
    const arrival = add(order.calendarExportedArrivalDates, reminder.merchantArrivalDeadline);
    return {
      ...order,
      calendarExportedDueDates: add(order.calendarExportedDueDates, reminder.due),
      ...(arrival ? {calendarExportedArrivalDates: arrival} : {}),
    };
  });
  if (seen.size !== byId.size) throw new CalendarBatchError('A selected return was removed before calendar export.');
  return next;
}

/** Dates in prior calendar files that might still appear as obsolete events. */
export function olderCalendarDates(order: Order): { primary: string[]; arrival: string[] } {
  const completed = isCompleted(order);
  const due = returnDueDate(order);
  const arrival = (order.calendarExportedArrivalDates ?? []).filter(date =>
    completed || date !== order.merchantArrivalDeadline);
  // v0.12.x could remember one removed arrival date but not a download
  // history. Keep that date actionable after upgrading.
  if (!order.merchantArrivalDeadline && order.calendarPreviousArrivalDate &&
      !arrival.includes(order.calendarPreviousArrivalDate)) {
    arrival.push(order.calendarPreviousArrivalDate);
  }
  return {
    primary: (order.calendarExportedDueDates ?? []).filter(date => completed || date !== due),
    arrival,
  };
}

export type CalendarCleanupSelection = { primary: readonly string[]; arrival: readonly string[] };

/** Each date is acknowledged only after the shopper removes that event in
 * their calendar app. Other stale dates and any current reminders stay visible.
 */
export function acknowledgeCalendarCleanup(
  current: readonly Order[], reviewed: Order, removed?: CalendarCleanupSelection,
): Order[] {
  const matches = current.filter(row => row.id === reviewed.id);
  if (matches.length !== 1 || JSON.stringify(matches[0]) !== JSON.stringify(reviewed)) {
    throw new CalendarBatchError('This return changed before calendar cleanup was confirmed. Refresh and review it.');
  }
  const order = matches[0];
  const pending = olderCalendarDates(order);
  const chosen = removed ?? pending;
  if (!chosen.primary.length && !chosen.arrival.length) {
    throw new CalendarBatchError('Select an old calendar entry you have removed.');
  }
  for (const kind of ['primary', 'arrival'] as const) {
    const selected = chosen[kind];
    if (new Set(selected).size !== selected.length || selected.some(date => !pending[kind].includes(date))) {
      throw new CalendarBatchError('An old calendar entry changed. Refresh and review the cleanup list.');
    }
  }
  const dueRemoved = new Set(chosen.primary);
  const arrivalRemoved = new Set(chosen.arrival);
  return current.map(row => {
    if (row.id !== reviewed.id) return row;
    const next = { ...row };
    const due = row.calendarExportedDueDates?.filter(date => !dueRemoved.has(date));
    const arrival = row.calendarExportedArrivalDates?.filter(date => !arrivalRemoved.has(date));
    if (due?.length) next.calendarExportedDueDates = due;
    else delete next.calendarExportedDueDates;
    if (arrival?.length) next.calendarExportedArrivalDates = arrival;
    else delete next.calendarExportedArrivalDates;
    if (!row.merchantArrivalDeadline && row.calendarPreviousArrivalDate &&
        arrivalRemoved.has(row.calendarPreviousArrivalDate)) delete next.calendarPreviousArrivalDate;
    return next;
  });
}

/** A one-event cancellation file for an imported deadline, without changing
 * the saved return. Active secondary deadlines cannot be canceled until they
 * are removed through Edit details or the return is completed.
 */
export function planCalendarCancellation(
  current: readonly Order[], reviewed: Order, kind: 'return' | 'merchant-arrival', stamp = new Date(),
) {
  const matches = current.filter(row => row.id === reviewed.id);
  if (matches.length !== 1 || JSON.stringify(matches[0]) !== JSON.stringify(reviewed)) {
    throw new CalendarBatchError('This return changed since it was displayed. Reload the tracker and try again.');
  }
  const saved = matches[0];
  if (!isCompleted(saved) && (kind === 'return' || !!saved.merchantArrivalDeadline)) {
    throw new CalendarBatchError('This deadline is still active. Update the imported reminder instead of cancelling it.');
  }
  const base = reminder({ ...saved, completedAt: undefined, completionKind: undefined });
  const arrival = saved.merchantArrivalDeadline || saved.calendarPreviousArrivalDate;
  if (kind === 'merchant-arrival' && (!arrival || !isCalendarDate(arrival))) {
    throw new CalendarBatchError('There is no earlier merchant-arrival reminder to cancel.');
  }
  const lastDownloaded = kind === 'return'
    ? saved.calendarExportedDueDates?.at(-1)
    : saved.calendarExportedArrivalDates?.at(-1);
  const event: CalendarReminder = kind === 'return' ? { ...base, due: lastDownloaded || base.due } : {
    ...base, id: base.id + ':merchant-arrival', due: lastDownloaded || arrival!,
    deadlineRequirement: 'arrive-by',
  };
  const content = buildCancelledIcs(event, stamp);
  if (encoder.encode(content).byteLength > MAX_CALENDAR_BYTES) throw sizeError();
  return {
    content,
    due: event.due,
    filename: `return-${(saved.merchant || 'order').replace(/\W+/g, '-')}-${kind}-cancel.ics`,
  };
}
