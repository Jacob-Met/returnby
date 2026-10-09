import './enquiry.css';
import { readSavedOrders, assertSnapshotCurrent, type SavedSnapshot } from './trip-checklist';
import { buildEnquiry, formatEnquiry, type EnquiryInput } from './enquiry';

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const orderSelect = element<HTMLSelectElement>('enquiry-order');
const items = element<HTMLTextAreaElement>('enquiry-items');
const reason = element<HTMLTextAreaElement>('enquiry-reason');
const request = element<HTMLSelectElement>('enquiry-request');
const signature = element<HTMLInputElement>('enquiry-signature');
const subject = element<HTMLInputElement>('enquiry-subject');
const body = element<HTMLTextAreaElement>('enquiry-body');
const preview = element<HTMLElement>('enquiry-preview');
const error = element<HTMLElement>('enquiry-error');
const feedback = element<HTMLElement>('enquiry-status');
const copy = element<HTMLButtonElement>('enquiry-copy');
const download = element<HTMLButtonElement>('enquiry-download');
const prepare = element<HTMLButtonElement>('enquiry-prepare');
let snapshot: SavedSnapshot | undefined;
let prepared: SavedSnapshot | undefined;
let preparedId = '';
let operation = 0;
let copying = false;

function reportError(problem: unknown) {
  error.textContent = problem instanceof Error ? problem.message : 'This action could not be completed. Your message is still here.';
  error.hidden = false;
}
function clearError() { error.textContent = ''; error.hidden = true; }
function sync() {
  prepare.disabled = !snapshot || !orderSelect.value;
  copy.disabled = !prepared || copying;
  download.disabled = !prepared || copying;
}
function invalidate(message: string) {
  prepared = undefined;
  preparedId = '';
  copying = false;
  operation += 1;
  clearError();
  feedback.textContent = message;
  sync();
}
function facts() {
  const order = snapshot?.orders.find(row => row.id === orderSelect.value);
  element('enquiry-facts').hidden = !order;
  for (const [name, value] of [
    ['merchant', order?.merchant], ['orderNo', order?.orderNo], ['orderDate', order?.orderDate],
  ] as const) element('fact-' + name).textContent = value || 'Not recorded';
}
function refresh() {
  try {
    const next = readSavedOrders(window.localStorage);
    const selected = orderSelect.value;
    const options = [new Option('Choose a saved order', '')];
    for (const order of next.orders) {
      const label = (order.merchant || 'Unknown store') + ' · ' + (order.orderNo || 'No order number') + ' · ' + order.orderDate;
      options.push(new Option(label, order.id));
    }
    orderSelect.replaceChildren(...options);
    orderSelect.value = next.orders.some(order => order.id === selected) ? selected : '';
    snapshot = next;
    facts();
    element('enquiry-count').textContent = next.orders.length + ' saved ' + (next.orders.length === 1 ? 'order' : 'orders') + ' read.';
    invalidate(next.orders.length
      ? 'Saved details refreshed. Your wording is retained; choose an order and prepare a new draft.'
      : 'No saved orders were found. Save reviewed details in the tracker first; any wording here is retained.');
  } catch (problem) {
    reportError(problem);
    feedback.textContent = 'The saved list could not be refreshed. Existing wording and any prepared message have been kept.';
    sync();
  }
}
orderSelect.addEventListener('change', () => {
  facts();
  invalidate('Order selection changed. Review your item details for this order, then prepare a new draft. Your wording has been kept.');
});
for (const field of [items, reason, request, signature]) {
  field.addEventListener('input', () => invalidate('Details changed. Prepare a new draft before copying or downloading; the previous message is still below.'));
}
for (const field of [subject, body]) {
  field.addEventListener('input', () => {
    operation += 1;
    copying = false;
    clearError();
    feedback.textContent = prepared ? 'Your message edits are included when you copy or download. Nothing has been sent.' : 'Prepare a current draft before copying or downloading.';
    sync();
  });
}
element('enquiry-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    if (!snapshot) throw new Error('Refresh the saved list successfully before preparing an enquiry.');
    assertSnapshotCurrent(snapshot, window.localStorage);
    const draft = buildEnquiry(snapshot, orderSelect.value, {
      items: items.value, reason: reason.value,
      request: request.value as EnquiryInput['request'], signature: signature.value,
    });
    operation += 1;
    copying = false;
    subject.value = draft.subject;
    body.value = draft.body;
    prepared = snapshot;
    preparedId = draft.orderId;
    preview.hidden = false;
    clearError();
    feedback.textContent = 'Draft prepared. Review and edit the message below, then copy or download it. Nothing has been sent.';
    sync();
    subject.focus();
  } catch (problem) { reportError(problem); }
});
function reviewedText(): string {
  if (!prepared || preparedId !== orderSelect.value) throw new Error('Prepare a current draft before copying or downloading.');
  assertSnapshotCurrent(prepared, window.localStorage);
  return formatEnquiry(subject.value, body.value);
}
copy.addEventListener('click', async () => {
  let token: number | undefined;
  try {
    const text = reviewedText();
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable. Download the text instead, or select and copy the message yourself.');
    token = ++operation;
    copying = true;
    clearError();
    sync();
    await navigator.clipboard.writeText(text);
    if (token === operation) feedback.textContent = 'Message copied. Paste it into your chosen contact method and check the recipient before sending.';
  } catch (problem) {
    if (token === undefined || token === operation) reportError(problem);
  } finally {
    if (token !== undefined && token === operation) { copying = false; sync(); }
  }
});
download.addEventListener('click', () => {
  let url: string | undefined;
  try {
    const text = reviewedText();
    clearError();
    url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'returnby-enquiry.txt';
    document.body.append(anchor);
    try { anchor.click(); } finally { anchor.remove(); }
    feedback.textContent = 'Download requested. Your message remains here; check your browser downloads for the saved file. Nothing has been sent.';
  } catch (problem) { reportError(problem); }
  finally {
    if (url !== undefined) {
      const ownUrl = url;
      window.setTimeout(() => URL.revokeObjectURL(ownUrl), 1000);
    }
  }
});
element('enquiry-refresh').addEventListener('click', refresh);
element('enquiry-reset').addEventListener('click', () => {
  const hasWork = Boolean(items.value || reason.value || signature.value || subject.value || body.value || request.value !== 'instructions');
  if (hasWork && !window.confirm('Clear the wording and message on this page? Saved orders will stay unchanged.')) return;
  items.value = ''; reason.value = ''; signature.value = ''; request.value = 'instructions';
  subject.value = ''; body.value = ''; preview.hidden = true;
  invalidate('Draft cleared. The selected saved order and tracker have not changed.');
  items.focus();
});
sync();
refresh();
