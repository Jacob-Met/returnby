// SPDX-License-Identifier: MIT
// Independent receiving: inspect actual rendered cards and downloaded bytes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => {
  if (index % 2 === 0) pairs.push([value.replace(/^--/, ''), all[index + 1]]);
  return pairs;
}, []));
for (const name of ['url', 'out', 'playwright', 'chromium']) assert(args[name], `Missing --${name}`);
const { chromium } = await import(args.playwright);
const out = path.resolve(args.out);
await fs.mkdir(out, { recursive: true });
const report = { mode: args.only || 'all', groups: [], downloads: [], pageErrors: [] };
const specialMerchant = '雪🙂,;\\\r\nBEGIN:VEVENT ' + '返品店🙂'.repeat(18);
const seeded = [
  { id: 'expired-id', merchant: 'Expired store', orderNo: 'OLD-1', windowDays: 6 },
  { id: 'today-id', merchant: 'Today store', orderNo: 'TODAY-2', windowDays: 7 },
  { id: 'near-id', merchant: specialMerchant, orderNo: 'A,;\\\nB', windowDays: 9 },
  { id: 'edge-id', merchant: 'Eight days away', orderNo: 'EDGE-4', windowDays: 15 },
  { id: 'far-id', merchant: 'Far away', orderNo: 'FAR-5', windowDays: 24 },
].map(order => ({ ...order, orderDate: '2026-10-01', windowSource: 'user', createdAt: '2026-10-08T10:00:00.000Z' }));

function unescapeText(value) {
  return value.replace(/\\([nN,;\\])/g, (_, char) => /[nN]/.test(char) ? '\n' : char);
}

function parseCalendar(bytes) {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  assert(text.endsWith('\r\n'), 'Calendar must end with CRLF');
  assert(!/(?<!\r)\n|\r(?!\n)/.test(text), 'Bare calendar line ending');
  for (const line of text.split('\r\n')) {
    assert(Buffer.byteLength(line, 'utf8') <= 75, `Physical line exceeds 75 octets: ${line}`);
  }
  const logical = text.replace(/\r\n[ \t]/g, '').split('\r\n');
  const stack = [];
  const events = [];
  const calendar = {};
  let event;
  let alarm;
  let calendarCount = 0;
  for (const line of logical) {
    if (!line) continue;
    const colon = line.indexOf(':');
    assert(colon > 0, `Malformed calendar property: ${line}`);
    const key = line.slice(0, colon);
    const value = line.slice(colon + 1);
    if (key === 'BEGIN') {
      if (value === 'VCALENDAR') {
        assert.equal(stack.length, 0); calendarCount += 1;
      } else if (value === 'VEVENT') {
        assert.equal(stack.at(-1), 'VCALENDAR'); event = { alarms: [] }; events.push(event);
      } else if (value === 'VALARM') {
        assert.equal(stack.at(-1), 'VEVENT'); alarm = {}; event.alarms.push(alarm);
      } else assert.fail(`Unexpected component ${value}`);
      stack.push(value);
    } else if (key === 'END') {
      assert.equal(stack.pop(), value, 'Calendar component nesting mismatch');
    } else {
      const object = stack.at(-1) === 'VALARM' ? alarm : stack.at(-1) === 'VEVENT' ? event : calendar;
      assert(!Object.hasOwn(object, key), `Duplicate property ${key}`);
      object[key] = value;
    }
  }
  assert.equal(stack.length, 0);
  assert.equal(calendarCount, 1);
  assert.equal(calendar.VERSION, '2.0');
  assert.equal(new Set(events.map(item => item.UID)).size, events.length);
  for (const item of events) {
    assert.equal(item.alarms.length, 1);
    assert.equal(item.alarms[0].ACTION, 'DISPLAY');
    assert.equal(item.alarms[0].TRIGGER, '-P3D');
    assert.equal(item.alarms[0].DESCRIPTION, item.SUMMARY);
    assert.match(item.DTSTAMP, /^\d{8}T\d{6}Z$/);
  }
  assert.equal(new Set(events.map(item => item.DTSTAMP)).size, events.length ? 1 : 0);
  return events;
}

const browser = await chromium.launch({
  executablePath: args.chromium,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

async function openPage({ rows = seeded, midnight = false, width = 1280 } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: 'UTC', acceptDownloads: true });
  await context.addInitScript(rows => localStorage.setItem('returnby.v1', JSON.stringify(rows)), rows);
  const page = await context.newPage();
  page.on('pageerror', error => report.pageErrors.push(error.message));
  if (midnight) {
    await page.clock.install({ time: new Date('2026-10-08T23:59:00.000Z') });
    await page.clock.pauseAt(new Date('2026-10-08T23:59:05.000Z'));
  } else await page.clock.setFixedTime(new Date('2026-10-08T12:00:00.000Z'));
  await page.goto(args.url);
  await page.locator('#export-calendar').waitFor();
  await page.evaluate(() => { window.__reviewExportElement = document.querySelector('#export-calendar'); });
  return { page, context };
}

async function visibleRows(page) {
  return page.locator('#list .card').evaluateAll(cards => cards.map(card => ({
    id: card.querySelector('[data-ics]').dataset.ics,
    due: card.querySelector('.return-by').textContent.match(/\d{4}-\d{2}-\d{2}/)[0],
  })));
}

async function assertCount(page, count) {
  const control = page.locator('#export-calendar');
  assert.equal(await control.isDisabled(), count === 0);
  const text = `${await control.innerText()} ${await page.locator('#calendar-export-help').innerText()}`;
  assert(new RegExp(`\\b${count}\\b`).test(text) || (count === 0 && /no deadlines|nothing.*export/i.test(text)), text);
  const describedBy = (await control.getAttribute('aria-describedby') || '').split(/\s+/);
  assert(describedBy.includes('calendar-export-help'));
  assert(await page.evaluate(() => document.querySelector('#export-calendar') === window.__reviewExportElement));
}

async function exportShown(page, name, key) {
  const shown = await visibleRows(page);
  await assertCount(page, shown.length);
  assert(shown.length > 0);
  const promise = page.waitForEvent('download');
  if (key) {
    await page.locator('#export-calendar').focus();
    await page.locator('#export-calendar').press(key);
  } else await page.locator('#export-calendar').click();
  const download = await promise;
  assert(download.suggestedFilename().endsWith('.ics'));
  const filename = path.join(out, `${name}.ics`);
  await download.saveAs(filename);
  assert.equal(await download.failure(), null);
  const bytes = await fs.readFile(filename);
  const events = parseCalendar(bytes);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('returnby.v1') || '[]'));
  assert.deepEqual(events.map(event => unescapeText(event.UID)), shown.map(row => `${row.id}@returnby`));
  for (let index = 0; index < shown.length; index += 1) {
    const row = shown[index];
    const event = events[index];
    assert.equal(event['DTSTART;VALUE=DATE'], row.due.replaceAll('-', ''));
    const end = new Date(`${row.due}T00:00:00Z`); end.setUTCDate(end.getUTCDate() + 1);
    assert.equal(event['DTEND;VALUE=DATE'], end.toISOString().slice(0, 10).replaceAll('-', ''));
    const original = stored.find(order => order.id === row.id);
    if (original) {
      const expected = `Return deadline: ${original.merchant}${original.orderNo ? ' #' + original.orderNo : ''}`.replace(/\r\n|\r/g, '\n');
      assert.equal(unescapeText(event.SUMMARY), expected);
    }
  }
  report.downloads.push({ name, filename, bytes: bytes.length, ids: shown.map(row => row.id) });
  return events;
}

try {
  if (args.only !== 'focus') {
    const { page, context } = await openPage();
    const originalSaved = await page.evaluate(() => localStorage.getItem('returnby.v1'));
    assert.deepEqual((await visibleRows(page)).map(row => row.id), ['expired-id', 'today-id', 'near-id', 'edge-id', 'far-id']);
    const all = await exportShown(page, 'all-with-literal-unicode');
    await page.locator('#filter-due').click();
    assert.deepEqual((await visibleRows(page)).map(row => row.id), ['today-id', 'near-id']);
    const due = await exportShown(page, 'due-keyboard-enter', 'Enter');
    assert.equal(due[1].UID, all[2].UID);
    await page.locator('#filter-expired').click();
    assert.deepEqual((await visibleRows(page)).map(row => row.id), ['expired-id']);
    await exportShown(page, 'expired-keyboard-space', 'Space');
    assert.equal(await page.evaluate(() => localStorage.getItem('returnby.v1')), originalSaved);
    report.groups.push({ name: 'all three filters export visible identities with literal Unicode, alarms and stable UIDs', pass: true });
    await context.close();
  }
  if (args.only !== 'focus') {
    const { page, context } = await openPage();
    await page.locator('#filter-due').click();
    await page.locator('#sample').click();
    await page.locator('#preview [name=merchant]').fill('New saved deadline');
    await page.locator('#preview [name=orderDate]').fill('2026-10-01');
    await page.locator('#preview [name=windowDays]').fill('9');
    await page.locator('#preview [name=orderNo]').fill('NEW-6');
    await page.locator('#preview button[type=submit]').click();
    assert.equal((await visibleRows(page)).length, 3);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('returnby.v1')));
    const added = stored.find(order => order.merchant === 'New saved deadline');
    assert(added && !seeded.some(order => order.id === added.id));
    const saved = await exportShown(page, 'after-save');
    assert(saved.some(event => unescapeText(event.UID) === `${added.id}@returnby`));
    await page.locator('[data-del="near-id"]').click();
    assert.equal((await visibleRows(page)).length, 2);
    const removed = await exportShown(page, 'after-remove');
    assert(!removed.some(event => unescapeText(event.UID) === 'near-id@returnby'));
    await page.locator('#filter-expired').click();
    await page.locator('[data-del="expired-id"]').click();
    assert.equal((await visibleRows(page)).length, 0);
    await assertCount(page, 0);
    report.groups.push({ name: 'Save and Remove refresh the exported rows and empty-filter action', pass: true });
    await context.close();
  }
  {
    const { page, context } = await openPage({ midnight: true });
    await page.locator('#filter-due').click();
    const before = await exportShown(page, 'before-midnight');
    assert.deepEqual(before.map(event => unescapeText(event.UID)), ['today-id@returnby', 'near-id@returnby']);
    await page.locator('#export-calendar').focus();
    await page.clock.fastForward(55_010);
    assert.deepEqual((await visibleRows(page)).map(row => row.id), ['near-id', 'edge-id']);
    assert.equal(await page.locator('#export-calendar').evaluate(node => node === document.activeElement), true);
    const after = await exportShown(page, 'after-midnight');
    assert.deepEqual(after.map(event => unescapeText(event.UID)), ['near-id@returnby', 'edge-id@returnby']);
    assert.equal(before[1].UID, after[0].UID);
    await page.clock.setSystemTime(new Date('2026-10-11T12:00:00.000Z'));
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    assert.deepEqual((await visibleRows(page)).map(row => row.id), ['edge-id']);
    await exportShown(page, 'after-pageshow-refresh');
    report.groups.push({ name: 'midnight exchanges same-count Due soon identities; pageshow also refreshes the export', pass: true });
    await context.close();
  }
  if (args.only !== 'focus') {
    const mobileRows = seeded.map(order => order.id === 'near-id' ? { ...order, merchant: 'Near store', orderNo: 'NEAR-3' } : order);
    const { page, context } = await openPage({ width: 390, rows: mobileRows });
    await page.locator('#export-calendar').scrollIntoViewIfNeeded();
    await page.locator('#export-calendar').focus();
    assert.equal(await page.locator('#export-calendar').evaluate(node => node === document.activeElement), true);
    const bounds = await page.locator('#export-calendar').boundingBox();
    assert(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 391);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    await exportShown(page, 'mobile-keyboard', 'Enter');
    await page.screenshot({ path: path.join(out, 'mobile-calendar.png'), fullPage: true });
    report.groups.push({ name: 'narrow viewport and keyboard export remain reachable without horizontal overflow', pass: true });
    await context.close();
  }
  if (args.only !== 'focus') {
    const { page, context } = await openPage({ rows: [] });
    await assertCount(page, 0);
    assert.equal(await page.locator('#export-calendar').count(), 1);
    report.groups.push({ name: 'empty tracker initializes one disabled export action', pass: true });
    await context.close();
  }
  {
    const { page, context } = await openPage({ rows: [seeded.find(order => order.id === 'today-id')], midnight: true });
    await page.locator('#filter-due').click();
    await assertCount(page, 1);
    await page.locator('#export-calendar').focus();
    await page.clock.fastForward(55_010);
    await assertCount(page, 0);
    report.focusAfterEmpty = await page.evaluate(() => ({
      id: document.activeElement?.id || '',
      tag: document.activeElement?.tagName || '',
      selectedFilter: document.querySelector('#filter-due')?.getAttribute('aria-pressed'),
    }));
    assert.equal(report.focusAfterEmpty.id, 'filter-due', 'A focused export that becomes unavailable should retain keyboard context at the selected filter');
    report.groups.push({ name: 'the focused export becoming empty at midnight restores focus to the selected filter', pass: true });
    await context.close();
  }
  {
    const { page, context } = await openPage({ rows: [seeded.find(order => order.id === 'today-id')], midnight: true });
    await page.locator('#filter-due').click();
    await page.locator('#paste').fill('Unsaved synthetic confirmation stays here');
    await page.clock.fastForward(55_010);
    await assertCount(page, 0);
    assert.equal(await page.locator('#paste').evaluate(node => node === document.activeElement), true);
    assert.equal(await page.locator('#paste').inputValue(), 'Unsaved synthetic confirmation stays here');
    report.groups.push({ name: 'an inactive export becoming empty does not steal focus or change an intake draft', pass: true });
    await context.close();
  }
  assert.deepEqual(report.pageErrors, []);
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = { message: error.message, stack: error.stack };
  throw error;
} finally {
  await fs.writeFile(path.join(out, 'browser-review.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}
