import { todayISO } from './deadline';
import {
  buildDeadlineOverview, OVERVIEW_PAGE_SIZE, shiftOverviewMonth,
  type DeadlineOverview, type DeadlineOverviewRecord,
} from './deadline-overview';

type Dependencies = {
  read: () => unknown;
  today?: () => string;
  now?: () => Date;
};

/** A separate, explicit snapshot: no save callback, storage listener or draft access. */
export function bindDeadlineOverview({
  read, today = todayISO, now = () => new Date(),
}: Dependencies): void {
  const panel = document.querySelector<HTMLDetailsElement>('#deadline-overview');
  if (!panel) return;
  const element = <T extends HTMLElement>(id: string): T => {
    const node = panel.querySelector<T>('#' + id);
    if (!node) throw new Error('Missing deadline overview control: ' + id);
    return node;
  };
  const month = element<HTMLInputElement>('overview-month');
  const previousMonth = element<HTMLButtonElement>('overview-month-previous');
  const nextMonth = element<HTMLButtonElement>('overview-month-next');
  const todayButton = element<HTMLButtonElement>('overview-today');
  const refreshButton = element<HTMLButtonElement>('overview-refresh');
  const content = element('overview-content');
  const error = element('overview-error');
  const snapshotLabel = element('overview-snapshot');
  const monthTitle = element('overview-month-title');
  const monthSummary = element('overview-month-summary');
  const days = element('overview-days');
  const selectedTitle = element('overview-selected-title');
  const selectedSummary = element('overview-selected-summary');
  const records = element<HTMLOListElement>('overview-records');
  const pager = element('overview-record-pagination');
  const previousPage = element<HTMLButtonElement>('overview-record-previous');
  const nextPage = element<HTMLButtonElement>('overview-record-next');
  const pageLabel = element('overview-record-page');
  let snapshot: DeadlineOverview | null = null;
  let selected = '';
  let page = 0;

  const text = (tag: string, value: string, className?: string): HTMLElement => {
    const node = document.createElement(tag);
    node.textContent = value;
    if (className) node.className = className;
    return node;
  };
  const plural = (count: number, single: string) => count + ' ' + single + (count === 1 ? '' : 's');
  const timing = (row: DeadlineOverviewRecord) => row.left < 0
    ? plural(-row.left, 'day') + ' past deadline'
    : row.left === 0 ? 'Due today' : plural(row.left, 'day') + ' left';

  function renderRecords(): void {
    if (!snapshot) return;
    const selectedDay = snapshot.days.find(day => day.date === selected);
    if (!selectedDay) return;
    selectedTitle.dataset.date = selected;
    selectedTitle.textContent = 'Saved returns due ' + selected;
    const count = selectedDay.records.length;
    const pages = Math.max(1, Math.ceil(count / OVERVIEW_PAGE_SIZE));
    page = Math.min(Math.max(0, page), pages - 1);
    selectedSummary.textContent = count
      ? plural(count, 'saved return') + '. Details below preserve the approved saved fields.'
      : 'No saved return in this snapshot has this deadline.';
    const items = document.createDocumentFragment();
    for (const row of selectedDay.records.slice(page * OVERVIEW_PAGE_SIZE, (page + 1) * OVERVIEW_PAGE_SIZE)) {
      const item = document.createElement('li');
      item.className = 'overview-record';
      item.dataset.overviewId = row.order.id;
      const heading = text('h4', row.order.merchant || 'Not recorded', 'overview-record-heading');
      const tag = text('p', timing(row), 'overview-record-timing');
      tag.dataset.status = row.status;
      const values: Array<[string, string, string | number | undefined]> = [
        ['id', 'Saved identity', row.order.id],
        ['merchant', 'Store', row.order.merchant],
        ['orderNo', 'Order number', row.order.orderNo],
        ['total', 'Saved total', row.order.total],
        ['orderDate', 'Order date', row.order.orderDate],
        ['windowDays', 'Return window (days)', row.order.windowDays],
        ['windowSource', 'Saved window source', row.order.windowSource],
        ['createdAt', 'Saved creation time', row.order.createdAt],
        ['due', 'Return by', row.due],
      ];
      const details = document.createElement('dl');
      for (const [key, label, value] of values) {
        const field = text('dd', value === undefined || value === '' ? 'Not recorded' : String(value));
        field.dataset.overviewField = key;
        details.append(text('dt', label), field);
      }
      item.append(heading, tag, details);
      items.append(item);
    }
    records.replaceChildren(items);
    records.start = page * OVERVIEW_PAGE_SIZE + 1;
    pager.hidden = count <= OVERVIEW_PAGE_SIZE;
    previousPage.disabled = page === 0;
    nextPage.disabled = page === pages - 1;
    pageLabel.textContent = count
      ? 'Page ' + (page + 1) + ' of ' + pages + ' · showing '
        + (page * OVERVIEW_PAGE_SIZE + 1) + '–' + Math.min((page + 1) * OVERVIEW_PAGE_SIZE, count)
        + ' of ' + count
      : 'Page 1 of 1 · 0 saved returns';
  }

  function selectDate(date: string, focus = false): void {
    if (!snapshot?.days.some(day => day.date === date)) return;
    selected = date;
    page = 0;
    for (const button of Array.from(days.querySelectorAll<HTMLButtonElement>('button[data-overview-date]'))) {
      const active = button.dataset.overviewDate === selected;
      button.setAttribute('aria-pressed', String(active));
      button.tabIndex = active ? 0 : -1;
      if (active && focus) button.focus();
    }
    renderRecords();
  }

  function renderMonth(): void {
    if (!snapshot) return;
    monthTitle.dataset.month = snapshot.month;
    monthTitle.textContent = snapshot.label;
    monthSummary.textContent = plural(snapshot.monthTotal, 'saved return') + ' across '
      + plural(snapshot.activeDates, 'deadline day') + ' in this month. '
      + snapshot.total + ' saved in total; ' + snapshot.outsideMonth + ' due in other months.';
    previousMonth.disabled = shiftOverviewMonth(snapshot.month, -1) === null;
    nextMonth.disabled = shiftOverviewMonth(snapshot.month, 1) === null;
    const cells = document.createDocumentFragment();
    for (let index = 0; index < snapshot.firstWeekday; index++) {
      const pad = document.createElement('span');
      pad.dataset.overviewPad = '';
      pad.setAttribute('aria-hidden', 'true');
      cells.append(pad);
    }
    for (const day of snapshot.days) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'overview-day';
      button.dataset.overviewDate = day.date;
      if (day.date === snapshot.today) button.setAttribute('aria-current', 'date');
      button.setAttribute('aria-label', day.date + ': ' + plural(day.records.length, 'saved return'));
      button.setAttribute('aria-pressed', String(day.date === selected));
      button.tabIndex = day.date === selected ? 0 : -1;
      button.append(text('span', String(day.day), 'overview-day-number'),
        text('span', String(day.records.length), 'overview-day-count'));
      button.addEventListener('click', () => selectDate(day.date));
      button.addEventListener('keydown', event => {
        let offset: number;
        switch (event.key) {
          case 'ArrowLeft': offset = -1; break;
          case 'ArrowRight': offset = 1; break;
          case 'ArrowUp': offset = -7; break;
          case 'ArrowDown': offset = 7; break;
          case 'Home': offset = -day.weekday; break;
          case 'End': offset = 6 - day.weekday; break;
          default: return;
        }
        event.preventDefault();
        const target = snapshot?.days[Math.min(Math.max(day.day - 1 + offset, 0), snapshot.days.length - 1)];
        if (target) selectDate(target.date, true);
      });
      cells.append(button);
    }
    days.replaceChildren(cells);
    renderRecords();
  }

  function refuse(reason: unknown): void {
    snapshot = null;
    content.hidden = true;
    snapshotLabel.textContent = '';
    error.textContent = 'Could not read the complete saved-deadline snapshot. '
      + (reason instanceof Error ? reason.message + ' ' : '')
      + 'Saved returns and drafts were not changed. Check the saved data, then use Refresh saved deadlines to retry.';
    error.hidden = false;
  }

  function refresh(): void {
    try {
      const next = buildDeadlineOverview(read(), month.value, today());
      const captured = now();
      if (!Number.isFinite(captured.getTime())) throw new Error('The snapshot time is unavailable.');
      snapshot = next;
      if (!next.days.some(day => day.date === selected)) {
        selected = next.days.some(day => day.date === next.today) ? next.today
          : (next.days.find(day => day.records.length) ?? next.days[0]).date;
      }
      page = 0;
      renderMonth();
      snapshotLabel.textContent = 'Read-only snapshot loaded ' + captured.toLocaleString()
        + ' (' + Intl.DateTimeFormat().resolvedOptions().timeZone + '); urgency as of '
        + next.today + '. Use Refresh saved deadlines after saving, editing, importing or removing returns in any tab.';
      error.hidden = true;
      error.textContent = '';
      content.hidden = false;
    } catch (reason) {
      refuse(reason);
    }
  }

  function moveMonth(direction: -1 | 1): void {
    try {
      const target = shiftOverviewMonth(month.value, direction);
      if (target !== null) {
        month.value = target;
        refresh();
      }
    } catch (reason) {
      refuse(reason);
    }
  }

  month.value = today().slice(0, 7);
  panel.addEventListener('toggle', () => { if (panel.open) refresh(); });
  month.addEventListener('change', refresh);
  previousMonth.addEventListener('click', () => moveMonth(-1));
  nextMonth.addEventListener('click', () => moveMonth(1));
  refreshButton.addEventListener('click', refresh);
  todayButton.addEventListener('click', () => {
    selected = today();
    month.value = selected.slice(0, 7);
    refresh();
  });
  previousPage.addEventListener('click', () => {
    page--;
    renderRecords();
    if (previousPage.disabled && !nextPage.disabled) nextPage.focus();
  });
  nextPage.addEventListener('click', () => {
    page++;
    renderRecords();
    if (nextPage.disabled && !previousPage.disabled) previousPage.focus();
  });
  if (panel.open) refresh();
}
