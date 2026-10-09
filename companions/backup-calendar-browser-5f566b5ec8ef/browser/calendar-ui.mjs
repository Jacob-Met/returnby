import { inspectBackupFile, prepareCalendar, calendarDownload, retireCalendarReview, retireBackup } from './calendar-model.mjs';

const $ = id => document.getElementById(id);
let generation = 0, currentDocument = null, review = null, page = 0;
const selected = new Set();
const PAGE_SIZE = 50;
function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}
function cell(row, text) { const node = document.createElement('td'); node.textContent = text ?? '—'; row.append(node); return node; }
function retireReview() {
  if (currentDocument) retireCalendarReview(currentDocument);
  review = null; $('preview').hidden = true; $('download').disabled = true;
  $('preview-body').replaceChildren();
}
function clearSource(message = '') {
  generation += 1; retireReview();
  if (currentDocument) retireBackup(currentDocument);
  currentDocument = null; selected.clear(); page = 0;
  $('source').hidden = true; $('choose').value = '';
  $('rows').replaceChildren(); $('count').textContent = '';
  $('loading').hidden = true;
  if (message) status(message);
}
function ids() { return currentDocument ? currentDocument.rows.filter(row => selected.has(row.id)).map(row => row.id) : []; }
function updateSelection() {
  $('selected-count').textContent = selected.size + ' selected';
  $('prepare').disabled = !selected.size;
  $('clear-selection').disabled = !selected.size;
}
function renderRows() {
  const rows = currentDocument.rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  $('rows').replaceChildren();
  for (const row of rows) {
    const tr = document.createElement('tr');
    const selectCell = cell(tr, '');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox'; checkbox.dataset.id = row.id;
    checkbox.checked = selected.has(row.id); checkbox.disabled = row.status !== 'eligible';
    checkbox.setAttribute('aria-label', 'Include source row ' + row.position + ': ' + (row.merchant || '(unnamed store)') + ' [' + row.id + ']');
    checkbox.addEventListener('change', () => {
      retireReview();
      if (checkbox.checked) selected.add(row.id); else selected.delete(row.id);
      updateSelection(); status('Selection changed. Preview the current reminders before downloading.');
    });
    selectCell.append(checkbox);
    cell(tr, String(row.position)); cell(tr, row.merchant); cell(tr, row.orderNo);
    cell(tr, row.id); cell(tr, row.orderDate);
    cell(tr, row.windowDays + ' days · ' + row.windowSource);
    cell(tr, row.due); cell(tr, row.total ?? '');
    cell(tr, row.status === 'eligible' ? 'Eligible for this calendar' : row.status + ': ' + row.problem);
    cell(tr, row.completedAt ?? '');
    $('rows').append(tr);
  }
  const pages = Math.max(1, Math.ceil(currentDocument.total / PAGE_SIZE));
  $('page-label').textContent = currentDocument.total ? 'Source rows ' + (page * PAGE_SIZE + 1) + '–' + Math.min((page + 1) * PAGE_SIZE, currentDocument.total) + ' of ' + currentDocument.total + ' · page ' + (page + 1) + ' of ' + pages : 'No saved orders in this backup.';
  $('previous').disabled = page === 0;
  $('next').disabled = page + 1 >= pages;
  updateSelection();
}
function showSource() {
  $('source').hidden = false;
  $('source-name').textContent = currentDocument.source.name || '(unnamed file)';
  $('source-hash').textContent = currentDocument.source.sha256;
  $('source-details').textContent = currentDocument.source.bytes.toLocaleString('en-US') + ' bytes · backup version ' + currentDocument.source.version + ' · exported ' + currentDocument.source.exportedAt;
  $('source-clock').textContent = 'Review captured ' + currentDocument.at + '. Browser calendar timezone: ' + Intl.DateTimeFormat().resolvedOptions().timeZone + '.';
  $('count').textContent = currentDocument.total + ' saved orders · ' + currentDocument.eligible + ' eligible · ' + currentDocument.completed + ' completed · ' + currentDocument.blocked + ' blocked';
  $('select-all').disabled = !currentDocument.eligible;
  renderRows();
}
$('choose').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return; // A cancelled native chooser preserves the current view.
  clearSource();
  const token = generation;
  const at = new Date().toISOString();
  $('loading').hidden = false;
  status('Reading ' + file.name + '…');
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('Choose a backup no larger than 5 MiB.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (token !== generation) return;
    if (bytes.byteLength !== file.size) throw new Error('The selected file size changed while reading. Choose it again.');
    const next = await inspectBackupFile(bytes, file.name, at);
    if (token !== generation) { retireBackup(next); return; }
    currentDocument = next; showSource();
    status('Backup inspected. No orders are selected. Choose reminders, then preview.');
  } catch (error) {
    if (token === generation) status('Backup not opened: ' + error.message, true);
  } finally {
    if (token === generation) $('loading').hidden = true;
  }
});
$('clear').addEventListener('click', () => clearSource('Cleared. Your backup and tracker were not changed.'));
$('select-all').addEventListener('click', () => {
  if (!currentDocument) return;
  retireReview(); selected.clear();
  for (const row of currentDocument.rows) if (row.status === 'eligible') selected.add(row.id);
  renderRows(); status('All eligible orders selected. Preview them before downloading.');
});
$('clear-selection').addEventListener('click', () => {
  retireReview(); selected.clear(); if (currentDocument) renderRows();
  status('Selection cleared. The inspected backup is kept.');
});
$('previous').addEventListener('click', () => { if (currentDocument && page > 0) { page -= 1; renderRows(); } });
$('next').addEventListener('click', () => { if (currentDocument && (page + 1) * PAGE_SIZE < currentDocument.total) { page += 1; renderRows(); } });
$('prepare').addEventListener('click', () => {
  retireReview();
  if (!currentDocument) return;
  try {
    review = prepareCalendar(currentDocument, ids());
    $('preview-body').replaceChildren();
    review.reminders.forEach((row, i) => {
      const tr = document.createElement('tr');
      cell(tr, String(i + 1)); cell(tr, row.id); cell(tr, row.merchant);
      cell(tr, row.orderNo ?? ''); cell(tr, row.due);
      $('preview-body').append(tr);
    });
    $('preview-summary').textContent = review.reminders.length + ' reminders · ' + review.bytes.toLocaleString('en-US') + ' UTF-8 bytes · ' + review.filename;
    $('preview-binding').textContent = 'From ' + currentDocument.source.name + ' · SHA-256 ' + currentDocument.source.sha256 + ' · timestamp ' + review.at;
    $('preview').hidden = false; $('download').disabled = false;
    status('Preview ready. Check every selected reminder. Nothing has been downloaded or imported.');
    $('preview-heading').focus();
  } catch (error) { status('Calendar not prepared: ' + error.message, true); }
});
$('download').addEventListener('click', () => {
  let url, anchor;
  try {
    const output = calendarDownload(currentDocument, ids(), review);
    url = URL.createObjectURL(new Blob([output.bytes], { type: 'text/calendar;charset=utf-8' }));
    anchor = document.createElement('a'); anchor.href = url; anchor.download = output.filename;
    document.body.append(anchor); anchor.click();
    status('Download requested: ' + output.filename + ". Check your browser's download location before importing it into a calendar.");
  } catch (error) { retireReview(); status('Download not prepared: ' + error.message, true); }
  finally { anchor?.remove(); if (url) setTimeout(() => URL.revokeObjectURL(url), 1000); }
});
window.addEventListener('pagehide', () => clearSource());
