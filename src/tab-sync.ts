// A different tab can change the same local tracker. Notify instead of silently
// replacing cards beneath an Edit/Remove gesture or overwriting an unsaved draft.
export function bindTabSync(options: { refresh: () => boolean }): void {
  const notice = document.querySelector<HTMLElement>('#tab-sync')!;
  const message = document.querySelector<HTMLElement>('#tab-sync-message')!;
  const review = document.querySelector<HTMLButtonElement>('#tab-sync-review')!;

  window.addEventListener('storage', (event: StorageEvent) => {
    // A storage event is only sent to *other* documents, never to its writer.
    // Unrelated keys must not interrupt a return the user is reviewing.
    if (event.storageArea !== window.localStorage ||
        (event.key !== 'returnby.v1' && event.key !== null)) return;
    notice.hidden = false;
    review.hidden = false;
    message.textContent = 'Saved returns changed in another tab. Review the latest tracker before acting on older deadlines.';
  });

  review.addEventListener('click', () => {
    // Reload only after an explicit gesture. This preserves an unsubmitted
    // confirmation or Edit dialog, and the existing stale-action checks.
    if (!options.refresh()) {
      message.textContent = "The updated tracker couldn't be loaded. Your unsaved confirmation is still here; retry when browser storage is available.";
      return;
    }
    message.textContent = 'Tracker updated from the other tab.';
    review.hidden = true;
    // The focused Review button just disappeared. Put focus on a durable
    // nearby control, without moving the viewport or submitting anything.
    document.querySelector<HTMLButtonElement>('.filter.active')?.focus({ preventScroll: true });
  });
}
