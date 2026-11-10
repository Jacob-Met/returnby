import { isCompleted } from './completion';
import { returnDueDate } from './deadline';
import { isSupportedDate } from './trip-checklist';
import type { Order } from './store';

/** Only a deadline date travels between pages; purchase details stay in storage. */
export function requestedDeadline(search: string): string | null {
  const values = new URLSearchParams(search).getAll('deadline');
  if (values.length !== 1 || !isSupportedDate(values[0]) || Number(values[0].slice(0, 4)) < 1000) return null;
  return values[0];
}
export function ordersForDeadline(orders: readonly Order[], deadline: string): Order[] {
  return orders.filter(order => !isCompleted(order) && returnDueDate(order) === deadline);
}
