import './trip-deadline-handoff.css';
import { requestedDeadline, ordersForDeadline } from './trip-deadline-handoff';
import type { SavedSnapshot } from './trip-checklist';

export function bindTripDeadlineHandoff(dependencies: {
  getSnapshot: () => SavedSnapshot | null;
  validate: () => boolean;
  selected: ReadonlySet<string>;
  add: (ids: string[]) => void;
}): () => void {
  const deadline = requestedDeadline(window.location.search);
  if (!deadline) return () => {};
  const host = document.querySelector('.planner');
  if (!host) return () => {};
  const panel = document.createElement('section');
  panel.className = 'deadline-handoff';
  panel.setAttribute('aria-labelledby', 'deadline-handoff-title');
  const title = document.createElement('h2');
  title.id = 'deadline-handoff-title';
  title.textContent = 'Returns due ' + new Date(deadline + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const intro = document.createElement('p');
  intro.textContent = 'Review purchases due this day. Add them without changing your trip date, packing checks or notes.';
  const rows = document.createElement('ul');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'primary-button';
  button.id = 'add-deadline-returns';
  const message = document.createElement('p');
  message.id = 'deadline-handoff-status';
  message.setAttribute('role', 'status');
  message.setAttribute('aria-live', 'polite');
  panel.append(title, intro, rows, button, message);
  host.prepend(panel);

  function update() {
    const snapshot = dependencies.getSnapshot();
    const matches = snapshot ? ordersForDeadline(snapshot.orders, deadline!) : [];
    const pending = matches.filter(order => !dependencies.selected.has(order.id));
    rows.replaceChildren();
    for (const order of matches) {
      const row = document.createElement('li');
      row.textContent = (order.merchant || 'Unnamed store') + (order.orderNo ? ' · #' + order.orderNo : '')
        + (dependencies.selected.has(order.id) ? ' — already in your trip' : '');
      rows.append(row);
    }
    button.disabled = !snapshot || !pending.length;
    button.textContent = pending.length ? 'Add ' + pending.length + (pending.length === 1 ? ' return to this trip' : ' returns to this trip') : 'Returns already in this trip';
    message.textContent = !snapshot ? 'Load saved orders to review this deadline.'
      : !matches.length ? 'No current saved returns have this deadline. A purchase may have changed or been removed; choose from the current list below.'
      : !pending.length ? 'All returns for this deadline are in your trip. Continue packing below.'
      : 'Review the stores above before adding. The deadline is not your planned trip date.';
    button.hidden = !matches.length;
  }
  button.addEventListener('click', () => {
    if (!dependencies.validate()) {
      message.textContent = 'Saved returns changed. Refresh saved orders and review this deadline again before adding.';
      return;
    }
    const snapshot = dependencies.getSnapshot();
    if (!snapshot) return;
    const ids = ordersForDeadline(snapshot.orders, deadline!).filter(order => !dependencies.selected.has(order.id)).map(order => order.id);
    if (!ids.length) { update(); return; }
    dependencies.add(ids);
    update();
    const packing = document.getElementById('packing-title');
    packing?.focus({ preventScroll: true });
    packing?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
  return update;
}
