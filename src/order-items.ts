import type { Order } from './store';

export type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  returned: number;
  kept: number;
};
export type ItemFields = {
  items?: OrderItem[];
  completedAt?: string;
  completionKind?: 'returned' | 'kept' | 'mixed';
};
export type ItemOrder = Order & ItemFields;
export class ItemError extends Error {}
export class ItemConflict extends ItemError {}
export const MAX_ORDER_ITEMS = 200;
const ITEM_KEYS = ['id', 'name', 'quantity', 'returned', 'kept'];

/** Construct the portable item shape; never retain pasted receipt properties. */
export function parseOrderItems(value: unknown, strict = true): OrderItem[] {
  if (!Array.isArray(value) || !value.length || value.length > MAX_ORDER_ITEMS) {
    throw new ItemError('Add between 1 and 200 item lines.');
  }
  const ids = new Set<string>();
  return value.map((entry, index) => {
    const label = 'Item ' + (index + 1);
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new ItemError(label + ' is not readable.');
    const row = entry as Record<string, unknown>;
    if (strict && Object.keys(row).some(key => !ITEM_KEYS.includes(key))) throw new ItemError(label + ' contains unsupported fields.');
    if (typeof row.id !== 'string' || !row.id || row.id.length > 128 || ids.has(row.id)) throw new ItemError(label + ' has a missing or repeated identity.');
    ids.add(row.id);
    if (typeof row.name !== 'string' || !row.name.trim() || row.name.length > 240) throw new ItemError('Name ' + label.toLowerCase() + ' (up to 240 characters).');
    if (!Number.isSafeInteger(row.quantity) || Number(row.quantity) < 1 || Number(row.quantity) > 10_000) throw new ItemError(label + ': bought quantity must be a whole number from 1 to 10,000.');
    for (const key of ['returned', 'kept']) {
      if (!Number.isSafeInteger(row[key]) || Number(row[key]) < 0) throw new ItemError(label + ': returned and kept quantities must be zero or a positive whole number.');
    }
    if (Number(row.returned) + Number(row.kept) > Number(row.quantity)) throw new ItemError(label + ': returned and kept together cannot exceed the quantity bought.');
    return { id: row.id, name: row.name.trim(), quantity: Number(row.quantity), returned: Number(row.returned), kept: Number(row.kept) };
  });
}

export function itemTotals(items: readonly OrderItem[]) {
  return items.reduce((sum, item) => ({
    quantity: sum.quantity + item.quantity,
    returned: sum.returned + item.returned,
    kept: sum.kept + item.kept,
    open: sum.open + item.quantity - item.returned - item.kept,
  }), { quantity: 0, returned: 0, kept: 0, open: 0 });
}

export function itemCompletionKind(items: readonly OrderItem[]): ItemFields['completionKind'] {
  const totals = itemTotals(items);
  if (totals.open) return undefined;
  return totals.returned && totals.kept ? 'mixed' : totals.returned ? 'returned' : 'kept';
}

export function itemSummary(order: Pick<ItemOrder, 'items'>): string {
  if (!order.items) return '';
  const totals = itemTotals(order.items);
  return totals.open + ' still open · ' + totals.returned + ' returned · ' + totals.kept + ' kept';
}

/** Item quantities and the order lifecycle must agree on whether work remains. */
export function hasValidItemState(value: { items?: unknown; completedAt?: unknown; completionKind?: unknown }): boolean {
  if (value.items === undefined) return value.completionKind !== 'mixed';
  try {
    const items = parseOrderItems(value.items);
    const kind = itemCompletionKind(items);
    return kind === undefined
      ? value.completedAt === undefined && value.completionKind === undefined
      : value.completedAt !== undefined && value.completionKind === kind;
  } catch { return false; }
}

/** Keep another tab's changes and unrelated purchases outside this reviewed edit. */
export function planItemEdit(
  current: readonly ItemOrder[], displayed: ItemOrder, draft: unknown, now = new Date(),
): { next: ItemOrder[]; order: ItemOrder; changed: boolean } {
  const matches = current.filter(order => order.id === displayed.id);
  if (matches.length !== 1 || JSON.stringify(matches[0]) !== JSON.stringify(displayed)) {
    throw new ItemConflict('This purchase changed while you were reviewing its items. Your draft is kept. Cancel and reopen Items to review the saved version.');
  }
  const items = parseOrderItems(draft);
  const saved = matches[0];
  const order: ItemOrder = { ...saved, items };
  const kind = itemCompletionKind(items);
  if (kind === undefined) {
    delete order.completedAt;
    delete order.completionKind;
  } else {
    if (!Number.isFinite(now.getTime())) throw new ItemError('The completion date could not be read. Your saved purchase was kept.');
    order.completedAt = saved.completedAt ?? now.toISOString();
    order.completionKind = kind;
  }
  const changed = JSON.stringify(order) !== JSON.stringify(saved);
  return { order, changed, next: changed ? current.map(row => row === saved ? order : row) : [...current] };
}

/** Whole-order actions affect only undecided quantities, preserving prior decisions. */
export function finishItemQuantities(items: readonly OrderItem[], action: 'returned' | 'kept'): OrderItem[] {
  return items.map(item => ({ ...item, [action]: item[action] + item.quantity - item.returned - item.kept }));
}
