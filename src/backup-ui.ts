import { BackupError, exportBackup, MAX_BACKUP_BYTES, parseBackup, planImport, type ImportPlan } from './backup';
import { dueDate } from './deadline';
import type { Order } from './store';

type Tracker = { read: () => unknown; commit: (orders: Order[]) => boolean };
const PAGE_SIZE = 25;

export function bindBackup(tracker: Tracker) {
  const get = <T extends HTMLElement>(id: string) => document.querySelector(`#${id}`) as T;
  const fileInput = get<HTMLInputElement>('backup-file');
  const panel = get<HTMLElement>('backup-preview');
  const summary = get<HTMLElement>('backup-summary');
  const rows = get<HTMLUListElement>('backup-rows');
  const message = get<HTMLElement>('backup-message');
  const apply = get<HTMLButtonElement>('backup-apply');
  const previous = get<HTMLButtonElement>('backup-previous');
  const next = get<HTMLButtonElement>('backup-next');
  let incoming: Order[] | null = null;
  let preview: ImportPlan | null = null;
  let generation = 0;
  let page = 0;

  function tell(value: string, error = false) {
    message.textContent = value;
    message.hidden = !value;
    message.setAttribute('role', error ? 'alert' : 'status');
  }

  function errorText(error: unknown) {
    return error instanceof BackupError ? error.message : "Couldn't read saved returns or this file. Check browser storage and try again.";
  }

  function reset() {
    generation++;
    incoming = null;
    preview = null;
    panel.hidden = true;
    apply.disabled = true;
    fileInput.value = '';
  }

  function renderPage() {
    if (!preview) return;
    const start = page * PAGE_SIZE;
    rows.replaceChildren(...preview.rows.slice(start, start + PAGE_SIZE).map(row => {
      const li = document.createElement('li');
      const o = row.order;
      const action = row.action === 'add' ? 'Add' : row.action === 'skip' ? 'Already saved' : 'Conflict';
      const source = o.windowSource === 'policy' ? 'saved store policy' : o.windowSource === 'default' ? 'saved fallback' : 'your saved rule';
      li.textContent = `${action}: ${o.merchant || 'Unknown store'}${o.orderNo ? ` #${o.orderNo}` : ''}${o.total ? ` · ${o.total}` : ''} — ordered ${o.orderDate}, return by ${dueDate(o.orderDate, o.windowDays)} (${o.windowDays} days; ${source})${row.changedFields.length ? `. Different fields: ${row.changedFields.join(', ')}.` : ''}`;
      return li;
    }));
    get('backup-page').textContent = preview.rows.length ? `${start + 1}–${Math.min(start + PAGE_SIZE, preview.rows.length)} of ${preview.rows.length} orders` : 'No orders in this backup';
    previous.disabled = page === 0;
    next.disabled = start + PAGE_SIZE >= preview.rows.length;
  }

  function show(plan: ImportPlan) {
    preview = plan;
    page = 0;
    summary.textContent = `${plan.added} to add · ${plan.skipped} already saved · ${plan.conflicts} conflicting`;
    apply.textContent = `Import ${plan.added} ${plan.added === 1 ? 'order' : 'orders'}`;
    apply.disabled = plan.conflicts > 0 || plan.added === 0;
    panel.hidden = false;
    renderPage();
    if (plan.conflicts) tell('Nothing can be imported from this file while IDs conflict. Keep your current tracker and choose the matching backup, or cancel.', true);
    else if (!plan.added) tell('Everything in this backup is already saved, or the backup is empty. Nothing will change.');
    else tell('Review the orders below, then choose Import. Existing saved orders will stay.');
    summary.focus();
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    reset();
    if (!file) { tell(''); return; }
    const ticket = generation;
    tell('Reading backup…');
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new BackupError('Choose a backup no larger than 5 MiB.');
      const contents = await file.text();
      if (ticket !== generation) return;
      incoming = parseBackup(contents);
      show(planImport(tracker.read(), incoming));
    } catch (error) {
      if (ticket !== generation) return;
      reset();
      tell(errorText(error), true);
    }
  });

  get('backup-cancel').addEventListener('click', () => { reset(); tell('Import cancelled. Your tracker is unchanged.'); });
  previous.addEventListener('click', () => { if (page > 0) { page--; renderPage(); } });
  next.addEventListener('click', () => { if (preview && (page + 1) * PAGE_SIZE < preview.rows.length) { page++; renderPage(); } });

  apply.addEventListener('click', () => {
    if (!incoming || !preview) return;
    try {
      // Read again at commitment: another save or tab may have changed the list
      // while the user reviewed the file. A changed plan needs fresh review.
      const current = planImport(tracker.read(), incoming);
      if (current.snapshot !== preview.snapshot) {
        show(current);
        tell('Saved returns changed since the preview. Review this updated plan before importing.', true);
        return;
      }
      if (current.conflicts || !current.added) return;
      if (!tracker.commit(current.next)) {
        tell("The backup wasn't imported because browser storage refused the change. Your preview is kept so you can try again.", true);
        return;
      }
      reset();
      tell(`Imported ${current.added} ${current.added === 1 ? 'order' : 'orders'}. Skipped ${current.skipped} already saved.`);
    } catch (error) { tell(errorText(error), true); }
  });

  get('backup-export').addEventListener('click', () => {
    let url: string | undefined;
    try {
      const now = new Date();
      const content = exportBackup(tracker.read(), now);
      url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `returnby-backup-${now.toISOString().slice(0, 10)}.json`;
      link.click();
      tell('Backup download requested. Keep this file private: it contains your saved order details.');
    } catch (error) { tell(errorText(error), true); }
    finally {
      // Let the browser start its download before releasing the object URL.
      if (url) {
        const downloaded = url;
        setTimeout(() => URL.revokeObjectURL(downloaded), 1000);
      }
    }
  });
}
