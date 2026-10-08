import type { Order } from './store';

// JSON storage is the source of the snapshot. Keeping its serialized value
// prevents later edits to an Order (including nested extra fields) changing it.
export type Removal = Readonly<{ record: string; index: number }>;
export type RemovalPlan =
  | { kind: 'restore'; orders: Order[]; order: Order }
  | { kind: 'present'; order: Order }
  | { kind: 'conflict' };

export function captureRemoval(order: Order, index: number): Removal {
  if (!Number.isSafeInteger(index) || index < 0) throw new RangeError('Invalid removal position.');
  return Object.freeze({ record: JSON.stringify(order), index });
}

// Compare JSON data, not object-key insertion order. Extra stored properties
// participate in equality; a changed same-ID record must never be overwritten.
function sameJson(left: unknown, right: unknown): boolean {
  const remaining: [unknown, unknown][] = [[left, right]];
  while (remaining.length) {
    const [a, b] = remaining.pop()!;
    if (a === b) continue;
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const aa = a as Record<string, unknown>, bb = b as Record<string, unknown>;
    const keys = Object.keys(aa);
    if (keys.length !== Object.keys(bb).length) return false;
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(bb, key)) return false;
      remaining.push([aa[key], bb[key]]);
    }
  }
  return true;
}

export function planUndoRemoval(current: Order[], removal: Removal): RemovalPlan {
  const order = JSON.parse(removal.record) as Order;
  const matches = current.filter(saved => saved.id === order.id);
  if (matches.length > 1) return { kind: 'conflict' };
  if (matches.length === 1) {
    return sameJson(matches[0], order) ? { kind: 'present', order: matches[0] } : { kind: 'conflict' };
  }
  const orders = current.slice();
  orders.splice(Math.min(removal.index, orders.length), 0, order);
  return { kind: 'restore', orders, order };
}
