import { dueDate } from './deadline';
import { editDraft, EditConflict, EditError, planEdit, previewEdit, sourceDescription, type EditDraft } from './edit';
import type { Order } from './store';

type EditorOptions = {
  getOrders(): Order[];
  read(): Order[];
  commit(next: Order[]): boolean;
  refresh(): void;
};

export function bindOrderEditor(options: EditorOptions) {
  const get = <T extends HTMLElement>(id: string) => document.querySelector<T>(`#${id}`)!;
  const dialog = get<HTMLDialogElement>('edit-dialog');
  const form = get<HTMLFormElement>('edit-form');
  const message = get<HTMLParagraphElement>('edit-message');
  const proposed = get<HTMLOutputElement>('edit-proposed-deadline');
  const source = get<HTMLParagraphElement>('edit-source');
  const save = get<HTMLButtonElement>('edit-save');
  const fields: Record<keyof EditDraft, HTMLInputElement> = {
    merchant: get('edit-merchant'), orderNo: get('edit-order-no'), total: get('edit-total'),
    orderDate: get('edit-order-date'), windowDays: get('edit-window-days'),
  };
  let original: Order | null = null;

  const draft = (): EditDraft => Object.fromEntries(Object.entries(fields).map(([name, input]) => [name, input.value])) as EditDraft;

  function showMessage(text: string, alert = false) {
    message.textContent = text;
    message.hidden = !text;
    message.setAttribute('role', alert ? 'alert' : 'status');
    if (alert) message.focus();
  }

  function updatePreview() {
    if (!original) return;
    for (const input of Object.values(fields)) input.removeAttribute('aria-invalid');
    try {
      const review = previewEdit(original, draft());
      proposed.textContent = review.due;
      source.textContent = sourceDescription(review.order);
      save.disabled = false;
      showMessage('');
    } catch (error) {
      proposed.textContent = 'Check the highlighted details';
      source.textContent = '';
      save.disabled = true;
      if (error instanceof EditError && error.field) fields[error.field].setAttribute('aria-invalid', 'true');
      showMessage(error instanceof Error ? error.message : 'Check the order details.');
    }
  }

  form.addEventListener('input', updatePreview);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!original) return;
    let current: Order[];
    try {
      current = options.read();
    } catch {
      showMessage("Couldn't read saved returns. Nothing was changed. Your draft is kept; try saving again when storage is available.", true);
      return;
    }
    try {
      const plan = planEdit(current, original, draft());
      if (plan.changed && !options.commit(plan.next)) {
        showMessage("Couldn't save these changes in your browser. Your saved return and draft are kept. Try again when storage is available.", true);
        return;
      }
      get('edit-feedback').textContent = plan.changed
        ? `Saved changes for ${plan.order.merchant || 'Unknown store'}. Return by ${plan.due}.`
        : 'No changes to save.';
      dialog.close();
    } catch (error) {
      if (error instanceof EditConflict) options.refresh();
      if (error instanceof EditError && error.field) fields[error.field].setAttribute('aria-invalid', 'true');
      showMessage(error instanceof Error ? error.message : 'Check the order details before saving.', true);
    }
  });
  get('edit-cancel').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    const id = original?.id;
    original = null;
    const button = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-edit]')).find(button => button.dataset.edit === id);
    (button ?? get('filter-all')).focus();
  });

  return {
    open(id: string) {
      const matches = options.getOrders().filter(order => order.id === id);
      if (matches.length !== 1) {
        get('edit-feedback').textContent = 'This return could not be selected uniquely. Refresh the tracker before editing.';
        return;
      }
      // Store an immutable review snapshot; a later render or import cannot move it.
      original = JSON.parse(JSON.stringify(matches[0])) as Order;
      const values = editDraft(original);
      for (const name of Object.keys(fields) as (keyof EditDraft)[]) fields[name].value = values[name];
      get('edit-current-deadline').textContent = dueDate(original.orderDate, original.windowDays);
      get('edit-feedback').textContent = '';
      updatePreview();
      dialog.showModal();
      fields.merchant.focus();
    },
  };
}
