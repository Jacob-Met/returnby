import { validateOrderFields, type EditDraft } from './order-admission';
import type { Order } from './store';

export type ReceiptIdentity = Pick<Order, 'id' | 'createdAt'>;
export type ReceiptReview = {
  draft: EditDraft;
  order: Order;
  due: string;
};

/** Use the shared admission rule; a receipt always carries the user's window. */
export function reviewReceipt(draft: EditDraft, identity: ReceiptIdentity): ReceiptReview {
  const { days, due } = validateOrderFields(draft);
  return {
    draft: { ...draft },
    order: {
      id: identity.id, merchant: draft.merchant, orderNo: draft.orderNo,
      total: draft.total, orderDate: draft.orderDate, windowDays: days,
      windowSource: 'user', createdAt: identity.createdAt,
    },
    due,
  };
}

/** Append to a fresh accepted-store read without projecting existing rows. */
export function planReceiptSave(current: Order[], order: Order): { next: Order[]; alreadySaved: boolean } {
  const matches = current.filter(row => row.id === order.id);
  if (matches.length === 0) return { next: [...current, order], alreadySaved: false };
  if (matches.length === 1 && JSON.stringify(matches[0]) === JSON.stringify(order)) {
    return { next: current, alreadySaved: true };
  }
  throw new Error('This receipt identity is already saved with different details or appears more than once. Nothing was replaced. Check the tracker before starting another receipt.');
}
