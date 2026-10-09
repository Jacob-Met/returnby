import { dueDate } from './deadline';

export type EditDraft = {
  merchant: string;
  orderNo: string;
  total: string;
  orderDate: string;
  windowDays: string;
};

export class EditError extends Error {
  constructor(message: string, readonly field?: keyof EditDraft) {
    super(message);
  }
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1000) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Validate fields shared by a new purchase and a saved-order edit. */
export function validateOrderFields(draft: EditDraft): { days: number; due: string } {
  for (const [field, label] of [['merchant', 'Store'], ['orderNo', 'Order number'], ['total', 'Total']] as const) {
    if (draft[field].length > 4096) throw new EditError(`${label} must be no longer than 4,096 characters.`, field);
  }
  if (!isCalendarDate(draft.orderDate)) {
    throw new EditError('Choose a valid order date with a year from 1000 to 9999.', 'orderDate');
  }
  const days = Number(draft.windowDays);
  if (!/^\d+$/.test(draft.windowDays) || !Number.isSafeInteger(days) || days < 1 || days > 3_700_000) {
    throw new EditError('Enter a return window as a positive whole number of days.', 'windowDays');
  }
  const due = dueDate(draft.orderDate, days);
  if (!isCalendarDate(due)) {
    throw new EditError('The return window must end within the year 9999.', 'windowDays');
  }
  if (!isCalendarDate(dueDate(due, 1))) {
    throw new EditError('The return deadline must be before 9999-12-31 so its calendar reminder has a valid end date.', 'windowDays');
  }

  return { days, due };
}
