export type Status = 'ok' | 'soon' | 'urgent' | 'expired';

const toDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function dueDate(orderDate: string, days: number): string {
  const d = toDate(orderDate);
  d.setDate(d.getDate() + days);
  return fmt(d);
}

export function daysLeft(due: string, today: string): number {
  const ms = toDate(due).getTime() - toDate(today).getTime();
  return Math.round(ms / 86_400_000);
}

export function status(left: number): Status {
  if (left < 0) return 'expired';
  if (left <= 2) return 'urgent';
  if (left <= 7) return 'soon';
  return 'ok';
}

export const todayISO = () => fmt(new Date());
