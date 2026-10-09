import { lookup } from './policy';
import type { Order } from './store';
import { validateOrderFields, EditError, type EditDraft } from './order-admission';
export { EditError } from './order-admission';
export type { EditDraft } from './order-admission';

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

/** Review one saved order without changing its identity or any stored data. */
export function previewEdit(original: Order, draft: EditDraft): { order: Order; due: string } {
  const { days, due } = validateOrderFields(draft);

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
