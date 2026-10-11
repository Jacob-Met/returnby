import './style.css';
import './backup.css';
import { applyMerge, buildBackup, parseBackup, planMerge, type MergePlan } from './backup';
import { readSavedOrders, MAX_SAVED_BYTES, SAVED_ORDERS_KEY, type SavedSnapshot } from './trip-checklist';
const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const notice = el<HTMLParagraphElement>('backup-notice');
const summary = el<HTMLParagraphElement>('saved-summary');
const file = el<HTMLInputElement>('backup-file');
const importSummary = el<HTMLParagraphElement>('import-summary');
const preview = el<HTMLDivElement>('backup-preview');
const rows = el<HTMLTableSectionElement>('backup-rows');
const confirm = el<HTMLInputElement>('confirm-import');
const apply = el<HTMLButtonElement>('apply-backup');
const download = el<HTMLButtonElement>('download-backup');
const storage = { getItem: (key: string) => window.localStorage.getItem(key), setItem: (key: string, value: string) => window.localStorage.setItem(key, value) };
let snapshot: SavedSnapshot | null = null;
let plan: MergePlan | null = null;
let generation = 0;
function message(text: string, error = false): void { notice.textContent = text; notice.classList.toggle('error', error); }
function fail(error: unknown): void { message(error instanceof Error ? error.message : 'This operation failed. Nothing was imported.', true); }
function retire(): void { generation++; plan = null; confirm.checked = false; apply.disabled = true; preview.hidden = true; rows.replaceChildren(); }
function refresh(): void {
  retire(); snapshot = null; download.disabled = true; message(''); importSummary.textContent = 'Select a backup to make a fresh preview.';
  try { snapshot = readSavedOrders(storage); summary.textContent = snapshot.orders.length + ' approved records saved in this browser.'; download.disabled = false; }
  catch (error) { summary.textContent = 'Saved records could not be read. They have not been changed.'; fail(error); }
}
function stillCurrent(): boolean {
  if (!snapshot) return false;
  try {
    if (readSavedOrders(storage).raw !== snapshot.raw) { retire(); download.disabled = true; message('Saved records changed. Refresh saved orders and choose the backup again.', true); return false; }
    return true;
  } catch (error) { retire(); download.disabled = true; fail(error); return false; }
}
function startDownload(text: string, name: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
download.addEventListener('click', () => {
  if (!snapshot || !stillCurrent()) return;
  try { startDownload(buildBackup(snapshot), 'returnby-backup-' + new Date().toISOString().slice(0, 10) + '.json'); message('Backup download started. Keep this unencrypted file private.'); }
  catch (error) { fail(error); }
});
el<HTMLButtonElement>('refresh-backup').addEventListener('click', () => { file.value = ''; refresh(); });
file.addEventListener('change', async () => {
  retire(); message(''); importSummary.textContent = 'No file selected.';
  const selected = file.files?.[0];
  if (!selected || !snapshot || !stillCurrent()) return;
  if (selected.size > MAX_SAVED_BYTES) { message('This file exceeds the 2 MiB limit. Nothing was imported.', true); return; }
  const ticket = generation;
  importSummary.textContent = 'Reading local file…';
  try {
    const text = await selected.text();
    if (ticket !== generation || !stillCurrent()) return;
    const backup = parseBackup(text); plan = planMerge(snapshot, backup);
    importSummary.textContent = plan.added + ' new records · ' + plan.skipped + ' identical records skipped · ' + plan.conflicts.length + ' conflicting identifiers.';
    for (const order of backup.orders) {
      const row = document.createElement('tr');
      for (const value of [order.merchant || 'Not recorded', order.orderNo || 'Not recorded', order.orderDate, String(order.windowDays) + ' days / ' + order.windowSource, order.total || 'Not recorded']) { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); }
      rows.append(row);
    }
    preview.hidden = false;
    confirm.disabled = plan.conflicts.length > 0 || plan.added === 0;
    if (plan.conflicts.length) message('Restore blocked: an existing identifier has different fields. Review both copies; no partial import or overwrite is allowed.', true);
    else if (!plan.added) message('All records are already saved. There is nothing new to import.');
    else message('Preview only. Review the fields, then check the confirmation to enable the import.');
  } catch (error) { if (ticket === generation) { importSummary.textContent = 'The selected file could not be previewed.'; fail(error); } }
});
confirm.addEventListener('change', () => { apply.disabled = !confirm.checked || !plan || !!plan.conflicts.length || plan.added === 0; });
apply.addEventListener('click', () => {
  if (!plan || !confirm.checked || !stillCurrent()) return;
  try { const count = applyMerge(plan, storage); file.value = ''; refresh(); message(count + ' new records imported. Open your tracker to review the restored deadlines.'); }
  catch (error) { retire(); fail(error); }
});
window.addEventListener('storage', event => { if (event.key === SAVED_ORDERS_KEY || event.key === null) stillCurrent(); });
window.addEventListener('focus', stillCurrent);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') stillCurrent(); });
refresh();
