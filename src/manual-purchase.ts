import { previewEdit, EditError, type EditDraft } from './edit';
import type { Order } from './store';

export function manualPurchase(draft: EditDraft, id: string, createdAt: string) {
  if (!draft.merchant.trim()) throw new EditError('Enter the store name from your receipt.', 'merchant');
  const base: Order = { id, createdAt, merchant: '', orderDate: '', windowDays: 0, windowSource: 'user' };
  const result = previewEdit(base, { ...draft, merchant: draft.merchant.trim() });
  return { ...result, order: { ...result.order, windowSource: 'user' as const } };
}

export function bindManualPurchase(options: { read: () => Order[] | null; commit: (next: Order[]) => boolean }) {
  const open = document.querySelector<HTMLButtonElement>('#manual-open');
  if (!open) return;
  const dialog = document.querySelector<HTMLDialogElement>('#manual-dialog')!;
  const form = document.querySelector<HTMLFormElement>('#manual-form')!;
  const error = document.querySelector<HTMLParagraphElement>('#manual-error')!;
  const deadline = document.querySelector<HTMLParagraphElement>('#manual-deadline')!;
  const draft = (): EditDraft => Object.fromEntries(['merchant', 'orderDate', 'windowDays', 'orderNo', 'total'].map(name => [name, String(new FormData(form).get(name) ?? '')])) as EditDraft;
  const refresh = () => {
    error.hidden = true;
    try { deadline.textContent = 'Return by ' + manualPurchase(draft(), 'preview', '2000-01-01T00:00:00Z').due; }
    catch { deadline.textContent = 'Enter a store, valid purchase date and whole-day return window to calculate the deadline.'; }
  };
  form.addEventListener('input', refresh);
  open.addEventListener('click', () => { dialog.showModal(); });
  document.querySelector('#manual-close')!.addEventListener('click', () => dialog.close());
  form.addEventListener('submit', event => {
    event.preventDefault();
    error.hidden = true;
    try {
      const result = manualPurchase(draft(), crypto.randomUUID(), new Date().toISOString());
      const current = options.read();
      if (!current) throw new Error("Saved returns couldn't be read. Close this draft, retry loading saved returns, then reopen it.");
      if (!options.commit([...current, result.order])) throw new Error("The purchase wasn't saved. Your draft is still here; check browser storage and try again.");
      form.reset(); refresh(); dialog.close();
      const feedback = document.querySelector('#edit-feedback');
      if (feedback) feedback.textContent = result.order.merchant + ' saved. Return by ' + result.due + '.';
    } catch (cause) {
      error.textContent = cause instanceof Error ? cause.message : 'The purchase could not be saved.';
      error.hidden = false;
      if (cause instanceof EditError && cause.field) form.querySelector<HTMLInputElement>('[name="' + cause.field + '"]')?.focus();
    }
  });
  window.addEventListener('beforeunload', event => {
    if (Object.values(draft()).some(value => value.trim())) { event.preventDefault(); event.returnValue = ''; }
  });
}
