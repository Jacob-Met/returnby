export type Order = {
  id: string; merchant: string; orderNo?: string; total?: string;
  orderDate: string; windowDays: number; windowSource: 'policy' | 'default' | 'user'; createdAt: string;
};
const KEY = 'returnby.v1';
export const load = (): Order[] => {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
};
export const save = (o: Order[]) => localStorage.setItem(KEY, JSON.stringify(o));
