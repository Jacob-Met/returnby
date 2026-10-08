import './reminder-time.css';
import { buildIcs } from './ics';
import { dueDate } from './deadline';
import { downloadCalendar } from './calendar-download';
import { confirmReminder, nextReminderHour, planReminder, type ReminderPlan } from './reminder-plan';
import { parseSavedOrders, SAVED_ORDERS_KEY, sourceLabel, type SavedSnapshot } from './trip-checklist';
import type { Order } from './store';

export function connectReminderTime(): { open: (id: string, opener: HTMLElement) => void } {
  const dialog = document.createElement('dialog');
  dialog.className = 'reminder-time';
  dialog.setAttribute('aria-labelledby', 'reminder-time-title');
  dialog.innerHTML = '<h2 id="reminder-time-title">Choose reminder time</h2>'
    + '<p class="reminder-order"></p><p class="reminder-facts"></p>'
    + '<p>The return deadline stays an all-day event. Choose when its calendar alarm should occur.</p>'
    + '<form class="reminder-form"><label for="reminder-local">Local date and time</label>'
    + '<input id="reminder-local" name="local" type="datetime-local" step="60" required aria-describedby="reminder-clock">'
    + '<p id="reminder-clock">Uses this device’s timezone. A repeated clock time uses its first occurrence; the review shows the exact offset and UTC time.</p>'
    + '<button class="button button-primary" type="submit">Review reminder</button></form>'
    + '<section class="reminder-review" hidden aria-label="Reviewed calendar alarm"><h3>Review before downloading</h3>'
    + '<dl><dt>Local alarm</dt><dd class="reminder-local-review"></dd><dt>Exact UTC alarm</dt><dd class="reminder-utc"></dd>'
    + '<dt>All-day return deadline</dt><dd class="reminder-deadline"></dd></dl>'
    + '<p class="reminder-late" hidden>This alarm is after the stored deadline. It does not extend the return window.</p>'
    + '<p>Import the downloaded .ics file into your calendar. Your calendar controls whether and how alarms are delivered.</p></section>'
    + '<p class="reminder-message" role="status"></p><div class="reminder-actions">'
    + '<button class="button button-primary reminder-download" type="button" disabled>Download reviewed calendar</button>'
    + '<button class="button button-link reminder-cancel" type="button" autofocus>Cancel</button></div>';
  document.body.append(dialog);
  const find = <T extends HTMLElement>(selector: string) => dialog.querySelector(selector) as T;
  const form = find<HTMLFormElement>('form');
  const input = find<HTMLInputElement>('input');
  const review = find<HTMLElement>('.reminder-review');
  const download = find<HTMLButtonElement>('.reminder-download');
  const message = find<HTMLElement>('.reminder-message');
  let snapshot: SavedSnapshot | undefined, order: Readonly<Order> | undefined;
  let reviewed: ReminderPlan | undefined, opener: HTMLElement | undefined;

  function invalidate(): void { reviewed = undefined; review.hidden = true; download.disabled = true; }
  function say(error: unknown): void { message.textContent = error instanceof Error ? error.message : 'The reminder could not be prepared. Try again.'; }
  function readRaw(): string | null {
    try { return localStorage.getItem(SAVED_ORDERS_KEY); }
    catch { throw new Error('Saved orders cannot be read. Close this review and allow browser storage before trying again. Nothing was changed.'); }
  }
  function assertCurrent(): void {
    if (!snapshot || readRaw() !== snapshot.raw) {
      throw new Error('Saved orders changed after this review opened. Close it and choose the reminder again. Nothing was changed.');
    }
  }
  function retire(): void {
    invalidate(); input.disabled = true; find<HTMLButtonElement>('form button').disabled = true;
    message.textContent = 'Saved orders changed. Close this review and choose the reminder again.';
  }
  function close(): void { dialog.close(); }
  dialog.addEventListener('close', () => {
    invalidate(); snapshot = undefined; order = undefined;
    (opener?.isConnected ? opener : document.getElementById('filter-all'))?.focus({ preventScroll: true });
  });
  find<HTMLButtonElement>('.reminder-cancel').addEventListener('click', close);
  input.addEventListener('input', () => { invalidate(); message.textContent = ''; });
  window.addEventListener('storage', event => {
    if (dialog.open && (event.key === null || event.key === SAVED_ORDERS_KEY)) retire();
  });
  form.addEventListener('submit', event => {
    event.preventDefault(); invalidate(); message.textContent = '';
    try {
      assertCurrent();
      if (!order) throw new Error('Choose a saved order again.');
      reviewed = planReminder(input.value, dueDate(order.orderDate, order.windowDays));
      find<HTMLElement>('.reminder-local-review').textContent = reviewed.local.replace('T', ' ') + ' · ' + reviewed.zone + ' · ' + reviewed.offset;
      find<HTMLElement>('.reminder-utc').textContent = reviewed.utc.replace('.000Z', ' UTC');
      find<HTMLElement>('.reminder-deadline').textContent = reviewed.due;
      find<HTMLElement>('.reminder-late').hidden = !reviewed.afterDeadline;
      review.hidden = false; download.disabled = false;
      download.focus();
    } catch (error) { say(error); }
  });
  download.addEventListener('click', () => {
    try {
      assertCurrent();
      if (!reviewed || !order) throw new Error('Review the reminder time before downloading.');
      const now = new Date();
      const current = confirmReminder(reviewed, input.value, dueDate(order.orderDate, order.windowDays), now);
      const calendar = buildIcs({ ...order, due: current.due }, now, new Date(current.utc));
      downloadCalendar(calendar, 'return-' + (order.merchant || 'order').replace(/\W+/g, '-') + '.ics');
      message.textContent = 'Calendar file prepared. Import it into your calendar to use the reviewed alarm.';
    } catch (error) { invalidate(); say(error); }
  });
  return { open(id, trigger) {
    if (dialog.open) return;
    opener = trigger; invalidate(); message.textContent = '';
    input.disabled = false; find<HTMLButtonElement>('form button').disabled = false;
    find<HTMLElement>('.reminder-order').textContent = '';
    find<HTMLElement>('.reminder-facts').textContent = '';
    snapshot = undefined; order = undefined;
    try {
      const raw = readRaw();
      try { snapshot = parseSavedOrders(raw); }
      catch { throw new Error('Saved orders cannot be safely reviewed. The saved list may be invalid, ambiguous or too large. Nothing was changed.'); }
      order = snapshot.orders.find(value => value.id === id);
      if (!order) throw new Error('This saved order is no longer available. Close the review and reload the tracker.');
      find<HTMLElement>('.reminder-order').textContent = (order.merchant || 'Unknown store') + (order.orderNo ? ' · Order #' + order.orderNo : '');
      find<HTMLElement>('.reminder-facts').textContent = 'Order date ' + order.orderDate + ' · ' + sourceLabel(order.windowSource) + ': ' + order.windowDays + ' days · Return by ' + dueDate(order.orderDate, order.windowDays);
      input.value = nextReminderHour();
    } catch (error) { input.disabled = true; find<HTMLButtonElement>('form button').disabled = true; say(error); }
    dialog.showModal(); find<HTMLButtonElement>('.reminder-cancel').focus();
  } };
}
