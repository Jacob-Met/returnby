// Exercise the shipped application through real controls with fictional orders.
// Optional local dependency: Playwright plus Chrome. No external account or data.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const { chromium } = await import(process.env.RETURNBY_PLAYWRIGHT || 'playwright');
const output = resolve(process.env.RETURNBY_EVIDENCE || 'completion-browser-evidence');
await mkdir(output, { recursive: true });
const base = process.env.RETURNBY_BASE_URL || 'http://127.0.0.1:18733/';
assert(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
const server = process.env.RETURNBY_BASE_URL ? null : spawn('python3', ['-m', 'http.server', '18733', '--bind', '127.0.0.1', '--directory', resolve(process.env.RETURNBY_BUILD || 'dist')], { stdio: 'ignore' });
const errors = [], external = [], checks = [];
let browser;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try { ready = (await fetch(base)).ok; } catch {}
    if (ready) break;
    await pause(100);
  }
  assert(ready, 'Actual build must be reachable');
  browser = await chromium.launch({ executablePath: process.env.RETURNBY_CHROME || '/usr/local/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, timezoneId: 'America/Los_Angeles' });
  context.on('request', req => { if (/^https?:/.test(req.url()) && new URL(req.url()).origin !== new URL(base).origin) external.push(req.url()); });
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  const page = await context.newPage();
  await page.goto(base);
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('returnby.v1') || '[]'));
  const raw = () => page.evaluate(() => localStorage.getItem('returnby.v1'));
  async function add(merchant, orderNo, orderDate, windowDays, windowStartDate = '') {
    await page.locator('#paste').fill('From: ' + merchant + '\nOrder number: ' + orderNo + '\nOrder date: ' + orderDate + '\nTotal: $68.00');
    await page.locator('#find').click();
    for (const [name, value] of Object.entries({ merchant, orderNo, total: '$68.00', orderDate, windowStartDate, windowDays: String(windowDays) })) {
      await page.locator('#preview [name=' + name + ']').fill(value);
    }
    await page.locator('#preview button[type=submit]').click();
    return (await saved()).at(-1);
  }
  async function finish(id, kind) {
    await page.locator('[data-finish="' + id + '"]').click();
    await page.locator('#finish-form [value=' + kind + ']').check();
    await page.locator('#finish-form button[type=submit]').click();
    assert(!(await page.locator('#finish-dialog').isVisible()), 'Accepted closure closes review');
  }
  let coat = await add('North Coast Outfitters', 'COAT-1042', '2026-11-01', 12, '2026-11-03');
  const lamp = await add('Juniper Home', 'LAMP-2077', '2026-10-01', 15);
  const shoes = await add('Harbor Footwear', 'SHOES-3510', '2026-11-01', 30);
  assert.equal(await page.locator('#tracked-count').innerText(), '3');
  await page.locator('[data-refund="' + coat.id + '"]').click();
  await page.locator('#refund-form [name=amount]').fill('$42.25');
  await page.locator('#refund-form [name=followUpDate]').fill('2026-11-22');
  await page.locator('#refund-form [name=note]').fill('Private drop-off reference NC-778; check merchant processing.');
  await page.locator('#refund-form button[type=submit]').click();
  coat = (await saved()).find(row => row.id === coat.id);
  assert.equal(await page.locator('#refund-count').innerText(), '1');
  const plannedTrip = await context.newPage();
  await plannedTrip.goto(new URL('trip-checklist.html', base).href);
  await plannedTrip.locator('#order-options input[value="' + coat.id + '"]').check();
  await plannedTrip.locator('#packing-planner textarea').fill('Bring the QR code to the service desk.');
  await page.bringToFront();

  await page.locator('#paste').fill('UNSAVED SECOND ORDER — KEEP THIS TEXT');
  await page.locator('#find').click();
  await page.locator('#preview [name=merchant]').fill('Unsaved draft merchant');
  await page.locator('#preview [name=orderNo]').fill('DRAFT-ONLY-88');
  const draft = await page.locator('#preview input').evaluateAll(inputs => inputs.map(input => ({ name: input.name, value: input.value })));
  const before = await raw();
  await page.locator('[data-finish="' + coat.id + '"]').click();
  assert.match(await page.locator('#finish-note').innerText(), /does not confirm a refund/);
  await page.locator('#finish-cancel').click();
  assert.equal(await raw(), before);
  assert.equal(await page.evaluate(() => document.activeElement.dataset.finish), coat.id);
  await page.locator('[data-finish="' + coat.id + '"]').click();
  await page.keyboard.press('Escape');
  assert.equal(await raw(), before);
  checks.push('Cancel and Escape preserve orders, draft and keyboard return focus');
  await page.locator('[data-finish="' + coat.id + '"]').click();
  await page.locator('#finish-form [value=returned]').check();
  await page.screenshot({ path: resolve(output, 'finish-review-desktop.png') });
  await page.locator('#finish-form button[type=submit]').click();
  assert.equal(await page.locator('#tracked-count').innerText(), '2');
  assert.equal(await page.locator('#completed-count').innerText(), '1');
  assert.equal((await saved()).find(row => row.id === coat.id).completionKind, 'returned');
  await plannedTrip.reload();
  assert.equal(await plannedTrip.locator('#order-options input[value="' + coat.id + '"]').count(), 0);
  assert.match(await plannedTrip.locator('.unavailable-plan').innerText(), /Bring the QR code/);
  await plannedTrip.close();
  assert.equal(await page.locator('#refund-count').innerText(), '1');
  assert.equal((await saved()).find(row => row.id === coat.id).refundState, 'awaiting');
  checks.push('Finishing removes an actual saved trip selection while keeping its packing notes and pending refund');
  await page.bringToFront();

  assert.deepEqual(await page.locator('#preview input').evaluateAll(inputs => inputs.map(input => ({ name: input.name, value: input.value }))), draft);
  assert(await page.locator('#preview').isVisible());
  assert.equal(await page.locator('#paste').inputValue(), 'UNSAVED SECOND ORDER — KEEP THIS TEXT');
  await finish(lamp.id, 'kept');
  assert.equal(await page.locator('#tracked-count').innerText(), '1');
  assert.equal(await page.locator('#expired-count').innerText(), '0');
  assert.equal(await page.locator('#soon-count').innerText(), '0');
  await page.locator('#filter-completed').click();
  assert.equal(await page.locator('#list .card').count(), 2);
  assert.equal(await page.locator('#tracker-title').innerText(), 'History');
  assert(!(await page.locator('#calendar-open').isVisible()));
  assert(!(await page.locator('#trip-link').isVisible()));
  assert.equal(await page.locator('#list [data-ics]').count(), 0);
  assert.equal(await page.locator('#list [role=progressbar]').count(), 0);
  assert.match(await page.locator('#list').innerText(), /Returned/);
  assert.match(await page.locator('#list').innerText(), /Kept/);
  const closedLamp = (await saved()).find(row => row.id === lamp.id);
  await page.locator('[data-del="' + lamp.id + '"]').click();
  assert.equal(await page.locator('#completed-count').innerText(), '1');
  await page.locator('#undo-removal').click();
  assert.equal(await page.locator('#completed-count').innerText(), '2');
  assert.deepEqual((await saved()).find(row => row.id === lamp.id), closedLamp);
  checks.push('Actual Remove and Undo restore a finished order without reopening its deadline');

  await page.screenshot({ path: resolve(output, 'history-desktop.png') });
  checks.push('Returned and kept leave all active urgency counts and render quiet History records');
  await page.locator('#return-search').fill('coat-1042');
  assert.equal(await page.locator('#list .card').count(), 1);
  assert.match(await page.locator('#list').innerText(), /North Coast/);
  assert.equal(await page.locator('#tracked-count').innerText(), '1');
  await page.locator('#search-clear').click();
  assert.equal(await page.locator('#list .card').count(), 2);
  checks.push('Mainline search works in History without changing active counts or saved outcomes');


  await page.locator('#backup-heading').click();
  const csvEvent = page.waitForEvent('download');
  await page.locator('#saved-returns-csv').click();
  const csv = await csvEvent;
  const csvText = await readFile(await csv.path(), 'utf8');
  assert.match(csvText, /"Return status","Finished at"/);
  assert.match(csvText, /"Returned"/);
  assert.match(csvText, /"Kept"/);
  assert(!csvText.includes('Private drop-off reference'));
  checks.push('Actual CSV labels finished outcomes and excludes private refund notes');
  const backupEvent = page.waitForEvent('download');
  await page.locator('#backup-export').click();
  const backupDownload = await backupEvent;
  const backupPath = resolve(output, 'fictional-returns-backup.json');
  await backupDownload.saveAs(backupPath);
  const backup = JSON.parse(await readFile(backupPath, 'utf8'));
  assert.equal(backup.version, 11);
  assert.equal(backup.orders.filter(row => row.completedAt).length, 2);
  const restoredContext = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true, timezoneId: 'America/Los_Angeles' });
  const restored = await restoredContext.newPage();
  restored.on('pageerror', error => errors.push(error.message));
  await restored.goto(base);
  await restored.locator('#backup-heading').click();
  await restored.locator('#backup-file').setInputFiles(backupPath);
  await restored.locator('#backup-apply').click();
  assert.equal(await restored.locator('#tracked-count').innerText(), '1');
  assert.equal(await restored.locator('#completed-count').innerText(), '2');
  assert(await restored.locator('#desk-back').isVisible(), 'A restored phone purchase exposes Your returns navigation');
  await restored.locator('#desk-back').click();
  assert(await restored.locator('#saved-returns').isVisible(), 'Actual phone navigation opens the restored ledger');
  await restored.locator('#filter-completed').click();
  assert.equal(await restored.locator('#list .card').count(), 2);
  const firstHistory = await restored.locator('#list .card').first().boundingBox();
  assert(firstHistory && firstHistory.y >= 0 && firstHistory.y + firstHistory.height <= 844, 'Selecting History brings a complete order into the phone viewport');
  assert(!(await restored.locator('#calendar-open').isVisible()));
  assert(await restored.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await restored.screenshot({ path: resolve(output, 'history-mobile.png') });
  checks.push('Actual downloaded calendar-revision backup restores both outcomes in a fresh phone browser');

  await page.locator('#filter-all').click();
  await page.locator('#calendar-open').click();
  assert.equal(await page.locator('#calendar-choices input').count(), 1);
  assert.match(await page.locator('#calendar-choices').innerText(), /SHOES-3510/);
  await page.locator('#calendar-cancel').click();
  await page.locator('#deadline-overview-open').click();
  await page.locator('#overview-month').fill('2026-12');
  await page.locator('#overview-refresh').click();
  assert.match(await page.locator('#overview-month-summary').innerText(), /1/);
  const trip = await context.newPage();
  await trip.goto(new URL('trip-checklist.html', base).href);
  assert.equal(await trip.locator('#order-options input').count(), 1);
  assert.match(await trip.locator('#order-options').innerText(), /SHOES-3510/);
  checks.push('Calendar and return-trip selectors omit both completed records');

  await page.locator('#filter-completed').click();
  await page.locator('[data-reopen="' + coat.id + '"]').click();
  await page.locator('#filter-all').click();
  assert.equal(await page.locator('#tracked-count').innerText(), '2');
  const reopened = (await saved()).find(row => row.id === coat.id);
  const { calendarRevision, ...reopenedOriginal } = reopened;
  assert.deepEqual(reopenedOriginal, coat);
  assert.equal(calendarRevision, 2);
  const reminderEvent = page.waitForEvent('download');
  await page.locator('[data-ics="' + coat.id + '"]').click();
  await page.locator('#calendar-dialog').waitFor({state:'visible'});
  await page.locator('#calendar-download').click();
  const reminder = await reminderEvent;
  assert.equal(await page.locator('#calendar-dialog').isVisible(), false);
  const reminderPath = resolve(output, 'reopened-return.ics');
  await reminder.saveAs(reminderPath);
  const reopenedReminder = await readFile(reminderPath, 'utf8');
  assert.match(reopenedReminder, /20261115/);
  assert.match(reopenedReminder, /SEQUENCE:2/);
  checks.push('Reopen restores original saved identity and actual calendar date');

  await page.locator('[data-finish="' + coat.id + '"]').click();
  const second = await context.newPage();
  await second.goto(base);
  await second.locator('[data-edit="' + coat.id + '"]').click();
  await second.locator('#edit-total').fill('$61.00');
  await second.locator('#edit-save').click();
  await page.locator('#finish-form [value=returned]').check();
  await page.locator('#finish-form button[type=submit]').click();
  assert(await page.locator('#finish-dialog').isVisible());
  assert.match(await page.locator('#finish-message').innerText(), /changed/);
  const conflicted = (await saved()).find(row => row.id === coat.id);
  assert.equal(conflicted.total, '$61.00');
  assert.equal(conflicted.completedAt, undefined);
  await page.locator('#finish-cancel').click();
  await second.close();
  checks.push('A real second-tab edit cannot be overwritten by a stale closure review');

  await page.locator('[data-finish="' + coat.id + '"]').click();
  await page.locator('#finish-form [value=returned]').check();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'returnby.v1') { Storage.prototype.setItem = original; throw new DOMException('Test quota exhausted', 'QuotaExceededError'); }
      return original.call(this, key, value);
    };
  });
  await page.locator('#finish-form button[type=submit]').click();
  assert(await page.locator('#finish-dialog').isVisible());
  assert.equal((await saved()).find(row => row.id === coat.id).completedAt, undefined);
  assert.match(await page.locator('#finish-message').innerText(), /save/);
  await page.locator('#finish-form button[type=submit]').click();
  assert(!(await page.locator('#finish-dialog').isVisible()));
  assert.equal((await saved()).find(row => row.id === coat.id).completionKind, 'returned');
  checks.push('Storage refusal keeps review open and retry commits exactly the intended record');

  await page.reload();
  assert.equal(await page.locator('#tracked-count').innerText(), '1');
  assert.equal(await page.locator('#completed-count').innerText(), '2');
  assert.equal(errors.length, 0, errors.join('\n'));
  assert.deepEqual(external, [], 'The application should not send reviewed orders anywhere');
  await writeFile(resolve(output, 'result.json'), JSON.stringify({ builder: 'astra-kestrel-7c33', checks, errors, externalRequests: external }, null, 2));
  console.log(JSON.stringify({ passed: checks.length, checks, evidence: output }));
} finally {
  await browser?.close();
  server?.kill();
}
