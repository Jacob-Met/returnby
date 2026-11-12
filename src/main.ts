import { openReceiptProof } from './receipt-photo-archive-ui';
import { pruneOriginalReceipts } from './receipt-photo-archive';
import './receipt-policy.css';
import { receiptPolicy, receiptWindow } from './receipt-policy';
import {readPending,writePending,PENDING_KEY} from './pending-delivery';
import {validReturnEvidenceUrl} from './return-evidence';
import {deadlineOptions,deadlinePhrase,deadlineCaution,validDeadlineRequirement,validMerchantArrivalDeadline} from './deadline-requirement';
import { deliveryReview } from './delivery-review';
import { bindKnownDeadlines } from './known-deadline';
import './known-deadline.css';
import { bindIntakeDeparture } from './intake-departure';
import { bindRefunds, renderRefunds } from './refund-ui';
import { bindSavedReturnsCsv } from './saved-returns-csv-ui';
import { reviewDuplicateIntake } from './duplicate-intake';
import './style.css';
import './desk-navigation.css';
import { bindDeskNavigation } from './desk-navigation';
import './backup.css';
import './edit.css';
import './calendar-batch.css';
import './removal-undo.css';
import { captureRemoval } from './removal-undo';
import { bindRemovalUndo } from './removal-undo-ui';
import { parse } from './parse';
import { lookup, knownMerchants } from './policy';
import { dueDate, returnDueDate, daysLeft, status, todayISO } from './deadline';
import { startDayRefresh } from './day-refresh';
import { bindTabSync } from './tab-sync';
import { bindIntakeDeadline } from './intake-deadline';
import { planSingleCalendar } from './calendar-batch';
import { isSupportedDate } from './trip-checklist';
import { load, read, save, type Order } from './store';
import { bindManualPurchase } from './manual-purchase';
import { completionLabel, isCompleted, planCompletion, type CompletionAction } from './completion';
import { samples } from './samples';
import { bindBackup } from './backup-ui';
import { bindOrderEditor } from './edit-ui';
import { bindCalendarBatch } from './calendar-batch-ui';

const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;
const paste = $<HTMLTextAreaElement>('#paste');
const preview = $<HTMLFormElement>('#preview');
const refreshIntakeDeadline = bindIntakeDeadline(preview);
const pendingDelivery = $<HTMLButtonElement>('#pending-delivery');
pendingDelivery.hidden=true;
const pendingDesk=$<HTMLElement>('#pending-desk');
let pendingId:string|null=null,pendingToken:string|null=null;
function refreshPendingDelivery(){
 try{
  const expanded=pendingDesk.querySelector('details')?.open ?? !window.matchMedia('(max-width: 760px)').matches;
  const saved=readPending(localStorage);pendingDesk.replaceChildren();pendingDesk.hidden=!saved.rows.length;
  if(!saved.rows.length){$('#pending-backup-note').hidden=true;return;}
  const collection=document.createElement('details');collection.open=expanded;
  const heading=document.createElement('summary');heading.textContent='Awaiting delivery ('+saved.rows.length+') — review purchases';collection.append(heading);pendingDesk.append(collection);
  const note=document.createElement('p');note.textContent='Keep each purchase here until you confirm delivery. No deadline or reminder has been created.';collection.append(note);
  for(const row of saved.rows){
   const line=document.createElement('div');line.className='pending-purchase';
   const label=document.createElement('p');label.textContent=(row.fields.merchant||'Purchase')+(row.fields.orderNo?' #'+row.fields.orderNo:'')+' · ordered '+(row.fields.orderDate||'date to review');line.append(label);
   const resume=document.createElement('button');resume.type='button';resume.className='button button-primary';resume.textContent='Review delivery';
   resume.onclick=()=>{const latest=readPending(localStorage);const item=latest.rows.find(x=>x.id===row.id);if(!item){refreshPendingDelivery();return;}if(showPreview(item.fields)){deskNavigation.openIntake();pendingId=item.id;pendingToken=latest.token;preview.scrollIntoView({block:'start'});preview.querySelector<HTMLInputElement>('[name=windowStartDate]')?.focus();}};
   const remove=document.createElement('button');remove.type='button';remove.className='button button-link';remove.textContent='Discard pending purchase';remove.onclick=()=>{if(!window.confirm('Discard pending review for '+(row.fields.merchant||'this purchase')+'? Saved deadlines will stay.'))return;try{const latest=readPending(localStorage);if(JSON.stringify(latest.rows.find(x=>x.id===row.id))!==JSON.stringify(row))throw Error('This pending purchase changed. Review the refreshed details before discarding.');writePending(localStorage,latest.rows.filter(x=>x.id!==row.id),latest.token);refreshPendingDelivery();}catch(e){showStorageError(e instanceof Error?e.message:'Could not remove pending purchase.');}};
   line.append(resume,remove);collection.append(line);
  }
  $('#pending-backup-note').hidden=!saved.rows.length;
  $('#pending-backup-note').textContent='Your backup includes these reviewed pending purchases. They still need delivery confirmation before a deadline is created.';
 }catch{pendingDesk.hidden=false;pendingDesk.textContent='Pending purchases could not be loaded. Existing details have been kept; check browser storage before continuing.';}
}
refreshPendingDelivery();
window.addEventListener('storage',e=>{if(e.key===PENDING_KEY||e.key==='returnby.pending-delivery')refreshPendingDelivery();});
window.addEventListener('returnby-pending-changed',()=>refreshPendingDelivery());
const refreshIntakeDeparture = bindIntakeDeparture(paste, preview);
const search = $<HTMLInputElement>('#return-search');
const searchClear = $<HTMLButtonElement>('#search-clear');
const list = $<HTMLUListElement>('#list');
const storageError = $<HTMLParagraphElement>('#storage-error');
const storageRetry = $<HTMLButtonElement>('#storage-retry');
let orders: Order[] = [];
let loadFailed = false;
let sampleIdx = 0;
let filterMode: 'all' | 'due' | 'expired' | 'completed' = 'all';
let completionReviewed: Order | undefined;
let reviewedIntake = '';
const reviewSignature = () => {
  const fields = new FormData(preview);
  return JSON.stringify(['merchant', 'orderDate', 'orderNo', 'total', 'returnEvidenceUrl', 'deadlineRequirement', 'merchantArrivalDeadline', 'windowStartDate', 'fixedDeadline', 'windowDays']
    .map(name => [name, fields.get(name) ?? '']));
};
const deskNavigation = bindDeskNavigation();

const loadError = "Couldn't load saved returns. Try loading again before saving, or clear saved returns to start over.";

function showStorageError(message: string) {
  storageError.textContent = message;
  storageError.hidden = false;
  storageRetry.hidden = !loadFailed;
  storageError.focus();
}

function clearStorageError() {
  storageError.textContent = '';
  storageError.hidden = true;
  storageRetry.hidden = true;
}

function reloadOrders(): boolean {
  try {
    orders = load();
  } catch {
    loadFailed = true;
    showStorageError(loadError);
    render();
    return false;
  }
  loadFailed = false;
  clearStorageError();
  render();
  return true;
}

function persistOrders(next: Order[], reset = false): boolean {
  if (loadFailed && !reset) {
    showStorageError(loadError);
    return false;
  }
  try {
    save(next);
  } catch {
    showStorageError("Couldn't save this change in your browser. Check storage availability and try again.");
    return false;
  }
  orders = next;
  loadFailed = false;
  clearStorageError();
  return true;
}

// Ordinary actions must start with the current saved list. A tab's displayed
// cards may predate another tab's save, edit, removal or import.
function readCurrentOrders(): Order[] | null {
  if (loadFailed) {
    showStorageError(loadError);
    return null;
  }
  try {
    return load();
  } catch {
    loadFailed = true;
    showStorageError(loadError);
    render();
    return null;
  }
}

function removeOrder(id: string) {
  const displayed = orders.filter(order => order.id === id);
  const current = readCurrentOrders();
  if (!current) return;
  const saved = current.filter(order => order.id === id);
  if (displayed.length !== 1 || saved.length !== 1 || JSON.stringify(displayed[0]) !== JSON.stringify(saved[0])) {
    orders = current;
    render();
    showStorageError('This saved return changed or could not be selected. Review the refreshed tracker before removing it.');
    return;
  }
  const removal = captureRemoval(saved[0], current.indexOf(saved[0]));
  if (persistOrders(current.filter(order => order.id !== id))) {
    render();
    removalUndo.remember(removal);
  }
}

const h = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function refreshPreviewPolicy() {
  const merchant = preview.querySelector<HTMLInputElement>('[name=merchant]');
  const windowDays = preview.querySelector<HTMLInputElement>('[name=windowDays]');
  const chip = preview.querySelector<HTMLElement>('.policy-chip');
  const source = preview.querySelector<HTMLElement>('#src');
  if (!merchant || !windowDays || !chip || !source) return;
  const days = Number(windowDays.value);
  const policy = lookup(merchant.value);
  const receiptDays = Number(preview.dataset.receiptDays || '0');
  if (!Number.isSafeInteger(days) || days < 1) {
    chip.textContent = 'CHECK RETURN WINDOW';
    source.textContent = 'Enter a whole number of days before saving this return.';
  } else if (receiptDays > 0 && days === receiptDays) {
    chip.textContent = 'RECEIPT / ' + days + ' DAYS';
    source.textContent = 'Window mentioned in this receipt; confirm it applies to your purchase.';
  } else if (days !== policy.days) {
    chip.textContent = `YOUR RULE / ${days} DAYS`;
    source.textContent = `Your entered ${days}-day window; confirm this rule with the retailer.`;
  } else {
    chip.textContent = policy.source === 'policy' ? 'STORE MATCH' : `${policy.days}-DAY FALLBACK`;
    source.textContent = policy.source === 'policy'
      ? 'Store rule from the local policy table; confirm with the retailer.'
      : `No store match: editable ${policy.days}-day fallback.`;
  }
}

preview.addEventListener('input', (event) => {
  const field = event.target as HTMLInputElement;
  if (field.name === 'merchant' || field.name === 'windowDays') refreshPreviewPolicy();
});

function showPreview(restored?: Record<string, string>) {
  if (restored && (paste.value !== '' || !preview.hidden) &&
      !window.confirm('Replace your current unsaved receipt and review with the pending purchase? Cancel to keep your current work.')) return false;
  if (!restored && !preview.hidden && reviewedIntake !== reviewSignature() &&
      !window.confirm('Replace your corrected review with details from the pasted receipt? Your unsaved corrections will be lost. Cancel to keep reviewing.')) return false;
  if (restored) paste.value = '';
  const p = restored ? { merchant: restored.merchant, orderDate: restored.orderDate, orderNo: restored.orderNo, total: restored.total, dateWarning: undefined, found: {merchant:true,orderDate:true,orderNo:true,total:true} } : parse(paste.value, knownMerchants);
  const pol = lookup(p.merchant);
  const evidence = receiptPolicy(restored ? '' : paste.value);
  preview.dataset.returnActionRequired = evidence.actionRequired || restored?.deadlineActionReviewRequired === 'yes' ? 'yes' : '';
  preview.dataset.receiptEvidence = evidence.passages.length ? 'yes' : '';
  preview.dataset.receiptDays = evidence.days === undefined ? '' : String(evidence.days);
  const delivery = restored ? {required:true} : deliveryReview(paste.value);
  if(!restored){pendingId=null;pendingToken=null;}
  preview.dataset.pendingResume = restored ? 'yes' : '';
  preview.dataset.deliveryReview = delivery.required ? "yes" : "";
  const field = (name: string, label: string, val: string, ok: boolean, type = 'text') =>
    `<label class="${ok ? '' : 'missing'}">${label}<input name="${name}" type="${type}" value="${h(val)}"></label>`;
  const nothing = !p.found.merchant && !p.found.orderDate;
  const foundCount = Object.values(p.found).filter(Boolean).length;
  preview.innerHTML = `
    <div class="review-head"><div><span>RULE ENGINE / REVIEW</span><strong>${foundCount} OF 4 PURCHASE FIELDS RECOGNIZED</strong></div><span class="policy-chip">${pol.source === 'policy' ? 'STORE MATCH' : '30-DAY FALLBACK'}</span></div>
    <p class="review-note">Amber fields need attention. Confirm or correct the details before saving.</p>
    ${delivery.required ? `<p class="warn" role="status">This receipt describes a return window starting at delivery. ${delivery.date ? 'Delivery date mentioned: ' + h(delivery.date) + '.' : 'No unambiguous delivered date was found.'} Confirm the clock start and return window with the retailer before saving. The order date stays separate.</p>` : ''}
    ${p.dateWarning ? '<p class="warn" role="status">'+h(p.dateWarning)+'</p>' : ''}
    ${nothing ? '<p class="warn">Could not read this one. Fill in the highlighted fields.</p>' : ''}
    ${field('merchant', 'Store', p.merchant, p.found.merchant)}
    ${field('orderDate', 'Order date', p.orderDate, p.found.orderDate, 'date')}
    <label>${delivery.required ? 'Confirm return clock start (required to save a deadline)' : 'Return clock starts (optional; date you confirmed with retailer, such as delivery)'}<input name="windowStartDate" ${delivery.required ? 'required' : ''} type="date" min="1000-01-01" max="9999-12-31" value="${h(restored?.windowStartDate || '')}"></label>
    ${field('orderNo', 'Order #', p.orderNo, p.found.orderNo)}
    ${field('total', 'Total', p.total, p.found.total)}
    <label>Return label, QR or receipt link (optional)<input name="returnEvidenceUrl" type="url" inputmode="url" autocomplete="off" maxlength="2048" placeholder="https://merchant.example/return" value="${h(restored?.returnEvidenceUrl || '')}"></label>
    <label>What must happen by the deadline?<select name="deadlineRequirement">${deadlineOptions(restored?.deadlineRequirement)}</select></label>
    <label>Also: merchant must receive by (optional second date; choose Ship by above)<input name="merchantArrivalDeadline" type="date" min="1000-01-01" max="9999-12-30" value="${h(restored?.merchantArrivalDeadline || '')}"></label>
    <label>Return window (days)<input name="windowDays" type="number" min="1" required value="${h(restored ? (restored.windowDays || '') : receiptWindow(paste.value, pol.days))}"></label>
    ${evidence.passages.length ? '<section class="receipt-policy-evidence" aria-label="Receipt return terms"><h3>Return terms in this receipt</h3><p>'+h(evidence.message)+'</p>'+evidence.passages.map(p=>'<blockquote>'+h(p)+'</blockquote>').join('')+'</section>' : ''}
    <p class="src"><output id="intake-deadline" aria-live="polite" aria-atomic="true"></output></p>
    <p class="src" id="src">${pol.source === 'policy' ? 'Store rule from the local policy table; confirm with the retailer.' : 'No store match: editable 30-day fallback.'}</p>
    ${delivery.required ? '<button type="button" class="button button-link" id="save-pending-delivery">Keep purchase pending delivery</button><p class="review-note">No deadline or reminders until you confirm delivery. Pending purchases stay in this browser and are included when you download a backup.</p>' : ''}<button type="submit" class="button button-primary">Save deadline to tracker</button>`;  preview.dataset.source = pol.source;
  preview.dataset.days = String(pol.days);
  const actionSelect = preview.querySelector<HTMLSelectElement>('select[name=deadlineRequirement]');
  if (preview.dataset.returnActionRequired === 'yes' && actionSelect) {
    actionSelect.required = true;
    actionSelect.options[0].textContent = 'Choose the confirmed return action';
    const warning = document.createElement('p');
    warning.className = 'warn return-action-warning';
    warning.setAttribute('role', 'status');
    warning.textContent = evidence.actionConflict
      ? 'If both dates apply, choose Ship by, confirm the carrier cutoff, and enter the merchant arrival date below.'
      : 'Confirm what must happen by this date. A delivery deadline is not necessarily a shipping deadline.';
    actionSelect.closest('label')?.after(warning);
  }
  preview.hidden = false;
  refreshIntakeDeadline();
  if (delivery.required) preview.querySelector('#save-pending-delivery')?.addEventListener('click', () => {
    const fields: Record<string,string> = {}; new FormData(preview).forEach((value,key) => { fields[key] = String(value); });
    if (preview.dataset.returnActionRequired === 'yes') fields.deadlineActionReviewRequired = 'yes';
    try {
      const saved=readPending(localStorage);
      if(restored&&saved.token!==pendingToken)throw Error('Pending purchases changed. Reopen this purchase before saving.');
      const id=pendingId||crypto.randomUUID();
      writePending(localStorage,[...saved.rows.filter(x=>x.id!==id),{id,updatedAt:new Date().toISOString(),fields}],saved.token);
      pendingId=null;pendingToken=null;refreshPendingDelivery();preview.hidden=true;paste.value='';refreshIntakeDeparture();
    }catch(e){showStorageError(e instanceof Error?e.message:'Could not keep this pending purchase. Your form is still here.');}
  });
  refreshPreviewPolicy();
  reviewedIntake = reviewSignature();
  refreshIntakeDeparture();
  return true;
}

preview.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(preview);
  const orderDate = String(f.get('orderDate') || '');
  if (!orderDate) { (preview.querySelector('[name=orderDate]') as HTMLInputElement).focus(); return; }
  const days = Number(f.get('windowDays'));
  const windowStartDate = String(f.get('windowStartDate') || '');
  if (preview.dataset.deliveryReview === 'yes' && !windowStartDate) { preview.querySelector<HTMLInputElement>('[name=windowStartDate]')?.reportValidity(); return; }
  const clockStart = windowStartDate || orderDate;
  const validDate = (value: string) => isSupportedDate(value) && Number(value.slice(0,4)) >= 1000;
  if (!validDate(clockStart) || !validDate(orderDate) || !Number.isSafeInteger(days) || days < 1 ||
      !validDate(dueDate(clockStart, days)) || !validDate(dueDate(dueDate(clockStart, days), 1))) {
    const hint = preview.querySelector<HTMLOutputElement>('#intake-deadline');
    if (hint) hint.textContent = 'Check the order date, confirmed return-clock start and window. The deadline must be a real supported date.';
    const offending = !validDate(orderDate) ? 'orderDate'
      : windowStartDate && !validDate(windowStartDate) ? 'windowStartDate' : 'windowDays';
    preview.querySelector<HTMLInputElement>('[name="' + offending + '"]')?.focus();
    return;
  }
  const merchant = String(f.get('merchant') || '');
  const returnEvidenceUrl = String(f.get('returnEvidenceUrl') || '').trim();
  if (returnEvidenceUrl && !validReturnEvidenceUrl(returnEvidenceUrl)) {
    const hint = preview.querySelector<HTMLOutputElement>('#intake-deadline');
    if (hint) hint.textContent = 'Use an HTTPS return label, QR or receipt link without a username or password.';
    preview.querySelector<HTMLInputElement>('[name=returnEvidenceUrl]')?.focus();
    return;
  }
  const deadlineRequirement = String(f.get('deadlineRequirement') || '');
  if (preview.dataset.returnActionRequired === 'yes' && !deadlineRequirement) {
    preview.querySelector<HTMLOutputElement>('#intake-deadline')!.textContent = 'Select what must happen by the date after checking the receipt instructions.';
    preview.querySelector<HTMLSelectElement>('[name=deadlineRequirement]')?.focus();
    return;
  }
  if (deadlineRequirement && !validDeadlineRequirement(deadlineRequirement)) {
    preview.querySelector<HTMLOutputElement>('#intake-deadline')!.textContent = 'Choose what the retailer requires by the deadline.';
    return;
  }
  const merchantArrivalDeadline = String(f.get('merchantArrivalDeadline') || '');
  if (!validMerchantArrivalDeadline(merchantArrivalDeadline, deadlineRequirement as Order['deadlineRequirement'], dueDate(clockStart, days))) {
    preview.querySelector<HTMLOutputElement>('#intake-deadline')!.textContent = 'For two cutoffs, choose Ship by and enter a merchant arrival date on or after the carrier cutoff.';
    preview.querySelector<HTMLInputElement>('[name=merchantArrivalDeadline]')?.focus();
    return;
  }
  const pol = lookup(merchant);
  let current: Order[] | null;
  try {
    current = reviewDuplicateIntake({ merchant, orderNo: String(f.get('orderNo') || '') }, readCurrentOrders, message => window.confirm(message));
  } catch (error) {
    const hint = preview.querySelector<HTMLOutputElement>('#intake-deadline');
    if (hint) hint.textContent = error instanceof Error ? error.message : 'Your draft is kept. Review saved returns before trying again.';
    return;
  }
  if (!current) return;
  const next: Order[] = [...current, {
    id: crypto.randomUUID(), merchant, orderNo: String(f.get('orderNo') || ''),
    total: String(f.get('total') || ''), ...(returnEvidenceUrl ? {returnEvidenceUrl} : {}), ...(deadlineRequirement ? {deadlineRequirement:deadlineRequirement as Order['deadlineRequirement']} : {}), ...(merchantArrivalDeadline ? {merchantArrivalDeadline} : {}), orderDate, ...(windowStartDate ? { windowStartDate } : {}), windowDays: days,
    windowSource: preview.dataset.receiptEvidence === 'yes' ? 'user' : days === pol.days ? pol.source : 'user',
    createdAt: new Date().toISOString(),
  }];
  if(pendingId){try{if(readPending(localStorage).token!==pendingToken)throw Error('Pending purchases changed. Reopen this purchase before confirming delivery.');}catch(e){showStorageError(e instanceof Error?e.message:'Could not check pending purchase.');return;}}
  if (!persistOrders(next)) return;
  if(pendingId){try{const saved=readPending(localStorage);writePending(localStorage,saved.rows.filter(x=>x.id!==pendingId),saved.token);pendingId=null;pendingToken=null;refreshPendingDelivery();}catch{showStorageError('Return saved, but pending review could not be cleared. It remains available; avoid saving it again.');}}
  preview.hidden = true; paste.value = ''; refreshIntakeDeparture(); revealSavedOrder(next[next.length - 1]);
});

function refundAction(o: Order): string {
  return '<button class="button button-link" data-refund="' + h(o.id) + '">' + (o.refundState ? 'Review refund' : 'Track a refund') + '</button>';
}

function historyCard(o: Order): string {
  const recorded = new Date(o.completedAt!).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  return '<li class="card completed" data-order-id="' + h(o.id) + '" tabindex="-1"><div class="order-head"><div><strong>' + h(o.merchant || 'Unknown store') + '</strong>'
    + (o.orderNo ? ' <span class="mono">#' + h(o.orderNo) + '</span>' : '')
    + '</div><span class="completion-kind">' + completionLabel(o) + '</span></div>'
    + '<p class="completion-date">Recorded ' + h(recorded) + '</p>'
    + '<div class="window-meta"><span>ORDER ' + h(o.orderDate) + '</span><span>Original ' + h(deadlinePhrase(o.deadlineRequirement).toLowerCase()) + ' ' + h(returnDueDate(o)) + '</span>' + (o.merchantArrivalDeadline ? '<span>Merchant received by ' + h(o.merchantArrivalDeadline) + '</span>' : '') + '</div>'
    + (o.total ? '<p class="history-amount">Order total <strong>' + h(o.total) + '</strong></p>' : '')
    + (o.returnEvidenceUrl ? '<p class="return-document"><a target="_blank" rel="noopener noreferrer" href="'+h(o.returnEvidenceUrl)+'">Open saved return document</a></p>' : '')
    + '<div class="order-actions"><button class="button button-link" data-receipt="' + h(o.id) + '">Paper receipt</button><button class="button button-link" data-reopen="' + h(o.id) + '">Reopen return</button>'
    + '<button class="button button-link" data-edit="' + h(o.id) + '">Edit details</button>'
    + '<button class="button button-link" data-del="' + h(o.id) + '">Remove</button>' + refundAction(o) + '</div></li>';
}

function revealSavedOrder(order: Order) {
  filterMode = 'all';
  search.value = '';
  render();
  $('#edit-feedback').textContent = (order.merchant || 'Purchase') + ' saved. ' + deadlinePhrase(order.deadlineRequirement) + ' ' + returnDueDate(order) + (order.merchantArrivalDeadline ? '; merchant must receive by ' + order.merchantArrivalDeadline : '') + '.';
  deskNavigation.saved(order.id);
}

function render() {
  deskNavigation.update(orders.length, loadFailed);
  renderRefunds(orders, loadFailed);
  const showingHistory = filterMode === 'completed';
  $('#tracker-title').textContent = showingHistory ? 'History' : 'Active returns';
  $('#tracker-description').textContent = showingHistory
    ? 'Returned and kept orders, newest first. Reopen an order to track its original deadline.'
    : 'Your next deadlines, soonest first.';
  for (const id of ['tracker-summary', 'calendar-toolbar', 'trip-link']) $('#' + id).hidden = showingHistory;
  if (loadFailed) {
    for (const id of ['tracked-count', 'soon-count', 'expired-count', 'completed-count']) $('#' + id).textContent = '—';
    list.innerHTML = '<li class="empty">Saved returns are unavailable until they can be loaded.</li>';
    return;
  }
  const query = search.value.trim().toLocaleLowerCase();
  const matchesSearch = (order: Order) => !query || [order.merchant, order.orderNo]
    .some(value => (value ?? '').toLocaleLowerCase().includes(query));
  searchClear.hidden = !search.value;
  const history = orders.filter(isCompleted).sort((a, b) => Date.parse(b.completedAt!) - Date.parse(a.completedAt!));
  const all = orders.filter(o => !isCompleted(o)).map(o => {
    const due = returnDueDate(o), left = daysLeft(due, todayISO());
    const progress = Math.max(0, Math.min(100, Math.round((o.windowDays - left) / Math.max(1, o.windowDays) * 100)));
    return { o, due, left, progress };
  }).sort((a, b) => a.left - b.left);
  $('#tracked-count').textContent = String(all.length);
  $('#soon-count').textContent = String(all.filter(r => r.left >= 0 && r.left <= 7).length);
  $('#expired-count').textContent = String(all.filter(r => r.left < 0).length);
  $('#completed-count').textContent = String(history.length);
  for (const [id, mode] of [['filter-all', 'all'], ['filter-due', 'due'], ['filter-expired', 'expired'], ['filter-completed', 'completed']] as const) {
    const button = $<HTMLButtonElement>('#' + id);
    button.classList.toggle('active', filterMode === mode);
    button.setAttribute('aria-pressed', String(filterMode === mode));
  }
  if (filterMode === 'completed') {
    const visibleHistory = history.filter(matchesSearch);
    $('#search-results').textContent = query ? visibleHistory.length + ' of ' + history.length + ' finished orders match this search.' : '';
    list.innerHTML = visibleHistory.length ? visibleHistory.map(historyCard).join('')
      : '<li class="empty">' + (history.length ? 'No finished orders match. Clear the search to see your History.'
        : 'No finished orders yet. Choose Finish return on an active order to record it as returned or kept.') + '</li>';
    return;
  }
  const rows = all.filter(r => matchesSearch(r.o)).filter(r => filterMode === 'all' || (filterMode === 'due' && r.left >= 0 && r.left <= 7) || (filterMode === 'expired' && r.left < 0));
  $('#search-results').textContent = query ? rows.length + ' of ' + all.length + ' active returns match this search and date filter.' : '';
  if (!rows.length) {
    list.innerHTML = '<li class="empty">' + (all.length ? 'No saved deadlines match. Clear the search or choose another date filter.' : history.length
      ? 'All caught up. Your finished orders are saved in History.'
      : 'No returns tracked yet. Paste an order email above, or try a fictional example.') + '</li>';
    return;
  }
  list.innerHTML = rows.map(({ o, due, left, progress }) => {
    const label = left < 0 ? 'PAST DUE' : left <= 2 ? 'URGENT' : left <= 7 ? 'DUE SOON' : 'ON TRACK';
    const policy = o.fixedDeadline ? 'FIXED DATE / CONFIRMED BY YOU' : o.windowSource === 'policy' ? 'STORE POLICY / ' + o.windowDays + ' DAYS' : o.windowSource === 'default' ? o.windowDays + '-DAY FALLBACK' : 'YOUR RULE / ' + o.windowDays + ' DAYS';
    const count = left < 0 ? 'EXPIRED ' + -left + 'D' : left + ' DAYS LEFT';
    return '<li class="card ' + status(left) + '" data-order-id="' + h(o.id) + '" tabindex="-1"><div class="order-head"><div><strong>' + h(o.merchant || 'Unknown store') + '</strong>'
      + (o.orderNo ? ' <span class="mono">#' + h(o.orderNo) + '</span>' : '') + '</div><span class="status-tag">' + label + '</span></div>'
      + '<div class="window-meta"><span>ORDER ' + h(o.orderDate) + ' · CLOCK ' + h(o.windowStartDate || o.orderDate) + (o.windowStartDate ? ' (confirmed by you)' : ' (order date)') + '</span><span class="source-tag">' + policy + '</span></div>'
      + '<div class="window-track" role="progressbar" aria-label="Return window elapsed" aria-valuenow="' + progress + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + progress + '%"></i></div>'
      + '<div class="order-foot"><span class="return-by">' + h(deadlinePhrase(o.deadlineRequirement).toUpperCase()) + ' ' + h(due) + '</span><strong class="days-left">' + count + '</strong></div>'
      + (o.merchantArrivalDeadline ? '<div class="order-foot second-return-deadline"><span class="return-by">MERCHANT MUST RECEIVE BY ' + h(o.merchantArrivalDeadline) + '</span><strong class="days-left">' + (daysLeft(o.merchantArrivalDeadline, todayISO()) < 0 ? 'PAST DUE' : h(String(daysLeft(o.merchantArrivalDeadline, todayISO()))) + ' DAYS LEFT') + '</strong></div>' : '')
      + (o.deadlineRequirement ? '<p class="return-document return-document-caution">'+h(deadlineCaution(o.deadlineRequirement))+'</p>' : '')
      + (o.returnEvidenceUrl ? '<p class="return-document"><a target="_blank" rel="noopener noreferrer" href="'+h(o.returnEvidenceUrl)+'">Open return label, QR or receipt</a></p>' : '<p class="return-document return-document-missing">No return document saved. Add one in Edit details before going to the store.</p>')
      + '<div class="order-actions"><button class="button button-link" data-receipt="' + h(o.id) + '">Paper receipt</button><button class="button button-primary" data-ics="' + h(o.id) + '">Add calendar reminders</button>'
      + '<button class="button button-link" data-finish="' + h(o.id) + '">Finish return</button>'
      + '<button class="button button-link" data-edit="' + h(o.id) + '">Edit details</button><button class="button button-link" data-del="' + h(o.id) + '">Remove</button>' + refundAction(o) + '</div></li>';
  }).join('');
}

function changeCompletion(displayed: Order | undefined, action: CompletionAction): boolean {
  const current = readCurrentOrders();
  if (!current) return false;
  try {
    const plan = planCompletion(current, displayed, action);
    if (!persistOrders(plan.next)) return false;
    render();
    $('#completion-feedback').textContent = (plan.order.merchant || 'Order') + (action === 'reopen'
      ? ' reopened with its original deadline.'
      : ' marked ' + completionLabel(plan.order).toLowerCase() + ' and saved in History. Remove any old reminder from your calendar.');
    return true;
  } catch (error) {
    orders = current;
    render();
    showStorageError(error instanceof Error ? error.message : 'This return could not be updated.');
    return false;
  }
}

function openCompletion(id: string) {
  const matches = orders.filter(order => order.id === id);
  if (matches.length !== 1 || isCompleted(matches[0])) return;
  completionReviewed = { ...matches[0] };
  $('#finish-order').textContent = completionReviewed.merchant + (completionReviewed.orderNo ? ' · #' + completionReviewed.orderNo : '');
  $<HTMLFormElement>('#finish-form').reset();
  $('#finish-message').hidden = true;
  $<HTMLDialogElement>('#finish-dialog').showModal();
  $('#finish-title').focus();
}

$('#finish-form').addEventListener('submit', e => {
  e.preventDefault();
  const kind = String(new FormData($<HTMLFormElement>('#finish-form')).get('completionKind') || '');
  if (kind !== 'returned' && kind !== 'kept') return;
  if (!changeCompletion(completionReviewed, kind)) {
    $('#finish-message').textContent = storageError.textContent;
    $('#finish-message').hidden = false;
    $('#finish-message').focus();
    return;
  }
  $<HTMLDialogElement>('#finish-dialog').close();
  $('#filter-completed').focus();
});
$('#finish-cancel').addEventListener('click', () => $<HTMLDialogElement>('#finish-dialog').close());
$('#finish-dialog').addEventListener('close', () => {
  const id = completionReviewed?.id;
  const button = Array.from(list.querySelectorAll<HTMLButtonElement>('button[data-finish]')).find(item => item.dataset.finish === id);
  button?.focus();
  completionReviewed = undefined;
});
list.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  if (t.dataset.finish) openCompletion(t.dataset.finish);
  if (t.dataset.reopen) {
    const matches = orders.filter(order => order.id === t.dataset.reopen);
    if (changeCompletion(matches.length === 1 ? matches[0] : undefined, 'reopen')) $('#filter-all').focus();
  }
  if (t.dataset.edit !== undefined) orderEditor.open(t.dataset.edit);
  if (t.dataset.receipt !== undefined) {
    const match = orders.filter(order => order.id === t.dataset.receipt);
    if (match.length === 1) void openReceiptProof(match[0]);
    else showStorageError('This purchase cannot be selected uniquely. Refresh saved returns first.');
  }
  if (t.dataset.del) removeOrder(t.dataset.del);
  if (t.dataset.ics) {
    const displayed = orders.filter(order => order.id === t.dataset.ics);
    if (displayed.length !== 1) {
      showStorageError('This saved return could not be selected uniquely. Review the tracker before downloading.');
      return;
    }
    const current = readCurrentOrders();
    if (!current) return;
    try {
      // Retain the card's freshness check before opening the shared alert review.
      planSingleCalendar(current, displayed[0]);
      calendarExporter.openSingle(displayed[0]);
      clearStorageError();
    } catch (error) {
      orders = current;
      render();
      showStorageError(error instanceof Error ? error.message : 'This return could not be exported. Review the refreshed tracker.');
    }
  }
});

search.addEventListener('input', render);
searchClear.addEventListener('click', () => { search.value = ''; render(); search.focus(); });
$('#filter-completed').addEventListener('click', () => {
  filterMode = 'completed';
  render();
  $('#saved-returns').scrollIntoView({ block: 'start' });
});
$('#filter-all').addEventListener('click',()=>{filterMode='all';render();});$('#filter-due').addEventListener('click',()=>{filterMode='due';render();});$('#filter-expired').addEventListener('click',()=>{filterMode='expired';render();});$('#find').addEventListener('click',()=>showPreview());
paste.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) showPreview(); });
$('#sample').addEventListener('click', (e) => {
  e.preventDefault();
  if ((paste.value !== '' || !preview.hidden) &&
      !window.confirm('Replace your unsaved receipt and review with an example? Cancel to keep your purchase details.')) return;
  preview.hidden = true;
  paste.value = samples[sampleIdx++ % samples.length];
  showPreview();
});
// Clearing all returns must not erase orders another tab saved while a destructive
// confirmation was open. Unlike normal edits, this action has no selected record
// to detect a stale view, so compare the complete saved state on both sides.
function clearAllTrackedOrders() {
  let snapshot: string | null;
  try {
    snapshot = localStorage.getItem('returnby.v1');
  } catch {
    showStorageError("Couldn't check saved returns before clearing. Nothing was deleted.");
    return;
  }
  if (!loadFailed) {
    const current = readCurrentOrders();
    if (!current) return;
    if (JSON.stringify(current) !== JSON.stringify(orders)) {
      orders = current;
      render();
      showStorageError('Saved returns changed in another tab. Review the refreshed tracker before clearing.');
      return;
    }
  }
  if (!confirm('Delete all saved returns?')) return;
  try {
    if (localStorage.getItem('returnby.v1') !== snapshot) {
      reloadOrders();
      showStorageError('Saved returns changed while you were confirming. Nothing was deleted; review the refreshed tracker.');
      return;
    }
  } catch {
    showStorageError("Couldn't recheck saved returns. Nothing was deleted; try again when browser storage is available.");
    return;
  }
  // Reset remains available for a genuinely unreadable store, as before.
  if (persistOrders([], true)) { render(); removalUndo.clear(); void pruneOriginalReceipts([]).catch(() => {}); }
}
$('#clear').addEventListener('click', clearAllTrackedOrders);
storageRetry.addEventListener('click', reloadOrders);
bindBackup({ read, commit: next => { if (!persistOrders(next)) return false; render(); return true; }, showSaved: id => { $('#edit-feedback').textContent = 'Restored purchase ready. Open Paper receipt to see the saved original.'; deskNavigation.saved(id); } });
const orderEditor = bindOrderEditor({
  getOrders: () => orders,
  read: load,
  commit: next => { if (!persistOrders(next)) return false; render(); return true; },
  refresh: reloadOrders,
});
bindManualPurchase({ read: readCurrentOrders, commit: next => { if (!persistOrders(next)) return false; render(); return true; }, onSaved: revealSavedOrder });
const calendarExporter = bindCalendarBatch({ read: load, filter: () => filterMode });
const removalUndo = bindRemovalUndo({
  read: readCurrentOrders,
  commit: next => { if (!persistOrders(next)) return false; render(); return true; },
  refresh: current => { orders = current; render(); },
  focusTracker: () => $('#filter-' + filterMode).focus(),
});
bindRefunds({ commit: next => { if (!persistOrders(next)) return false; render(); return true; } });
bindTabSync({ refresh: reloadOrders });
if (reloadOrders()) void pruneOriginalReceipts(orders).catch(() => {});

if (typeof window !== 'undefined' && typeof document !== 'undefined') startDayRefresh(() => {
  // Preserve the currently focused saved-row action through midnight's
  // urgency reorder; do not silently move keyboard focus to another order.
  const active = document.activeElement;
  const focused = active instanceof HTMLButtonElement && list.contains(active) ? active : undefined;
  const action = (['ics', 'finish', 'reopen', 'edit', 'del'] as const).find(name => focused?.hasAttribute('data-' + name));
  const id = action ? focused?.dataset[action] : undefined;
  render();
  if (!action || id === undefined || loadFailed) return;
  const next = Array.from(list.querySelectorAll<HTMLButtonElement>('button[data-' + action + ']'))
    .find(button => button.dataset[action] === id);
  (next ?? $<HTMLButtonElement>('#filter-' + filterMode)).focus({ preventScroll: true });
});

bindSavedReturnsCsv(read);

bindKnownDeadlines();
