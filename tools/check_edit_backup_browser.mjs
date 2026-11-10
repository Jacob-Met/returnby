// Receiving acceptance for an isolated composition with portable-backup PR #10.
// The standalone editor branch does not supply the backup controls.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const { chromium } = await import(process.env.RETURNBY_PLAYWRIGHT || 'playwright');
const base = new URL(process.env.RETURNBY_BASE_URL || 'http://127.0.0.1:4173/');
assert(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname));
const browser = await chromium.launch({ headless: true,
  ...(process.env.RETURNBY_CHROME ? { executablePath: process.env.RETURNBY_CHROME } : {}),
  ...(process.env.RETURNBY_DOWNLOAD_DIR ? { downloadsPath: process.env.RETURNBY_DOWNLOAD_DIR } : {}) });
const contexts = [], errors = [];
const observed = {};
const bytes = page => page.evaluate(() => localStorage.getItem('returnby.v1'));
const saved = async page => JSON.parse(await bytes(page) || '[]');
const backup = orders => ({ schema: 'returnby.backup', version: 1, exportedAt: '2026-10-08T00:00:00Z', orders });
async function open() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  contexts.push(ctx);
  const page = await ctx.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base.href, { waitUntil: 'networkidle' });
  await page.locator('#backup-heading').click();
  return page;
}
async function choose(page, file) {
  await page.locator('#backup-file').setInputFiles({ name: 'fictional-returnby-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) });
  await page.waitForFunction(() => document.querySelector('#backup-message').textContent !== 'Reading backup…');
}

try {
  const page = await open();
  const historical = { id: 'historical-order', merchant: 'Unlisted Historical Shop', orderNo: 'OLD', total: '$10.00',
    orderDate: '2026-10-01', windowDays: 45, windowSource: 'default', createdAt: '2026-10-01T10:00:00Z' };
  await choose(page, backup([historical]));
  await page.locator('#backup-apply').click();
  assert.deepEqual(await saved(page), [historical]);
  await page.locator('#paste').fill('UNSAVED_EMAIL_EXCLUDED_FROM_BACKUP');
  await page.locator('#find').click();
  await page.locator('[data-edit="historical-order"]').click();
  await page.locator('#edit-order-date').fill('2026-10-03');
  await page.locator('#edit-total').fill('$22.00');
  assert.match(await page.locator('#edit-source').innerText(), /Saved fallback · 45 days/);
  await page.locator('#edit-save').click();
  const edited = (await saved(page))[0];
  assert.deepEqual(edited, { ...historical, orderDate: '2026-10-03', total: '$22.00' });
  const pending = page.waitForEvent('download');
  await page.locator('#backup-export').click();
  const text = await readFile(await (await pending).path(), 'utf8');
  const exported = JSON.parse(text);
  assert.deepEqual(exported.orders, [edited]);
  assert(!text.includes('UNSAVED_EMAIL_EXCLUDED_FROM_BACKUP'));
  const receiver = await open();
  await choose(receiver, exported);
  await receiver.locator('#backup-apply').click();
  assert.deepEqual(await saved(receiver), [edited]);
  assert.match(await receiver.locator('#list').innerText(), /45-DAY FALLBACK/);
  observed.restored_historical_order_edit_export_restore_exact = true;

  const addition = { ...historical, id: 'staged-addition', orderNo: 'NEW' };
  await choose(page, backup([addition]));
  assert.match(await page.locator('#backup-summary').innerText(), /1 to add/);
  await page.locator('[data-edit="historical-order"]').click();
  await page.locator('#edit-window-days').fill('60');
  await page.locator('#edit-save').click();
  const afterEdit = await bytes(page);
  await page.locator('#backup-apply').click();
  assert.match(await page.locator('#backup-message').innerText(), /changed since the preview/);
  assert.equal(await bytes(page), afterEdit);
  await page.locator('#backup-apply').click();
  const combined = await saved(page);
  assert.equal(combined.length, 2);
  assert.equal(combined[0].windowDays, 60);
  assert.equal(combined[0].windowSource, 'user');
  assert.deepEqual(combined[1], addition);
  observed.staged_import_requires_review_after_edit_and_preserves_both = true;

  await choose(page, exported);
  assert.match(await page.locator('#backup-summary').innerText(), /1 conflicting/);
  assert(await page.locator('#backup-apply').isDisabled());
  assert.deepEqual(await saved(page), combined);
  await page.locator('#backup-cancel').click();
  assert.equal(await page.locator('#paste').inputValue(), 'UNSAVED_EMAIL_EXCLUDED_FROM_BACKUP');
  assert(await page.locator('#preview').isVisible());
  observed.old_backup_conflict_keeps_corrected_order_and_new_order_draft = true;
  assert.deepEqual(errors, []);
  const result = JSON.stringify({ status: 'pass', observed, browser_errors: errors }, null, 2);
  if (process.env.RETURNBY_CAPTURE_DIR) {
    await mkdir(process.env.RETURNBY_CAPTURE_DIR, { recursive: true });
    await writeFile(resolve(process.env.RETURNBY_CAPTURE_DIR, 'edit-backup-result.json'), result + '\n');
  }
  console.log(result);
} finally {
  for (const ctx of contexts) await ctx.close();
  await browser.close();
}
