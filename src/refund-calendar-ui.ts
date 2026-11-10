import { load, type Order } from './store';
import { localCalendarDate } from './calendar-alert';
import { planRefundCalendar, refundReminderInstant } from './refund-calendar';
import './refund-calendar.css';

export function bindRefundCalendar() {
  const dialog = document.querySelector<HTMLDialogElement>('#refund-calendar-dialog')!;
  const get = <T extends HTMLElement>(id: string) => document.querySelector<T>('#' + id)!;
  const date = get<HTMLInputElement>('refund-calendar-date');
  const time = get<HTMLInputElement>('refund-calendar-time');
  const error = get('refund-calendar-error');
  let reviewed: Order | null = null, opener: HTMLElement | null = null;
  const feedback = () => document.querySelector<HTMLElement>('#refund-feedback')!;
  function preview() {
    try {
      const at = refundReminderInstant({ date: date.value, time: time.value });
      get('refund-calendar-preview').textContent = 'Check your refund ' + new Intl.DateTimeFormat(undefined,
        { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(at) + '.';
    } catch (e) { get('refund-calendar-preview').textContent = (e as Error).message; }
    error.hidden = true;
  }
  document.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-refund-calendar]');
    if (!button) return;
    try {
      const matches = load().filter(o => o.id === button.dataset.refundCalendar);
      if (matches.length !== 1 || matches[0].refundState !== 'awaiting')
        throw new Error('This refund is no longer awaiting your check. Review the latest saved purchases.');
      reviewed = { ...matches[0] }; opener = button;
      get('refund-calendar-purchase').textContent = reviewed.merchant + (reviewed.orderNo ? ' · Order ' + reviewed.orderNo : '')
        + (reviewed.refundAmount ? ' · ' + reviewed.refundAmount : '');
      const today = localCalendarDate(new Date());
      const saved = reviewed.refundFollowUpDate;
      date.min = today; date.value = saved && saved >= today ? saved : today; time.value = '09:00';
      if (new Date(date.value + 'T09:00:00').getTime() <= Date.now()) {
        const nextHour = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000 + 3_600_000);
        date.value = localCalendarDate(nextHour);
        time.value = String(nextHour.getHours()).padStart(2, '0') + ':' + String(nextHour.getMinutes()).padStart(2, '0');
      }
      get('refund-calendar-saved').textContent = saved
        ? 'Your saved check date is ' + saved + (saved < today ? ' and has passed. Choose when to follow up next.' : '.')
        : 'No check date is saved yet. Choose when to follow up.';
      get('refund-calendar-zone').textContent = 'Times are in ' + Intl.DateTimeFormat().resolvedOptions().timeZone + '. This only sets the calendar reminder; your saved check date stays unchanged.';
      preview(); dialog.showModal(); get('refund-calendar-title').focus();
    } catch (e) { feedback().textContent = (e as Error).message; }
  });
  date.addEventListener('input', preview); time.addEventListener('input', preview);
  get('refund-calendar-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => (opener?.isConnected ? opener : document.querySelector<HTMLElement>('#refund-heading'))?.focus());
  get<HTMLFormElement>('refund-calendar-form').addEventListener('submit', event => {
    event.preventDefault(); if (!reviewed) return;
    try {
      const plan = planRefundCalendar(load(), reviewed, { date: date.value, time: time.value });
      const url = URL.createObjectURL(new Blob([plan.content], { type: 'text/calendar;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = plan.filename;
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60_000);
      feedback().textContent = 'Refund reminder downloaded. Import the .ics file into your calendar and check notifications. If the refund arrives, remove the calendar reminder there too.';
      dialog.close();
    } catch (e) { error.textContent = (e as Error).message; error.hidden = false; error.focus(); }
  });
}
