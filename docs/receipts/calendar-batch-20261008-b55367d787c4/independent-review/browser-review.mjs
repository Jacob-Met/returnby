import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const source = process.env.RETURNBY_SOURCE || '/workspace/scratch/b55367d787c4/production/returnby';
const runtime = process.env.RETURNBY_BROWSER_RUNTIME || '/workspace/scratch/b55367d787c4/production/browser-runtime';
const out = dirname(fileURLToPath(import.meta.url));
const { chromium } = await import(resolve(runtime, 'node_modules/playwright/index.mjs'));
const build = resolve(source, 'dist');
const expected = JSON.parse(await readFile(resolve(source, 'docs/receipts/calendar-batch-20261008-b55367d787c4/source-and-verification.json'), 'utf8'));
const buildHashes = {};
for (const item of expected.verification.buildFiles) {
  const sha = createHash('sha256').update(await readFile(resolve(source, item.path))).digest('hex');
  assert.equal(sha, item.sha256, item.path);
  buildHashes[item.path] = sha;
}
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    const file = resolve(build, decodeURIComponent(url.pathname.slice(1)) || 'index.html');
    assert(file.startsWith(build + sep));
    const data = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(data);
  } catch { response.writeHead(404); response.end('Missing isolated fixture'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: resolve(runtime, 'chromium'), headless: true });
const contexts = [], checks = [], pageErrors = [], externalRequests = [];
const fixture = id => ({ id, merchant: `Fictional ${id}`, orderNo: id, orderDate: '2026-10-01',
  windowDays: 30, windowSource: 'user', createdAt: '2026-10-01T12:00:00Z', total: '$12.00' });
const originals = [fixture('A'), fixture('B'), fixture('C')];
async function pageFor(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, ...options });
  contexts.push(context);
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    externalRequests.push(route.request().url());
    return route.abort();
  });
  await context.addInitScript(orders => {
    const originalSet = Storage.prototype.setItem;
    originalSet.call(localStorage, 'returnby.v1', JSON.stringify(orders));
    window.reviewSet = value => originalSet.call(localStorage, 'returnby.v1', JSON.stringify(value));
    window.reviewWrites = 0;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'returnby.v1') window.reviewWrites++;
      return originalSet.call(this, key, value);
    };
  }, originals);
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.clock.setFixedTime(new Date('2026-10-08T12:34:56Z'));
  await page.goto(origin, { waitUntil: 'networkidle' });
  return page;
}
const checkbox = (page, id) => page.locator('#calendar-choices label').filter({ hasText: `#${id}` }).locator('input');
async function downloadFrom(page, action) {
  const pending = page.waitForEvent('download');
  await action();
  const item = await pending;
  return { filename: item.suggestedFilename(), content: await readFile(await item.path(), 'utf8') };
}
let failure = null;
try {
  const page = await pageFor();
  const downloads = [];
  page.on('download', item => downloads.push(item.suggestedFilename()));
  await page.locator('#calendar-open').click();
  await page.locator('#calendar-select-none').click();
  await checkbox(page, 'A').check();

  // A read refusal on explicit refresh preserves the visible choice but disables use.
  await page.evaluate(() => {
    const original = Storage.prototype.getItem;
    window.reviewRestoreRead = () => { Storage.prototype.getItem = original; };
    Storage.prototype.getItem = function(key) {
      if (key === 'returnby.v1') throw Error('Independent storage read refusal');
      return original.call(this, key);
    };
  });
  await page.locator('#calendar-reload').click();
  assert(await checkbox(page, 'A').isChecked());
  assert(await checkbox(page, 'A').isDisabled());
  assert(await page.locator('#calendar-download').isDisabled());
  assert(await page.locator('#calendar-select-all').isDisabled());
  assert.match(await page.locator('#calendar-message').innerText(), /Couldn't read saved returns/);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'calendar-message');

  // Refresh explicitly admits the edited fields and retains the selected identity only.
  const revised = [{ ...originals[0], merchant: 'Revised fictional A', windowDays: 45 }, originals[2], originals[1], fixture('D')];
  await page.evaluate(orders => { window.reviewRestoreRead(); window.reviewSet(orders); }, revised);
  await page.locator('#calendar-reload').click();
  assert(await checkbox(page, 'A').isChecked());
  assert(await checkbox(page, 'A').isEnabled());
  assert.equal(await page.locator('#calendar-choices input:checked').count(), 1);
  assert.equal(await page.locator('#calendar-choices input').count(), 4);
  assert.match(await page.locator('#calendar-summary').innerText(), /2026-11-15/);
  checks.push({ name: 'Refresh read failure disables stale choices; explicit recovery retains only the edited selected identity', result: 'pass' });
  console.log('PASS refresh refusal and explicit recovery lifecycle');

  // Fail before a browser download is created. The next attempt must reread storage.
  await page.evaluate(() => {
    const original = URL.createObjectURL;
    window.reviewRestoreDownload = () => { URL.createObjectURL = original; };
    window.reviewObjectURLCalls = 0;
    URL.createObjectURL = function() { window.reviewObjectURLCalls++; throw Error('Independent object URL allocation refusal'); };
  });
  await page.locator('#calendar-download').click();
  assert.equal(await page.locator('#calendar-dialog').evaluate(node => node.open), true);
  assert(await checkbox(page, 'A').isChecked());
  assert.match(await page.locator('#calendar-message').innerText(), /Independent object URL allocation refusal/);
  assert.equal(await page.locator('#calendar-feedback').innerText(), '');
  assert.equal(downloads.length, 0);
  assert.equal(await page.evaluate(() => window.reviewObjectURLCalls), 1);

  await page.evaluate(orders => window.reviewSet(orders), [...revised, { ...revised[0], merchant: 'Ambiguous A' }]);
  await page.locator('#calendar-download').click();
  assert.match(await page.locator('#calendar-message').innerText(), /changed or was removed/);
  assert.equal(await page.evaluate(() => window.reviewObjectURLCalls), 1);
  assert.equal(downloads.length, 0);
  await page.locator('#calendar-reload').click();
  assert.equal(await page.locator('#calendar-choices input:checked').count(), 0);
  assert.equal(await page.locator('#calendar-choices input:disabled').count(), 2);
  assert(await page.locator('#calendar-download').isDisabled());

  await page.evaluate(orders => { window.reviewSet(orders); window.reviewRestoreDownload(); }, revised);
  await page.locator('#calendar-reload').click();
  assert.equal(await page.locator('#calendar-choices input:checked').count(), 0);
  await checkbox(page, 'A').check();
  const accepted = await downloadFrom(page, () => page.locator('#calendar-download').click());
  assert.equal(accepted.filename, 'returnby-reminders-2026-10-08.ics');
  assert.equal((accepted.content.match(/BEGIN:VEVENT/g) || []).length, 1);
  assert(accepted.content.includes('UID:A@returnby'));
  assert(accepted.content.includes('DTSTART;VALUE=DATE:20261115\r\nDTEND;VALUE=DATE:20261116'));
  assert(accepted.content.includes('SUMMARY:Return deadline: Revised fictional A #A'));
  assert.equal(accepted.content.includes('$12.00'), false);
  assert.equal(await page.locator('#calendar-dialog').evaluate(node => node.open), false);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'calendar-open');
  assert.equal(await page.evaluate(() => window.reviewWrites), 0);
  assert.equal(await page.evaluate(() => localStorage.getItem('returnby.v1')), JSON.stringify(revised));
  await writeFile(resolve(out, 'browser-recovered-reminder.ics'), accepted.content);
  checks.push({ name: 'Download allocation refusal retains review; retry rereads and refuses new identity ambiguity; fresh explicit choice downloads once', result: 'pass', downloadCount: downloads.length, appStorageWrites: 0 });
  console.log('PASS download refusal, new ambiguity, and explicit recovered download');

  // This is an emulated touch context, not a claim about a physical phone.
  const touch = await pageFor({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  assert((await touch.evaluate(() => navigator.maxTouchPoints)) > 0);
  await touch.locator('#calendar-open').tap();
  const heading = await touch.locator('#calendar-title').boundingBox();
  assert(heading && heading.y >= 0 && heading.y + heading.height < 844);
  await touch.locator('#calendar-select-none').tap();
  await checkbox(touch, 'B').tap();
  assert(await checkbox(touch, 'B').isChecked());
  assert.equal(await touch.locator('#calendar-choices input:checked').count(), 1);
  assert(await touch.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const touchDownload = await downloadFrom(touch, () => touch.locator('#calendar-download').tap());
  assert.equal((touchDownload.content.match(/BEGIN:VEVENT/g) || []).length, 1);
  assert(touchDownload.content.includes('UID:B@returnby'));
  assert.equal(await touch.evaluate(() => window.reviewWrites), 0);
  checks.push({ name: '390 px emulated touch activates review, selection and actual browser download', result: 'pass', physicalDeviceTested: false, hasTouch: true, appStorageWrites: 0 });
  console.log('PASS emulated touch review and actual file download');
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(externalRequests, []);
} catch (error) {
  failure = error.stack;
  console.error(failure);
  process.exitCode = 1;
} finally {
  const receipt = { reviewer: 'estate-b55367d787c4 / engine', browser: browser.version(), node: process.version,
    sourceAndBuildReadOnly: true, implementation: expected.local.contribution, buildHashes, checks, pageErrors, externalRequests, failure };
  await writeFile(resolve(out, 'browser-review.json'), JSON.stringify(receipt, null, 2) + '\n');
  await Promise.allSettled(contexts.map(context => context.close()));
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  console.log(JSON.stringify({ passed: checks.length, failure: Boolean(failure) }));
}
