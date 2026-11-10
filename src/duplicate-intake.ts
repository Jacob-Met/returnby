import { purchaseIdentity } from './purchase-identity';
import { returnDueDate } from './deadline';
import type { Order } from './store';

/** Cancel preserves the draft. A deliberate repeat never changes existing records. */
export function reviewDuplicateIntake(
  candidate: Pick<Order, 'merchant' | 'orderNo'>,
  read: () => Order[] | null,
  confirm: (message: string) => boolean,
): Order[] | null {
  const current = read();
  if (!current) throw new Error('Saved returns could not be read. Your draft is kept; retry loading saved returns before saving.');
  const key = purchaseIdentity(candidate);
  const matches = key ? current.filter(order => purchaseIdentity(order) === key) : [];
  if (!matches.length) return current;
  const details = matches.slice(0, 3).map(order => `Purchased ${order.orderDate}; return by ${returnDueDate(order)}.`).join('\n');
  if (!confirm(`${candidate.merchant.trim()} #${candidate.orderNo?.trim()} already matches ${matches.length} saved ${matches.length === 1 ? 'return' : 'returns'}.\n\n${details}${matches.length > 3 ? '\nMore matches are in your tracker.' : ''}\n\nSave this as another return? Choose Cancel to keep this draft and review the saved purchase.`)) return null;
  const latest = read();
  if (!latest || JSON.stringify(latest) !== JSON.stringify(current)) {
    throw new Error('Saved returns changed while you reviewed the possible duplicate. Your draft is kept. Save again to review the latest list.');
  }
  return latest;
}
