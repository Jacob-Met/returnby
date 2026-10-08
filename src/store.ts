export type Order = {
  id: string; merchant: string; orderNo?: string; total?: string;
  orderDate: string; windowDays: number; windowSource: 'policy' | 'default' | 'user'; createdAt: string;
};
const KEY = 'returnby.v1';
// Backup/restore must distinguish unreadable storage from an empty tracker.
export const read = (): unknown => JSON.parse(localStorage.getItem(KEY) || '[]');
export const load = (): Order[] => {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
};
export const save = (o: Order[]) => localStorage.setItem(KEY, JSON.stringify(o));
