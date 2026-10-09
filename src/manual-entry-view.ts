import './style.css';
import './manual-entry.css';
import { EditError, type EditDraft } from './order-admission';
import { load, save } from './store';
import { reviewReceipt, planReceiptSave, type ReceiptIdentity, type ReceiptReview } from './manual-entry';

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const form = get<HTMLFormElement>('manual-form');
const fields: Record<keyof EditDraft, HTMLInputElement> = {
  merchant: get('manual-merchant'), orderNo: get('manual-order-no'),
  total: get('manual-total'), orderDate: get('manual-date'), windowDays: get('manual-days'),
};
const panel = get('manual-review');
const reviewButton = get<HTMLButtonElement>('manual-review-button');
const saveButton = get<HTMLButtonElement>('manual-save');
const message = get('manual-message');
const success = get('manual-success');
let review: ReceiptReview | null = null;
let identity: ReceiptIdentity | null = null;
let completed = false;
let saving = false;

function draft(): EditDraft {
  return Object.fromEntries(Object.entries(fields).map(([key, input]) => [key, input.value])) as EditDraft;
}
function sameDraft(a: EditDraft, b: EditDraft) {
  return (Object.keys(fields) as (keyof EditDraft)[]).every(key => a[key] === b[key]);
}
function feedback(text: string, error = false) {
  message.textContent = text;
  message.hidden = !text;
  message.classList.toggle('is-error', error);
  message.setAttribute('role', error ? 'alert' : 'status');
}
function retireReview() {
  review = null;
  panel.hidden = true;
  saveButton.disabled = true;
}
for (const input of Object.values(fields)) {
  input.addEventListener('input', () => {
    if (completed) return;
    const hadReview = review !== null;
    retireReview();
    Object.values(fields).forEach(field => field.removeAttribute('aria-invalid'));
    feedback(hadReview ? 'Details changed. Review the new deadline before saving.' : '');
  });
}
form.addEventListener('submit', event => {
  event.preventDefault();
  if (completed || saving) return;
  const candidateIdentity = identity ?? { id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  try {
    review = reviewReceipt(draft(), candidateIdentity);
  } catch (error) {
    retireReview();
    if (!(error instanceof EditError)) throw error;
    feedback(error.message, true);
    const input = fields[error.field ?? 'orderDate'];
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    return;
  }
  identity = candidateIdentity;
  for (const key of ['merchant', 'orderNo', 'total', 'orderDate', 'windowDays'] as const) {
    get('review-' + key).textContent = review.draft[key] || 'Not provided';
  }
  const due = get<HTMLTimeElement>('review-due');
  due.textContent = review.due;
  due.dateTime = review.due;
  get('manual-review-title').textContent = 'Review this deadline.';
  panel.hidden = false;
  saveButton.disabled = false;
  feedback('');
  get('manual-review-title').focus();
});
saveButton.addEventListener('click', () => {
  if (!review || completed || saving) return;
  if (!sameDraft(draft(), review.draft)) {
    retireReview();
    feedback('Details changed. Review the new deadline before saving.', true);
    return;
  }
  saving = true;
  saveButton.disabled = true;
  try {
    let current;
    try { current = load(); }
    catch {
      feedback('Could not read saved returns. Your receipt and review are still here. Check browser storage, then try Save to tracker again.', true);
      return;
    }
    let plan;
    try { plan = planReceiptSave(current, review.order); }
    catch (error) {
      feedback(error instanceof Error ? error.message : 'This receipt could not be saved safely. Nothing was replaced.', true);
      return;
    }
    try { if (!plan.alreadySaved) save(plan.next); }
    catch {
      feedback('Could not save this receipt in your browser. Your receipt and review are still here. Check storage availability, then try Save to tracker again.', true);
      return;
    }
    completed = true;
    review = null;
    Object.values(fields).forEach(input => { input.readOnly = true; });
    reviewButton.disabled = true;
    get('manual-review-title').textContent = 'Receipt saved.';
    success.hidden = false;
    feedback('Saved to your tracker with your return window.');
    get('manual-review-title').focus();
  } finally {
    saving = false;
    saveButton.disabled = completed || review === null;
  }
});
get('manual-another').addEventListener('click', () => {
  if (!completed) return;
  completed = false;
  identity = null;
  retireReview();
  Object.values(fields).forEach(input => {
    input.readOnly = false;
    input.value = '';
    input.removeAttribute('aria-invalid');
  });
  reviewButton.disabled = false;
  success.hidden = true;
  feedback('');
  fields.merchant.focus();
});
