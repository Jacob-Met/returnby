// Optional acceptance against a local production build. Requires Playwright
// and Chromium; RETURNBY_PLAYWRIGHT can point at an already installed module.
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const { chromium } = await import(process.env.RETURNBY_PLAYWRIGHT || 'playwright');
const base = new URL(process.env.RETURNBY_BASE_URL || 'http://127.0.0.1:4173/');
assert(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Acceptance must use an isolated local build');
const browser = await chromium.launch({ headless: true, ...(process.env.RETURNBY_CHROME ? { executablePath: process.env.RETURNBY_CHROME } : {}) });
const contexts = [], errors = [], externalRequests = [];
const observed = {};
async function context(viewport) {
  const ctx = await browser.newContext({ viewport, acceptDownloads: true });
  contexts.push(ctx);
  ctx.on('page', page => {
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  });
  ctx.on('request', request => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== base.origin) externalRequests.push(request.url());
  });
  return ctx;
}
async function open(ctx) {
  const page = await ctx.newPage();
  await page.goto(base.href, { waitUntil: 'networkidle' });
  return page;
}
async function save(page, merchant, number, days) {
  await page.locator('#paste').fill(`From: ${merchant}\nOrder number: ${number}\nOrder placed on October 1, 2026\nTotal: $42.00`);
  await page.locator('#find').click();
  for (const [name, value] of Object.entries({ merchant, orderNo: number, orderDate: '2026-10-01', total: '$42.00', windowDays: String(days) })) {
    await page.locator(`#preview [name=${name}]`).fill(value);
  }
  await page.locator('#preview button[type=submit]').click();
}
const bytes = page => page.evaluate(() => localStorage.getItem('returnby.v1'));
const saved = async page => JSON.parse(await bytes(page) || '[]');
async function choose(page, document) {
  await page.locator('#backup-file').setInputFiles({ name: 'returnby-fixture.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(document)) });
  await page.waitForFunction(() => document.querySelector('#backup-message').textContent !== 'Reading backup…');
}
async function count(page, expected) {
  assert.equal(await page.locator('#tracked-count').innerText(), String(expected));
}
async function download(page) {
  const pending = page.waitForEvent('download');
  await page.locator('#backup-export').click();
  const item = await pending;
  assert.match(item.suggestedFilename(), /^returnby-backup-\d{4}-\d{2}-\d{2}\.json$/);
  return readFile(await item.path(), 'utf8');
}

try {
  const source = await open(await context({ width: 1440, height: 1000 }));
  await save(source, 'Northwind Outfitters', 'POLICY', 30);
  await save(source, 'Unlisted Fictional Shop', 'DEFAULT', 30);
  await save(source, 'Personal Fictional Shop', 'CUSTOM', 47);
  const original = await saved(source);
  assert.deepEqual(original.map(row => row.windowSource), ['policy', 'default', 'user']);
  await source.locator('#paste').fill('RAW_EMAIL_ONLY_DO_NOT_EXPORT secret example');
  await source.locator('#find').click();
  await source.locator('#backup-heading').click();
  const exported = await download(source);
  assert(!exported.includes('RAW_EMAIL_ONLY_DO_NOT_EXPORT'));
  const file = JSON.parse(exported);
  assert.equal(file.schema, 'returnby.backup'); assert.equal(file.version, 1);
  assert.deepEqual(file.orders, original);
  observed.native_saved_sources = original.map(row => row.windowSource);

  const receivingContext = await context({ width: 390, height: 844 });
  const receiver = await open(receivingContext);
  await receiver.locator('#backup-heading').click();
  const untouched = await bytes(receiver);
  await choose(receiver, file);
  assert.equal(await receiver.locator('#backup-summary').innerText(), '3 to add · 0 already saved · 0 conflicting');
  assert.equal(await bytes(receiver), untouched);
  await receiver.locator('#backup-cancel').click();
  assert.equal(await bytes(receiver), untouched);
  await choose(receiver, file);
  await receiver.locator('#backup-apply').click();
  assert.deepEqual(await saved(receiver), original);
  await count(receiver, 3);
  await choose(receiver, file);
  assert.equal(await receiver.locator('#backup-summary').innerText(), '0 to add · 3 already saved · 0 conflicting');
  assert(await receiver.locator('#backup-apply').isDisabled());
  await receiver.locator('#backup-cancel').click();
  observed.round_trip_exact = true; observed.cancel_unchanged = true; observed.repeated_import_skipped = 3;

  await choose(receiver, { ...file, orders: [{ ...original[2], id: 'conflict-addition' }, { ...original[0], windowSource: 'user' }] });
  assert(await receiver.locator('#backup-apply').isDisabled());
  assert.match(await receiver.locator('#backup-summary').innerText(), /1 conflicting/);
  assert.deepEqual(await saved(receiver), original);
  await receiver.locator('#backup-cancel').click();
  for (const invalid of [{ ...file, version: 99 }, { ...file, orders: [original[0], { ...original[2], windowSource: 'unverified-new-source' }] }]) {
    await choose(receiver, invalid);
    assert(await receiver.locator('#backup-preview').isHidden());
    assert.equal(await receiver.locator('#backup-message').getAttribute('role'), 'alert');
    assert.deepEqual(await saved(receiver), original);
  }
  await receiver.locator('#backup-file').setInputFiles({ name: 'oversized.json', mimeType: 'application/json', buffer: Buffer.alloc(5 * 1024 * 1024 + 1, ' ') });
  await receiver.waitForFunction(() => document.querySelector('#backup-message').textContent.includes('no larger than 5 MiB'));
  assert.deepEqual(await saved(receiver), original);
  assert(await receiver.locator('#backup-preview').isHidden());
  observed.conflict_and_incompatible_files_unchanged = true;
  observed.oversized_file_unchanged = true;

  const addition = { ...original[2], id: 'receiving-addition' };
  await choose(receiver, { ...file, orders: [addition] });
  const otherTab = await open(receivingContext);
  await save(otherTab, 'Another Tab Fictional Shop', 'OTHER-TAB', 30);
  const withOtherTab = await saved(otherTab);
  assert.equal(withOtherTab.length, 4);
  await receiver.locator('#backup-apply').click();
  assert.match(await receiver.locator('#backup-message').innerText(), /changed since the preview/);
  assert.deepEqual(await saved(receiver), withOtherTab);
  await receiver.locator('#backup-apply').click();
  assert.deepEqual(await saved(receiver), [...withOtherTab, addition]);
  await count(receiver, 5); await otherTab.close();
  observed.changed_other_tab_requires_fresh_review = true;

  await receiver.locator('#paste').fill('RECEIVING_UNSAVED_EMAIL');
  await receiver.locator('#find').click();
  const historical = { ...original[1], id: 'historical-fallback', windowDays: 45 };
  await choose(receiver, { ...file, orders: [historical] });
  const beforeQuota = await bytes(receiver);
  await receiver.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      Storage.prototype.setItem = original;
      if (key === 'returnby.v1') throw new DOMException('Synthetic quota refusal', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await receiver.locator('#backup-apply').click();
  assert.equal(await bytes(receiver), beforeQuota); await count(receiver, 5);
  assert(await receiver.locator('#backup-preview').isVisible());
  assert(await receiver.locator('#preview').isVisible());
  assert.equal(await receiver.locator('#paste').inputValue(), 'RECEIVING_UNSAVED_EMAIL');
  await receiver.locator('#backup-apply').click(); await count(receiver, 6);
  assert.match(await receiver.locator('#list').innerText(), /45-DAY FALLBACK/);
  observed.quota_failure_preserves_bytes_and_draft_then_retries = true;

  const unsafeText = '<img src=x onerror="window.UNSAFE_BACKUP=true">';
  await choose(receiver, { ...file, orders: [{ ...original[2], id: 'serialization-addition', merchant: unsafeText }] });
  assert.equal(await receiver.locator('#backup-rows img').count(), 0);
  const beforeSerialization = await bytes(receiver);
  await receiver.evaluate(() => {
    const stringify = JSON.stringify;
    JSON.stringify = function(value, ...args) {
      if (Array.isArray(value) && value.length === 7) {
        JSON.stringify = stringify;
        throw new TypeError('Synthetic serialization refusal at native save');
      }
      return stringify.call(JSON, value, ...args);
    };
  });
  await receiver.locator('#backup-apply').click();
  assert.equal(await bytes(receiver), beforeSerialization); await count(receiver, 6);
  assert(await receiver.locator('#backup-preview').isVisible());
  await receiver.locator('#backup-apply').click(); await count(receiver, 7);
  assert.equal(await receiver.locator('#list img').count(), 0);
  assert.equal(await receiver.evaluate(() => window.UNSAFE_BACKUP), undefined);
  observed.serialization_failure_preserves_bytes_then_retries = true; observed.imported_html_is_text = true;

  await choose(receiver, { ...file, orders: Array.from({ length: 26 }, (_, i) => ({ ...original[2], id: `bulk-${i}` })) });
  assert.equal(await receiver.locator('#backup-rows li').count(), 25);
  await receiver.locator('#backup-next').click();
  assert.equal(await receiver.locator('#backup-rows li').count(), 1);
  assert.equal(await receiver.locator('#backup-page').innerText(), '26–26 of 26 orders');
  await receiver.locator('#backup-cancel').click();
  observed.preview_pagination = [25, 1];
  await choose(receiver, file);
  assert.equal(await receiver.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
  observed.mobile_horizontal_overflow = false;
  const restored = JSON.parse(await download(receiver));
  assert.deepEqual(restored.orders, await saved(receiver));
  assert.deepEqual(restored.orders.slice(0, 3), original);
  assert(!JSON.stringify(restored).includes('RECEIVING_UNSAVED_EMAIL'));
  observed.final_orders = restored.orders.length;
  if (process.env.RETURNBY_CAPTURE_DIR) {
    const directory = resolve(process.env.RETURNBY_CAPTURE_DIR);
    await mkdir(directory, { recursive: true });
    await receiver.locator('.backup-panel').screenshot({ path: resolve(directory, 'backup-mobile.png') });
    await receiver.setViewportSize({ width: 1440, height: 1000 });
    await receiver.locator('.backup-panel').screenshot({ path: resolve(directory, 'backup-desktop.png') });
  }
  assert.deepEqual(errors, []); assert.deepEqual(externalRequests, []);
  observed.browser_errors = errors; observed.external_requests = externalRequests;
  console.log(JSON.stringify(observed, null, 2));
} finally {
  for (const ctx of contexts) await ctx.close();
  await browser.close();
}
