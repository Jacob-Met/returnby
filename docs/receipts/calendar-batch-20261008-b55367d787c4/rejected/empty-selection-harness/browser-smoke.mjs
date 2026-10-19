// Isolated local-build acceptance. Uses fictional orders and fresh browser profiles.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createHash } from 'node:crypto';

const { chromium } = await import(process.env.RETURNBY_PLAYWRIGHT || 'playwright');
const build = resolve(process.env.RETURNBY_BUILD || 'dist');
const baseline = process.env.RETURNBY_BASELINE_BUILD && resolve(process.env.RETURNBY_BASELINE_BUILD);
const out = resolve(process.env.RETURNBY_EVIDENCE || 'calendar-browser-evidence');
await mkdir(out, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    const isBaseline = url.pathname.startsWith('/baseline/');
    const root = isBaseline ? baseline : build;
    if (!root) throw Error('Baseline not configured');
    const relative = decodeURIComponent(isBaseline ? url.pathname.slice('/baseline/'.length) : url.pathname.slice(1));
    const file = resolve(root, relative || 'index.html');
    if (!file.startsWith(root + sep)) throw Error('Outside fixture');
    const bytes = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(bytes);
  } catch { response.writeHead(404); response.end('Missing local fixture asset'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, ...(process.env.RETURNBY_CHROME ? { executablePath: process.env.RETURNBY_CHROME } : {}) });
const contexts = [], errors = [], external = [], checks = {};
const fixed = new Date('2026-10-08T12:34:56.000Z');
const raw = page => page.evaluate(() => localStorage.getItem('returnby.v1'));
const saved = async page => JSON.parse(await raw(page) || '[]');
const events = text => [...text.replace(/\r\n[ \t]/g, '').matchAll(/BEGIN:VEVENT\r\n([\s\S]*?)END:VEVENT\r\n/g)].map(match => match[1]);

async function context(options = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true, ...options });
  contexts.push(ctx);
  await ctx.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    external.push(route.request().url()); return route.abort();
  });
  ctx.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  return ctx;
}
async function open(ctx, pathname = '/') {
  const page = await ctx.newPage();
  await page.clock.setFixedTime(fixed);
  await page.goto(origin + pathname, { waitUntil: 'networkidle' });
  return page;
}
async function add(page, number, days = 30, merchant = 'Fictional Shop', date = '2026-10-01') {
  await page.locator('#paste').fill(`From: ${merchant}\nOrder number: ${number}\nOrder date: October 1, 2026\nTotal: $12.00`);
  await page.locator('#find').click();
  for (const [name, value] of Object.entries({ merchant, orderNo: number, orderDate: date, total: '$12.00', windowDays: String(days) })) {
    await page.locator(`#preview [name=${name}]`).fill(value);
  }
  await page.locator('#preview button[type=submit]').click();
  return (await saved(page)).find(order => order.orderNo === number);
}
async function download(page, action) {
  const pending = page.waitForEvent('download');
  await action();
  const file = await pending;
  const text = await readFile(await file.path(), 'utf8');
  return { text, filename: file.suggestedFilename() };
}
const checkbox = (page, number) => page.locator('#calendar-choices label').filter({ hasText: `#${number}` }).locator('input');
const begin = page => page.locator('#calendar-open').click();
async function selectOnly(page, numbers) {
  await page.locator('#calendar-select-none').click();
  for (const number of numbers) await checkbox(page, number).check();
}
async function guardWrites(page) {
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.calendarWriteCount = 0;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'returnby.v1') window.calendarWriteCount++;
      return original.call(this, key, value);
    };
  });
}

let failure;
try {
  if (baseline) {
    const page = await open(await context(), '/baseline/');
    const a = await add(page, 'BASE-A'); await add(page, 'BASE-B', 15);
    assert.equal(await page.locator('[data-ics]').count(), 2);
    assert.equal(await page.locator('#calendar-open').count(), 0);
    const original = await download(page, () => page.locator(`[data-ics="${a.id}"]`).click());
    assert.equal(events(original.text).length, 1);
    checks.baseline = { savedReturns: 2, individualExportControls: 2, batchExportControls: 0, downloadedEvents: 1 };
  }

  const ctx = await context(); const page = await open(ctx);
  const today = await add(page, 'TODAY', 7);
  const soon = await add(page, 'SOON', 14);
  const later = await add(page, 'LATER', 30);
  await add(page, 'EXPIRED', 2);
  const unicode = await add(page, 'UNICODE', 60, 'Étoile 家具🛍️ '.repeat(12) + '<img src="https://not-requested.example/image">\nSUMMARY:literal');
  const before = await raw(page);
  const singles = new Map();
  for (const order of [today, soon, later, unicode]) {
    singles.set(order.id, events((await download(page, () => page.locator(`[data-ics="${order.id}"]`).click())).text)[0]);
  }
  await guardWrites(page);
  await page.locator('#paste').fill('UNSAVED FICTIONAL EMAIL — preserve this draft');
  await page.locator('#find').click();
  const draft = await page.locator('#preview').innerHTML();
  await page.locator('#filter-due').click();
  await begin(page);
  assert.equal(await page.getByRole('checkbox').count(), 5);
  assert.equal(await page.locator('#calendar-choices input:checked').count(), 2);
  assert(await checkbox(page, 'TODAY').isChecked());
  assert(await checkbox(page, 'SOON').isChecked());
  assert.match(await page.locator('#calendar-summary').innerText(), /2 reminders selected · 2026-10-08 to 2026-10-15/);
  await checkbox(page, 'TODAY').uncheck();
  await checkbox(page, 'UNICODE').focus(); await page.keyboard.press('Space');
  assert(await checkbox(page, 'UNICODE').isChecked());
  assert.equal(await page.locator('#calendar-choices img').count(), 0);
  const selected = await download(page, () => page.locator('#calendar-download').click());
  assert.equal(selected.filename, 'returnby-reminders-2026-10-08.ics');
  assert.deepEqual(events(selected.text), [singles.get(soon.id), singles.get(unicode.id)]);
  assert.equal(selected.text.split('BEGIN:VCALENDAR').length - 1, 1);
  assert.equal(selected.text.split('END:VCALENDAR').length - 1, 1);
  assert.equal(await raw(page), before);
  assert.equal(await page.locator('#paste').inputValue(), 'UNSAVED FICTIONAL EMAIL — preserve this draft');
  assert.equal(await page.locator('#preview').innerHTML(), draft);
  assert.equal(await page.evaluate(() => window.calendarWriteCount), 0);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'calendar-open');
  await writeFile(resolve(out, 'selected-reminders.ics'), selected.text);
  checks.filtered_selection_keyboard_unicode_single_event_identity_and_no_writes = true;

  await begin(page); await page.locator('#calendar-select-none').click();
  assert(await page.locator('#calendar-download').isDisabled());
  await page.locator('#calendar-select-all').click();
  assert.equal(await page.locator('#calendar-choices input:checked').count(), 5);
  assert.match(await page.locator('#calendar-summary').innerText(), /1 deadline is already past due/);
  await page.keyboard.press('Escape');
  assert(await page.locator('#calendar-dialog').isHidden());
  assert.equal(await raw(page), before);
  await begin(page);
  assert.equal(await page.locator('#calendar-choices input:checked').count(), 2);
  await page.locator('#calendar-cancel').click();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'calendar-open');
  checks.empty_selection_select_all_cancel_escape_and_focus = true;

  const second = await open(ctx);
  await begin(page); await selectOnly(page, ['SOON']);
  const observedDownloads = []; page.on('download', item => observedDownloads.push(item.suggestedFilename()));
  await second.locator(`[data-edit="${soon.id}"]`).click();
  await second.locator('#edit-window-days').fill('45');
  await second.locator('#edit-save').click();
  const changed = await raw(second);
  await page.locator('#calendar-download').click();
  assert.match(await page.locator('#calendar-message').innerText(), /changed or was removed/);
  assert.equal(observedDownloads.length, 0);
  assert.equal(await raw(page), changed);
  await page.locator('#calendar-reload').click();
  assert(await checkbox(page, 'SOON').isChecked());
  assert.match(await page.locator('#calendar-summary').innerText(), /2026-11-15/);
  const refreshed = await download(page, () => page.locator('#calendar-download').click());
  assert.equal(events(refreshed.text).length, 1);
  assert(refreshed.text.includes(`UID:${soon.id}@returnby`));
  assert(refreshed.text.includes('DTSTART;VALUE=DATE:20261115'));
  assert.equal(await raw(page), changed);
  checks.real_second_tab_edit_refusal_reload_review_and_stable_uid = true;

  await begin(page); await selectOnly(page, ['TODAY']);
  await second.locator(`[data-del="${today.id}"]`).click();
  const removed = await raw(second), count = observedDownloads.length;
  await page.locator('#calendar-download').click();
  assert.match(await page.locator('#calendar-message').innerText(), /changed or was removed/);
  assert.equal(observedDownloads.length, count);
  await page.locator('#calendar-reload').click();
  assert(await page.locator('#calendar-download').isDisabled());
  assert.equal(await checkbox(page, 'TODAY').count(), 0);
  assert.equal(await raw(page), removed);
  await page.locator('#calendar-cancel').click();
  await begin(page); await selectOnly(page, ['LATER']);
  await add(second, 'UNRELATED', 90);
  const added = await raw(second);
  const retained = await download(page, () => page.locator('#calendar-download').click());
  assert.deepEqual(events(retained.text), [singles.get(later.id)]);
  assert.equal(await raw(page), added);
  checks.second_tab_removal_refused_and_unrelated_addition_retained = true;

  await begin(page); await selectOnly(page, ['LATER']);
  await page.evaluate(() => {
    const original = Storage.prototype.getItem;
    window.restoreCalendarRead = () => { Storage.prototype.getItem = original; };
    Storage.prototype.getItem = function(key) { if (key === 'returnby.v1') throw Error('Authored read refusal'); return original.call(this, key); };
  });
  const beforeRefusal = observedDownloads.length;
  await page.locator('#calendar-download').click();
  assert.match(await page.locator('#calendar-message').innerText(), /Couldn't read saved returns/);
  assert.equal(observedDownloads.length, beforeRefusal);
  assert(await checkbox(page, 'LATER').isChecked());
  await page.evaluate(() => window.restoreCalendarRead());
  await download(page, () => page.locator('#calendar-download').click());
  assert.equal(await raw(page), added);
  await page.evaluate(() => {
    const original = Storage.prototype.getItem;
    window.restoreCalendarRead = () => { Storage.prototype.getItem = original; };
    Storage.prototype.getItem = function(key) { if (key === 'returnby.v1') throw Error('Authored initial read refusal'); return original.call(this, key); };
  });
  await begin(page);
  assert(await page.locator('#calendar-download').isDisabled());
  assert.match(await page.locator('#calendar-message').innerText(), /Couldn't read saved returns/);
  await page.evaluate(() => window.restoreCalendarRead());
  await page.locator('#calendar-reload').click();
  assert.equal(await page.getByRole('checkbox').count(), 5);
  await page.locator('#calendar-cancel').click();
  assert.equal(await raw(page), added);
  assert.equal(await page.evaluate(() => window.calendarWriteCount), 0);
  checks_read: checks.read_failure_at_open_and_download_preserves_selection_and_retries = true;

  await page.locator('#filter-all').click(); await begin(page);
  await page.screenshot({ path: resolve(out, 'desktop-calendar.png'), fullPage: true });
  await page.locator('#calendar-cancel').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await begin(page);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert(await page.locator('#calendar-dialog').evaluate(element => element.scrollWidth <= element.clientWidth));
  await page.screenshot({ path: resolve(out, 'phone-calendar.png'), fullPage: true });
  await page.locator('#calendar-select-none').click(); await checkbox(page, 'LATER').check();
  await download(page, () => page.locator('#calendar-download').click());
  checks.phone_width_and_touch_selection_download = true;

  const invalidPage = await open(await context());
  const valid = await add(invalidPage, 'VALID', 30);
  const malformed = [valid, { ...valid, id: 'duplicate', orderNo: 'DUP-A' }, { ...valid, id: 'duplicate', orderNo: 'DUP-B' }, { ...valid, id: 'invalid-date', orderNo: 'INVALID-DATE', orderDate: '2026-02-30' }];
  await invalidPage.evaluate(value => localStorage.setItem('returnby.v1', JSON.stringify(value)), malformed);
  await invalidPage.reload({ waitUntil: 'networkidle' });
  const malformedBytes = await raw(invalidPage);
  await begin(invalidPage);
  assert.equal(await invalidPage.locator('#calendar-choices input:disabled').count(), 3);
  assert.equal(await invalidPage.locator('#calendar-choices input:checked').count(), 1);
  const validOnly = await download(invalidPage, () => invalidPage.locator('#calendar-download').click());
  assert.equal(events(validOnly.text).length, 1);
  assert(validOnly.text.includes(`UID:${valid.id}@returnby`));
  assert.equal(await raw(invalidPage), malformedBytes);
  checks.invalid_dates_and_duplicate_ids_are_visible_and_cannot_be_selected = true;

  checks.timezones = [];
  for (const timezoneId of ['America/Los_Angeles', 'Pacific/Kiritimati']) {
    const zonePage = await open(await context({ timezoneId }));
    await add(zonePage, 'LEAP', 1, 'Leap Shop', '2028-02-28');
    await add(zonePage, 'YEAR', 1, 'Year Shop', '2026-12-30');
    await begin(zonePage);
    const result = await download(zonePage, () => zonePage.locator('#calendar-download').click());
    const entries = events(result.text);
    assert.equal(entries.length, 2);
    assert(entries[0].includes('DTSTART;VALUE=DATE:20261231\r\nDTEND;VALUE=DATE:20270101'));
    assert(entries[1].includes('DTSTART;VALUE=DATE:20280229\r\nDTEND;VALUE=DATE:20280301'));
    checks.timezones.push({ timezoneId, events: 2, leapAndYearEndDates: 'pass' });
  }
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
} catch (error) { failure = error; }
finally {
  const receipt = { browser: browser.version(), checks, errors, externalRequests: external, failure: failure?.stack ?? null,
    buildIndexSha256: createHash('sha256').update(await readFile(resolve(build, 'index.html'))).digest('hex') };
  await writeFile(resolve(out, 'browser-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt, null, 2));
  await Promise.all(contexts.map(ctx => ctx.close())); await browser.close();
  await new Promise(resolve => server.close(resolve));
}
if (failure) throw failure;
