/** Keep reading and keyboard order aligned when the narrow desk prioritizes saved work. */
let saved = false;
let media: MediaQueryList | undefined;

function arrange() {
  const grid = document.querySelector('.desk-grid');
  const intake = document.querySelector<HTMLElement>('.intake-panel');
  const ledger = document.querySelector<HTMLElement>('.ledger-panel');
  if (!grid || !intake || !ledger) return;
  const first = media?.matches && saved ? ledger : intake;
  const list = ledger.querySelector('#list');
  const calendar = ledger.querySelector('.calendar-toolbar');
  const csv = ledger.querySelector('.csv-toolbar');
  if (list && calendar) {
    if (media?.matches && saved && list.nextElementSibling !== (csv || calendar)) {
      if (csv) list.after(csv, calendar);
      else list.after(calendar);
    } else if (!(media?.matches && saved) && list.previousElementSibling !== calendar) {
      if (csv) list.before(csv, calendar);
      else list.before(calendar);
    }
  }
  grid.classList.toggle('has-saved-returns', saved);
  if (grid.firstElementChild === first) return;
  const focused = document.activeElement as HTMLElement | null;
  grid.insertBefore(first, grid.firstElementChild);
  if (focused && first.contains(focused)) focused.focus({ preventScroll: true });
}

export function updateMobileDesk(hasSaved: boolean) {
  if (typeof window.matchMedia !== 'function') return;
  saved = hasSaved;
  if (!media) {
    media = window.matchMedia('(max-width: 760px)');
    media.addEventListener('change', arrange);
  }
  arrange();
}
