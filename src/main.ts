import { deliveryReview } from './delivery-review';
import './style.css';
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
import { samples } from './samples';
import { bindBackup } from './backup-ui';
import { bindOrderEditor } from './edit-ui';
import { bindCalendarBatch, downloadCalendar } from './calendar-batch-ui';

const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;
const paste = $<HTMLTextAreaElement>('#paste');
const preview = $<HTMLFormElement>('#preview');
const refreshIntakeDeadline = bindIntakeDeadline(preview);
const pendingDelivery = $<HTMLButtonElement>('#pending-delivery');
pendingDelivery.type = 'button'; pendingDelivery.className = 'button button-link';
pendingDelivery.textContent = 'Purchase pending delivery — resume review';

function refreshPendingDelivery() {
  try { const raw = localStorage.getItem('returnby.pending-delivery'); pendingDelivery.hidden = !raw;
    if(raw) { const fields = JSON.parse(raw); pendingDelivery.textContent = `${fields.merchant || 'Purchase'}${fields.orderNo ? ' #' + fields.orderNo : ''} pending delivery — resume review`; }
    $('#pending-backup-note').hidden = !raw;
  } catch { pendingDelivery.hidden = true; }
}
refreshPendingDelivery();
pendingDelivery.addEventListener('click', () => {
  try { const raw = localStorage.getItem('returnby.pending-delivery'); if(raw) showPreview(JSON.parse(raw)); }
  catch { showStorageError('Could not open the pending purchase.'); }
});
const search = $<HTMLInputElement>('#return-search');
const searchClear = $<HTMLButtonElement>('#search-clear');
const list = $<HTMLUListElement>('#list');
const storageError = $<HTMLParagraphElement>('#storage-error');
const storageRetry = $<HTMLButtonElement>('#storage-retry');
let orders: Order[] = [];
let loadFailed = false;
let sampleIdx = 0;
let filterMode: 'all' | 'due' | 'expired' = 'all';

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

function showPreview(restored?: Record<string, string>) {
  const p = restored ? { merchant: restored.merchant, orderDate: restored.orderDate, orderNo: restored.orderNo, total: restored.total, found: {merchant:true,orderDate:true,orderNo:true,total:true} } : parse(paste.value, knownMerchants);
  const pol = lookup(p.merchant);
  const delivery = restored ? {required:true} : deliveryReview(paste.value);
  preview.dataset.pendingResume = restored ? 'yes' : '';
  preview.dataset.deliveryReview = delivery.required ? "yes" : "";
  const field = (name: string, label: string, val: string, ok: boolean, type = 'text') =>
    `<label class="${ok ? '' : 'missing'}">${label}<input name="${name}" type="${type}" value="${h(val)}"></label>`;
  const nothing = !p.found.merchant && !p.found.orderDate;
  const foundCount = Object.values(p.found).filter(Boolean).length;
  preview.innerHTML = `
    <div class="review-head"><div><span>RULE ENGINE / REVIEW</span><strong>${foundCount} OF 4 FIELDS RECOGNIZED</strong></div><span class="policy-chip">${pol.source === 'policy' ? 'STORE MATCH' : '30-DAY FALLBACK'}</span></div>
    <p class="review-note">Amber fields need attention. Confirm or correct the details before saving.</p>
    ${delivery.required ? `<p class="warn" role="status">This receipt describes a return window starting at delivery. ${delivery.date ? 'Delivery date mentioned: ' + h(delivery.date) + '.' : 'No unambiguous delivered date was found.'} Confirm the clock start and return window with the retailer before saving. The order date stays separate.</p>` : ''}
    ${nothing ? '<p class="warn">Could not read this one. Fill in the highlighted fields.</p>' : ''}
    ${field('merchant', 'Store', p.merchant, p.found.merchant)}
    ${field('orderDate', 'Order date', p.orderDate, p.found.orderDate, 'date')}
    <label>${delivery.required ? 'Confirm return clock start (required to save a deadline)' : 'Return clock starts (optional; date you confirmed with retailer, such as delivery)'}<input name="windowStartDate" ${delivery.required ? 'required' : ''} type="date" min="1000-01-01" max="9999-12-31"></label>
    ${field('orderNo', 'Order #', p.orderNo, p.found.orderNo)}
    ${field('total', 'Total', p.total, p.found.total)}
    <label>Return window (days)<input name="windowDays" type="number" min="1" value="${restored?.windowDays || pol.days}"></label>
    <p class="src"><output id="intake-deadline" aria-live="polite" aria-atomic="true"></output></p>
    <p class="src" id="src">${pol.source === 'policy' ? 'Store rule from the local policy table; confirm with the retailer.' : 'No store match: editable 30-day fallback.'}</p>
    ${delivery.required ? '<button type="button" class="button button-link" id="save-pending-delivery">Keep purchase pending delivery</button><p class="review-note">No deadline or reminders until you confirm delivery. Pending purchases stay in this browser and are not included in return backups.</p>' : ''}<button type="submit" class="button button-primary">Save deadline to tracker</button>`;  preview.dataset.source = pol.source;
  preview.dataset.days = String(pol.days);
  preview.hidden = false;
  refreshIntakeDeadline();
  if (delivery.required) preview.querySelector('#save-pending-delivery')?.addEventListener('click', () => {
    const fields: Record<string,string> = {}; new FormData(preview).forEach((value,key) => { fields[key] = String(value); });
    if (!restored && localStorage.getItem('returnby.pending-delivery')) { showStorageError('A purchase is already pending delivery. Resume that review before keeping another pending purchase.'); return; }
    try { localStorage.setItem('returnby.pending-delivery', JSON.stringify(fields)); refreshPendingDelivery(); preview.hidden = true; paste.value = ''; }
    catch { showStorageError('Could not keep this pending purchase. Your form is still here.'); }
  });
}

preview.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(preview);
  const orderDate = String(f.get('orderDate') || '');
  if (!orderDate) { (preview.querySelector('[name=orderDate]') as HTMLInputElement).focus(); return; }
  const days = Number(f.get('windowDays')) || 30;
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
  const pol = lookup(merchant);
  const current = readCurrentOrders();
  if (!current) return;
  const next: Order[] = [...current, {
    id: crypto.randomUUID(), merchant, orderNo: String(f.get('orderNo') || ''),
    total: String(f.get('total') || ''), orderDate, ...(windowStartDate ? { windowStartDate } : {}), windowDays: days,
    windowSource: days === pol.days ? pol.source : 'user',
    createdAt: new Date().toISOString(),
  }];
  if (!persistOrders(next)) return;
  if(preview.dataset.pendingResume === 'yes') { try { localStorage.removeItem('returnby.pending-delivery'); refreshPendingDelivery(); } catch { showStorageError('Return saved, but pending draft could not be cleared.'); } }
  preview.hidden = true; paste.value = ''; render();
});

function render() {
  if (loadFailed) {
    for (const id of ['tracked-count', 'soon-count', 'expired-count']) $(`#${id}`).textContent = '—';
    list.innerHTML = '<li class="empty">Saved returns are unavailable until they can be loaded.</li>';
    return;
  }
  const all=orders.map(o=>{const due=returnDueDate(o),left=daysLeft(due,todayISO()),progress=Math.max(0,Math.min(100,Math.round((o.windowDays-left)/Math.max(1,o.windowDays)*100)));return {o,due,left,progress};}).sort((a,b)=>a.left-b.left);
  $('#tracked-count').textContent=String(all.length);$('#soon-count').textContent=String(all.filter(r=>r.left>=0&&r.left<=7).length);$('#expired-count').textContent=String(all.filter(r=>r.left<0).length);
  for(const [id,mode] of [['filter-all','all'],['filter-due','due'],['filter-expired','expired']] as const){const b=$<HTMLButtonElement>(`#${id}`);b.classList.toggle('active',filterMode===mode);b.setAttribute('aria-pressed',String(filterMode===mode));}
  const query = search.value.trim().toLocaleLowerCase();
  searchClear.hidden = !search.value;
  const rows=all.filter(r=>!query || [r.o.merchant,r.o.orderNo].some(value=>(value ?? "").toLocaleLowerCase().includes(query))).filter(r=>filterMode==='all'||(filterMode==='due'&&r.left>=0&&r.left<=7)||(filterMode==='expired'&&r.left<0));
  $('#search-results').textContent = query ? rows.length + ' of ' + all.length + ' saved returns match this search and date filter.' : '';
  if(!rows.length){list.innerHTML=`<li class="empty">${all.length?'No saved deadlines match. Clear the search or choose another date filter.':'No returns tracked yet. Paste an order email above, or try a fictional example.'}</li>`;return;}
  list.innerHTML=rows.map(({o,due,left,progress})=>{const label=left<0?'PAST DUE':left<=2?'URGENT':left<=7?'DUE SOON':'ON TRACK';const policy=o.windowSource==='policy'?`STORE POLICY / ${o.windowDays} DAYS`:o.windowSource==='default'?`${o.windowDays}-DAY FALLBACK`:`YOUR RULE / ${o.windowDays} DAYS`;const count=left<0?`EXPIRED ${-left}D`:`${left} DAYS LEFT`;return `<li class="card ${status(left)}"><div class="order-head"><div><strong>${h(o.merchant||'Unknown store')}</strong>${o.orderNo?` <span class="mono">#${h(o.orderNo)}</span>`:''}</div><span class="status-tag">${label}</span></div><div class="window-meta"><span>ORDER ${h(o.orderDate)} · CLOCK ${h(o.windowStartDate || o.orderDate)}${o.windowStartDate ? ' (confirmed by you)' : ' (order date)'}</span><span class="source-tag">${policy}</span></div><div class="window-track" role="progressbar" aria-label="Return window elapsed" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${progress}%"></i></div><div class="order-foot"><span class="return-by">RETURN BY ${h(due)}</span><strong class="days-left">${count}</strong></div><div class="order-actions"><button class="button button-primary" data-ics="${h(o.id)}">Add calendar reminder</button><button class="button button-link" data-edit="${h(o.id)}">Edit details</button><button class="button button-link" data-del="${h(o.id)}">Remove</button></div></li>`;}).join('');
}
list.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  if (t.dataset.edit !== undefined) orderEditor.open(t.dataset.edit);
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
      const plan = planSingleCalendar(current, displayed[0]);
      downloadCalendar(plan.content, plan.filename);
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
$('#filter-all').addEventListener('click',()=>{filterMode='all';render();});$('#filter-due').addEventListener('click',()=>{filterMode='due';render();});$('#filter-expired').addEventListener('click',()=>{filterMode='expired';render();});$('#find').addEventListener('click',()=>showPreview());
paste.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) showPreview(); });
$('#sample').addEventListener('click', (e) => { e.preventDefault(); paste.value = samples[sampleIdx++ % samples.length]; showPreview(); });
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
  if (persistOrders([], true)) { render(); removalUndo.clear(); }
}
$('#clear').addEventListener('click', clearAllTrackedOrders);
storageRetry.addEventListener('click', reloadOrders);
bindBackup({ read, commit: next => { if (!persistOrders(next)) return false; render(); return true; } });
const orderEditor = bindOrderEditor({
  getOrders: () => orders,
  read: load,
  commit: next => { if (!persistOrders(next)) return false; render(); return true; },
  refresh: reloadOrders,
});
bindManualPurchase({ read: readCurrentOrders, commit: next => { if (!persistOrders(next)) return false; render(); return true; } });
bindCalendarBatch({ read: load, filter: () => filterMode });
const removalUndo = bindRemovalUndo({
  read: readCurrentOrders,
  commit: next => { if (!persistOrders(next)) return false; render(); return true; },
  refresh: current => { orders = current; render(); },
  focusTracker: () => $('#filter-' + filterMode).focus(),
});
bindTabSync({ refresh: reloadOrders });
reloadOrders();

if (typeof window !== 'undefined' && typeof document !== 'undefined') startDayRefresh(() => {
  // Preserve the currently focused saved-row action through midnight's
  // urgency reorder; do not silently move keyboard focus to another order.
  const active = document.activeElement;
  const focused = active instanceof HTMLButtonElement && list.contains(active) ? active : undefined;
  const action = (['ics', 'edit', 'del'] as const).find(name => focused?.hasAttribute('data-' + name));
  const id = action ? focused?.dataset[action] : undefined;
  render();
  if (!action || id === undefined || loadFailed) return;
  const next = Array.from(list.querySelectorAll<HTMLButtonElement>('button[data-' + action + ']'))
    .find(button => button.dataset[action] === id);
  (next ?? $<HTMLButtonElement>('#filter-' + filterMode)).focus({ preventScroll: true });
});
