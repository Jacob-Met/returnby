// Optional acceptance against isolated local production builds. No external
// service, account, existing browser profile or real order data is used.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const { chromium } = await import(process.env.RETURNBY_PLAYWRIGHT || 'playwright');
const base = new URL(process.env.RETURNBY_BASE_URL || 'http://127.0.0.1:4173/');
assert(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Acceptance requires a local build');
const browser = await chromium.launch({
  headless: true,
  ...(process.env.RETURNBY_CHROME ? { executablePath: process.env.RETURNBY_CHROME } : {}),
  ...(process.env.RETURNBY_DOWNLOAD_DIR ? { downloadsPath: process.env.RETURNBY_DOWNLOAD_DIR } : {}),
});
const contexts = [], errors = [], externalRequests = [], observed = {};
const bytes = page => page.evaluate(() => localStorage.getItem('returnby.v1'));
const saved = async page => JSON.parse(await bytes(page) || '[]');

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

async function open(ctx, url = base.href) {
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  return page;
}

async function add(page, merchant, orderNo, windowDays = 30) {
  await page.locator('#paste').fill(`From: ${merchant}\nOrder number: ${orderNo}\nOrder date: October 1, 2026\nTotal: $12.00`);
  await page.locator('#find').click();
  for (const [name, value] of Object.entries({ merchant, orderNo, total: '$12.00', orderDate: '2026-10-01', windowDays: String(windowDays) })) {
    await page.locator(`#preview [name=${name}]`).fill(value);
  }
  await page.locator('#preview button[type=submit]').click();
}

const edit = async (page, id) => {
  // Generated fixture IDs contain only UUID characters.
  assert(/^[a-zA-Z0-9-]+$/.test(id));
  await page.locator(`[data-edit="${id}"]`).click();
  assert(await page.locator('#edit-dialog').isVisible());
};

try {
  if (process.env.RETURNBY_BASELINE_URL) {
    const baseline = new URL(process.env.RETURNBY_BASELINE_URL);
    assert.equal(baseline.origin, base.origin);
    const page = await open(await context({ width: 1440, height: 1000 }), baseline.href);
    await add(page, 'Northwind Outfitters', 'BASELINE');
    assert.equal((await saved(page)).length, 1);
    assert.equal(await page.locator('[data-edit]').count(), 0);
    assert.equal(await page.locator('[data-ics]').count(), 1);
    assert.equal(await page.locator('[data-del]').count(), 1);
    observed.baseline = { saved_orders: 1, edit_actions: 0, calendar_actions: 1, remove_actions: 1 };
  }

  const ctx = await context({ width: 1440, height: 1000 });
  const page = await open(ctx);
  await add(page, 'Northwind Outfitters', 'ORIGINAL');
  await add(page, 'Contoso Electronics', 'OTHER', 15);
  const original = await saved(page), id = original[0].id;
  await page.locator('#paste').fill('UNSAVED_FICTIONAL_EMAIL_KEEP_THIS_DRAFT');
  await page.locator('#find').click();
  const draft = await page.locator('#preview').innerHTML();
  const initialBytes = await bytes(page);

  await edit(page, id);
  await page.locator('#edit-order-date').fill('2026-10-03');
  await page.locator('#edit-window-days').fill('45');
  assert.equal(await page.locator('#edit-current-deadline').innerText(), '2026-10-31');
  assert.equal(await page.locator('#edit-proposed-deadline').innerText(), '2026-11-17');
  assert.equal(await bytes(page), initialBytes);
  await page.locator('#edit-cancel').click();
  assert.equal(await bytes(page), initialBytes);
  assert.equal(await page.evaluate(() => document.activeElement.dataset.edit), id);
  await edit(page, id);
  assert.equal(await page.locator('#edit-order-date').inputValue(), '2026-10-01');
  await page.keyboard.press('Escape');
  assert(await page.locator('#edit-dialog').isHidden());
  assert.equal(await bytes(page), initialBytes);
  observed.review_cancel_escape_no_writes = true;

  await edit(page, id);
  await page.locator('#edit-order-date').fill('2026-10-03');
  await page.locator('#edit-window-days').fill('45');
  await page.locator('#edit-order-no').fill('CORRECTED <tag>');
  await page.locator('#edit-save').click();
  const corrected = await saved(page);
  assert.equal(corrected.length, 2);
  assert.deepEqual(corrected[1], original[1]);
  assert.equal(corrected[0].id, id);
  assert.equal(corrected[0].createdAt, original[0].createdAt);
  assert.equal(corrected[0].windowSource, 'user');
  assert.equal(corrected[0].windowDays, 45);
  assert.equal(await page.locator('#paste').inputValue(), 'UNSAVED_FICTIONAL_EMAIL_KEEP_THIS_DRAFT');
  assert.equal(await page.locator('#preview').innerHTML(), draft);
  assert(await page.locator('#preview').isVisible());
  assert.match(await page.locator('#edit-feedback').innerText(), /2026-11-17/);
  assert.equal(await page.locator('#list tag').count(), 0);
  const download = page.waitForEvent('download');
  await page.locator(`[data-ics="${id}"]`).click();
  const ics = await readFile(await (await download).path(), 'utf8');
  assert(ics.includes(`UID:${id}@returnby`));
  assert(ics.includes('DTSTART;VALUE=DATE:20261117'));
  observed.corrected_record_stable_identity_and_calendar_uid = true;
  observed.unrelated_record_and_new_order_draft_preserved = true;

  await edit(page, id);
  await page.locator('#edit-window-days').fill('0');
  assert(await page.locator('#edit-save').isDisabled());
  assert.equal(await page.locator('#edit-window-days').getAttribute('aria-invalid'), 'true');
  await page.locator('#edit-window-days').fill('1.5');
  assert(await page.locator('#edit-save').isDisabled());
  await page.locator('#edit-window-days').fill('45');
  await page.locator('#edit-order-date').fill('');
  assert(await page.locator('#edit-save').isDisabled());
  assert.deepEqual(await saved(page), corrected);
  await page.locator('#edit-cancel').click();
  observed.invalid_values_refused_before_write = true;

  await edit(page, id);
  await page.locator('#edit-total').fill('$25.00');
  await page.evaluate(() => {
    const prior = Storage.prototype.getItem;
    window.restoreReturnByRead = () => { Storage.prototype.getItem = prior; };
    Storage.prototype.getItem = function(key) { if (key === 'returnby.v1') throw Error('Authored read refusal'); return prior.call(this, key); };
  });
  await page.locator('#edit-save').click();
  assert.match(await page.locator('#edit-message').innerText(), /Couldn't read/);
  assert(await page.locator('#edit-dialog').isVisible());
  await page.evaluate(() => window.restoreReturnByRead());
  assert.deepEqual(await saved(page), corrected);
  await page.evaluate(() => {
    const prior = Storage.prototype.setItem;
    window.restoreReturnByWrite = () => { Storage.prototype.setItem = prior; };
    Storage.prototype.setItem = function(key, value) { if (key === 'returnby.v1') throw Error('Authored write refusal'); return prior.call(this, key, value); };
  });
  await page.locator('#edit-save').click();
  assert.match(await page.locator('#edit-message').innerText(), /Couldn't save/);
  assert.deepEqual(await saved(page), corrected);
  assert.equal(await page.locator('#edit-total').inputValue(), '$25.00');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'edit-message');
  await page.evaluate(() => window.restoreReturnByWrite());
  await page.locator('#edit-save').click();
  assert.equal((await saved(page))[0].total, '$25.00');
  assert(await page.locator('#edit-dialog').isHidden());
  observed.read_write_refusal_keeps_bytes_and_draft_then_retries = true;

  await edit(page, id);
  await page.locator('#edit-total').fill('$30.00');
  const second = await open(ctx);
  await add(second, 'Fabrikam Home', 'CONCURRENT-ADDITION', 60);
  const added = (await saved(second))[2];
  await page.locator('#edit-save').click();
  assert.deepEqual((await saved(page))[2], added);
  assert.equal((await saved(page)).length, 3);
  observed.concurrent_unrelated_addition_preserved = true;

  await edit(page, id);
  await page.locator('#edit-total').fill('$55.00');
  await second.reload({ waitUntil: 'networkidle' });
  await edit(second, id);
  await second.locator('#edit-window-days').fill('60');
  await second.locator('#edit-save').click();
  const changedElsewhere = await bytes(second);
  await page.locator('#edit-save').click();
  assert.match(await page.locator('#edit-message').innerText(), /changed while/);
  assert.equal(await bytes(page), changedElsewhere);
  assert.equal(await page.locator('#edit-total').inputValue(), '$55.00');
  await page.locator('#edit-cancel').click();
  await edit(page, id);
  assert.equal(await page.locator('#edit-window-days').inputValue(), '60');
  await page.locator('#edit-total').fill('$70.00');
  await second.locator(`[data-del="${id}"]`).click();
  const removedElsewhere = await bytes(second);
  await page.locator('#edit-save').click();
  assert.match(await page.locator('#edit-message').innerText(), /removed while/);
  assert.equal(await bytes(page), removedElsewhere);
  await page.locator('#edit-cancel').click();
  assert.equal(await page.locator('#tracked-count').innerText(), '2');
  observed.concurrent_changed_or_removed_target_refused = true;

  const mobile = await open(await context({ width: 390, height: 844 }));
  await add(mobile, 'Northwind Outfitters', 'PHONE');
  const mobileId = (await saved(mobile))[0].id;
  await edit(mobile, mobileId);
  const malicious = '<img src=x onerror=alert(1)> & "Fictional shop"';
  await mobile.locator('#edit-merchant').fill(malicious);
  await mobile.locator('#edit-window-days').fill('45');
  assert.equal(await mobile.locator('#edit-merchant').inputValue(), malicious);
  assert.equal(await mobile.locator('#edit-dialog img').count(), 0);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  const box = await mobile.locator('#edit-dialog').boundingBox();
  assert(box.x >= 0 && box.x + box.width <= 390);
  if (process.env.RETURNBY_CAPTURE_DIR) {
    await mkdir(process.env.RETURNBY_CAPTURE_DIR, { recursive: true });
    await mobile.screenshot({ path: resolve(process.env.RETURNBY_CAPTURE_DIR, 'saved-order-edit-mobile.png'), fullPage: true });
  }
  await mobile.locator('#edit-save').click();
  assert.equal((await saved(mobile))[0].merchant, malicious);
  assert.equal(await mobile.locator('#list img').count(), 0);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  observed.phone_dialog_and_literal_markup_text = true;
  observed.phone_horizontal_overflow = false;

  await edit(page, original[1].id);
  await page.locator('#edit-window-days').fill('21');
  if (process.env.RETURNBY_CAPTURE_DIR) await page.screenshot({ path: resolve(process.env.RETURNBY_CAPTURE_DIR, 'saved-order-edit-desktop.png'), fullPage: true });
  observed.browser_errors = errors;
  observed.external_requests = externalRequests;
  assert.deepEqual(errors, []);
  assert.deepEqual(externalRequests, []);
  const result = JSON.stringify({ status: 'pass', browser: await browser.version(), observed }, null, 2);
  if (process.env.RETURNBY_CAPTURE_DIR) await writeFile(resolve(process.env.RETURNBY_CAPTURE_DIR, 'browser-result.json'), result + '\n');
  console.log(result);
} finally {
  for (const ctx of contexts) await ctx.close();
  await browser.close();
}
