const KEY = 'returnby.manual-draft.v1';
export const manualDraftFields = ['merchant', 'orderDate', 'windowStartDate', 'windowDays', 'orderNo', 'total'] as const;
export type ManualDraft = Record<typeof manualDraftFields[number], string>;

export function decodeManualDraft(raw: string | null): ManualDraft | null {
  if (!raw) return null;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid draft');
  const record = value as Record<string, unknown>;
  if (record.version !== 1 || !record.fields || typeof record.fields !== 'object' || Array.isArray(record.fields)) throw new Error('Invalid draft');
  const fields = record.fields as Record<string, unknown>;
  if (Object.keys(fields).length !== manualDraftFields.length || manualDraftFields.some(name => typeof fields[name] !== 'string' || (fields[name] as string).length > 10000)) throw new Error('Invalid draft');
  return fields as ManualDraft;
}

/** Draft storage is separate from saved purchases: recovery never writes the tracker. */
export function bindManualDraftRecovery(form: HTMLFormElement, open: HTMLButtonElement, refresh: () => void) {
  const note = document.querySelector<HTMLParagraphElement>('#manual-recovery')!;
  const discard = document.querySelector<HTMLButtonElement>('#manual-discard')!;
  const values = (): ManualDraft => Object.fromEntries(manualDraftFields.map(name => [name, form.querySelector<HTMLInputElement>('[name="' + name + '"]')!.value])) as ManualDraft;
  const mark = (message: string, hasDraft: boolean) => {
    note.textContent = message;
    discard.hidden = !hasDraft;
    open.textContent = hasDraft ? 'Resume unfinished purchase' : 'Enter a purchase manually';
  };
  const clear = () => {
    try { sessionStorage.removeItem(KEY); mark('Unfinished details stay in this tab until you save or discard them.', false); }
    catch { mark("Couldn't clear the recovery copy. Browser storage is unavailable; discard again when available.", true); }
  };
  const remember = () => {
    const fields = values();
    if (!Object.values(fields).some(value => value.trim())) { clear(); return; }
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ version: 1, fields }));
      mark('Unfinished purchase kept in this tab. It is not saved to your tracker yet.', true);
    } catch {
      mark("These details are only on this page. Couldn't keep a recovery copy; leave this page open until you save.", true);
    }
  };
  mark('Unfinished details stay in this tab until you save or discard them.', false);
  try {
    const saved = decodeManualDraft(sessionStorage.getItem(KEY));
    if (saved) {
      for (const name of manualDraftFields) form.querySelector<HTMLInputElement>('[name="' + name + '"]')!.value = saved[name];
      refresh();
      mark('Recovered unfinished purchase. Review the details, then save to your tracker.', true);
    }
  } catch {
    mark("Couldn't read the unfinished purchase. Your saved tracker is unchanged. Discard this recovery copy to start again.", true);
  }
  form.addEventListener('input', remember);
  discard.addEventListener('click', () => {
    if (!window.confirm('Discard this unfinished purchase? Saved purchases will stay in your tracker.')) return;
    clear();
    form.reset();
    refresh();
    form.querySelector<HTMLInputElement>('[name=merchant]')!.focus();
  });
  return { clear };
}
