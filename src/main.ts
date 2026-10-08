import './style.css';
import './backup.css';
import './edit.css';
import './calendar-batch.css';
import { parse } from './parse';
import { lookup, knownMerchants } from './policy';
import { dueDate, daysLeft, status, todayISO } from './deadline';
import { buildIcs } from './ics';
import { load, read, save, type Order } from './store';
import { samples } from './samples';
import { bindBackup } from './backup-ui';
import { bindOrderEditor } from './edit-ui';
import { bindCalendarBatch } from './calendar-batch-ui';
import { bindSavedReturnsCsv } from './saved-returns-csv-ui';

const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;
const paste = $<HTMLTextAreaElement>('#paste');
const preview = $<HTMLFormElement>('#preview');
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

function reloadOrders() {
  try {
    orders = load();
  } catch {
    loadFailed = true;
    showStorageError(loadError);
    render();
    return;
  }
  loadFailed = false;
  clearStorageError();
  render();
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
  if (persistOrders(current.filter(order => order.id !== id))) render();
}

const h = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function showPreview() {
  const p = parse(paste.value, knownMerchants);
  const pol = lookup(p.merchant);
  const field = (name: string, label: string, val: string, ok: boolean, type = 'text') =>
    `<label class="${ok ? '' : 'missing'}">${label}<input name="${name}" type="${type}" value="${h(val)}"></label>`;
  const nothing = !p.found.merchant && !p.found.orderDate;
  const foundCount = Object.values(p.found).filter(Boolean).length;
  preview.innerHTML = `
    <div class="review-head"><div><span>RULE ENGINE / REVIEW</span><strong>${foundCount} OF 4 FIELDS RECOGNIZED</strong></div><span class="policy-chip">${pol.source === 'policy' ? 'STORE MATCH' : '30-DAY FALLBACK'}</span></div>
    <p class="review-note">Amber fields need attention. Confirm or correct the details before saving.</p>
    ${nothing ? '<p class="warn">Could not read this one. Fill in the highlighted fields.</p>' : ''}
    ${field('merchant', 'Store', p.merchant, p.found.merchant)}
    ${field('orderDate', 'Order date', p.orderDate, p.found.orderDate, 'date')}
    ${field('orderNo', 'Order #', p.orderNo, p.found.orderNo)}
    ${field('total', 'Total', p.total, p.found.total)}
    <label>Return window (days)<input name="windowDays" type="number" min="1" value="${pol.days}"></label>
    <p class="src" id="src">${pol.source === 'policy' ? 'Store rule from the local policy table; confirm with the retailer.' : 'No store match: editable 30-day fallback.'}</p>
    <button type="submit" class="button button-primary">Save deadline to tracker</button>`;  preview.dataset.source = pol.source;
  preview.dataset.days = String(pol.days);
  preview.hidden = false;
}

preview.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(preview);
  const orderDate = String(f.get('orderDate') || '');
  if (!orderDate) { (preview.querySelector('[name=orderDate]') as HTMLInputElement).focus(); return; }
  const days = Number(f.get('windowDays')) || 30;
  const merchant = String(f.get('merchant') || '');
  const pol = lookup(merchant);
  const current = readCurrentOrders();
  if (!current) return;
  const next: Order[] = [...current, {
    id: crypto.randomUUID(), merchant, orderNo: String(f.get('orderNo') || ''),
    total: String(f.get('total') || ''), orderDate, windowDays: days,
    windowSource: days === pol.days ? pol.source : 'user',
    createdAt: new Date().toISOString(),
  }];
  if (!persistOrders(next)) return;
  preview.hidden = true; paste.value = ''; render();
});

function render() {
  if (loadFailed) {
    for (const id of ['tracked-count', 'soon-count', 'expired-count']) $(`#${id}`).textContent = '—';
    list.innerHTML = '<li class="empty">Saved returns are unavailable until they can be loaded.</li>';
    return;
  }
  const all=orders.map(o=>{const due=dueDate(o.orderDate,o.windowDays),left=daysLeft(due,todayISO()),progress=Math.max(0,Math.min(100,Math.round((o.windowDays-left)/Math.max(1,o.windowDays)*100)));return {o,due,left,progress};}).sort((a,b)=>a.left-b.left);
  $('#tracked-count').textContent=String(all.length);$('#soon-count').textContent=String(all.filter(r=>r.left>=0&&r.left<=7).length);$('#expired-count').textContent=String(all.filter(r=>r.left<0).length);
  for(const [id,mode] of [['filter-all','all'],['filter-due','due'],['filter-expired','expired']] as const){const b=$<HTMLButtonElement>(`#${id}`);b.classList.toggle('active',filterMode===mode);b.setAttribute('aria-pressed',String(filterMode===mode));}
  const rows=all.filter(r=>filterMode==='all'||(filterMode==='due'&&r.left>=0&&r.left<=7)||(filterMode==='expired'&&r.left<0));
  if(!rows.length){list.innerHTML=`<li class="empty">${all.length?'No saved deadlines match this filter.':'No returns tracked yet. Paste an order email above, or try a fictional example.'}</li>`;return;}
  list.innerHTML=rows.map(({o,due,left,progress})=>{const label=left<0?'PAST DUE':left<=2?'URGENT':left<=7?'DUE SOON':'ON TRACK';const policy=o.windowSource==='policy'?`STORE POLICY / ${o.windowDays} DAYS`:o.windowSource==='default'?`${o.windowDays}-DAY FALLBACK`:`YOUR RULE / ${o.windowDays} DAYS`;const count=left<0?`EXPIRED ${-left}D`:`${left} DAYS LEFT`;return `<li class="card ${status(left)}"><div class="order-head"><div><strong>${h(o.merchant||'Unknown store')}</strong>${o.orderNo?` <span class="mono">#${h(o.orderNo)}</span>`:''}</div><span class="status-tag">${label}</span></div><div class="window-meta"><span>ORDER ${h(o.orderDate)}</span><span class="source-tag">${policy}</span></div><div class="window-track" role="progressbar" aria-label="Return window elapsed" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${progress}%"></i></div><div class="order-foot"><span class="return-by">RETURN BY ${h(due)}</span><strong class="days-left">${count}</strong></div><div class="order-actions"><button class="button button-primary" data-ics="${h(o.id)}">Add calendar reminder</button><button class="button button-link" data-edit="${h(o.id)}">Edit details</button><button class="button button-link" data-del="${h(o.id)}">Remove</button></div></li>`;}).join('');
}
list.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  if (t.dataset.edit !== undefined) orderEditor.open(t.dataset.edit);
  if (t.dataset.del) removeOrder(t.dataset.del);
  if (t.dataset.ics) {
    const o = orders.find((x) => x.id === t.dataset.ics)!;
    const blob = new Blob([buildIcs({ ...o, due: dueDate(o.orderDate, o.windowDays) })], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `return-${(o.merchant || 'order').replace(/\W+/g, '-')}.ics`; a.click();
    URL.revokeObjectURL(a.href);
  }
});

$('#filter-all').addEventListener('click',()=>{filterMode='all';render();});$('#filter-due').addEventListener('click',()=>{filterMode='due';render();});$('#filter-expired').addEventListener('click',()=>{filterMode='expired';render();});$('#find').addEventListener('click',showPreview);
paste.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) showPreview(); });
$('#sample').addEventListener('click', (e) => { e.preventDefault(); paste.value = samples[sampleIdx++ % samples.length]; showPreview(); });
$('#clear').addEventListener('click', () => { if (confirm('Delete all saved returns?') && persistOrders([], true)) render(); });
storageRetry.addEventListener('click', reloadOrders);
bindBackup({ read, commit: next => { if (!persistOrders(next)) return false; render(); return true; } });
const orderEditor = bindOrderEditor({
  getOrders: () => orders,
  read: load,
  commit: next => { if (!persistOrders(next)) return false; render(); return true; },
  refresh: reloadOrders,
});
bindCalendarBatch({ read: load, filter: () => filterMode });
bindSavedReturnsCsv(read);
reloadOrders();
