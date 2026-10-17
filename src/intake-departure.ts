/** Observe the current unsaved intake without parsing or storing its contents. */
function hasIntakeDraft(paste: HTMLTextAreaElement, preview: HTMLFormElement): boolean {
  if (paste.value !== '') return true;
  if (preview.hidden) return false;
  for (const name of ['merchant', 'orderDate', 'orderNo', 'total']) {
    const input = preview.querySelector<HTMLInputElement>(`[name="${name}"]`);
    if (input && input.value !== '') return true;
  }
  const days = preview.querySelector<HTMLInputElement>('[name="windowDays"]');
  return days !== null && days.value !== preview.dataset.days;
}

/** The browser decides whether to display its standard departure warning. */
export function bindIntakeDeparture(
  paste: HTMLTextAreaElement,
  preview: HTMLFormElement,
  target: Window = window,
): () => void {
  let attached = false;
  function beforeUnload(event: BeforeUnloadEvent): void {
    // A programmatic clear may have occurred since the last observed event.
    if (!hasIntakeDraft(paste, preview)) return;
    event.preventDefault();
    event.returnValue = '';
  }
  function refresh(): void {
    const needed = hasIntakeDraft(paste, preview);
    if (needed === attached) return;
    if (needed) target.addEventListener('beforeunload', beforeUnload);
    else target.removeEventListener('beforeunload', beforeUnload);
    attached = needed;
  }
  paste.addEventListener('input', refresh);
  paste.addEventListener('change', refresh);
  preview.addEventListener('input', refresh);
  preview.addEventListener('change', refresh);
  refresh();
  return refresh;
}
