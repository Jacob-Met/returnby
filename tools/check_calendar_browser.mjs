import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';

const { chromium } = await import(process.env.RETURNBY_PLAYWRIGHT || 'playwright');
const root = resolve(process.env.RETURNBY_BUILD || 'dist');
const output = resolve(process.env.RETURNBY_CALENDAR_OUTPUT || 'test-results/calendar-export');
const key = 'returnby.v1';
const now = new Date('2026-10-08T12:00:00Z');
const receipts = [];
let browser, server, origin, downloadNumber = 0;

before(async () => {
  await mkdir(output, { recursive: true });
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
  server = createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(root + sep)) return void response.writeHead(403).end();
    try { response.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' }).end(await readFile(file)); }
    catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, executablePath: process.env.RETURNBY_CHROME || undefined });
});

after(async () => {
  await writeFile(resolve(output, 'results.json'), JSON.stringify({ browser: browser?.version(), build: root, receipts }, null, 2) + '\n');
  await browser?.close();
  await new Promise(resolve => server?.close(resolve));
});

function order(id, windowDays, merchant = `Fictional ${id}`, orderNo = id) {
  return { id, merchant, orderNo, total: '$12.00', orderDate: '2026-10-01', windowDays,
    windowSource: 'user', createdAt: '2026-10-01T00:00:00.000Z' };
}

const fixtures = [order('past', 6), order('today', 7), order('soon', 14), order('later', 15)];

async function open(rows = fixtures, viewport = { width: 1280, height: 900 }, time = now) {
  const context = await browser.newContext({ viewport, timezoneId: 'UTC' });
  const errors = [], external = [];
  context.on('request', request => { if (new URL(request.url()).origin !== origin) external.push(request.url()); });
  await context.addInitScript(({ key, rows }) => localStorage.setItem(key, JSON.stringify(rows)), { key, rows });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install({ time: new Date(time.getTime() - 1000) });
  await page.clock.pauseAt(time);
  await page.goto(origin);
  await page.waitForFunction(count => document.querySelector('#tracked-count')?.textContent === String(count), rows.length);
  return { page, context, errors, external };
}

const saved = page => page.evaluate(key => localStorage.getItem(key), key);
const shownIds = page => page.locator('#list [data-ics]').evaluateAll(buttons => buttons.map(button => button.dataset.ics));
const properties = (lines, name) => lines.filter(line => line.startsWith(`${name}:`)).map(line => line.slice(name.length + 1));
const decodeText = value => value.replace(/\\([nN,;\\])/g, (_, c) => /[nN]/.test(c) ? '\n' : c);

function parseCalendar(bytes) {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  assert.ok(text.endsWith('\r\n'), 'calendar ends with CRLF');
  for (const line of text.split('\r\n')) {
    assert.ok(Buffer.byteLength(line, 'utf8') <= 75, 'physical lines fit the 75-octet budget');
    assert.doesNotMatch(line, /[\u0000-\u0008\u000a-\u001f\u007f]/, 'no unescaped line breaks or controls');
  }
  const lines = text.replace(/\r\n[ \t]/g, '').split('\r\n');
  assert.equal(lines.filter(line => line === 'BEGIN:VCALENDAR').length, 1);
  assert.equal(lines.filter(line => line === 'END:VCALENDAR').length, 1);
  const events = [];
  let event;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { assert.equal(event, undefined, 'events cannot nest'); event = []; }
    else if (line === 'END:VEVENT') { assert.ok(event); events.push(event); event = undefined; }
    else if (event) event.push(line);
  }
  assert.equal(event, undefined, 'every event ends');
  for (const event of events) {
    for (const name of ['UID', 'DTSTAMP', 'DTSTART;VALUE=DATE', 'DTEND;VALUE=DATE', 'SUMMARY', 'DESCRIPTION', 'TRIGGER']) {
      assert.equal(properties(event, name).length, 1, `one ${name} per event`);
    }
    assert.equal(event.filter(line => line === 'BEGIN:VALARM').length, 1);
    assert.equal(event.filter(line => line === 'END:VALARM').length, 1);
    assert.deepEqual(properties(event, 'ACTION'), ['DISPLAY']);
    assert.deepEqual(properties(event, 'TRIGGER'), ['-P3D']);
    assert.deepEqual(properties(event, 'DESCRIPTION'), properties(event, 'SUMMARY'));
    assert.match(properties(event, 'DTSTAMP')[0], /^\d{8}T\d{6}Z$/);
    const due = properties(event, 'DTSTART;VALUE=DATE')[0];
    const next = new Date(Date.UTC(+due.slice(0, 4), +due.slice(4, 6) - 1, +due.slice(6, 8) + 1));
    assert.deepEqual(properties(event, 'DTEND;VALUE=DATE'), [next.toISOString().slice(0, 10).replaceAll('-', '')]);
  }
  return { text, events };
}

async function download(page, selector = '#export-calendar', keyboard = false) {
  const pending = page.waitForEvent('download');
  if (keyboard) await page.locator(selector).press('Enter'); else await page.locator(selector).click();
  const result = await pending;
  const path = resolve(output, `${++downloadNumber}-${result.suggestedFilename()}`);
  await result.saveAs(path);
  assert.equal(await result.failure(), null);
  const bytes = await readFile(path);
  const parsed = parseCalendar(bytes);
  receipts.push({ download: result.suggestedFilename(), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
    ids: parsed.events.flatMap(event => properties(event, 'UID')) });
  return parsed;
}

async function expectShownDownload(page, expectedIds) {
  assert.deepEqual(await shownIds(page), expectedIds);
  assert.match(await page.locator('#export-calendar').textContent(), new RegExp(`\\b${expectedIds.length} shown deadline`));
  const before = await saved(page);
  const calendar = await download(page);
  assert.deepEqual(calendar.events.flatMap(event => properties(event, 'UID').map(decodeText)), expectedIds.map(id => `${id}@returnby`));
  assert.equal(await saved(page), before, 'export never changes saved data');
  return calendar;
}

async function clean(game) {
  assert.deepEqual(game.errors, [], 'no page errors');
  assert.deepEqual(game.external, [], 'no external requests');
  await game.context.close();
}

test('exports all currently displayed deadlines in one real browser download', async () => {
  const game = await open();
  try {
    assert.deepEqual(await shownIds(game.page), ['past', 'today', 'soon', 'later']);
    const single = await download(game.page, '[data-ics="today"]');
    assert.deepEqual(single.events.flatMap(event => properties(event, 'UID')), ['today@returnby']);
    assert.equal(await game.page.locator('#export-calendar').count(), 1, 'bulk calendar control must exist above the displayed list');
    const all = await expectShownDownload(game.page, ['past', 'today', 'soon', 'later']);
    assert.deepEqual(all.events[1], single.events[0], 'single and combined downloads preserve the same event bytes at the same time');
    await game.page.locator('.ledger-panel').screenshot({ path: resolve(output, 'calendar-desktop.png') });
  } finally { await clean(game); }
});

test('filters, reviewed Save, Remove and Clear refresh the export set and empty state', async () => {
  const game = await open();
  const { page } = game;
  try {
    await page.locator('#filter-expired').click();
    await expectShownDownload(page, ['past']);
    await page.locator('#filter-due').click();
    await expectShownDownload(page, ['today', 'soon']);
    await page.locator('#paste').fill('Fictional saved deadline for browser verification');
    await page.locator('#find').click();
    for (const [name, value] of Object.entries({ merchant: 'Fictional New Store', orderNo: 'NEW-REVIEWED', orderDate: '2026-10-01', windowDays: '10' })) {
      await page.locator(`#preview [name=${name}]`).fill(value);
    }
    await page.locator('#preview button[type=submit]').click();
    const newId = JSON.parse(await saved(page)).find(row => row.orderNo === 'NEW-REVIEWED').id;
    await expectShownDownload(page, ['today', newId, 'soon']);
    await page.locator(`[data-del="${newId}"]`).click();
    await expectShownDownload(page, ['today', 'soon']);
    await page.locator('[data-del="today"]').click();
    await page.locator('[data-del="soon"]').click();
    assert.deepEqual(await shownIds(page), []);
    assert.equal(await page.locator('#export-calendar').isDisabled(), true);
    assert.match(await page.locator('#calendar-export-help').textContent(), /0 calendar events.*change the filter/);
    let unexpectedDownload = false;
    page.on('download', () => { unexpectedDownload = true; });
    await page.locator('#export-calendar').dispatchEvent('click');
    assert.equal(unexpectedDownload, false, 'even a synthetic click on an empty set cannot download stale rows');
    await page.locator('#filter-all').click();
    await expectShownDownload(page, ['past', 'later']);
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#clear').click();
    assert.equal(await page.locator('#export-calendar').isDisabled(), true);
    assert.deepEqual(JSON.parse(await saved(page)), []);
  } finally { await clean(game); }
});

test('midnight and resume replace equal-count filtered identities while keeping export focus and draft', async () => {
  const game = await open(fixtures, { width: 1280, height: 900 }, new Date('2026-10-08T23:59:59Z'));
  const { page } = game;
  try {
    await page.locator('#filter-due').click();
    await expectShownDownload(page, ['today', 'soon']);
    await page.locator('#paste').fill('Unsubmitted fictional email stays in this draft.');
    await page.locator('#export-calendar').focus();
    await page.evaluate(() => { window.calendarControl = document.querySelector('#export-calendar'); });
    await page.clock.fastForward(1500);
    assert.equal(await page.evaluate(() => document.activeElement === window.calendarControl && document.querySelector('#export-calendar') === window.calendarControl), true);
    await expectShownDownload(page, ['soon', 'later']);
    assert.equal(await page.locator('#paste').inputValue(), 'Unsubmitted fictional email stays in this draft.');
    await page.clock.setSystemTime(new Date('2026-10-16T12:00:00Z'));
    await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
    await expectShownDownload(page, ['later']);
  } finally { await clean(game); }
});

test('Unicode calendar text stays intact and the control works by keyboard on a narrow screen', async () => {
  const merchant = 'Fictional Étoile 家具🛍️ '.repeat(18) + '\r\nEND:VEVENT,;\\north';
  const row = order('unicode', 10, merchant, 'AB\r\n12');
  const game = await open([row], { width: 360, height: 800 });
  const { page } = game;
  try {
    await page.locator('#filter-expired').focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'export-calendar');
    const calendar = await download(page, '#export-calendar', true);
    assert.equal(calendar.events.length, 1);
    assert.deepEqual(properties(calendar.events[0], 'SUMMARY').map(decodeText), [`Return deadline: ${merchant.replace(/\r\n/g, '\n')} #AB\n12`]);
    const box = await page.locator('#export-calendar').boundingBox();
    assert.ok(box.height >= 44 && box.x >= 0 && box.x + box.width <= 360);
    // The bulk control is bounded even if a pre-existing card has an unbroken long value.
    const control = await page.locator('.calendar-export').evaluate(element => ({ width: element.clientWidth, scroll: element.scrollWidth }));
    assert.equal(control.width, control.scroll);
    await page.locator('.calendar-export').screenshot({ path: resolve(output, 'calendar-phone.png') });
  } finally { await clean(game); }
});

test('a focused export that becomes empty at midnight returns focus to the selected filter', async () => {
  const game = await open([order('today', 7)], { width: 360, height: 800 }, new Date('2026-10-08T23:59:59Z'));
  const { page } = game;
  try {
    await page.locator('#filter-due').click();
    await expectShownDownload(page, ['today']);
    await page.locator('#export-calendar').focus();
    await page.clock.fastForward(1500);
    assert.equal(await page.locator('#export-calendar').isDisabled(), true);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'filter-due');
    assert.deepEqual(await shownIds(page), []);
    await page.locator('#filter-expired').click();
    await expectShownDownload(page, ['today']);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  } finally { await clean(game); }
});
