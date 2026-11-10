import { returnDueDate } from './deadline';
import { ItemConflict, MAX_ORDER_ITEMS, itemSummary, itemTotals, parseOrderItems, planItemEdit, type ItemOrder, type OrderItem } from './order-items';

type Options = {
  getOrders(): ItemOrder[];
  read(): ItemOrder[];
  commit(next: ItemOrder[]): boolean;
  refresh(): unknown;
};
const escape = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

export function bindItemEditor(options: Options) {
  const dialog = document.querySelector<HTMLDialogElement>('#items-dialog')!;
  const get = <T extends HTMLElement>(id: string) => document.querySelector<T>('#' + id)!;
  const form = get<HTMLFormElement>('items-form');
  const lines = get<HTMLDivElement>('item-lines');
  const message = get<HTMLParagraphElement>('items-message');
  let original: ItemOrder | null = null;

  function draft(): OrderItem[] {
    return Array.from(lines.querySelectorAll<HTMLElement>('.item-line')).map(row => {
      const field = (name: string) => row.querySelector<HTMLInputElement>('[data-item-field="' + name + '"]')!.value;
      return { id: row.dataset.itemId!, name: field('name'), quantity: Number(field('quantity')), returned: Number(field('returned')), kept: Number(field('kept')) };
    });
  }

  function showError(text: string) {
    message.textContent = text;
    message.hidden = !text;
    if (text) message.focus();
  }

  function updateSummary() {
    for (const row of Array.from(lines.querySelectorAll<HTMLElement>('.item-line'))) {
      const field = (name: string) => Number(row.querySelector<HTMLInputElement>('[data-item-field="' + name + '"]')!.value);
      const left = field('quantity') - field('returned') - field('kept');
      row.querySelector('output')!.textContent = Number.isInteger(left) && left >= 0 ? String(left) : '—';
    }
    get<HTMLButtonElement>('items-add').disabled = lines.children.length >= MAX_ORDER_ITEMS;
    try {
      const items = parseOrderItems(draft());
      const totals = itemTotals(items);
      get('items-summary').textContent = itemSummary({ items });
      get('items-outcome').textContent = totals.open
        ? (original?.completedAt ? 'Saving reopens this purchase. ' : '') + 'Its deadline stays active for the remaining quantities.'
        : 'All items are decided. Saving puts this purchase in History; a recorded return does not confirm a refund.';
      get<HTMLButtonElement>('items-save').disabled = false;
    } catch (error) {
      get('items-summary').textContent = error instanceof Error ? error.message : 'Review the item quantities.';
      get('items-outcome').textContent = 'Nothing changes until you save.';
      get<HTMLButtonElement>('items-save').disabled = true;
    }
  }

  function renderItems(items: OrderItem[]) {
    lines.innerHTML = items.map((item, index) => {
      const prefix = 'item-' + index;
      const number = (field: 'quantity' | 'returned' | 'kept', label: string) =>
        '<label for="' + prefix + '-' + field + '">' + label + '<input id="' + prefix + '-' + field + '" data-item-field="' + field + '" type="number" inputmode="numeric" min="' + (field === 'quantity' ? 1 : 0) + '" max="10000" step="1" required value="' + item[field] + '"></label>';
      return '<section class="item-line" data-item-id="' + escape(item.id) + '" aria-label="Item ' + (index + 1) + '">'
        + '<label class="item-name" for="' + prefix + '-name">Item<input id="' + prefix + '-name" data-item-field="name" maxlength="240" required value="' + escape(item.name) + '" placeholder="e.g. Linen shirt, blue / M"></label>'
        + number('quantity', 'Bought') + number('returned', 'Returned') + number('kept', 'Kept')
        + '<div class="item-open"><span>Still open</span><output>' + (item.quantity - item.returned - item.kept) + '</output></div>'
        + '<button class="button button-link item-remove" type="button" data-item-remove="' + escape(item.id) + '" aria-label="Remove item ' + (index + 1) + '">Remove</button></section>';
    }).join('');
    updateSummary();
  }

  const blank = (): OrderItem => ({ id: crypto.randomUUID(), name: '', quantity: 1, returned: 0, kept: 0 });

  get('items-add').addEventListener('click', () => {
    const items = draft();
    if (items.length >= MAX_ORDER_ITEMS) return;
    renderItems([...items, blank()]);
    lines.querySelectorAll<HTMLInputElement>('[data-item-field="name"]').item(items.length).focus();
  });
  lines.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-item-remove]');
    if (!button) return;
    renderItems(draft().filter(item => item.id !== button.dataset.itemRemove));
    (lines.querySelector<HTMLInputElement>('input') ?? get('items-add')).focus();
  });
  form.addEventListener('input', updateSummary);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!original) return;
    let current: ItemOrder[];
    try { current = options.read(); }
    catch {
      showError('Could not read saved purchases. Your item draft is kept; try saving again when storage is available.');
      return;
    }
    try {
      const plan = planItemEdit(current, original, draft());
      if (plan.changed && !options.commit(plan.next)) {
        showError('Could not save item decisions. Your draft is kept. Try saving again when browser storage is available.');
        return;
      }
      const feedback = document.querySelector<HTMLElement>('#edit-feedback');
      if (feedback) feedback.textContent = 'Saved items for ' + (plan.order.merchant || 'this purchase') + ': ' + itemSummary(plan.order) + '.';
      dialog.close();
    } catch (error) {
      if (error instanceof ItemConflict) options.refresh();
      showError(error instanceof Error ? error.message : 'Review the items before saving.');
    }
  });
  get('items-cancel').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    const id = original?.id;
    original = null;
    const button = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-items]')).find(button => button.dataset.items === id);
    (button ?? document.querySelector<HTMLElement>('#filter-completed[aria-pressed="true"]') ?? document.querySelector<HTMLElement>('#filter-all'))?.focus();
  });
  return {
    open(id: string) {
      const matches = options.getOrders().filter(order => order.id === id);
      if (matches.length !== 1) {
        const feedback = document.querySelector<HTMLElement>('#edit-feedback');
        if (feedback) feedback.textContent = 'This purchase could not be selected. Refresh the tracker before reviewing items.';
        return;
      }
      original = JSON.parse(JSON.stringify(matches[0])) as ItemOrder;
      get('items-purchase').textContent = original.merchant + (original.orderNo ? ' · #' + original.orderNo : '');
      get('items-clock').textContent = 'Return by ' + returnDueDate(original) + '. Check the store’s item exclusions.';
      showError('');
      renderItems(original.items ?? [blank()]);
      dialog.showModal();
      lines.querySelector<HTMLInputElement>('input')?.focus();
    },
  };
}
