import { CalendarBatchError, CalendarAlertExpiredError, calendarRows, initialCalendarSelection, planCalendarBatch, recordCalendarDownloads, olderCalendarDates, type CalendarFilter, type CalendarRow } from './calendar-batch';
import { deadlinePhrase } from './deadline-requirement';
import { DEFAULT_ALERT_SETTINGS, describeCalendarAlert, localCalendarDate, planCalendarAlert, type CalendarAlertSettings } from './calendar-alert';
import type { Order } from './store';

type CalendarOptions = {
  read(): Order[];
  commit(next: Order[]): boolean;
  filter(): CalendarFilter;
  download?(content: string, filename: string): void;
};

export function downloadCalendar(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  try { anchor.click(); }
  finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function bindCalendarBatch(options: CalendarOptions) {
  const get = <T extends HTMLElement>(id: string) => document.querySelector<T>(`#${id}`)!;
  const dialog = get<HTMLDialogElement>('calendar-dialog');
  const choices = get<HTMLDivElement>('calendar-choices');
  const message = get<HTMLParagraphElement>('calendar-message');
  const summary = get<HTMLParagraphElement>('calendar-summary');
  const download = get<HTMLButtonElement>('calendar-download');
  const feedback = get<HTMLParagraphElement>('calendar-feedback');
  const days = get<HTMLSelectElement>('calendar-alert-days');
  const time = get<HTMLInputElement>('calendar-alert-time');
  let rows: CalendarRow[] = [];
  let selected = new Set<string>();
  let loaded = false;
  let singleId: string | null = null;
  let returnFocus: HTMLElement | null = null;
  let reviewedAt = new Date();
  days.value = String(DEFAULT_ALERT_SETTINGS.daysBefore);
  time.value = DEFAULT_ALERT_SETTINGS.time;

  function settings(): CalendarAlertSettings {
    return { daysBefore: days.value === 'none' ? null : Number(days.value) as 0 | 1 | 3 | 7, time: time.value };
  }
  function showMessage(text: string, focus = false) {
    message.textContent = text;
    message.hidden = !text;
    if (focus) message.focus();
  }
  function updateSummary() {
    const picked = rows.filter(row => !row.problem && selected.has(row.order.id));
    const count = picked.reduce((n, row) => n + (row.order.merchantArrivalDeadline ? 2 : 1), 0);
    let alarms = 0, catchUps = 0, valid = true;
    try {
      for (const row of picked) {
        const alert = planCalendarAlert(row.due!, settings(), reviewedAt);
        if (alert.at) alarms++;
        if (alert.reason === 'catch-up') catchUps++;
        if (row.order.merchantArrivalDeadline) {
          const arrivalAlert = planCalendarAlert(row.order.merchantArrivalDeadline, settings(), reviewedAt);
          if (arrivalAlert.at) alarms++;
          if (arrivalAlert.reason === 'catch-up') catchUps++;
        }
      }
    } catch { valid = false; }
    summary.textContent = count
      ? `${count} ${count === 1 ? 'deadline' : 'deadlines'} selected · ${alarms} ${alarms === 1 ? 'alert' : 'alerts'}.${count > alarms ? ` ${count - alarms} calendar ${count - alarms === 1 ? 'entry has' : 'entries have'} no alert.` : ''}${catchUps ? ' Review the catch-up times and import promptly.' : ''}`
      : 'No deadlines selected.';
    download.disabled = !loaded || !count || !valid;
    get<HTMLButtonElement>('calendar-select-all').disabled = !loaded || !rows.some(row => !row.problem);
    get<HTMLButtonElement>('calendar-select-none').disabled = !loaded || !count;
    time.disabled = days.value === 'none';
  }
  function renderChoices() {
    choices.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement('p');
      empty.textContent = 'There are no open saved returns to export. Completed returns stay in your tracker history.';
      choices.append(empty);
      return;
    }
    for (const [index, row] of rows.entries()) {
      const label = document.createElement('label');
      label.className = 'calendar-choice';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !row.problem && selected.has(row.order.id);
      checkbox.disabled = Boolean(row.problem);
      checkbox.dataset.calendarIndex = String(index);
      const text = document.createElement('span');
      const name = document.createElement('strong');
      name.textContent = `${row.order.merchant || 'Unknown store'}${row.order.orderNo ? ` #${row.order.orderNo}` : ''}`;
      const detail = document.createElement('span');
      detail.className = row.problem ? 'calendar-invalid' : 'calendar-due';
      detail.textContent = row.problem ?? `${deadlinePhrase(row.order.deadlineRequirement)} ${row.due}${row.order.merchantArrivalDeadline ? ' · Merchant receives by ' + row.order.merchantArrivalDeadline : ''} · clock starts ${row.order.windowStartDate || row.order.orderDate}${row.order.windowStartDate ? ' (confirmed by you)' : ' (order date)'}`;
      text.append(name, detail);
      if (!row.problem) {
        const timing = document.createElement('span');
        timing.className = 'calendar-alert-preview';
        try {
          const alert = planCalendarAlert(row.due!, settings(), reviewedAt);
          timing.textContent = describeCalendarAlert(alert);
          if (row.order.merchantArrivalDeadline) timing.textContent += ' · Arrival: ' + describeCalendarAlert(planCalendarAlert(row.order.merchantArrivalDeadline, settings(), reviewedAt));
          if (alert.reason !== 'scheduled' && alert.reason !== 'off') timing.classList.add('calendar-alert-attention');
        } catch (error) { timing.textContent = error instanceof Error ? error.message : 'Choose an alert time.'; }
        text.append(timing);
      }
      label.append(checkbox, text);
      choices.append(label);
    }
  }
  function refreshAlerts() {
    reviewedAt = new Date();
    rows = calendarRows(rows.map(row => row.order), localCalendarDate(reviewedAt));
    renderChoices(); updateSummary();
  }
  function loadSelection(keepSelection = false) {
    try {
      const current = options.read();
      const next = calendarRows(singleId ? current.filter(order => order.id === singleId) : current);
      const valid = new Set(next.filter(row => !row.problem).map(row => row.order.id));
      selected = new Set(keepSelection
        ? [...selected].filter(id => valid.has(id))
        : singleId ? [...valid] : initialCalendarSelection(next, options.filter()));
      rows = next;
      loaded = true;
      reviewedAt = new Date();
      renderChoices();
      const invalid = rows.filter(row => row.problem).length;
      const older = next.filter(row => !row.problem).flatMap(row => {
        const dates = olderCalendarDates(row.order);
        return [...dates.primary.map(date => row.order.merchant + ' ' + date),
          ...dates.arrival.map(date => row.order.merchant + ' arrival ' + date)];
      });
      get('calendar-note').textContent = `${keepSelection ? 'Saved returns reloaded. Review the current dates and alert times.' : singleId ? 'Review this deadline and its alert before downloading.' : 'Choose the returns to add to your calendar.'} Completed returns are excluded.${invalid ? ` ${invalid} ${invalid === 1 ? 'return needs' : 'returns need'} correction and cannot be selected.` : ''}` +
        (older.length ? ' Earlier downloaded calendar dates may still be present: ' + older.join(', ') + '. Remove obsolete entries from your calendar app.' : '');
      showMessage('');
    } catch (error) {
      loaded = false;
      choices.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(checkbox => { checkbox.disabled = true; });
      showMessage(error instanceof CalendarBatchError ? error.message
        : "Couldn't read saved returns for calendar export. Your selection is kept. Try Reload saved returns when storage is available.", true);
    }
    updateSummary();
  }

  choices.addEventListener('change', event => {
    const input = event.target as HTMLInputElement;
    const index = Number(input.dataset.calendarIndex);
    if (input.type !== 'checkbox' || input.dataset.calendarIndex === undefined || !Number.isInteger(index)) return;
    const row = rows[index];
    if (!row || row.problem || !loaded) return;
    if (input.checked) selected.add(row.order.id); else selected.delete(row.order.id);
    showMessage(''); updateSummary();
  });
  for (const input of [days, time]) input.addEventListener('change', () => { refreshAlerts(); showMessage(''); });
  get('calendar-refresh-alerts').addEventListener('click', () => { refreshAlerts(); showMessage('Alert times refreshed. Review them before downloading.'); });
  get('calendar-select-all').addEventListener('click', () => {
    selected = new Set(rows.filter(row => !row.problem).map(row => row.order.id));
    renderChoices(); updateSummary(); showMessage('');
  });
  get('calendar-select-none').addEventListener('click', () => {
    selected.clear(); renderChoices(); updateSummary(); showMessage('');
  });
  get('calendar-reload').addEventListener('click', () => loadSelection(loaded || rows.length > 0));
  get('calendar-cancel').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => (returnFocus?.isConnected ? returnFocus : get('calendar-open')).focus());
  get('calendar-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!loaded || !selected.size) return;
    let current: Order[];
    try { current = options.read(); }
    catch {
      showMessage("Couldn't read saved returns. Nothing was downloaded. Your selection is kept; try again when storage is available.", true);
      return;
    }
    try {
      const now = new Date();
      if (localCalendarDate(now) !== localCalendarDate(reviewedAt)) throw new CalendarAlertExpiredError();
      const plan = planCalendarBatch(current, rows, [...selected], now, settings(), reviewedAt);
      const filename = singleId ? `return-${(rows[0].order.merchant || 'order').replace(/\W+/g, '-')}.ics` : plan.filename;
      // Store the dates whose files the shopper requested before issuing the
      // browser download. A blocked storage write must not lose cleanup context.
      const tracked = recordCalendarDownloads(current, plan.reminders);
      if (!options.commit(tracked)) {
        showMessage('Calendar dates could not be saved to this browser. No download started; free browser storage and try again.', true);
        return;
      }
      (options.download ?? downloadCalendar)(plan.content, filename);
      const alertCount = plan.reminders.reduce((count,row) => count + (row.alertAt ? 1 : 0) + (row.merchantArrivalAlertAt ? 1 : 0), 0);
      const older = plan.reminders.flatMap(reminder => {
        const row = tracked.find(order => order.id === reminder.id)!;
        const dates = olderCalendarDates(row);
        return [...dates.primary.map(date => row.merchant + ' ' + date),
          ...dates.arrival.map(date => row.merchant + ' arrival ' + date)];
      });
      feedback.textContent = `Calendar file prepared with ${plan.count} ${plan.count === 1 ? 'deadline' : 'deadlines'} and ${alertCount} ${alertCount === 1 ? 'alert' : 'alerts'}. ${alertCount ? 'Import the downloaded .ics file before the alert time. If correcting an earlier import, check the old date was replaced. ReturnBy does not send notifications.' : 'Import the downloaded .ics file to add or update the deadline entries. No alerts were requested.'}` +
        (older.length ? ' Earlier downloaded deadlines may still appear in your calendar: ' + older.join(', ') + '. Remove their old entries in the calendar app, then confirm cleanup in the ReturnBy tracker.' : '');
      dialog.close();
    } catch (error) {
      if (error instanceof CalendarAlertExpiredError) refreshAlerts();
      showMessage(error instanceof Error ? error.message : 'The calendar file could not be prepared. Try again.', true);
    }
  });

  function open(single?: Order) {
    returnFocus = document.activeElement as HTMLElement | null;
    singleId = single?.id ?? null;
    rows = []; selected.clear(); loaded = false;
    choices.replaceChildren();
    feedback.textContent = '';
    get('calendar-title').textContent = 'Set return reminders';
    get('calendar-timezone').textContent = `Times shown in ${Intl.DateTimeFormat().resolvedOptions().timeZone}.`;
    get('calendar-select-all').hidden = Boolean(singleId);
    get('calendar-select-none').hidden = Boolean(singleId);
    dialog.showModal();
    loadSelection();
    if (loaded) get('calendar-title').focus();
  }
  get('calendar-open').addEventListener('click', () => open());
  return { open, openSingle: (order: Order) => open(order) };
}
