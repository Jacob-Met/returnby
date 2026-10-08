// Receive exact PR16 ordinary actions against the reviewed backup/editor/calendar app.
// Only fictional user data and disposable loopback browser contexts are used.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { extname, resolve, sep } from 'node:path';

const { chromium } = await import(process.env.RETURNBY_PLAYWRIGHT || 'playwright');
const build = resolve(process.env.RETURNBY_BUILD || 'dist');
const out = resolve(process.env.RETURNBY_EVIDENCE || 'actions-backup-calendar-receiving');
await mkdir(out, { recursive: true });
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
async function files(root, relative = '') {
  const result = [];
  for (const entry of await readdir(resolve(root, relative), { withFileTypes: true })) {
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...await files(root, name));
    else if (entry.isFile()) { const bytes = await readFile(resolve(root, name)); result.push({ path: name, sha256: sha256(bytes), bytes: bytes.length }); }
  }
  return result.sort((a, b) => a.path.localeCompare(b.path));
}
const sourcePaths = ['index.html', 'src/main.ts', 'src/store.ts', 'src/parse.ts', 'src/policy.ts', 'src/deadline.ts', 'src/ics.ts', 'src/backup.ts', 'src/backup-ui.ts', 'src/backup.css', 'src/edit.ts', 'src/edit-ui.ts', 'src/edit.css', 'src/calendar-batch.ts', 'src/calendar-batch-ui.ts', 'src/calendar-batch.css'];
const source = await Promise.all(sourcePaths.map(async path => ({ path, sha256: sha256(await readFile(path)) })));
const buildFiles = await files(build);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer(async (request, response) => {
  try {
    const relative = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname.slice(1));
    const file = resolve(build, relative || 'index.html');
    if (!file.startsWith(build + sep)) throw Error('Outside local build');
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end('Missing local build asset'); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, ...(process.env.RETURNBY_CHROME ? { executablePath: process.env.RETURNBY_CHROME } : {}) });
const contexts = new Set(), errors = [], external = [], checks = {}, artifacts = [];
const fixed = new Date('2026-10-08T12:34:56.000Z');
const raw = page => page.evaluate(() => localStorage.getItem('returnby.v1'));
const saved = async page => JSON.parse(await raw(page) || '[]');
const metrics = page => page.evaluate(() => ({ attempts: window.receivingWrites.length, accepted: window.receivingWrites.filter(write => write.accepted).length, allocations: window.receivingAllocations }));
const eventBlocks = text => [...text.replace(/\r\n[ \t]/g, '').matchAll(/BEGIN:VEVENT\r\n([\s\S]*?)END:VEVENT\r\n/g)].map(match => match[1]);
const eventUid = event => event.match(/^UID:(.+)$/m)?.[1].replace(/\r$/, '');
const backup = orders => ({ schema: 'returnby.backup', version: 1, exportedAt: fixed.toISOString(), orders });
const fixture = (id, fields = {}) => ({ id, merchant: 'Fictional receiving shop', orderNo: id, total: '$18.00', orderDate: '2026-10-01', windowDays: 30, windowSource: 'user', createdAt: '2026-10-01T12:00:00Z', ...fields });

async function context(options = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, ...options });
  contexts.add(ctx);
  await ctx.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    external.push(route.request().url()); return route.abort();
  });
  ctx.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  await ctx.addInitScript(() => {
    const read = Storage.prototype.getItem, write = Storage.prototype.setItem, allocate = URL.createObjectURL;
    window.receivingWrites = []; window.receivingAllocations = 0;
    window.receivingRefuseReads = false; window.receivingRefuseWrites = false;
    Storage.prototype.getItem = function(key) {
      if (key === 'returnby.v1' && window.receivingRefuseReads) throw new DOMException('Receiving read refusal', 'SecurityError');
      return read.call(this, key);
    };
    Storage.prototype.setItem = function(key, value) {
      if (key !== 'returnby.v1') return write.call(this, key, value);
      const entry = { value, accepted: false }; window.receivingWrites.push(entry);
      if (window.receivingRefuseWrites) throw new DOMException('Receiving write refusal', 'QuotaExceededError');
      const result = write.call(this, key, value); entry.accepted = true; return result;
    };
    URL.createObjectURL = function(blob) { window.receivingAllocations++; return allocate.call(this, blob); };
  });
  return ctx;
}
async function close(ctx) { await ctx.close(); contexts.delete(ctx); }
async function open(ctx) {
  const page = await ctx.newPage();
  await page.clock.setFixedTime(fixed);
  await page.goto(origin, { waitUntil: 'networkidle' });
  return page;
}
async function draft(page, orderNo) {
  await page.locator('#paste').fill(`From: Contoso Electronics <orders@example.test>\nOrder #CT-48131\nOrder placed October 3, 2026\nSubtotal: $50.00\nShipping: $5.00\nTotal: $55.00\nFictional private draft ${orderNo}`);
  await page.locator('#find').click();
  assert.equal(await page.locator('#preview [name=total]').inputValue(), '$55.00');
  assert.equal(await page.locator('#preview [name=orderDate]').inputValue(), '2026-10-03');
  assert.equal(await page.locator('#preview [name=windowDays]').inputValue(), '15');
  await page.locator('#preview [name=orderNo]').fill(orderNo);
}
async function chooseBackup(page, document) {
  if (!await page.locator('.backup-panel details').evaluate(node => node.open)) await page.locator('#backup-heading').click();
  await page.locator('#backup-file').setInputFiles({ name: 'fictional-returnby-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(document)) });
  await page.waitForFunction(() => document.querySelector('#backup-message').textContent !== 'Reading backup…');
}
async function importBackup(page, document) {
  await chooseBackup(page, document);
  assert(await page.locator('#backup-apply').isEnabled());
  await page.locator('#backup-apply').click();
  assert.match(await page.locator('#backup-message').innerText(), /^Imported /);
}
async function download(page, action, filename) {
  const pending = page.waitForEvent('download');
  await action();
  const file = await pending;
  const bytes = await readFile(await file.path());
  await writeFile(resolve(out, filename), bytes);
  artifacts.push({ path: filename, suggestedFilename: file.suggestedFilename(), bytes: bytes.length, sha256: sha256(bytes) });
  return bytes.toString('utf8');
}
const choice = (page, number) => page.locator('#calendar-choices label').filter({ hasText: `#${number}` }).locator('input');
async function selectOnly(page, numbers, touch = false) {
  if (await page.locator('#calendar-select-none').isEnabled()) await page.locator('#calendar-select-none')[touch ? 'tap' : 'click']();
  for (const number of numbers) await choice(page, number)[touch ? 'tap' : 'check']();
}
async function capture(page, filename, fullPage = false) {
  await page.screenshot({ path: resolve(out, filename), fullPage });
  const bytes = await readFile(resolve(out, filename));
  artifacts.push({ path: filename, bytes: bytes.length, sha256: sha256(bytes) });
}

let failure;
try {
  // Real backup + editor changes arrive while the other tab holds a new-order draft.
  const firstContext = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const first = await open(firstContext);
  const historical = fixture('actions-historical', { orderNo: 'HISTORY', merchant: 'Fictional Café', windowDays: 45, windowSource: 'default' });
  const removed = fixture('actions-removed', { orderNo: 'REMOVED-ELSEWHERE' });
  await importBackup(first, backup([historical, removed]));
  const stale = await open(firstContext);
  await draft(stale, 'LOCAL-SAVE');
  await first.locator(`[data-edit="${historical.id}"]`).tap();
  await first.locator('#edit-order-no').fill('EDITED-HISTORY');
  await first.locator('#edit-order-date').fill('2026-10-10');
  await first.locator('#edit-total').fill('$22.00');
  await first.locator('#edit-save').tap();
  await first.locator(`[data-del="${removed.id}"]`).tap();
  const restored = fixture('actions-restored', { orderNo: 'NEW-FROM-BACKUP' });
  await importBackup(first, backup([restored]));
  const beforeSave = await saved(first);
  await stale.locator('#preview button[type=submit]').tap();
  const afterSave = await saved(stale);
  assert.deepEqual(afterSave.slice(0, 2), beforeSave);
  assert.equal(afterSave.length, 3);
  assert.equal(afterSave[2].orderNo, 'LOCAL-SAVE');
  assert.equal(afterSave[2].windowSource, 'policy');
  assert.equal(afterSave[2].total, '$55.00');
  assert.equal(afterSave.filter(row => row.id === removed.id).length, 0);
  assert.match(await stale.locator('#list').innerText(), /45-DAY FALLBACK/);
  assert.equal(await stale.locator('#paste').inputValue(), '');
  const savedBackup = await download(stale, () => stale.locator('#backup-export').tap(), 'after-stale-save-backup.json');
  assert.deepEqual(JSON.parse(savedBackup).orders, afterSave);
  const calendarBefore = await raw(stale), calendarMetrics = await metrics(stale);
  await stale.locator('#calendar-open').tap();
  await selectOnly(stale, ['EDITED-HISTORY', 'LOCAL-SAVE'], true);
  assert(!await choice(stale, 'NEW-FROM-BACKUP').isChecked());
  assert(await stale.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await capture(stale, 'phone-calendar-after-stale-save.png');
  const reminders = await download(stale, () => stale.locator('#calendar-download').tap(), 'after-stale-save-reminders.ics');
  assert.deepEqual(eventBlocks(reminders).map(eventUid).sort(), [`${historical.id}@returnby`, `${afterSave[2].id}@returnby`].sort());
  assert.match(reminders, /DTSTART;VALUE=DATE:20261124/);
  assert.match(reminders, /DTSTART;VALUE=DATE:20261018/);
  assert(!reminders.includes('$22.00') && !reminders.includes('$55.00') && !reminders.includes('private draft'));
  assert.equal(await raw(stale), calendarBefore);
  assert.equal((await metrics(stale)).attempts, calendarMetrics.attempts);
  checks.backup_editor_changes_survive_stale_save_and_touch_calendar = { before: beforeSave, after: afterSave, deletedIdentityNotRevived: removed.id, preservedFallbackDays: 45, selectedEvents: 2, calendarWrites: 0, mobile: '390px Chromium with touch emulation; no physical phone' };
  await close(firstContext);

  // One identity is explicitly removed and restored with changed fields in another tab.
  const secondContext = await context({ viewport: { width: 390, height: 844 } });
  const remote = await open(secondContext);
  await importBackup(remote, backup([historical, removed]));
  const reviewing = await open(secondContext);
  await draft(reviewing, 'KEEP-DRAFT');
  const retainedDraft = await reviewing.locator('#paste').inputValue();
  await reviewing.locator('#calendar-open').click();
  await selectOnly(reviewing, ['HISTORY']);
  await remote.locator(`[data-del="${historical.id}"]`).click();
  await remote.locator(`[data-del="${removed.id}"]`).click();
  const replacement = { ...historical, orderNo: 'RESTORED-HISTORY', orderDate: '2026-10-10', windowDays: 60, windowSource: 'user' };
  await importBackup(remote, backup([replacement, restored]));
  const current = await raw(remote), refusalMetrics = await metrics(reviewing);
  await reviewing.locator('#calendar-download').click();
  assert.match(await reviewing.locator('#calendar-message').innerText(), /changed or was removed/);
  assert.equal((await metrics(reviewing)).allocations, refusalMetrics.allocations);
  assert.equal(await raw(remote), current);
  await reviewing.locator('#calendar-cancel').click();
  await reviewing.locator(`[data-del="${historical.id}"]`).click();
  assert.equal(await raw(remote), current);
  assert.equal((await metrics(reviewing)).attempts, refusalMetrics.attempts);
  assert.match(await reviewing.locator('#storage-error').innerText(), /changed|review/i);
  assert.match(await reviewing.locator('#list').innerText(), /RESTORED-HISTORY/);
  assert.equal(await reviewing.locator('#tracked-count').innerText(), '2');
  assert.equal(await reviewing.locator('#paste').inputValue(), retainedDraft);
  assert.equal(await reviewing.locator('#preview [name=orderNo]').inputValue(), 'KEEP-DRAFT');
  await capture(reviewing, 'phone-refused-stale-remove.png', true);
  await reviewing.locator('#calendar-open').click();
  await selectOnly(reviewing, ['RESTORED-HISTORY']);
  const reviewed = await download(reviewing, () => reviewing.locator('#calendar-download').click(), 'reviewed-replacement-before-remove.ics');
  assert.deepEqual(eventBlocks(reviewed).map(eventUid), [`${historical.id}@returnby`]);
  assert.match(reviewed, /DTSTART;VALUE=DATE:20261209\r\nDTEND;VALUE=DATE:20261210/);
  assert.equal((await metrics(reviewing)).attempts, refusalMetrics.attempts);
  await reviewing.locator(`[data-del="${historical.id}"]`).click();
  assert.deepEqual(await saved(remote), [restored]);
  assert.equal(await reviewing.locator('#preview [name=orderNo]').inputValue(), 'KEEP-DRAFT');
  const remainingBackup = await download(reviewing, () => reviewing.locator('#backup-export').click(), 'after-reviewed-remove-backup.json');
  assert.deepEqual(JSON.parse(remainingBackup).orders, [restored]);
  checks.restored_selected_identity_requires_calendar_and_remove_review = { currentBeforeRefusal: JSON.parse(current), staleCalendarAllocations: 0, staleRemoveWrites: 0, draftRetained: true, currentCalendarUid: `${historical.id}@returnby`, reviewedDue: '2026-12-09', deliberateSecondRemovePreserved: [restored.id] };
  await close(secondContext);

  // Read and write failures retain both ordinary and import drafts; retries observe new restores.
  const retryContext = await context();
  const restoring = await open(retryContext);
  const base = fixture('retry-base'), remoteOne = fixture('retry-remote-one'), remoteTwo = fixture('retry-remote-two'), pending = fixture('retry-staged-import');
  await importBackup(restoring, backup([base]));
  const retry = await open(retryContext);
  await draft(retry, 'LOCAL-RETRY');
  await chooseBackup(retry, backup([pending]));
  await importBackup(restoring, backup([remoteOne]));
  const beforeReadFailure = await raw(restoring), beforeReadMetrics = await metrics(retry);
  await retry.evaluate(() => { window.receivingRefuseReads = true; });
  await retry.locator('#preview button[type=submit]').click();
  assert.equal(await raw(restoring), beforeReadFailure);
  assert.equal((await metrics(retry)).attempts, beforeReadMetrics.attempts);
  assert(await retry.locator('#storage-retry').isVisible());
  assert(await retry.locator('#backup-preview').isVisible());
  assert.equal(await retry.locator('#preview [name=orderNo]').inputValue(), 'LOCAL-RETRY');
  await retry.evaluate(() => { window.receivingRefuseReads = false; });
  await retry.locator('#backup-apply').click();
  assert.match(await retry.locator('#backup-message').innerText(), /changed since the preview/);
  await retry.locator('#backup-apply').click();
  assert.match(await retry.locator('#backup-message').innerText(), /storage refused/);
  assert.equal((await metrics(retry)).attempts, beforeReadMetrics.attempts);
  assert.equal(await raw(restoring), beforeReadFailure);
  await retry.locator('#storage-retry').click();
  assert.equal(await retry.locator('#preview [name=orderNo]').inputValue(), 'LOCAL-RETRY');
  assert(await retry.locator('#backup-preview').isVisible());
  await retry.evaluate(() => { window.receivingRefuseWrites = true; });
  await retry.locator('#preview button[type=submit]').click();
  assert.equal(await raw(restoring), beforeReadFailure);
  assert.equal((await metrics(retry)).attempts, beforeReadMetrics.attempts + 1);
  assert.equal((await metrics(retry)).accepted, beforeReadMetrics.accepted);
  await retry.locator('#calendar-open').click();
  assert.equal(await choice(retry, 'LOCAL-RETRY').count(), 0);
  assert.equal(await choice(retry, pending.orderNo).count(), 0);
  await selectOnly(retry, [base.orderNo]);
  const beforeReadOnlyDownload = await metrics(retry);
  const duringRefusal = await download(retry, () => retry.locator('#calendar-download').click(), 'saved-reminder-during-action-write-refusal.ics');
  assert.deepEqual(eventBlocks(duringRefusal).map(eventUid), [`${base.id}@returnby`]);
  assert.equal((await metrics(retry)).attempts, beforeReadOnlyDownload.attempts);
  await importBackup(restoring, backup([remoteTwo]));
  const beforeRetry = await saved(restoring);
  await retry.evaluate(() => { window.receivingRefuseWrites = false; });
  await retry.locator('#preview button[type=submit]').click();
  const afterRetry = await saved(retry);
  assert.deepEqual(afterRetry.slice(0, 3), beforeRetry);
  assert.equal(afterRetry.filter(row => row.orderNo === 'LOCAL-RETRY').length, 1);
  assert.equal(afterRetry.length, 4);
  const beforeImportReview = await raw(retry), beforeImportMetrics = await metrics(retry);
  await retry.locator('#backup-apply').click();
  assert.match(await retry.locator('#backup-message').innerText(), /changed since the preview/);
  assert.equal(await raw(retry), beforeImportReview);
  assert.equal((await metrics(retry)).attempts, beforeImportMetrics.attempts);
  await retry.locator('#backup-apply').click();
  assert.match(await retry.locator('#backup-message').innerText(), /^Imported 1 order/);
  const afterImport = await saved(retry);
  assert.deepEqual(afterImport.slice(0, 4), afterRetry);
  assert.equal(afterImport.filter(row => row.id === pending.id).length, 1);
  assert.equal(afterImport.length, 5);
  const completedBackup = await download(retry, () => retry.locator('#backup-export').click(), 'after-ordinary-and-import-retry-backup.json');
  assert.deepEqual(JSON.parse(completedBackup).orders, afterImport);
  const finalCalendarMetrics = await metrics(retry);
  await retry.locator('#calendar-open').click();
  const recoveredCalendar = await download(retry, () => retry.locator('#calendar-download').click(), 'after-ordinary-and-import-retry-reminders.ics');
  assert.deepEqual(eventBlocks(recoveredCalendar).map(eventUid).sort(), afterImport.map(row => `${row.id}@returnby`).sort());
  assert.equal((await metrics(retry)).attempts, finalCalendarMetrics.attempts);
  assert.deepEqual(await saved(restoring), afterImport);
  checks.failures_preserve_both_drafts_and_each_retry_rereads_backup_restores = { latestReadFailureWrites: 0, loadingGuardImportWrites: 0, explicitReloadRetainedBothDrafts: true, refusedWriteAttempts: 1, refusedWritesAccepted: 0, readOnlyCalendarDuringRefusal: true, freshOrdersBeforeRetry: beforeRetry, ordinaryRetryExactlyOnce: true, stagedImportRequiredFreshReview: true, finalRecords: afterImport, recoveredCalendarEvents: 5 };
  await close(retryContext);

  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  assert.deepEqual(await files(build), buildFiles);
  for (const entry of source) assert.equal(sha256(await readFile(entry.path)), entry.sha256);
} catch (error) { failure = error; }
finally {
  const result = { status: failure ? 'fail' : 'pass', source_freeze: '50cf9e6efd8a7c92f664ddc09aaf7f9a47c41a8f', source_tree: '0ea163db4637c50dd68be33d6015daa5dc94e522', actual_checkout_head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), browser_version: browser.version(), checks, application_errors: errors, external_requests: external, source_sha256: source, build_files: buildFiles, artifacts, ...(failure ? { failure: { message: failure.message, stack: failure.stack } } : {}) };
  await writeFile(resolve(out, 'browser-receipt.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  for (const ctx of contexts) await ctx.close();
  await browser.close();
  await new Promise(done => server.close(done));
}
if (failure) throw failure;
