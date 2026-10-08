// Exact portable-recovery + editor/calendar receiving; fictional data and local builds.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { extname, resolve, sep } from 'node:path';

const { chromium } = await import(process.env.RETURNBY_PLAYWRIGHT || 'playwright');
const build = resolve(process.env.RETURNBY_BUILD || 'dist');
const baseline = process.env.RETURNBY_BASELINE_BUILD && resolve(process.env.RETURNBY_BASELINE_BUILD);
const out = resolve(process.env.RETURNBY_EVIDENCE || 'calendar-backup-receiving');
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
const sourcePaths = ['index.html', 'src/main.ts', 'src/store.ts', 'src/parse.ts', 'src/deadline.ts', 'src/ics.ts', 'src/backup.ts', 'src/backup-ui.ts', 'src/backup.css', 'src/edit.ts', 'src/edit-ui.ts', 'src/edit.css', 'src/calendar-batch.ts', 'src/calendar-batch-ui.ts', 'src/calendar-batch.css'];
const source = await Promise.all(sourcePaths.map(async path => ({ path, sha256: sha256(await readFile(path)) })));
const buildFiles = await files(build);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    const original = url.pathname.startsWith('/baseline/');
    const root = original ? baseline : build;
    if (!root) throw Error('Baseline not configured');
    const relative = decodeURIComponent(original ? url.pathname.slice(10) : url.pathname.slice(1));
    const file = resolve(root, relative || 'index.html');
    if (!file.startsWith(root + sep)) throw Error('Outside local build');
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end('Missing local build asset'); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, ...(process.env.RETURNBY_CHROME ? { executablePath: process.env.RETURNBY_CHROME } : {}) });
const contexts = [], errors = [], external = [], checks = {}, artifacts = [];
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
  contexts.push(ctx);
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
async function open(ctx, pathname = '/') {
  const page = await ctx.newPage();
  await page.clock.setFixedTime(fixed);
  await page.goto(origin + pathname, { waitUntil: 'networkidle' });
  return page;
}
async function expandBackup(page) {
  if (!await page.locator('.backup-panel details').evaluate(node => node.open)) await page.locator('#backup-heading').click();
}
async function chooseBackup(page, document) {
  await expandBackup(page);
  await page.locator('#backup-file').setInputFiles({ name: 'fictional-returnby-backup.json', mimeType: 'application/json', buffer: Buffer.from(typeof document === 'string' ? document : JSON.stringify(document)) });
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
  if (filename) { await writeFile(resolve(out, filename), bytes); artifacts.push({ path: filename, suggestedFilename: file.suggestedFilename(), bytes: bytes.length, sha256: sha256(bytes) }); }
  return { text: bytes.toString('utf8'), name: file.suggestedFilename() };
}
const choice = (page, number) => page.locator('#calendar-choices label').filter({ hasText: `#${number}` }).locator('input');
async function selectOnly(page, numbers, touch = false) {
  if (await page.locator('#calendar-select-none').isEnabled()) await page.locator('#calendar-select-none')[touch ? 'tap' : 'click']();
  for (const number of numbers) await choice(page, number)[touch ? 'tap' : 'check']();
}
async function edit(page, id, values) {
  await page.locator(`[data-edit="${id}"]`).click();
  for (const [field, value] of Object.entries(values)) await page.locator(`#edit-${field}`).fill(value);
  await page.locator('#edit-save').click();
  assert(await page.locator('#edit-dialog').isHidden());
}
async function capture(page, filename) {
  await page.screenshot({ path: resolve(out, filename) });
  const bytes = await readFile(resolve(out, filename));
  artifacts.push({ path: filename, bytes: bytes.length, sha256: sha256(bytes) });
}

let failure;
try {
  if (baseline) {
    const page = await open(await context(), '/baseline/');
    assert.equal(await page.locator('#backup-export').count(), 1);
    assert.equal(await page.locator('#calendar-open').count(), 0);
    assert.equal(await page.locator('#edit-dialog').count(), 0);
    checks.baseline = { backupControl: true, calendarBatchControl: false, savedEditor: false };
  }
  const primaryContext = await context();
  const primary = await open(primaryContext);
  await primary.locator('#paste').fill('From: Contoso Electronics <orders@example.test>\nOrder #CT-48130\nOrder placed October 3, 2026\nSubtotal: $50.00\nShipping: $5.00\nTotal: $55.00');
  await primary.locator('#find').click();
  assert.equal(await primary.locator('#preview [name=total]').inputValue(), '$55.00');
  assert.equal(await primary.locator('#preview [name=orderDate]').inputValue(), '2026-10-03');
  assert.equal(await primary.locator('#preview [name=windowDays]').inputValue(), '15');
  await primary.locator('#preview button[type=submit]').click();
  const parsed = (await saved(primary))[0];
  assert.equal(parsed.windowSource, 'policy');
  const historical = fixture('historical-fallback', { orderNo: 'HISTORY', merchant: 'Fictional Café 家 <img src="https://invalid.test/receipt">', windowDays: 45, windowSource: 'default' });
  await importBackup(primary, backup([historical]));
  assert.match(await primary.locator('#list').innerText(), /45-DAY FALLBACK/);
  await primary.locator('#paste').fill('UNSAVED_COMPOSITION_EMAIL_KEEP_PRIVATE');
  await primary.locator('#find').click();
  await edit(primary, historical.id, { 'order-date': '2026-10-03', total: '$22.00' });
  const approved = await saved(primary);
  const editedHistorical = approved.find(row => row.id === historical.id);
  assert.deepEqual(editedHistorical, { ...historical, orderDate: '2026-10-03', total: '$22.00' });
  const actualBackup = await download(primary, () => primary.locator('#backup-export').click(), 'combined-approved-backup.json');
  assert.deepEqual(JSON.parse(actualBackup.text).orders, approved);
  assert(!actualBackup.text.includes('UNSAVED_COMPOSITION_EMAIL_KEEP_PRIVATE'));
  const phone = await open(await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }));
  const empty = await raw(phone);
  await chooseBackup(phone, actualBackup.text);
  assert.match(await phone.locator('#backup-summary').innerText(), /2 to add/);
  await phone.locator('#backup-cancel').tap();
  assert.equal(await raw(phone), empty);
  await importBackup(phone, actualBackup.text);
  assert.deepEqual(await saved(phone), approved);
  assert.match(await phone.locator('#list').innerText(), /45-DAY FALLBACK/);
  const singles = [];
  for (const row of approved) singles.push(eventBlocks((await download(phone, () => phone.locator(`[data-ics="${row.id}"]`).tap())).text)[0]);
  await phone.locator('#paste').fill('UNSAVED_PHONE_DRAFT'); await phone.locator('#find').tap();
  const phoneBefore = await raw(phone), phoneMetrics = await metrics(phone);
  await phone.locator('#calendar-open').tap();
  await selectOnly(phone, ['CT-48130', 'HISTORY'], true);
  assert.equal(await phone.locator('#calendar-choices input:checked').count(), 2);
  assert.equal(await phone.locator('#calendar-choices img').count(), 0);
  const heading = await phone.locator('#calendar-title').boundingBox();
  assert(heading && heading.y >= 0 && heading.y + heading.height <= 844);
  assert(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await capture(phone, 'phone-restored-calendar.png');
  const joined = await download(phone, () => phone.locator('#calendar-download').tap(), 'restored-selected-reminders.ics');
  const sortEvents = values => values.sort((a, b) => eventUid(a).localeCompare(eventUid(b)));
  assert.deepEqual(sortEvents(eventBlocks(joined.text)), sortEvents(singles));
  assert.equal(joined.text.split('BEGIN:VCALENDAR').length - 1, 1);
  assert(!joined.text.includes('$55.00') && !joined.text.includes('$22.00') && !joined.text.includes('UNSAVED'));
  assert.equal(await raw(phone), phoneBefore);
  assert.equal((await metrics(phone)).attempts, phoneMetrics.attempts);
  assert.equal(await phone.locator('#paste').inputValue(), 'UNSAVED_PHONE_DRAFT');
  checks.parsed_review_saved_edited_backup_restored_and_touch_calendar = { exactOrders: approved.length, parserTotal: parsed.total, historicalFallbackDays: editedHistorical.windowDays, events: eventBlocks(joined.text).length, calendarWrites: 0, receivingTouch: 'Chromium emulation, no physical phone' };
  await primary.locator('#calendar-open').click();
  await selectOnly(primary, ['HISTORY']);
  const beforeReplacement = await raw(primary);
  const sibling = await open(primaryContext);
  const replacement = { ...editedHistorical, merchant: 'Restored Fictional Store', orderNo: 'RESTORED-HISTORY', orderDate: '2026-10-10', windowDays: 60, windowSource: 'user' };
  await chooseBackup(sibling, backup([replacement]));
  assert(await sibling.locator('#backup-apply').isDisabled());
  assert.match(await sibling.locator('#backup-summary').innerText(), /1 conflicting/);
  assert.equal(await raw(primary), beforeReplacement);
  await sibling.locator('#backup-cancel').click();
  await sibling.locator(`[data-del="${historical.id}"]`).click();
  const addition = fixture('restored-new', { orderNo: 'RESTORED-NEW' });
  await importBackup(sibling, backup([replacement, addition]));
  const afterReplacement = await raw(primary), beforeRefusal = await metrics(primary);
  await primary.locator('#calendar-download').click();
  assert.match(await primary.locator('#calendar-message').innerText(), /changed or was removed/);
  assert(await primary.locator('#calendar-dialog').isVisible());
  assert.equal((await metrics(primary)).allocations, beforeRefusal.allocations);
  assert.equal(await raw(primary), afterReplacement);
  await primary.locator('#calendar-reload').click();
  assert(await choice(primary, 'RESTORED-HISTORY').isChecked());
  assert(!await choice(primary, 'RESTORED-NEW').isChecked());
  assert.equal(await primary.locator('#calendar-choices input:checked').count(), 1);
  assert.match(await primary.locator('#calendar-summary').innerText(), /2026-12-09/);
  await capture(primary, 'desktop-replacement-review.png');
  const replaced = await download(primary, () => primary.locator('#calendar-download').click(), 'replacement-reviewed-reminder.ics');
  assert.equal(eventBlocks(replaced.text).length, 1);
  assert.equal(eventUid(eventBlocks(replaced.text)[0]), `${historical.id}@returnby`);
  assert.match(replaced.text, /DTSTART;VALUE=DATE:20261209\r\nDTEND;VALUE=DATE:20261210/);
  assert.equal(await raw(primary), afterReplacement);
  assert.equal((await metrics(primary)).attempts, beforeRefusal.attempts);
  checks.real_second_tab_remove_restore_changes_selected_identity = { conflictBlockedOriginal: true, restoredRecords: 2, staleDownloadAllocations: 0, explicitReloadRetainedOnlySelectedIdentity: true, unchangedUid: `${historical.id}@returnby`, reviewedDue: '2026-12-09', calendarWrites: 0 };
  const staged = await open(await context());
  await importBackup(staged, actualBackup.text);
  const firstAddition = fixture('staged-first', { orderNo: 'STAGED-FIRST' });
  await chooseBackup(staged, backup([firstAddition]));
  const beforeCalendar = await raw(staged), beforeCalendarMetrics = await metrics(staged);
  await staged.locator('#calendar-open').click(); await selectOnly(staged, ['HISTORY']);
  await download(staged, () => staged.locator('#calendar-download').click());
  assert.equal(await raw(staged), beforeCalendar);
  assert.equal((await metrics(staged)).attempts, beforeCalendarMetrics.attempts);
  assert(await staged.locator('#backup-preview').isVisible());
  await staged.locator('#backup-apply').click();
  assert.match(await staged.locator('#backup-message').innerText(), /^Imported 1 order/);
  const secondAddition = fixture('staged-second', { orderNo: 'STAGED-SECOND' });
  await chooseBackup(staged, backup([secondAddition]));
  await edit(staged, historical.id, { 'window-days': '60' });
  const afterEdit = await raw(staged), afterEditMetrics = await metrics(staged);
  await staged.locator('#backup-apply').click();
  assert.match(await staged.locator('#backup-message').innerText(), /changed since the preview/);
  assert.equal(await raw(staged), afterEdit);
  assert.equal((await metrics(staged)).attempts, afterEditMetrics.attempts);
  await staged.locator('#backup-apply').click();
  assert.match(await staged.locator('#backup-message').innerText(), /^Imported 1 order/);
  await chooseBackup(staged, actualBackup.text);
  assert(await staged.locator('#backup-apply').isDisabled());
  assert.match(await staged.locator('#backup-summary').innerText(), /1 conflicting/);
  await staged.locator('#backup-cancel').click();
  const retryAddition = fixture('staged-retry', { orderNo: 'STAGED-RETRY' });
  await chooseBackup(staged, backup([retryAddition]));
  const beforeFailedImport = await raw(staged), beforeFailedMetrics = await metrics(staged);
  await staged.evaluate(() => { window.receivingRefuseWrites = true; });
  await staged.locator('#backup-apply').click();
  assert.match(await staged.locator('#backup-message').innerText(), /storage refused/);
  assert.equal(await raw(staged), beforeFailedImport);
  assert.equal((await metrics(staged)).attempts, beforeFailedMetrics.attempts + 1);
  assert.equal((await metrics(staged)).accepted, beforeFailedMetrics.accepted);
  await staged.locator('#calendar-open').click(); await selectOnly(staged, ['HISTORY']);
  assert.equal(await choice(staged, 'STAGED-RETRY').count(), 0);
  const beforeRetryCalendar = await metrics(staged);
  const retryCalendar = await download(staged, () => staged.locator('#calendar-download').click(), 'calendar-during-backup-write-refusal.ics');
  assert.equal(eventBlocks(retryCalendar.text).length, 1);
  assert.match(retryCalendar.text, /DTSTART;VALUE=DATE:20261202/);
  assert.equal((await metrics(staged)).attempts, beforeRetryCalendar.attempts);
  assert.equal(await raw(staged), beforeFailedImport);
  await staged.evaluate(() => { window.receivingRefuseWrites = false; });
  await staged.locator('#backup-apply').click();
  assert.match(await staged.locator('#backup-message').innerText(), /^Imported 1 order/);
  const recovered = await saved(staged);
  assert.equal(recovered.filter(row => row.id === retryAddition.id).length, 1);
  assert.equal(recovered.find(row => row.id === historical.id).windowDays, 60);
  assert.deepEqual(recovered.filter(row => row.id !== retryAddition.id), JSON.parse(beforeFailedImport));
  checks.staged_import_calendar_noop_edit_freshness_and_failed_write_retry = { calendarKeptImportPlan: true, editRequiredAnotherImportReview: true, oldBackupConflictPreservedCorrection: true, failedWriteAttempts: 1, failedWriteAccepted: 0, calendarDuringRefusalUsedOnlySavedRows: true, recoveredAdditionCount: 1 };
  const boundary = await open(await context());
  const beyondCalendarEnd = fixture('last-return-day', { orderNo: 'LAST-DAY', orderDate: '9999-12-30', windowDays: 1 });
  const validBoundary = fixture('ordinary-return', { orderNo: 'ORDINARY' });
  await importBackup(boundary, backup([beyondCalendarEnd, validBoundary]));
  const boundaryBefore = await raw(boundary), boundaryMetrics = await metrics(boundary);
  await boundary.locator('#calendar-open').click();
  assert(await choice(boundary, 'LAST-DAY').isDisabled());
  assert.match(await boundary.locator('#calendar-choices').innerText(), /before 9999-12-31/);
  assert(await choice(boundary, 'ORDINARY').isChecked());
  const boundaryCalendar = await download(boundary, () => boundary.locator('#calendar-download').click(), 'valid-subset-after-boundary-backup.ics');
  assert.deepEqual(eventBlocks(boundaryCalendar.text).map(eventUid), [`${validBoundary.id}@returnby`]);
  assert.equal(await raw(boundary), boundaryBefore);
  assert.equal((await metrics(boundary)).attempts, boundaryMetrics.attempts);
  checks.backup_admission_preserved_calendar_explains_narrower_date_boundary = { backupRecordsPreserved: 2, visiblyUnselectableEndOverflow: 1, exportedValidSubset: 1, calendarWrites: 0 };
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  assert.deepEqual(await files(build), buildFiles);
  for (const entry of source) assert.equal(sha256(await readFile(entry.path)), entry.sha256);
} catch (error) { failure = error; }
finally {
  const result = { status: failure ? 'fail' : 'pass', source_freeze: 'd457628a3def47f71bab58f9285fe64173ea1624', source_tree: 'debb013d11b8a9fddc620522192c3c8939c84c76', actual_checkout_head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), browser_version: browser.version(), checks, application_errors: errors, external_requests: external, source_sha256: source, build_files: buildFiles, artifacts, ...(failure ? { failure: { message: failure.message, stack: failure.stack } } : {}) };
  await writeFile(resolve(out, 'browser-receipt.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  for (const ctx of contexts) await ctx.close();
  await browser.close();
  await new Promise(done => server.close(done));
}
if (failure) throw failure;
