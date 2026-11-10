import { exportBackup, parseBackup } from './backup';
import { daysLeft, dueDate, status, todayISO, type Status } from './deadline';
import type { Order } from './store';

export const OVERVIEW_PAGE_SIZE = 20;

export type DeadlineOverviewRecord = {
  order: Readonly<Order>;
  due: string;
  left: number;
  status: Status;
};
export type DeadlineOverviewDay = {
  date: string;
  day: number;
  weekday: number;
  records: readonly DeadlineOverviewRecord[];
};
export type DeadlineOverview = {
  month: string;
  label: string;
  today: string;
  firstWeekday: number;
  total: number;
  monthTotal: number;
  activeDates: number;
  outsideMonth: number;
  days: readonly DeadlineOverviewDay[];
};

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const admissionTime = new Date('2000-01-01T00:00:00.000Z');

export class DeadlineOverviewError extends Error {}

function monthParts(value: unknown): { year: number; month: number } {
  if (typeof value !== 'string' || !/^[1-9]\d{3}-(?:0[1-9]|1[0-2])$/.test(value)) {
    throw new DeadlineOverviewError('Choose a valid month from January 1000 through December 9999.');
  }
  return { year: Number(value.slice(0, 4)), month: Number(value.slice(5, 7)) };
}

// Same four-digit civil-date admission used by the native backup format.
// UTC is used only for date labels and weekday alignment, not to reinterpret
// saved fields or replace the existing local civil-date deadline functions.
function isCivilDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)
      || Number(value.slice(0, 4)) < 1000) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function shiftOverviewMonth(month: string, direction: -1 | 1): string | null {
  const parts = monthParts(month);
  if (direction !== -1 && direction !== 1) {
    throw new DeadlineOverviewError('Month navigation needs one previous or next month.');
  }
  const next = parts.year * 12 + parts.month - 1 + direction;
  if (next < 1000 * 12 || next > 9999 * 12 + 11) return null;
  return String(Math.floor(next / 12)).padStart(4, '0') + '-'
    + String(next % 12 + 1).padStart(2, '0');
}

/** Admit the whole saved collection and detach its approved fields before display. */
export function buildDeadlineOverview(
  current: unknown, month: string, today = todayISO(),
): DeadlineOverview {
  const parts = monthParts(month);
  if (!isCivilDate(today)) {
    throw new DeadlineOverviewError('The current date could not be read as a supported calendar date.');
  }

  // Reuse the shipped whole-collection field, identity, date, count and byte
  // contract. The fixed admission timestamp is never displayed or saved; no
  // file, storage write or new history format is created by this projection.
  const approved = parseBackup(exportBackup(current, admissionTime));
  const rows = approved.map(order => {
    const due = dueDate(order.orderDate, order.windowDays);
    const left = daysLeft(due, today);
    return { order, due, left, status: status(left) };
  }).sort((a, b) => compare(a.due, b.due) || compare(a.order.id, b.order.id));

  const byDate = new Map<string, DeadlineOverviewRecord[]>();
  for (const row of rows) {
    if (!row.due.startsWith(month + '-')) continue;
    const day = byDate.get(row.due) ?? [];
    day.push(row);
    byDate.set(row.due, day);
  }
  const leap = parts.year % 4 === 0 && (parts.year % 100 !== 0 || parts.year % 400 === 0);
  const count = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][parts.month - 1];
  const firstWeekday = (new Date(month + '-01T00:00:00Z').getUTCDay() + 6) % 7;
  const days = Array.from({ length: count }, (_, index) => {
    const date = month + '-' + String(index + 1).padStart(2, '0');
    return { date, day: index + 1, weekday: (firstWeekday + index) % 7, records: byDate.get(date) ?? [] };
  });
  const monthTotal = days.reduce((sum, day) => sum + day.records.length, 0);
  return {
    month, label: months[parts.month - 1] + ' ' + parts.year, today, firstWeekday,
    total: approved.length, monthTotal, activeDates: byDate.size,
    outsideMonth: approved.length - monthTotal, days,
  };
}
