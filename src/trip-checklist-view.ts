import './trip-checklist.css';
import { dueDate, todayISO } from './deadline';
import {
  assertSnapshotCurrent, buildChecklistHtml, CHECKLIST_SHEET_CSS, createChecklist,
  readSavedOrders, renderChecklist, SAVED_ORDERS_KEY, sourceLabel,
  type SavedSnapshot, type TripChecklist,
} from './trip-checklist';

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const form = el<HTMLFormElement>('trip-form');
const options = el<HTMLDivElement>('order-options');
const tripDate = el<HTMLInputElement>('trip-date');
const summary = el<HTMLParagraphElement>('selection-summary');
const previewButton = el<HTMLButtonElement>('preview-trip');
const downloadButton = el<HTMLButtonElement>('download-checklist');
const clearButton = el<HTMLButtonElement>('clear-selection');
const preview = el<HTMLDivElement>('checklist-preview');
const empty = el<HTMLDivElement>('empty-preview');
const notice = el<HTMLDivElement>('trip-notice');
const readMessage = el<HTMLParagraphElement>('read-message');
let snapshot: SavedSnapshot | null = null;
let prepared: TripChecklist | null = null;
let stale = false;
const selected = new Set<string>();
// Resolve storage inside getItem so even a blocked localStorage getter gets an actionable read error.
const savedReader = { getItem: (key: string) => window.localStorage.getItem(key) };

const sheetStyle = document.createElement('style');
sheetStyle.textContent = CHECKLIST_SHEET_CSS;
document.head.append(sheetStyle);
tripDate.value = todayISO();

function showNotice(message: string, error = false): void {
  notice.textContent = message;
  notice.hidden = !message;
  notice.classList.toggle('error', error);
}
function retirePreview(): void {
  prepared = null;
  preview.replaceChildren();
  preview.hidden = true;
  empty.hidden = false;
  downloadButton.disabled = true;
}
function selectionChanged(): void {
  summary.textContent = selected.size + (selected.size === 1 ? ' order selected' : ' orders selected');
  previewButton.disabled = stale || selected.size === 0;
  clearButton.disabled = selected.size === 0;
  retirePreview();
  if (!stale) showNotice('');
}
function showFailure(error: unknown): void {
  showNotice(error instanceof Error ? error.message : 'This checklist could not be prepared. Refresh saved orders and try again.', true);
}
function validateCurrent(): boolean {
  if (!snapshot || stale) return false;
  try { assertSnapshotCurrent(snapshot, savedReader); return true; }
  catch (error) {
    stale = true;
    previewButton.disabled = true;
    downloadButton.disabled = true;
    showFailure(error);
    return false;
  }
}
function addOrderOption(order: SavedSnapshot['orders'][number]): void {
  const label = document.createElement('label');
  label.className = 'order-choice';
  const check = document.createElement('input');
  check.type = 'checkbox';
  check.value = order.id;
  const body = document.createElement('span');
  body.className = 'choice-body';
  const heading = document.createElement('strong');
  heading.className = 'choice-merchant';
  heading.textContent = order.merchant || 'Merchant not recorded';
  const ref = document.createElement('span');
  ref.className = 'choice-reference';
  ref.textContent = 'Order ' + (order.orderNo || 'number not recorded') + (order.total ? ' · ' + order.total : '');
  const date = document.createElement('span');
  date.className = 'choice-date';
  date.textContent = 'Calculated deadline · ' + dueDate(order.orderDate, order.windowDays);
  const source = document.createElement('span');
  source.className = 'choice-source';
  source.textContent = sourceLabel(order.windowSource) + ' · ' + order.windowDays + ' days';
  body.append(heading, ref, date, source);
  label.append(check, body);
  check.addEventListener('change', () => {
    if (check.checked) selected.add(order.id); else selected.delete(order.id);
    label.classList.toggle('chosen', check.checked);
    selectionChanged();
  });
  options.append(label);
}
function refresh(): void {
  snapshot = null;
  selected.clear();
  stale = false;
  options.replaceChildren();
  form.hidden = true;
  retirePreview();
  showNotice('');
  selectionChanged();
  readMessage.classList.remove('error');
  try {
    snapshot = readSavedOrders(savedReader);
    const ordered = [...snapshot.orders].sort((a, b) => dueDate(a.orderDate, a.windowDays).localeCompare(dueDate(b.orderDate, b.windowDays)));
    ordered.forEach(addOrderOption);
    readMessage.textContent = ordered.length
      ? ordered.length + (ordered.length === 1 ? ' open saved order ready to choose.' : ' open saved orders ready to choose.')
      : 'No open saved orders are available. Completed returns stay in your tracker history. Reopen a return or save a new order, then refresh here.';
    form.hidden = ordered.length === 0;
  } catch (error) {
    readMessage.textContent = error instanceof Error ? error.message : 'Saved orders could not be read. Return to the tracker to review them, then refresh here.';
    readMessage.classList.add('error');
  }
}
el<HTMLButtonElement>('refresh-orders').addEventListener('click', refresh);
clearButton.addEventListener('click', () => {
  selected.clear();
  options.querySelectorAll<HTMLInputElement>('input').forEach(input => { input.checked = false; });
  options.querySelectorAll('.chosen').forEach(label => label.classList.remove('chosen'));
  selectionChanged();
});
tripDate.addEventListener('input', () => {
  retirePreview();
  if (!stale) showNotice('');
});
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!snapshot || !validateCurrent()) return;
  try {
    prepared = createChecklist(snapshot, [...selected], tripDate.value);
    preview.innerHTML = renderChecklist(prepared);
    preview.hidden = false;
    empty.hidden = true;
    downloadButton.disabled = false;
    showNotice('Preview ready. Review the saved details below, then download your sheet.');
    el<HTMLHeadingElement>('preview-title').setAttribute('tabindex', '-1');
    el<HTMLHeadingElement>('preview-title').focus({ preventScroll: true });
    if (window.matchMedia('(max-width: 820px)').matches) {
      el<HTMLHeadingElement>('preview-title').scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  } catch (error) { retirePreview(); showFailure(error); }
});
downloadButton.addEventListener('click', () => {
  if (!prepared || !validateCurrent()) return;
  try {
    const blob = new Blob([buildChecklistHtml(prepared)], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'returnby-trip-' + prepared.tripDate + '.html';
    document.body.append(link);
    link.click();
    link.remove();
    // Keep the object URL alive while the browser starts the actual download.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    showNotice('Checklist download started. Open the HTML file in a browser and use Print. Marks and notes on paper are not saved here.');
  } catch (error) { showFailure(error); }
});
window.addEventListener('storage', event => {
  if (event.key === SAVED_ORDERS_KEY || event.key === null) validateCurrent();
});
window.addEventListener('focus', () => { validateCurrent(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') validateCurrent();
});
refresh();
