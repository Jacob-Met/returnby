import './batch-intake.css';
import {
  appendConfirmations, validateDraft, prepareBatch, commitBatch,
  BatchIntakeError, MAX_BATCH_ORDERS, MAX_CONFIRMATION_BYTES,
  type BatchDraft, type BatchReview, type DraftFields,
} from './batch-intake';
import { dueDate } from './deadline';

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const paste = get<HTMLTextAreaElement>('batch-paste');
const files = get<HTMLInputElement>('batch-files');
const add = get<HTMLButtonElement>('batch-add');
const discard = get<HTMLButtonElement>('batch-discard');
const preview = get<HTMLButtonElement>('batch-preview');
const save = get<HTMLButtonElement>('batch-save');
const draftsRoot = get<HTMLDivElement>('batch-drafts');
const final = get<HTMLElement>('batch-final');
const errorBox = get<HTMLParagraphElement>('batch-error');
const status = get<HTMLParagraphElement>('batch-status');
const success = get<HTMLParagraphElement>('batch-success');
const acknowledgement = get<HTMLInputElement>('batch-duplicate-ack');
let drafts: BatchDraft[] = [];
let review: BatchReview | null = null;
let pasteCount = 0;
let reading = false;
let generation = 0;

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function updateControls() {
  const selected = drafts.filter(draft => draft.reviewed).length;
  get('batch-count').textContent = drafts.length + (drafts.length === 1 ? ' confirmation' : ' confirmations');
  get('batch-selection').textContent = selected
    ? selected + ' of ' + drafts.length + ' confirmations reviewed and selected.'
    : 'No confirmations selected for saving.';
  get('batch-empty').hidden = drafts.length > 0;
  preview.disabled = !selected || reading;
  add.disabled = reading;
  files.disabled = reading;
  discard.disabled = !drafts.length && !reading;
  save.disabled = !review || (review.duplicates.length > 0 && !acknowledgement.checked);
}

function invalidate(message?: string) {
  review = null;
  final.hidden = true;
  acknowledgement.checked = false;
  success.hidden = true;
  errorBox.hidden = true;
  if (message) status.textContent = message;
  updateControls();
}

function showError(error: unknown) {
  errorBox.textContent = error instanceof Error ? error.message : String(error);
  errorBox.hidden = false;
  if (error instanceof BatchIntakeError && error.draftId && error.field) {
    const card = Array.from(draftsRoot.children).find(node => (node as HTMLElement).dataset.draft === error.draftId);
    card?.querySelector<HTMLInputElement>('[data-field="' + error.field + '"]')?.focus();
  }
}

function renderDrafts() {
  const fragment = document.createDocumentFragment();
  drafts.forEach((draft, index) => {
    const card = element('article', undefined, 'batch-card' + (draft.reviewed ? ' is-reviewed' : ''));
    card.dataset.draft = draft.id;
    const head = element('header', undefined, 'batch-card-head');
    const identity = element('div');
    identity.append(element('p', 'CONFIRMATION ' + String(index + 1).padStart(2, '0'), 'batch-card-kicker'));
    identity.append(element('h3', draft.label));
    identity.append(element('p', Object.values(draft.found).filter(Boolean).length + ' of 4 fields recognized · check every field', 'batch-card-recognized'));
    const remove = element('button', 'Remove', 'batch-remove');
    remove.type = 'button';
    remove.dataset.remove = draft.id;
    remove.setAttribute('aria-label', 'Remove confirmation ' + (index + 1) + ': ' + draft.label);
    head.append(identity, remove);
    card.append(head);
    const fields = element('div', undefined, 'batch-fields');
    const labels: Array<[keyof DraftFields, string, string]> = [
      ['merchant', 'Store', 'text'], ['orderNo', 'Order number', 'text'],
      ['orderDate', 'Order date', 'date'], ['total', 'Total (as entered)', 'text'],
      ['windowDays', 'Return window (days)', 'number'],
    ];
    for (const [key, labelText, type] of labels) {
      const label = element('label', labelText);
      if (key !== 'windowDays' && !draft.found[key]) label.className = 'not-recognized';
      if (key === 'windowDays') label.className = 'window-field';
      const input = element('input');
      input.type = type;
      input.value = draft.fields[key];
      input.dataset.field = key;
      input.name = key;
      input.maxLength = 4096;
      input.setAttribute('aria-label', labelText + ' for confirmation ' + (index + 1));
      if (key === 'orderDate') { input.min = '1000-01-01'; input.max = '9999-12-31'; }
      if (key === 'windowDays') { input.min = '1'; input.step = '1'; }
      label.append(input);
      fields.append(label);
    }
    card.append(fields);
    const original = element('details');
    original.append(element('summary', 'Read the original confirmation'), element('pre', draft.text));
    card.append(original);
    const checkboxLabel = element('label', undefined, 'batch-reviewed');
    const checkbox = element('input');
    checkbox.type = 'checkbox';
    checkbox.checked = draft.reviewed;
    checkbox.dataset.reviewed = draft.id;
    checkboxLabel.append(checkbox, element('span', 'I reviewed these fields. Include this order.'));
    card.append(checkboxLabel);
    fragment.append(card);
  });
  draftsRoot.replaceChildren(fragment);
  updateControls();
}

draftsRoot.addEventListener('input', event => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !input.dataset.field) return;
  const card = input.closest<HTMLElement>('[data-draft]');
  const draft = drafts.find(item => item.id === card?.dataset.draft);
  if (!draft) return;
  const field = input.dataset.field as keyof DraftFields;
  draft.fields = { ...draft.fields, [field]: input.value };
  draft.reviewed = false;
  const checkbox = card?.querySelector<HTMLInputElement>('[data-reviewed]');
  if (checkbox) checkbox.checked = false;
  card?.classList.remove('is-reviewed');
  invalidate('Fields changed. Select this order again when you have reviewed the correction.');
});

draftsRoot.addEventListener('change', event => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !input.dataset.reviewed) return;
  const draft = drafts.find(item => item.id === input.dataset.reviewed);
  if (!draft) return;
  invalidate();
  try {
    if (input.checked) validateDraft(draft);
    draft.reviewed = input.checked;
    input.closest('.batch-card')?.classList.toggle('is-reviewed', draft.reviewed);
    status.textContent = draft.reviewed ? 'Order selected for the final review.' : 'Order kept in this batch without selecting it for saving.';
  } catch (error) {
    input.checked = false;
    draft.reviewed = false;
    showError(error);
  }
  updateControls();
});

draftsRoot.addEventListener('click', event => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const button = target.closest<HTMLButtonElement>('[data-remove]');
  if (!button) return;
  const index = drafts.findIndex(draft => draft.id === button.dataset.remove);
  if (index < 0) return;
  drafts = drafts.filter((_, position) => position !== index);
  invalidate('Confirmation removed from this unsaved batch.');
  renderDrafts();
  const next = draftsRoot.children[Math.min(index, drafts.length - 1)] as HTMLElement | undefined;
  (next?.querySelector<HTMLButtonElement>('[data-remove]') ?? add).focus();
});

add.addEventListener('click', () => {
  try {
    drafts = appendConfirmations(drafts, [{ label: 'Pasted confirmation ' + (pasteCount + 1), text: paste.value }]);
    pasteCount++;
    paste.value = '';
    invalidate('Confirmation added. Check its fields and select it when reviewed.');
    renderDrafts();
    draftsRoot.lastElementChild?.querySelector<HTMLInputElement>('[data-field]')?.focus();
  } catch (error) { showError(error); }
});

files.addEventListener('change', async () => {
  const selected = Array.from(files.files ?? []);
  if (!selected.length) return;
  const request = ++generation;
  reading = true;
  status.textContent = 'Reading the selected local text files…';
  errorBox.hidden = true;
  updateControls();
  try {
    if (drafts.length + selected.length > MAX_BATCH_ORDERS) throw new BatchIntakeError('Keep at most 20 confirmations in one batch.');
    for (const file of selected) {
      if (!/\.txt$/i.test(file.name) || file.size > MAX_CONFIRMATION_BYTES) {
        throw new BatchIntakeError('Choose .txt files no larger than 100 KiB each. No selected file was added.');
      }
    }
    const incoming = await Promise.all(selected.map(async file => {
      try {
        return { label: file.name, text: new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()) };
      } catch {
        throw new BatchIntakeError(file.name + ' could not be read as UTF-8 text. No selected file was added.');
      }
    }));
    if (request !== generation) return;
    drafts = appendConfirmations(drafts, incoming);
    invalidate(selected.length + ' local text ' + (selected.length === 1 ? 'file added.' : 'files added.') + ' Review each order before selecting it.');
    renderDrafts();
  } catch (error) {
    if (request === generation) showError(error);
  } finally {
    if (request === generation) {
      reading = false;
      files.value = '';
      updateControls();
    }
  }
});

discard.addEventListener('click', () => {
  if (!confirm('Discard this entire batch and its unsaved corrections?')) return;
  generation++;
  reading = false;
  drafts = [];
  files.value = '';
  invalidate('Batch discarded. Saved tracker orders were not changed.');
  renderDrafts();
  paste.focus();
});

function renderReview(current: BatchReview) {
  get('batch-final-summary').textContent = 'Add ' + current.orders.length + ' reviewed '
    + (current.orders.length === 1 ? 'order' : 'orders') + ' beside ' + current.existingCount
    + ' already saved. Existing records will be retained.';
  const fragment = document.createDocumentFragment();
  current.orders.forEach(order => {
    const article = element('article', undefined, 'batch-final-order');
    article.append(element('h3', order.merchant || 'Unknown store'), element('p', 'Order number: ' + (order.orderNo || 'Not recorded')));
    const facts = element('dl');
    const source = order.windowSource === 'policy' ? 'Local store rule' : order.windowSource === 'default' ? 'Local default' : 'Your chosen window';
    for (const [label, value] of [
      ['Order date', order.orderDate], ['Calculated deadline', dueDate(order.orderDate, order.windowDays)],
      ['Reviewed window', order.windowDays + ' days · ' + source], ['Saved amount', order.total || 'Not recorded'],
    ]) {
      const pair = element('div');
      pair.append(element('dt', label), element('dd', value));
      facts.append(pair);
    }
    article.append(facts);
    fragment.append(article);
  });
  get('batch-final-orders').replaceChildren(fragment);
  get('batch-duplicates').hidden = !current.duplicates.length;
  get('batch-duplicate-list').replaceChildren(...current.duplicates.map(item => element('li', item.label + ' may match ' + item.match + '.')));
  acknowledgement.checked = false;
  final.hidden = false;
  updateControls();
  get('batch-final-title').focus({ preventScroll: true });
  final.scrollIntoView({ block: 'nearest' });
}

preview.addEventListener('click', () => {
  invalidate();
  try {
    review = prepareBatch(drafts, window.localStorage);
    renderReview(review);
    status.textContent = 'Selection preview ready. Inspect every new order before saving.';
  } catch (error) { showError(error); }
});

acknowledgement.addEventListener('change', updateControls);
get('batch-back').addEventListener('click', () => {
  invalidate('Continue correcting or selecting your confirmations. Nothing was saved.');
  preview.focus();
});

save.addEventListener('click', () => {
  if (!review) return;
  errorBox.hidden = true;
  try {
    const saved = new Set(commitBatch(review, window.localStorage, acknowledgement.checked));
    drafts = drafts.filter(draft => !saved.has(draft.id));
    invalidate();
    renderDrafts();
    status.textContent = '';
    success.textContent = saved.size + ' reviewed ' + (saved.size === 1 ? 'order was' : 'orders were')
      + ' saved to the tracker. ' + drafts.length + ' unsaved '
      + (drafts.length === 1 ? 'confirmation remains' : 'confirmations remain') + ' in this batch.';
    success.hidden = false;
    success.tabIndex = -1;
    success.focus();
  } catch (error) { showError(error); }
});

renderDrafts();
