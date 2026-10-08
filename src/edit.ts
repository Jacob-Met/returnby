import { dueDate } from './deadline';
import { lookup } from './policy';
import type { Order } from './store';

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

export class EditConflict extends EditError {}

export function editDraft(order: Order): EditDraft {
  return {
    merchant: order.merchant,
    orderNo: order.orderNo ?? '',
    total: order.total ?? '',
    orderDate: order.orderDate,
    windowDays: String(order.windowDays),
  };
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1000) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Review one saved order without changing its identity or any stored data. */
export function previewEdit(original: Order, draft: EditDraft): { order: Order; due: string } {
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

  // An unrelated correction must not reinterpret a historical saved policy.
  const policy = lookup(draft.merchant);
  const windowSource = draft.merchant === original.merchant && days === original.windowDays
    ? original.windowSource
    : days === policy.days ? policy.source : 'user';
  const order: Order = { ...original, merchant: draft.merchant, orderDate: draft.orderDate, windowDays: days, windowSource };
  if (draft.orderNo !== (original.orderNo ?? '')) order.orderNo = draft.orderNo;
  if (draft.total !== (original.total ?? '')) order.total = draft.total;
  return { order, due };
}

/** Replace exactly the reviewed record in a freshly read tracker. */
export function planEdit(current: Order[], original: Order, draft: EditDraft) {
  const matches = current.filter(order => order.id === original.id);
  if (matches.length === 0) throw new EditConflict('This return was removed while you were editing. Your draft is still here; cancel to return to the tracker.');
  if (matches.length !== 1) throw new EditConflict('More than one saved return has this ID. Nothing was changed.');
  if (JSON.stringify(matches[0]) !== JSON.stringify(original)) {
    throw new EditConflict('This saved return changed while you were editing. Your draft is still here; cancel and reopen Edit details to review the saved version.');
  }
  const preview = previewEdit(matches[0], draft);
  const changed = JSON.stringify(preview.order) !== JSON.stringify(matches[0]);
  return {
    ...preview,
    changed,
    next: changed ? current.map(order => order.id === original.id ? preview.order : order) : current,
  };
}

export function sourceDescription(order: Order): string {
  if (order.windowSource === 'policy') return `Local store rule · ${order.windowDays} days. Confirm with the retailer.`;
  if (order.windowSource === 'default') return `Saved fallback · ${order.windowDays} days. Confirm with the retailer.`;
  return `Your return window · ${order.windowDays} days.`;
}
