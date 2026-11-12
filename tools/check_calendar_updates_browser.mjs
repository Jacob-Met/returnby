// Run the built ReturnBy app at desktop and phone sizes with fictional data.
// Uses the normal calendar export/download and saved-return controls.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const { chromium } = await import(process.env.RETURNBY_PLAYWRIGHT || 'playwright');
const base = process.env.RETURNBY_BASE_URL || 'http://127.0.0.1:19731/';
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const server = process.env.RETURNBY_BASE_URL ? null :
  spawn('python3', ['-m', 'http.server', '19731', '--bind', '127.0.0.1',
    '--directory', resolve(process.env.RETURNBY_BUILD || 'dist')], { stdio: 'ignore' });
const screenshots = resolve(process.env.RETURNBY_EVIDENCE || '/tmp/returnby-calendar-updates');
const errors = [], external = [];
let browser;
try {
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try { ready = (await fetch(base)).ok; } catch {}
    if (ready) break;
    await new Promise(done => setTimeout(done, 100));
  }
  assert(ready, 'Packaged app must serve a real page');
  browser = await chromium.launch({
    executablePath: process.env.RETURNBY_CHROME || '/usr/local/bin/google-chrome',
    headless: true, args: ['--no-sandbox'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }, acceptDownloads: true, timezoneId: 'America/Los_Angeles',
  });
  context.on('request', request => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== new URL(base).origin) external.push(request.url());
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  const original = {
    id: 'winter-coat', merchant: 'Harbor Outfitters', orderNo: 'COAT-12', total: '$84',
    orderDate: '2026-11-01', windowDays: 15, windowSource: 'user',
    deadlineRequirement: 'ship-by', merchantArrivalDeadline: '2026-11-28',
    createdAt: '2026-11-02T09:00:00Z',
  };
  await page.evaluate(row => localStorage.setItem('returnby.v1', JSON.stringify([row])), original);
  await page.reload();

  async function downloadOnClick(selector) {
    const pending = page.waitForEvent('download');
    await page.locator(selector).click();
    const download = await pending;
    return readFile(await download.path(), 'utf8');
  }
  async function downloadDeadline() {
    await page.locator('[data-ics="winter-coat"]').click();
    await page.locator('#calendar-alert-days').selectOption('none');
    const content = await downloadOnClick('#calendar-download');
    assert(!(await page.locator('#calendar-dialog').isVisible()));
    return content;
  }
  const first = await downloadDeadline();
  assert.match(first, /UID:winter-coat@returnby/);
  assert.match(first, /UID:winter-coat:merchant-arrival@returnby/);
  assert.match(first, /DTSTART;VALUE=DATE:20261116/);
  assert.doesNotMatch(first, /SEQUENCE:/);

  await page.locator('[data-edit="winter-coat"]').click();
  await page.locator('#edit-window-days').fill('17');
  await page.locator('#edit-save').click();
  const second = await downloadDeadline();
  assert.match(second, /SEQUENCE:1/);
  assert.match(second, /DTSTART;VALUE=DATE:20261118/);
  assert.match(second, /UID:winter-coat@returnby/);

  await page.locator('[data-edit="winter-coat"]').click();
  await page.locator('#edit-merchant-arrival-deadline').fill('');
  await page.locator('#edit-save').click();
  assert.match(await page.locator('#edit-feedback').innerText(), /old merchant-arrival entry/i);
  const third = await downloadDeadline();
  assert.match(third, /SEQUENCE:2/);
  assert.doesNotMatch(third, /UID:winter-coat:merchant-arrival@returnby/);
  const secondaryCancel = await downloadOnClick('[data-cancel-arrival="winter-coat"]');
  assert.match(secondaryCancel, /METHOD:CANCEL/);
  assert.match(secondaryCancel, /UID:winter-coat:merchant-arrival@returnby/);
  assert.match(secondaryCancel, /SEQUENCE:2/);
  assert.match(secondaryCancel, /STATUS:CANCELLED/);
  assert.match(secondaryCancel, /DTSTART;VALUE=DATE:20261128/);
  assert.equal((secondaryCancel.match(/BEGIN:VEVENT/g) || []).length, 1);

  await page.locator('[data-finish="winter-coat"]').click();
  await page.locator('#finish-form [value=returned]').check();
  await page.locator('#finish-form button[type=submit]').click();
  await page.locator('#filter-completed').click();
  const primaryCancel = await downloadOnClick('[data-cancel-calendar="winter-coat"]');
  assert.match(primaryCancel, /METHOD:CANCEL/);
  assert.match(primaryCancel, /UID:winter-coat@returnby/);
  assert.doesNotMatch(primaryCancel, /UID:winter-coat:merchant-arrival@returnby/);
  assert.match(primaryCancel, /SEQUENCE:3/);
  assert.match(primaryCancel, /STATUS:CANCELLED/);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('returnby.v1') || '[]'));
  assert.equal(stored[0].calendarRevision, 3);
  assert.equal(stored[0].calendarPreviousArrivalDate, '2026-11-28');
  assert.equal(stored[0].completionKind, 'returned');

  await mkdir(screenshots, { recursive: true });
  await page.screenshot({ path: resolve(screenshots, 'history-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: resolve(screenshots, 'history-phone.png'), fullPage: true });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Phone history must not overflow');
  await page.locator('[data-reopen="winter-coat"]').click();
  assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('returnby.v1') || '[]')))[0].calendarRevision, 4);
  const fourth = await downloadDeadline();
  assert.match(fourth, /SEQUENCE:4/);
  assert.match(fourth, /UID:winter-coat@returnby/);
  assert.equal(errors.length, 0, errors.join('\n'));
  assert.equal(external.length, 0, 'The private tracker must not make external requests');
  console.log('PASS: real desktop+phone app, revised calendar imports, cancelled obsolete arrival and finished deadline, reopened return');
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
}
