// A different tab can change the same local tracker. Notify instead of silently
// replacing cards beneath an Edit/Remove gesture or overwriting an unsaved draft.
export function bindTabSync(options: { refresh: () => boolean }): void {
  const notice = document.querySelector<HTMLElement>('#tab-sync')!;
  const message = document.querySelector<HTMLElement>('#tab-sync-message')!;
  const review = document.querySelector<HTMLButtonElement>('#tab-sync-review')!;
  const editDialog = document.querySelector<HTMLDialogElement>('#edit-dialog')!;
  const editNotice = document.querySelector<HTMLElement>('#edit-tab-sync-notice')!;

  window.addEventListener('storage', (event: StorageEvent) => {
    // A storage event is only sent to *other* documents, never to its writer.
    // Unrelated keys must not interrupt a return the user is reviewing.
    if (event.storageArea !== window.localStorage ||
        (event.key !== 'returnby.v1' && event.key !== null)) return;
    notice.hidden = false;
    review.hidden = false;
    message.textContent = 'Saved returns changed in another tab. Review the latest tracker before acting on older deadlines.';
    // The background Review control is unreachable while a native edit dialog
    // is open. Announce the change inside the modal without touching the draft.
    if (editDialog.open) {
      editNotice.hidden = false;
      editNotice.textContent = 'Saved returns changed in another tab while you were editing. Your draft is still here. Save will check for conflicts; cancel and reopen to review the latest details.';
    }
  });

  editDialog.addEventListener('close', () => {
    editNotice.hidden = true;
    editNotice.textContent = '';
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
