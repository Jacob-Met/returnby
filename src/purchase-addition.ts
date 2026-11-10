import type { Order } from './store';

/** A matching receipt is possible duplication, not proof that two purchases are identical. */
export function reviewPurchaseAddition(
  current: Order[], incoming: Order, read: () => Order[] | null,
  confirm: (message: string) => boolean,
): Order[] | null {
  const key = (order: Order) => {
    const store = order.merchant.trim().toLowerCase();
    const number = (order.orderNo ?? '').trim().toLowerCase();
    return store && number ? JSON.stringify([store, number]) : null;
  };
  const identity = key(incoming);
  const matches = identity ? current.filter(order => key(order) === identity) : [];
  if (!matches.length) return [...current, incoming];
  if (!confirm('A saved return already uses ' + incoming.merchant.trim() + ' order ' +
    (incoming.orderNo ?? '').trim() + '. Add another separate return? Cancel keeps your draft so you can review or edit the saved return.')) return null;
  const latest = read();
  if (!latest || JSON.stringify(latest) !== JSON.stringify(current)) {
    throw new Error('Saved returns changed while you reviewed this match. Nothing was added. Review the tracker, then save this draft again.');
  }
  return [...latest, incoming];
}
