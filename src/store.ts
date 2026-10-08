export type Order = {
  id: string; merchant: string; orderNo?: string; total?: string;
  orderDate: string; windowDays: number; windowSource: 'policy' | 'default' | 'user'; createdAt: string;
};
const KEY = 'returnby.v1';
const isOrder = (value: unknown): value is Order => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const o = value as Record<string, unknown>;
  return ['id', 'merchant', 'orderDate', 'createdAt'].every((key) => typeof o[key] === 'string')
    && typeof o.windowDays === 'number' && Number.isFinite(o.windowDays)
    && (o.windowSource === 'policy' || o.windowSource === 'default' || o.windowSource === 'user')
    && (o.orderNo === undefined || typeof o.orderNo === 'string')
    && (o.total === undefined || typeof o.total === 'string');
};
export const load = (): Order[] => {
  const raw = localStorage.getItem(KEY);
  if (raw === null) return [];
  const orders: unknown = JSON.parse(raw);
  if (!Array.isArray(orders) || !orders.every(isOrder)) throw new Error('Saved returns have an unsupported format');
  return orders;
};
export const save = (o: Order[]) => localStorage.setItem(KEY, JSON.stringify(o));
