import './trip-checklist.css';
import { returnDueDate } from './deadline';
import {
  assertSnapshotCurrent, buildChecklistHtml, CHECKLIST_SHEET_CSS, createChecklist,
  readSavedOrders, renderChecklist, SAVED_ORDERS_KEY, sourceLabel,
  isSupportedDate, tripTiming, type SavedSnapshot, type TripChecklist, type TripPacking,
} from './trip-checklist';
import {
  alignTripPlan, emptyTripPlan, planOrder, readTripPlan, saveTripPlan, TRIP_PLAN_KEY,
  TripPlanError, type PlannedOrder, type TripPlan,
} from './trip-plan';

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
const packing = el<HTMLDivElement>('packing-planner');
const planStatus = el<HTMLParagraphElement>('plan-status');
const retrySave = el<HTMLButtonElement>('retry-trip-save');
const reloadPlan = el<HTMLButtonElement>('reload-trip');
const keepPlan = el<HTMLButtonElement>('keep-trip');
let snapshot: SavedSnapshot | null = null;
let prepared: TripChecklist | null = null;
let stale = false;
let plan: TripPlan = emptyTripPlan();
let planRaw: string | null = null;
let planReadable = true;
let unsaved = false;
let unavailable: PlannedOrder[] = [];
const selected = new Set<string>();
const tripSearch = el<HTMLInputElement>('trip-search');
const clearSearch = el<HTMLButtonElement>('trip-search-clear');
const searchResults = el<HTMLParagraphElement>('trip-search-results');
const searchEmpty = el<HTMLParagraphElement>('trip-search-empty');
const optionRows: { label: HTMLLabelElement; id: string; merchant: string; reference: string }[] = [];
const searchable = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

// Filtering changes only which existing choices are visible. Selection, packing
// notes and a prepared printable sheet belong to the trip, not the search.
function filterOrderOptions(): void {
  const query = searchable(tripSearch.value);
  const referenceQuery = query.replace(/^#/, '');
  let shown = 0;
  let selectedShown = 0;
  for (const row of optionRows) {
    const matches = !query || row.merchant.includes(query)
      || (!!referenceQuery && row.reference.includes(referenceQuery));
    row.label.hidden = !matches;
    if (matches) {
      shown++;
      if (selected.has(row.id)) selectedShown++;
    }
  }
  clearSearch.hidden = tripSearch.value.length === 0;
  searchResults.textContent = query
    ? shown + ' of ' + optionRows.length + ' saved orders shown.'
    : optionRows.length + (optionRows.length === 1 ? ' saved order.' : ' saved orders.');
  searchEmpty.hidden = shown !== 0;
  const elsewhere = selected.size - selectedShown;
  summary.textContent = selected.size + (selected.size === 1 ? ' order selected' : ' orders selected')
    + (elsewhere > 0 ? ' · ' + elsewhere + ' outside this search' : '');
}

const planStorage = {
  getItem: (key: string) => window.localStorage.getItem(key),
  setItem: (key: string, value: string) => window.localStorage.setItem(key, value),
};
const savedReader = { getItem: (key: string) => window.localStorage.getItem(key) };
const sheetStyle = document.createElement('style');
sheetStyle.textContent = CHECKLIST_SHEET_CSS;
document.head.append(sheetStyle);

function showNotice(message: string, error = false): void {
  notice.textContent = message;
  notice.hidden = !message;
  notice.classList.toggle('error', error);
}
function planMessage(message: string, error = false): void {
  planStatus.textContent = message;
  planStatus.classList.toggle('error', error);
}
function retirePreview(): void {
  prepared = null;
  preview.replaceChildren();
  preview.hidden = true;
  empty.hidden = false;
  downloadButton.disabled = true;
}
function persist(): void {
  unsaved = true;
  if (!planReadable) { planMessage('This trip is only open in this tab. Load the saved trip or retry browser storage before closing.', true); reloadPlan.hidden = false; return; }
  try {
    planRaw = saveTripPlan(planStorage, plan, planRaw);
    unsaved = false;
    retrySave.hidden = true;
    reloadPlan.hidden = true;
    keepPlan.hidden = true;
    planMessage('Trip saved on this device.');
  } catch (error) {
    const conflict = error instanceof TripPlanError && error.code === 'conflict';
    planMessage(error instanceof Error ? error.message : 'This trip could not be saved. Keep this tab open and retry.', true);
    retrySave.hidden = conflict;
    reloadPlan.hidden = !conflict;
    keepPlan.hidden = !conflict;
  }
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
function entryFor(id: string): PlannedOrder {
  let entry = plan.orders.find(value => value.id === id);
  if (!entry) {
    const order = snapshot!.orders.find(value => value.id === id)!;
    entry = planOrder(order);
    plan.orders.push(entry);
  }
  return entry;
}
function selectionChanged(save = true): void {
  filterOrderOptions();
  previewButton.disabled = stale || selected.size === 0;
  clearButton.disabled = selected.size === 0;
  el<HTMLAnchorElement>('pack-selected').hidden = selected.size === 0;
  retirePreview();
  renderPacking();
  if (save) persist();
}
function renderPacking(): void {
  packing.replaceChildren();
  if (!snapshot) return;
  for (const order of snapshot.orders.filter(value => selected.has(value.id)).sort((a,b) => returnDueDate(a).localeCompare(returnDueDate(b)))) {
    const entry = entryFor(order.id);
    const section = document.createElement('section');
    section.className = 'packing-order';
    const title = document.createElement('h3');
    title.textContent = order.merchant || 'Unnamed store';
    const ref = document.createElement('p');
    ref.className = 'packing-reference';
    ref.textContent = (order.orderNo ? '#' + order.orderNo + ' · ' : '') + 'Return by ' + returnDueDate(order);
    section.append(title, ref);
    if (isSupportedDate(tripDate.value)) {
      const timing = document.createElement('p');
      const due = returnDueDate(order);
      timing.className = 'packing-timing' + (tripDate.value > due ? ' late' : '');
      timing.textContent = 'Planned trip: ' + tripTiming(due, tripDate.value).toLowerCase() + '.';
      section.append(timing);
    }
    const checks: [keyof Pick<TripPacking, 'packed' | 'receiptReady' | 'instructionsChecked'>, string][] = [
      ['packed', 'Item, tags and packaging ready'],
      ['receiptReady', 'Receipt or order confirmation ready'],
      ['instructionsChecked', 'Store instructions and return arrangement checked'],
    ];
    for (const [key, text] of checks) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = entry[key];
      input.dataset.packing = key;
      input.addEventListener('change', () => { entry[key] = input.checked; retirePreview(); persist(); });
      label.append(input, document.createTextNode(text));
      section.append(label);
    }
    const label = document.createElement('label');
    label.className = 'packing-notes-label';
    const text = document.createElement('span');
    text.textContent = 'Drop-off details or packing notes';
    const notes = document.createElement('textarea');
    notes.rows = 3;
    notes.maxLength = 2000;
    notes.value = entry.notes;
    notes.placeholder = 'For example: bring the QR code; leave the parcel at the service desk.';
    notes.addEventListener('input', () => { entry.notes = notes.value; retirePreview(); persist(); });
    label.append(text, notes);
    section.append(label);
    packing.append(section);
  }
  if (unavailable.length) {
    const section = document.createElement('section');
    section.className = 'unavailable-plan';
    const title = document.createElement('h3');
    title.textContent = 'Orders no longer available';
    const description = document.createElement('p');
    description.textContent = 'These orders are no longer available for this trip. They are left out of the sheet; your notes are kept below.';
    section.append(title, description);
    for (const entry of unavailable) {
      const row = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = (entry.merchant || 'Unnamed store') + (entry.orderNo ? ' · #' + entry.orderNo : '');
      const note = document.createElement('p');
      note.textContent = entry.notes || 'No packing notes.';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'text-button';
      remove.textContent = 'Remove from trip plan';
      remove.addEventListener('click', () => {
        plan.orders = plan.orders.filter(value => value.id !== entry.id);
        unavailable = unavailable.filter(value => value.id !== entry.id);
        renderPacking(); persist();
      });
      row.append(title, note, remove);
      section.append(row);
    }
    packing.append(section);
  }
}
function addOrderOption(order: SavedSnapshot['orders'][number]): void {
  const label = document.createElement('label');
  label.className = 'order-choice';
  const check = document.createElement('input');
  check.type = 'checkbox';
  check.value = order.id;
  check.checked = selected.has(order.id);
  label.classList.toggle('chosen', check.checked);
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
  date.textContent = 'Calculated deadline · ' + returnDueDate(order);
  const source = document.createElement('span');
  source.className = 'choice-source';
  source.textContent = sourceLabel(order.windowSource) + ' · ' + order.windowDays + ' days';
  body.append(heading, ref, date, source);
  label.append(check, body);
  check.addEventListener('change', () => {
    if (check.checked) selected.add(order.id); else selected.delete(order.id);
    entryFor(order.id).selected = check.checked;
    label.classList.toggle('chosen', check.checked);
    selectionChanged();
  });
  optionRows.push({ label, id: order.id, merchant: searchable(order.merchant), reference: searchable(order.orderNo || '') });
  options.append(label);
}
function refresh(): void {
  snapshot = null;
  selected.clear();
  stale = false;
  options.replaceChildren();
  optionRows.length = 0;
  form.hidden = true;
  retirePreview();
  showNotice('');
  readMessage.classList.remove('error');
  try {
    snapshot = readSavedOrders(savedReader);
    const aligned = alignTripPlan(plan, snapshot);
    plan = aligned.plan;
    unavailable = aligned.unavailable;
    plan.orders.filter(entry => entry.selected).forEach(entry => selected.add(entry.id));
    const ordered = [...snapshot.orders].sort((a, b) => returnDueDate(a).localeCompare(returnDueDate(b)));

    ordered.forEach(addOrderOption);
    readMessage.textContent = ordered.length
      ? ordered.length + (ordered.length === 1 ? ' saved order ready to choose.' : ' saved orders ready to choose.')
      : 'No saved returns. Add an order in your tracker to plan another trip.';
    form.hidden = ordered.length === 0;
    selectionChanged(false);
    const changes = [];
    if (aligned.changed.length) changes.push('Saved details changed for ' + aligned.changed.join(', ') + '. Review the current dates and check the store instructions again; your packing notes are kept.');
    if (unavailable.length) changes.push(unavailable.length + (unavailable.length === 1 ? ' order is' : ' orders are') + ' no longer available and will not appear on the sheet.');
    if (changes.length) showNotice(changes.join(' '));
  } catch (error) {
    readMessage.textContent = error instanceof Error ? error.message : 'Saved orders could not be read. Refresh and try again.';
    readMessage.classList.add('error');
    packing.replaceChildren();
  }
}
function loadPlan(): void {
  try {
    const saved = readTripPlan(planStorage);
    plan = saved.plan || emptyTripPlan();
    planRaw = saved.raw;
    planReadable = true;
    unsaved = false;
    planMessage(saved.plan ? 'Your trip is restored. Packing checks and notes are ready to continue.' : 'Choose orders for a trip. Your plan will be saved on this device.');
    retrySave.hidden = true; reloadPlan.hidden = true; keepPlan.hidden = true;
  } catch (error) {
    planReadable = false;
    planMessage(error instanceof Error ? error.message : 'Your saved trip could not be read.', true);
    reloadPlan.hidden = false;
  }
  tripDate.value = plan.tripDate;
  refresh();
}
el<HTMLButtonElement>('refresh-orders').addEventListener('click', refresh);
tripSearch.addEventListener('input', filterOrderOptions);
tripSearch.addEventListener('keydown', event => {
  if (event.key === 'Enter') event.preventDefault();
});
clearSearch.addEventListener('click', () => {
  tripSearch.value = '';
  filterOrderOptions();
  tripSearch.focus();
});

clearButton.addEventListener('click', () => {
  selected.clear();
  plan.orders.forEach(entry => { entry.selected = false; });
  options.querySelectorAll<HTMLInputElement>('input').forEach(input => { input.checked = false; });
  options.querySelectorAll('.chosen').forEach(label => label.classList.remove('chosen'));
  selectionChanged();
});
tripDate.addEventListener('input', () => { plan.tripDate = tripDate.value; retirePreview(); renderPacking(); persist(); });
retrySave.addEventListener('click', persist);
reloadPlan.addEventListener('click', () => {
  if (!unsaved || window.confirm('Load the saved trip and replace unsaved changes in this tab?')) loadPlan();
});
keepPlan.addEventListener('click', () => {
  try { planRaw = planStorage.getItem(TRIP_PLAN_KEY); planReadable = true; persist(); }
  catch { planMessage('Browser storage is unavailable. This trip is still open in this tab.', true); }
});
el<HTMLButtonElement>('new-trip').addEventListener('click', () => {
  if ((plan.orders.length || !planReadable) && !window.confirm('Start a new trip? This replaces the saved trip, its packing checks and notes. Your saved orders stay unchanged.')) return;
  try { planRaw = planStorage.getItem(TRIP_PLAN_KEY); planReadable = true; }
  catch { planReadable = false; }
  plan = emptyTripPlan();
  tripDate.value = plan.tripDate;
  refresh();
  persist();
});
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!snapshot || !validateCurrent()) return;
  try {
    const checks: Record<string, TripPacking> = {};
    for (const id of selected) checks[id] = { ...entryFor(id) };
    prepared = { ...createChecklist(snapshot, [...selected], tripDate.value), packing: checks };
    preview.innerHTML = renderChecklist(prepared);
    preview.hidden = false;
    empty.hidden = true;
    downloadButton.disabled = false;
    persist();
    showNotice('Preview ready. Review the current dates, checks and notes, then download your sheet.');
    el<HTMLHeadingElement>('preview-title').setAttribute('tabindex', '-1');
    el<HTMLHeadingElement>('preview-title').focus({ preventScroll: true });
    if (window.matchMedia('(max-width: 820px)').matches) el<HTMLHeadingElement>('preview-title').scrollIntoView({ block: 'start', behavior: 'smooth' });
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
    document.body.append(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    showNotice(unsaved ? 'Checklist downloaded with your current checks and notes. The file works offline. This tab’s edits are not saved yet; retry saving before closing.' : 'Checklist downloaded with your current checks and notes. The file works offline; your editable trip stays saved in this browser.');
  } catch (error) { showFailure(error); }
});
window.addEventListener('storage', event => {
  if (event.key === SAVED_ORDERS_KEY || event.key === null) validateCurrent();
  if ((event.key === TRIP_PLAN_KEY || event.key === null) && event.newValue !== planRaw) {
    planMessage('This trip changed in another tab. Load the saved trip, or keep this tab’s trip instead.', true);
    reloadPlan.hidden = false; keepPlan.hidden = false;
  }
});
window.addEventListener('focus', () => { validateCurrent(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') validateCurrent(); });
window.addEventListener('beforeunload', event => { if (unsaved) { event.preventDefault(); event.returnValue = ''; } });
loadPlan();
