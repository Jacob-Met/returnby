import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const { chromium } = await import(process.env.RETURNBY_PLAYWRIGHT || 'playwright');
const root = resolve(process.env.RETURNBY_BUILD || 'dist');
const output = resolve(process.env.RETURNBY_TAB_SYNC_OUTPUT || 'test-results/tab-sync');
const key = 'returnby.v1';
let browser, server, origin;

before(async () => {
  await mkdir(output, { recursive: true });
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
  server = createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const target = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!target.startsWith(root + sep)) return void response.writeHead(403).end();
    try { response.writeHead(200, { 'content-type': types[extname(target)] || 'application/octet-stream' }).end(await readFile(target)); }
    catch { response.writeHead(404).end(); }
  });
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  origin = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ headless: true, executablePath: process.env.RETURNBY_CHROME || undefined });
});
after(async () => {
  await browser?.close();
  await new Promise(ok => server?.close(ok));
});

async function pair(viewport = { width: 1280, height: 800 }) {
  const context = await browser.newContext({ viewport, acceptDownloads: true });
  const errors = [], remote = [];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  context.on('request', request => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== origin) remote.push(request.url());
  });
  const first = await context.newPage();
  await first.goto(origin);
  const second = await context.newPage();
  await second.goto(origin);
  return { context, first, second, errors, remote };
}
async function add(page, no) {
  await page.locator('#paste').fill('From: Fictional Marsh Supplies\nOrder number: ' + no + '\nOrder date: October 1, 2026\nTotal: $12.00');
  await page.locator('#find').click();
  for (const [name, value] of Object.entries({
    merchant: 'Fictional Marsh Supplies', orderNo: no,
    orderDate: '2026-10-01', total: '$12.00', windowDays: '30',
  })) await page.locator('#preview [name=' + name + ']').fill(value);
  await page.locator('#preview button[type=submit]').click();
}
const raw = page => page.evaluate(name => localStorage.getItem(name), key);

test('a second tab offers an explicit safe refresh without a storage write or lost keyboard focus', async () => {
  const game = await pair();
  try {
    await game.second.locator('#paste').fill('UNSAVED DRAFT');
    await game.second.locator('#paste').focus();
    await add(game.first, 'LIVE-ONE');
    await game.second.locator('#tab-sync').waitFor({ state: 'visible' });
    assert.match(await game.second.locator('#tab-sync-message').textContent(), /changed in another tab/);
    assert.equal(await game.second.locator('#tracked-count').textContent(), '0', 'an unreviewed table must not replace rows under a stale Remove');
    assert.equal(await game.second.locator('#paste').inputValue(), 'UNSAVED DRAFT');
    assert.equal(await game.second.evaluate(() => document.activeElement.id), 'paste');
    const expected = await raw(game.first);
    await game.second.screenshot({ path: resolve(output, 'sync-notice-desktop.png'), fullPage: true });
    await game.second.locator('#tab-sync-review').click();
    assert.equal(await game.second.locator('#tracked-count').textContent(), '1');
    assert.match(await game.second.locator('#list').innerText(), /LIVE-ONE/);
    assert.equal(await game.second.locator('#paste').inputValue(), 'UNSAVED DRAFT');
    assert.equal(await game.second.evaluate(() => document.activeElement.id), 'filter-all');
    assert.equal(await game.second.locator('#tab-sync-review').isVisible(), false);
    assert.equal(await raw(game.second), expected, 'refresh reads stored orders; it does not write');
    assert.deepEqual(game.errors, []); assert.deepEqual(game.remote, []);
  } finally { await game.context.close(); }
});

test('a changed order still requires fresh review before destructive Remove', async () => {
  const game = await pair({ width: 390, height: 844 });
  try {
    await add(game.first, 'ORIGINAL');
    await game.second.locator('#tab-sync').waitFor({ state: 'visible' });
    await game.second.locator('#tab-sync-review').click();
    const [{ id }] = JSON.parse(await raw(game.second));
    await game.second.locator('#paste').fill('UNSAVED SECOND ORDER');
    await game.first.locator('[data-edit="' + id + '"]').click();
    await game.first.locator('#edit-order-no').fill('CHANGED IN FIRST TAB');
    await game.first.locator('#edit-save').click();
    await game.second.locator('#tab-sync-review').waitFor({ state: 'visible' });
    await game.second.screenshot({ path: resolve(output, 'sync-notice-phone.png'), fullPage: true });
    await game.second.locator('[data-del="' + id + '"]').click();
    assert.match(await game.second.locator('#storage-error').textContent(), /changed|review/i);
    assert.match(await game.second.locator('#list').textContent(), /CHANGED IN FIRST TAB/);
    assert.equal(JSON.parse(await raw(game.second)).length, 1, 'no outdated Remove was committed');
    assert.equal(await game.second.locator('#paste').inputValue(), 'UNSAVED SECOND ORDER');
    await game.second.locator('#tab-sync-review').click();
    assert.equal(await game.second.locator('#tab-sync-review').isVisible(), false);
    assert.deepEqual(game.errors, []); assert.deepEqual(game.remote, []);
    assert.equal(await game.second.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  } finally { await game.context.close(); }
});

test('unrelated storage does not interrupt, and unreadable remote data is never overwritten', async () => {
  const game = await pair();
  try {
    await game.second.locator('#paste').fill('DRAFT AFTER STORAGE ERROR');
    await game.first.evaluate(() => localStorage.setItem('unrelated-preference', '1'));
    assert.equal(await game.second.locator('#tab-sync').isVisible(), false);
    await game.first.evaluate(key => localStorage.setItem(key, '{incomplete'), key);
    await game.second.locator('#tab-sync').waitFor({ state: 'visible' });
    await game.second.locator('#tab-sync-review').click();
    assert.equal(await game.second.locator('#storage-retry').isVisible(), true);
    assert.equal(await game.second.locator('#tracked-count').textContent(), '—');
    assert.equal(await game.second.locator('#paste').inputValue(), 'DRAFT AFTER STORAGE ERROR');
    assert.equal(await raw(game.second), '{incomplete');
    assert.equal(await game.second.locator('#tab-sync-review').isVisible(), true, 'retry remains available');
    await game.first.evaluate(key => localStorage.setItem(key, '[]'), key);
    await game.second.locator('#tab-sync-review').click();
    assert.equal(await game.second.locator('#tracked-count').textContent(), '0');
    assert.equal(await game.second.locator('#storage-retry').isVisible(), false);
    assert.deepEqual(game.errors, []); assert.deepEqual(game.remote, []);
  } finally { await game.context.close(); }
});
