import type { Order } from './store';
import { hasValidRefund } from './refund';
import { localCalendarDate } from './calendar-alert';
import { buildRefundIcs } from './ics';

export type RefundReminderTime = { date: string; time: string };
const identity = (o: Order) => JSON.stringify([o.id, o.merchant, o.orderNo || '', o.refundState,
  o.refundAmount || '', o.refundFollowUpDate || '', o.refundUpdatedAt || '']);

export function refundReminderInstant(value: RefundReminderTime, now = new Date()): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date) || Number(value.date.slice(0, 4)) < 1000
      || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)) throw new Error('Choose a reminder date and time.');
  const [y, m, d] = value.date.split('-').map(Number);
  const [h, minute] = value.time.split(':').map(Number);
  const at = new Date(y, m - 1, d, h, minute);
  if (localCalendarDate(at) !== value.date || at.getHours() !== h || at.getMinutes() !== minute)
    throw new Error('That local date or time does not exist. Choose another time.');
  if (!Number.isFinite(now.getTime()) || at.getTime() <= now.getTime())
    throw new Error('Choose a future time so you can import the reminder before it is due.');
  if (at.getUTCFullYear() > 9999 || at.getUTCFullYear() < 1000)
    throw new Error('Choose a reminder date between years 1000 and 9999.');
  return at;
}

export function planRefundCalendar(current: readonly Order[], reviewed: Order, value: RefundReminderTime, now = new Date()) {
  const matches = current.filter(o => o.id === reviewed.id);
  if (matches.length !== 1 || identity(matches[0]) !== identity(reviewed))
    throw new Error('This refund changed or was removed. Close this review and open its reminder again.');
  const order = matches[0];
  if (order.refundState !== 'awaiting' || !hasValidRefund(order))
    throw new Error('Only a refund still awaiting your check can have a reminder.');
  if (!order.id || order.id.length > 4096 || /[\u0000-\u001f\u007f]/.test(order.id)
      || order.merchant.length > 4096 || (order.orderNo || '').length > 4096)
    throw new Error('This purchase has unsupported calendar details. Correct its details first.');
  const at = refundReminderInstant(value, now);
  return { content: buildRefundIcs({ id: order.id, merchant: order.merchant, orderNo: order.orderNo,
    amount: order.refundAmount, at: at.toISOString() }, now),
    filename: 'returnby-refund-' + (order.merchant || 'purchase').replace(/\W+/g, '-').slice(0, 80) + '.ics',
    at };
}
