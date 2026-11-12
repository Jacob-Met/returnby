import type { Order } from './store';

// iCalendar SEQUENCE is a nonnegative 32-bit integer. An absent sequence in
// older saved orders means the original event was revision zero.
export const MAX_CALENDAR_REVISION = 2147483647;
const eventFields = [
  'merchant', 'orderNo', 'orderDate', 'windowStartDate', 'windowDays',
  'fixedDeadline', 'deadlineRequirement', 'merchantArrivalDeadline',
] as const;

export function validCalendarRevision(order: Pick<Order, 'calendarRevision' | 'calendarPreviousArrivalDate'>): boolean {
  const revision = order.calendarRevision;
  if (revision !== undefined && (!Number.isInteger(revision) || revision < 1 || revision > MAX_CALENDAR_REVISION)) return false;
  if (order.calendarPreviousArrivalDate !== undefined) {
    if (revision === undefined || (!/^\d{4}-\d{2}-\d{2}$/.test(order.calendarPreviousArrivalDate) || Number(order.calendarPreviousArrivalDate.slice(0, 4)) < 1000)) return false;
    const date = new Date(order.calendarPreviousArrivalDate + 'T00:00:00Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== order.calendarPreviousArrivalDate) return false;
  }
  return true;
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
