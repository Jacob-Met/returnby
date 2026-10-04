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
let orders = load();
let sampleIdx = 0;

const h = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function showPreview() {
  const p = parse(paste.value, knownMerchants);
  const pol = lookup(p.merchant);
  const field = (name: string, label: string, val: string, ok: boolean, type = 'text') =>
    `<label class="${ok ? '' : 'missing'}">${label}<input name="${name}" type="${type}" value="${h(val)}"></label>`;
  const nothing = !p.found.merchant && !p.found.orderDate;
  preview.innerHTML = `
    ${nothing ? '<p class="warn">Couldn\'t read this one. Fill it in.</p>' : ''}
    ${field('merchant', 'Store', p.merchant, p.found.merchant)}
    ${field('orderDate', 'Order date', p.orderDate, p.found.orderDate, 'date')}
    ${field('orderNo', 'Order #', p.orderNo, true)}
    ${field('total', 'Total', p.total, true)}
    <label>Return window (days)<input name="windowDays" type="number" min="1" value="${pol.days}"></label>
    <p class="src" id="src">${pol.source === 'policy' ? 'From policy table (default; verify with store)' : 'Default 30 days (store not in table)'}</p>
    <button type="submit">Save</button>`;
  preview.dataset.source = pol.source;
  preview.dataset.days = String(pol.days);
  preview.hidden = false;
}

preview.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(preview);
  const orderDate = String(f.get('orderDate') || '');
  if (!orderDate) { (preview.querySelector('[name=orderDate]') as HTMLInputElement).focus(); return; }
  const days = Number(f.get('windowDays')) || 30;
  orders.push({
    id: crypto.randomUUID(), merchant: String(f.get('merchant') || ''), orderNo: String(f.get('orderNo') || ''),
    total: String(f.get('total') || ''), orderDate, windowDays: days,
    windowSource: String(days) === preview.dataset.days ? (preview.dataset.source as Order['windowSource']) : 'user',
    createdAt: new Date().toISOString(),
  });
  save(orders); preview.hidden = true; paste.value = ''; render();
});

function render() {
  const today = todayISO();
  const rows = orders.map((o) => {
    const due = dueDate(o.orderDate, o.windowDays);
    return { o, due, left: daysLeft(due, today) };
  }).sort((a, b) => a.left - b.left);
  if (!rows.length) { list.innerHTML = '<li class="empty">No returns tracked yet. Paste an order email above, or try a sample.</li>'; return; }
  list.innerHTML = rows.map(({ o, due, left }) => `
    <li class="card ${status(left)}">
      <div><strong>${h(o.merchant || 'Unknown store')}</strong>${o.orderNo ? ` <span class="mono">#${h(o.orderNo)}</span>` : ''}</div>
      <div class="mono">ordered ${o.orderDate} · return by ${due}</div>
      <div class="left">${left < 0 ? `Expired ${-left} days ago` : `${left} days left`}</div>
      <button data-ics="${o.id}">Add to calendar</button> <button class="link" data-del="${o.id}">Delete</button>
    </li>`).join('');
}

list.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  if (t.dataset.del) { orders = orders.filter((o) => o.id !== t.dataset.del); save(orders); render(); }
  if (t.dataset.ics) {
    const o = orders.find((x) => x.id === t.dataset.ics)!;
    const blob = new Blob([buildIcs({ ...o, due: dueDate(o.orderDate, o.windowDays) })], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `return-${(o.merchant || 'order').replace(/\W+/g, '-')}.ics`; a.click();
    URL.revokeObjectURL(a.href);
  }
});

$('#find').addEventListener('click', showPreview);
paste.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) showPreview(); });
$('#sample').addEventListener('click', (e) => { e.preventDefault(); paste.value = samples[sampleIdx++ % samples.length]; showPreview(); });
$('#clear').addEventListener('click', () => { if (confirm('Delete all saved returns?')) { orders = []; save(orders); render(); } });
render();
