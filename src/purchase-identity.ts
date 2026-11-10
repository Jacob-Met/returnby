import type { Order } from './store';

/** A possible repeat needs both a named merchant and receipt/order number. */
export function purchaseIdentity(order: Pick<Order, 'merchant' | 'orderNo'>): string | null {
  const merchant = order.merchant.trim().toLowerCase();
  const number = (order.orderNo ?? '').trim().toLowerCase();
  return merchant && number ? JSON.stringify([merchant, number]) : null;
}
