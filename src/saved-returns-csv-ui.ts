import { createSavedReturnsCsv } from './saved-returns-csv';

/** Separate read-only download; existing editor/import/tracker state is untouched. */
export function bindSavedReturnsCsv(readCurrent: () => unknown): void {
  const button = document.querySelector<HTMLButtonElement>('#saved-returns-csv');
  const message = document.querySelector<HTMLParagraphElement>('#saved-csv-message');
  if (!button || !message) throw new Error('Saved-return CSV controls are missing.');
  button.addEventListener('click', () => {
    let url: string | undefined;
    let link: HTMLAnchorElement | undefined;
    try {
      // Always receive the latest saved store, including changes in other tabs.
      const output = createSavedReturnsCsv(readCurrent());
      url = URL.createObjectURL(new Blob([output.content], { type: 'text/csv;charset=utf-8' }));
      link = document.createElement('a');
      link.href = url;
      link.download = output.filename;
      document.body.append(link);
      link.click();
      message.textContent = `CSV download started for all ${output.count} currently saved ${output.count === 1 ? 'return' : 'returns'}.` +
        (output.protectedCells ? ` ${output.protectedCells} ${output.protectedCells === 1 ? 'cell has' : 'cells have'} a leading apostrophe to keep formula-like text literal in spreadsheets.` : '');
      message.classList.remove('warn');
    } catch (error) {
      message.textContent = 'Could not download saved returns. ' + (error instanceof Error ? error.message : 'Try again after checking browser storage.');
      message.classList.add('warn');
    } finally {
      link?.remove();
      const completedUrl = url;
      if (completedUrl) setTimeout(() => URL.revokeObjectURL(completedUrl), 1000);
      message.hidden = false;
    }
  });
}
