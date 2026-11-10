/** Keep the phone's saved-return desk and intake separate without losing a draft. */
export function bindDeskNavigation() {
  const grid = document.querySelector<HTMLElement>('#desk-grid')!;
  const intake = document.querySelector<HTMLElement>('#purchase-intake')!;
  const ledger = document.querySelector<HTMLElement>('#saved-returns')!;
  const add = document.querySelector<HTMLAnchorElement>('#desk-add')!;
  const back = document.querySelector<HTMLButtonElement>('#desk-back')!;
  const paste = document.querySelector<HTMLTextAreaElement>('#paste')!;
  const preview = document.querySelector<HTMLFormElement>('#preview')!;
  const screen = window.matchMedia('(max-width: 900px)');
  let initialized = false;
  let hasSaved = false;
  let view: 'returns' | 'intake' = 'intake';

  function apply() {
    intake.hidden = screen.matches && view === 'returns';
    ledger.hidden = screen.matches && view === 'intake';
    add.hidden = screen.matches && view === 'intake';
    back.hidden = !screen.matches || view !== 'intake' || !hasSaved;
    add.setAttribute('aria-expanded', String(!intake.hidden));
    grid.dataset.view = view;
    document.querySelector<HTMLElement>('#desk-intro')!.dataset.view = view;
    back.textContent = paste.value.trim() || !preview.hidden ? '← Your returns · draft kept' : '← Your returns';
  }

  function showIntake() {
    view = 'intake';
    apply();
    const target = screen.matches ? document.querySelector<HTMLElement>('#intake-title')! : paste;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start' });
  }

  function showReturns() {
    view = 'returns';
    apply();
    if (['#paste', '#purchase-intake', '#preview'].includes(window.location.hash))
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    const title = document.querySelector<HTMLElement>('#returns-title')!;
    title.focus({ preventScroll: true });
    ledger.scrollIntoView({ block: 'start' });
  }

  add.addEventListener('click', event => { event.preventDefault(); showIntake(); });
  back.addEventListener('click', showReturns);
  paste.addEventListener('input', apply);
  screen.addEventListener('change', apply);
  window.addEventListener('hashchange', () => {
    if (['#paste', '#purchase-intake', '#preview'].includes(window.location.hash)) showIntake();
  });

  return {
    openIntake: showIntake,
    update(count: number, unavailable = false) {
      hasSaved = count > 0 || unavailable;
      if (!initialized) {
        view = hasSaved && !['#paste', '#purchase-intake', '#preview'].includes(window.location.hash) ? 'returns' : 'intake';
        initialized = true;
      }
      apply();
    },
    saved(id: string) {
      view = 'returns';
      apply();
      if (['#paste', '#purchase-intake', '#preview'].includes(window.location.hash))
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      window.requestAnimationFrame(() => {
        const card = Array.from(ledger.querySelectorAll<HTMLElement>('[data-order-id]'))
          .find(element => element.dataset.orderId === id);
        const target = card ?? document.querySelector<HTMLElement>('#returns-title')!;
        target.focus({ preventScroll: true });
        target.scrollIntoView({ block: 'start' });
      });
    },
  };
}
