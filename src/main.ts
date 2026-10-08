import './style.css';
import { parse } from './parse';
import { lookup, knownMerchants } from './policy';
import { dueDate, daysLeft, status, todayISO } from './deadline';
import { buildIcs } from './ics';
import { load, save, type Order } from './store';
import { samples } from './samples';

const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;
const paste = $<HTMLTextAreaElement>('#paste');
const preview = $<HTMLFormElement>('#preview');
const list = $<HTMLUListElement>('#list');
const storageError = $<HTMLParagraphElement>('#storage-error');
let orders = load();
let sampleIdx = 0;
let filterMode: 'all' | 'due' | 'expired' = 'all';

function persistOrders(next: Order[]): boolean {
  try {
    save(next);
  } catch {
    storageError.textContent = "Couldn't save this change in your browser. Check storage availability and try again.";
    storageError.hidden = false;
    storageError.focus();
    return false;
  }
  orders = next;
  storageError.textContent = '';
  storageError.hidden = true;
  return true;
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
  const next: Order[] = [...orders, {
    id: crypto.randomUUID(), merchant, orderNo: String(f.get('orderNo') || ''),
    total: String(f.get('total') || ''), orderDate, windowDays: days,
    windowSource: days === pol.days ? pol.source : 'user',
    createdAt: new Date().toISOString(),
  }];
  if (!persistOrders(next)) return;
  preview.hidden = true; paste.value = ''; render();
});

function render() {
  const all=orders.map(o=>{const due=dueDate(o.orderDate,o.windowDays),left=daysLeft(due,todayISO()),progress=Math.max(0,Math.min(100,Math.round((o.windowDays-left)/Math.max(1,o.windowDays)*100)));return {o,due,left,progress};}).sort((a,b)=>a.left-b.left);
  $('#tracked-count').textContent=String(all.length);$('#soon-count').textContent=String(all.filter(r=>r.left>=0&&r.left<=7).length);$('#expired-count').textContent=String(all.filter(r=>r.left<0).length);
  for(const [id,mode] of [['filter-all','all'],['filter-due','due'],['filter-expired','expired']] as const){const b=$<HTMLButtonElement>(`#${id}`);b.classList.toggle('active',filterMode===mode);b.setAttribute('aria-pressed',String(filterMode===mode));}
  const rows=all.filter(r=>filterMode==='all'||(filterMode==='due'&&r.left>=0&&r.left<=7)||(filterMode==='expired'&&r.left<0));
  if(!rows.length){list.innerHTML=`<li class="empty">${all.length?'No saved deadlines match this filter.':'No returns tracked yet. Paste an order email above, or try a fictional example.'}</li>`;return;}
  list.innerHTML=rows.map(({o,due,left,progress})=>{const label=left<0?'PAST DUE':left<=2?'URGENT':left<=7?'DUE SOON':'ON TRACK';const policy=o.windowSource==='policy'?`STORE POLICY / ${o.windowDays} DAYS`:o.windowSource==='default'?'30-DAY FALLBACK':`YOUR RULE / ${o.windowDays} DAYS`;const count=left<0?`EXPIRED ${-left}D`:`${left} DAYS LEFT`;return `<li class="card ${status(left)}"><div class="order-head"><div><strong>${h(o.merchant||'Unknown store')}</strong>${o.orderNo?` <span class="mono">#${h(o.orderNo)}</span>`:''}</div><span class="status-tag">${label}</span></div><div class="window-meta"><span>ORDER ${h(o.orderDate)}</span><span class="source-tag">${policy}</span></div><div class="window-track" role="progressbar" aria-label="Return window elapsed" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${progress}%"></i></div><div class="order-foot"><span class="return-by">RETURN BY ${h(due)}</span><strong class="days-left">${count}</strong></div><div class="order-actions"><button class="button button-primary" data-ics="${h(o.id)}">Add calendar reminder</button><button class="button button-link" data-del="${h(o.id)}">Remove</button></div></li>`;}).join('');
}
list.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  if (t.dataset.del) { if (persistOrders(orders.filter((o) => o.id !== t.dataset.del))) render(); }
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
$('#clear').addEventListener('click', () => { if (confirm('Delete all saved returns?') && persistOrders([])) render(); });
render();
