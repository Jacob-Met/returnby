import { receiptPhotoDraft } from './receipt-photo-ui';
import { saveOriginalReceipt, removeOriginalReceipt } from './receipt-photo-archive';
import { bindManualDraftRecovery } from './manual-draft-recovery';
import { reviewDuplicateIntake } from './duplicate-intake';
import { previewEdit, EditError, type EditDraft } from './edit';
import type { Order } from './store';
import { deadlinePhrase } from './deadline-requirement';

export function manualPurchase(draft: EditDraft, id: string, createdAt: string) {
  if (!draft.merchant.trim()) throw new EditError('Enter the store name from your receipt.', 'merchant');
  const base: Order = { id, createdAt, merchant: '', orderDate: '', windowDays: 0, windowSource: 'user' };
  const result = previewEdit(base, { ...draft, merchant: draft.merchant.trim() });
  return { ...result, order: { ...result.order, windowSource: 'user' as const } };
}

export function bindManualPurchase(options: { read: () => Order[] | null; commit: (next: Order[]) => boolean; onSaved?: (order: Order) => void }) {
  const open = document.querySelector<HTMLButtonElement>('#manual-open');
  if (!open) return;
  const dialog = document.querySelector<HTMLDialogElement>('#manual-dialog')!;
  const form = document.querySelector<HTMLFormElement>('#manual-form')!;
  const error = document.querySelector<HTMLParagraphElement>('#manual-error')!;
  const deadline = document.querySelector<HTMLParagraphElement>('#manual-deadline')!;
  const draft = (): EditDraft => Object.fromEntries(['merchant', 'orderDate', 'windowStartDate', 'fixedDeadline', 'windowDays', 'orderNo', 'total', 'returnEvidenceUrl', 'deadlineRequirement', 'merchantArrivalDeadline'].map(name => [name, String(new FormData(form).get(name) ?? '')])) as EditDraft;
  const refresh = () => {
    error.hidden = true;
    try { const review=manualPurchase(draft(), 'preview', '2000-01-01T00:00:00Z'); deadline.textContent=deadlinePhrase(review.order.deadlineRequirement)+' '+review.due+(review.order.merchantArrivalDeadline?' · Merchant receives by '+review.order.merchantArrivalDeadline:''); }
    catch { deadline.textContent = 'Enter a store, valid purchase date and whole-day return window to calculate the deadline.'; }
  };
  const recovery = bindManualDraftRecovery(form, open, refresh);
  form.addEventListener('input', refresh);
  open.addEventListener('click', () => { dialog.showModal(); });
  document.querySelector('#manual-close')!.addEventListener('click', () => dialog.close());
  let saving = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (saving) return;
    error.hidden = true;
    try {
      const result = manualPurchase(draft(), crypto.randomUUID(), new Date().toISOString());
      const current = reviewDuplicateIntake(result.order, options.read, message => window.confirm(message));
      if (!current) return;
      const receipt = receiptPhotoDraft();
      const button = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
      saving = true;
      button.disabled = true;
      try {
        if (receipt) await saveOriginalReceipt(result.order, receipt.file, receipt.rotation);
        // A second tab must not be overwritten while the photograph is stored.
        const fresh = options.read();
        if (!fresh || JSON.stringify(fresh) !== JSON.stringify(current))
          throw new Error('Your saved purchases changed in another tab. Review them and save again; your draft and photograph remain open.');
        if (!options.commit([...fresh, result.order]))
          throw new Error("The purchase wasn't saved. Your draft is still here; check browser storage and try again.");
      } catch (error) {
        if (receipt) await removeOriginalReceipt(result.order).catch(() => {});
        throw error;
      } finally {
        button.disabled = false;
        saving = false;
      }
      recovery.clear(); form.reset(); refresh(); dialog.close();
      const feedback = document.querySelector('#edit-feedback');
      if (feedback) feedback.textContent = result.order.merchant + ' saved. ' + deadlinePhrase(result.order.deadlineRequirement) + ' ' + result.due + '.';
      options.onSaved?.(result.order);
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
