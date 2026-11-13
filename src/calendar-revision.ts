import type { Order } from './store';

// iCalendar SEQUENCE is a nonnegative 32-bit integer. An absent sequence in
// older saved orders means the original event was revision zero.
export const MAX_CALENDAR_REVISION = 2147483647;
const eventFields = [
  'merchant', 'orderNo', 'orderDate', 'windowStartDate', 'windowDays',
  'fixedDeadline', 'deadlineRequirement', 'merchantArrivalDeadline',
] as const;

const isCalendarDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1000) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const validDownloadDates = (dates: unknown) => dates === undefined || (
  Array.isArray(dates) && dates.length > 0 && dates.length <= 128 &&
  dates.every(isCalendarDate) && new Set(dates).size === dates.length
);

export function validCalendarRevision(order: Pick<Order, 'calendarRevision' | 'calendarPreviousArrivalDate' | 'calendarExportedDueDates' | 'calendarExportedArrivalDates'>): boolean {
  const revision = order.calendarRevision;
  if (revision !== undefined && (!Number.isInteger(revision) || revision < 1 || revision > MAX_CALENDAR_REVISION)) return false;
  if (order.calendarPreviousArrivalDate !== undefined) {
    if (revision === undefined || !isCalendarDate(order.calendarPreviousArrivalDate)) return false;
  }
  return validDownloadDates(order.calendarExportedDueDates) &&
    validDownloadDates(order.calendarExportedArrivalDates);
}

export function nextCalendarRevision(order: Order): number {
  if (!validCalendarRevision(order) || (order.calendarRevision ?? 0) === MAX_CALENDAR_REVISION) {
    throw new Error('This calendar reminder has reached its update limit. Save a new return before making another calendar change.');
  }
  return (order.calendarRevision ?? 0) + 1;
}

export function eventDetailsChanged(before: Order, after: Order): boolean {
  return eventFields.some(key => (before[key] ?? '') !== (after[key] ?? ''));
}
