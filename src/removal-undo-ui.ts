import { planUndoRemoval, type Removal } from './removal-undo';
import type { Order } from './store';

type Bindings = {
  read: () => Order[] | null;
  commit: (orders: Order[]) => boolean;
  refresh: (orders: Order[]) => void;
  focusTracker: () => void;
};

export function bindRemovalUndo({ read, commit, refresh, focusTracker }: Bindings) {
  const $ = <T extends HTMLElement>(selector: string) => document.querySelector(selector) as T;
  const panel = $('#removal-undo');
  const title = $('#removal-title');
  const description = $('#removal-description');
  const message = $('#removal-status');
  const undo = $<HTMLButtonElement>('#undo-removal');
  const dismiss = $<HTMLButtonElement>('#keep-removed');
  let pending: Removal | null = null;

  function clear() {
    pending = null;
    panel.hidden = true;
    description.textContent = '';
    message.textContent = '';
  }

  function finish(text: string) {
    pending = null;
    title.textContent = 'Return restored';
    message.textContent = text;
    undo.hidden = true;
    dismiss.textContent = 'Dismiss';
    message.focus();
  }

  undo.addEventListener('click', () => {
    if (!pending) return;
    const current = read();
    if (!current) {
      message.textContent = 'Your removed return is still available here. Retry loading saved returns, then choose Undo removal again.';
      return;
    }
    const plan = planUndoRemoval(current, pending);
    if (plan.kind === 'conflict') {
      refresh(current);
      message.textContent = 'Undo could not restore this return because its saved ID is already in use by changed or duplicate records. Your tracker has been refreshed. Review those records, then retry or choose Keep removed.';
      message.focus();
      return;
    }
    if (plan.kind === 'present') {
      refresh(current);
      finish('This exact return is already in your tracker. No saved data was changed. Your current filter still applies.');
      return;
    }
    if (!commit(plan.orders)) {
      message.textContent = 'Your removed return is still available here. Check browser storage and choose Undo removal to try again.';
      return;
    }
    finish('Restored to your tracker with its original details. Your current filter still applies.');
  });

  dismiss.addEventListener('click', () => {
    clear();
    focusTracker();
  });

  return {
    clear,
    remember(removal: Removal) {
      pending = removal;
      const order = JSON.parse(removal.record) as Order;
      const short = (value: string) => value.length > 120 ? `${value.slice(0, 120)}…` : value;
      title.textContent = 'Return removed';
      description.textContent = `${short(order.merchant || 'Unknown store')}${order.orderNo ? ` · #${short(order.orderNo)}` : ''}`;
      message.textContent = 'Undo restores only this return. Available until your next successful removal, clearing saved returns, or reloading this page.';
      undo.hidden = false;
      dismiss.textContent = 'Keep removed';
      panel.hidden = false;
      undo.focus();
    },
  };
}
