import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(process.argv[2] ?? path.join(import.meta.dirname, '..'));
if (!process.argv[3] || !process.env.PLAYWRIGHT_MODULE) {
  throw new Error('Usage: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs CHROME_PATH=/path/to/chrome node tools/verify_trip_checklist.mjs <checkout> <new-evidence-directory>');
}
const out = path.resolve(process.argv[3]);
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
await fs.mkdir(out, { recursive: false });
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const sourceHead = git('rev-parse', 'HEAD');
const tracked = git('ls-files', '-z').split('\0').filter(Boolean);
const sourceBefore = await Promise.all(tracked.map(async name => ({ path: name, sha256: sha(await fs.readFile(path.join(root, name))) })));
const result = {
  schema: 'returnby.trip-checklist-browser-receiving.v1', started_at: new Date().toISOString(),
  source_head: sourceHead, source_tree: git('rev-parse', 'HEAD^{tree}'),
  receiver_sha256: sha(await fs.readFile(new URL(import.meta.url))),
  viewport: { desktop: [1440, 1000], phone: [390, 844] },
  fixture_kind: 'authored fictional saved orders only',
  groups: [], downloads: [], artifacts: [], page_errors: [], console_errors: [], external_requests: [],
};
const base = {
  id: 'demo-policy', merchant: 'Fictional Trail Shop', orderNo: 'DEMO-104',
  total: '$64.00', orderDate: '2026-10-03', windowDays: 30,
  windowSource: 'policy', createdAt: '2026-10-08T12:00:00.000Z',
};
const second = {
  ...base, id: 'demo-default', merchant: 'Paper & Pine <demo>', orderNo: 'P-29 "blue"',
  total: '€29,50', orderDate: '2026-09-25', windowDays: 14, windowSource: 'default',
};
const third = {
  ...base, id: 'demo-user', merchant: 'Fictional Studio', orderNo: 'ST-5',
  total: '¥3,200', orderDate: '2026-10-01', windowDays: 10, windowSource: 'user',
};
const fixtureRaw = JSON.stringify([base, second, third]);
const dist = path.join(root, 'dist');
let context, server, lastPage;
const mark = name => result.groups.push(name);
async function artifact(name, bytes) {
  const file = path.join(out, name);
  if (bytes) await fs.writeFile(file, bytes);
  const data = await fs.readFile(file);
  const record = { path: name, bytes: data.length, sha256: sha(data) };
  result.artifacts.push(record);
  return record;
}
async function downloaded(page, suffix) {
  const waiting = page.waitForEvent('download');
  await page.locator('#download-checklist').click();
  const download = await waiting;
  const name = suffix + '-' + download.suggestedFilename();
  try {
    await download.saveAs(path.join(out, name));
    const bytes = await fs.readFile(path.join(out, name));
    assert.equal(await download.failure(), null);
    const record = { path: name, suggested_filename: download.suggestedFilename(), bytes: bytes.length, sha256: sha(bytes), failure: null };
    result.downloads.push(record);
    return { name, bytes };
  } catch (error) {
    result.downloads.push({ path: name, failure: await download.failure(), error: String(error) });
    throw error;
  }
}
async function observe(page) {
  lastPage = page;
  page.on('pageerror', error => result.page_errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') result.console_errors.push(message.text()); });
  return page;
}
try {
  server = http.createServer(async (request, response) => {
    try {
      const rel = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
      const file = path.resolve(dist, rel);
      if (!file.startsWith(dist + path.sep)) { response.writeHead(403); response.end(); return; }
      const data = await fs.readFile(file);
      response.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' })[path.extname(file)] || 'application/octet-stream');
      response.end(data);
    } catch { response.writeHead(404); response.end('Not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  context = await chromium.launchPersistentContext(path.join(out, 'profile'), {
    headless: true, executablePath: process.env.CHROME_PATH,
    viewport: { width: 1440, height: 1000 }, acceptDownloads: true,
  });
  await context.route('**/*', route => {
    const url = route.request().url();
    if (!/^https?:/.test(url) || url.startsWith(origin + '/')) return route.continue();
    result.external_requests.push(url);
    return route.abort();
  });
  await context.addInitScript(() => {
    const set = Storage.prototype.setItem, remove = Storage.prototype.removeItem, clear = Storage.prototype.clear;
    window.__checklistWrites = [];
    window.__fixtureRaw = raw => {
      if (raw === null) remove.call(localStorage, 'returnby.v1');
      else set.call(localStorage, 'returnby.v1', raw);
    };
    Storage.prototype.setItem = function (...args) { window.__checklistWrites.push(['set', args[0]]); return set.apply(this, args); };
    Storage.prototype.removeItem = function (...args) { window.__checklistWrites.push(['remove', args[0]]); return remove.apply(this, args); };
    Storage.prototype.clear = function (...args) { window.__checklistWrites.push(['clear']); return clear.apply(this, args); };
  });
  const page = await observe(await context.newPage());
  await page.goto(origin + '/');
  assert.equal(await page.locator('#tracked-count').innerText(), '0');
  await page.locator('#paste').fill('From: Northwind Outfitters <orders@northwind.example>\nOrder #NW-48213 was placed on October 3, 2026.\nOrder total: $64.00');
  await page.locator('#find').click();
  for (const [field, value] of Object.entries({ merchant: 'Fictional Saved Through Tracker', orderDate: '2026-10-03', orderNo: 'RECEIVE-1', total: '$64.00', windowDays: '30' })) {
    await page.locator('#preview [name="' + field + '"]').fill(value);
  }
  await page.getByRole('button', { name: 'Save deadline to tracker' }).click();
  assert.equal(await page.locator('#tracked-count').innerText(), '1');
  const savedRaw = await page.evaluate(() => localStorage.getItem('returnby.v1'));
  assert.deepEqual(await page.evaluate(() => window.__checklistWrites), [['set', 'returnby.v1']]);
  await page.getByRole('link', { name: 'Prepare a return-trip checklist' }).click();
  assert.match(page.url(), /\/trip-checklist\.html$/);
  assert.equal(await page.locator('.order-choice').count(), 1);
  assert.match(await page.locator('.order-choice').innerText(), /Fictional Saved Through Tracker/);
  assert.equal(await page.evaluate(() => localStorage.getItem('returnby.v1')), savedRaw);
  assert.deepEqual(await page.evaluate(() => window.__checklistWrites), []);
  mark('The built original tracker saves a real authored order and its new link opens that unchanged saved order in the separate checklist.');

  await page.evaluate(raw => window.__fixtureRaw(raw), fixtureRaw);
  await page.reload();
  assert.equal(await page.locator('.order-choice').count(), 3);
  assert.equal(await page.locator('#preview-trip').isDisabled(), true);
  assert.equal(await page.locator('#download-checklist').isDisabled(), true);
  assert.equal(await page.locator('#empty-preview').isVisible(), true);
  assert.match(await page.locator('#order-options').innerText(), /Paper & Pine <demo>/);
  assert.equal(await page.locator('#order-options demo').count(), 0);
  mark('Three fictional saved orders render literal text and all stored source labels; no checklist is selected or exportable by default.');

  const firstCheck = page.locator('input[type="checkbox"][value="demo-policy"]');
  await firstCheck.focus();
  await page.keyboard.press('Space');
  await page.locator('input[type="checkbox"][value="demo-default"]').check();
  await page.locator('#trip-date').fill('2026-10-10');
  await page.locator('#preview-trip').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#preview-title').evaluate(el => el === document.activeElement), true);
  assert.equal(await page.locator('.sheet-order').count(), 2);
  const selectedTitles = await page.locator('.sheet-order h3').allTextContents();
  assert.deepEqual(selectedTitles, ['Paper & Pine <demo>', 'Fictional Trail Shop']);
  const text = await page.locator('#checklist-preview').innerText();
  for (const literal of ['€29,50', '$64.00', '2026-10-09', '2026-11-02', '1 day after the calculated deadline', '23 days before the calculated deadline', 'Saved default window', 'Saved policy window']) assert.ok(text.includes(literal), literal);
  assert.equal(text.includes(third.merchant), false);
  assert.equal(await page.locator('.blank-check').count(), 6);
  assert.equal(await page.locator('#download-checklist').isEnabled(), true);
  mark('Keyboard selection and preview show only two chosen orders in deadline order, preserving mixed-currency strings and before/after timing.');

  await page.screenshot({ path: path.join(out, 'desktop-preview.png'), fullPage: true });
  await artifact('desktop-preview.png');
  const first = await downloaded(page, 'desktop');
  assert.equal(first.name, 'desktop-returnby-trip-2026-10-10.html');
  const html = first.bytes.toString('utf8');
  assert.ok(html.startsWith('<!doctype html>\n'));
  for (const literal of ['$64.00', '€29,50', 'Paper &amp; Pine &lt;demo&gt;', 'P-29 &quot;blue&quot;']) assert.ok(html.includes(literal), literal);
  for (const excluded of [third.merchant, third.total, base.createdAt, '<script', '<iframe', '<link']) assert.equal(html.includes(excluded), false, excluded);
  assert.equal(await page.evaluate(() => localStorage.getItem('returnby.v1')), fixtureRaw);
  assert.deepEqual(await page.evaluate(() => window.__checklistWrites), []);
  mark('A real browser download completes with exact selected literal facts, six blank checks, self-contained styles and no unselected order or creation metadata.');

  const offline = await observe(await context.newPage());
  await context.setOffline(true);
  await offline.goto(pathToFileURL(path.join(out, first.name)).href);
  assert.deepEqual(await offline.locator('.sheet-order h3').allTextContents(), selectedTitles);
  assert.equal(await offline.locator('script,link,iframe,img,input,form').count(), 0);
  const reopenedText = await offline.locator('.trip-sheet').innerText();
  assert.equal(reopenedText, text);
  assert.equal(await offline.locator('.blank-check').count(), 6);
  mark('The actually downloaded file reopens through file:// with networking offline and matches the reviewed sheet exactly.');

  await offline.emulateMedia({ media: 'print' });
  assert.equal(await offline.locator('.sheet-open-help').isVisible(), false);
  assert.equal(await offline.locator('.sheet-footer').isVisible(), true);
  for (const literal of ['Saved policy window', 'Saved default window', 'does not confirm that a return is eligible']) assert.ok((await offline.locator('.trip-sheet').innerText()).includes(literal));
  await offline.screenshot({ path: path.join(out, 'offline-print-layout.png'), fullPage: true });
  await artifact('offline-print-layout.png');
  const pdf = await offline.pdf({ format: 'A4', printBackground: true });
  assert.ok(pdf.subarray(0, 5).equals(Buffer.from('%PDF-')));
  await artifact('offline-print.pdf', pdf);
  mark('The downloaded file has a real print-media layout and produces a native Chrome PDF while retaining source labels and limitations.');
  await context.setOffline(false);

  // Change the saved list through the original tracker in another tab.
  const tracker = await observe(await context.newPage());
  await tracker.goto(origin + '/');
  assert.equal(await tracker.locator('#tracked-count').innerText(), '3');
  await tracker.locator('button[data-del="demo-user"]').click();
  assert.equal(await tracker.locator('#tracked-count').innerText(), '2');
  await page.waitForFunction(() => document.querySelector('#download-checklist').disabled);
  assert.match(await page.locator('#trip-notice').innerText(), /Saved orders changed/);
  assert.equal(await page.locator('.sheet-order').count(), 2);
  assert.equal(await page.locator('#preview-trip').isDisabled(), true);
  mark('An actual removal in the original tracker makes the other tab’s preview stale and disables export without silently replacing the sheet.');
  await page.locator('#refresh-orders').click();
  assert.equal(await page.locator('.order-choice').count(), 2);
  assert.equal(await page.locator('input[type="checkbox"]:checked').count(), 0);
  assert.equal(await page.locator('#checklist-preview').isHidden(), true);
  assert.equal(await page.locator('#download-checklist').isDisabled(), true);
  mark('Explicit refresh loads current records and clears the prior selection and preview.');

  await page.locator('input[type="checkbox"][value="demo-policy"]').check();
  await page.locator('#preview-trip').click();
  await page.locator('#trip-date').fill('2026-10-11');
  assert.equal(await page.locator('#download-checklist').isDisabled(), true);
  assert.equal(await page.locator('#checklist-preview').isHidden(), true);
  await page.locator('#preview-trip').click();
  await page.locator('#clear-selection').click();
  assert.equal(await page.locator('#preview-trip').isDisabled(), true);
  assert.equal(await page.locator('#download-checklist').isDisabled(), true);
  mark('Changing the planned date or clearing the selected orders retires the old preview before a new download.');

  await page.locator('input[type="checkbox"][value="demo-policy"]').check();
  await page.locator('#preview-trip').click();
  const changedRaw = JSON.stringify([{ ...base, total: '$70.00' }, second]);
  await page.evaluate(raw => window.__fixtureRaw(raw), changedRaw); // Same-tab writes have no storage event.
  await page.locator('#download-checklist').click();
  assert.equal(await page.locator('#download-checklist').isDisabled(), true);
  assert.match(await page.locator('#trip-notice').innerText(), /Saved orders changed/);
  assert.equal(await page.evaluate(() => localStorage.getItem('returnby.v1')), changedRaw);
  assert.deepEqual(await page.evaluate(() => window.__checklistWrites), []);
  mark('The final download guard catches a same-tab raw change even without a storage event, preserving the changed saved bytes.');

  await page.locator('#refresh-orders').click();
  await page.locator('input[type="checkbox"][value="demo-policy"]').check();
  await page.locator('#preview-trip').click();
  await page.evaluate(() => {
    const get = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) {
      if (key === 'returnby.v1') throw new DOMException('authored blocked-storage boundary', 'SecurityError');
      return get.call(this, key);
    };
  });
  await page.locator('#download-checklist').click();
  assert.equal(await page.locator('#download-checklist').isDisabled(), true);
  assert.match(await page.locator('#trip-notice').innerText(), /Allow this site to read browser storage/);
  assert.deepEqual(await page.evaluate(() => window.__checklistWrites), []);
  mark('A read-access failure at download time is actionable and prevents export without any attempted storage write.');

  // Navigation restores the original Storage prototype after the authored failure.
  await page.reload();
  await page.evaluate(() => window.__fixtureRaw('{'));
  await page.reload();
  assert.equal(await page.locator('#trip-form').isHidden(), true);
  assert.match(await page.locator('#read-message').innerText(), /not readable JSON/);
  assert.equal(await page.evaluate(() => localStorage.getItem('returnby.v1')), '{');
  assert.deepEqual(await page.evaluate(() => window.__checklistWrites), []);
  assert.equal(await page.locator('#download-checklist').isDisabled(), true);
  mark('Malformed saved JSON remains intact, with no empty-list disguise, row dropping or reset.');

  const duplicateRaw = JSON.stringify([base, { ...second, id: base.id }]);
  await page.evaluate(raw => window.__fixtureRaw(raw), duplicateRaw);
  await page.locator('#refresh-orders').click();
  assert.match(await page.locator('#read-message').innerText(), /repeated identifier/);
  assert.equal(await page.locator('#trip-form').isHidden(), true);
  assert.equal(await page.evaluate(() => localStorage.getItem('returnby.v1')), duplicateRaw);
  await page.evaluate(() => window.__fixtureRaw(null));
  await page.locator('#refresh-orders').click();
  assert.match(await page.locator('#read-message').innerText(), /No saved orders yet/);
  assert.equal(await page.evaluate(() => localStorage.getItem('returnby.v1')), null);
  assert.deepEqual(await page.evaluate(() => window.__checklistWrites), []);
  mark('Duplicate identities are refused and a genuinely empty store offers the tracker/refresh path, without altering either value.');

  await page.evaluate(raw => window.__fixtureRaw(raw), fixtureRaw);
  await page.reload();
  await page.evaluate(() => Object.defineProperty(window, 'localStorage', {
    configurable: true, get() { throw new DOMException('authored blocked getter', 'SecurityError'); },
  }));
  await page.locator('#refresh-orders').click();
  assert.match(await page.locator('#read-message').innerText(), /Allow this site to read browser storage/);
  assert.equal(await page.locator('#trip-form').isHidden(), true);
  mark('A blocked localStorage property getter also reaches the actionable read-error state.');

  const phone = await observe(await context.newPage());
  await phone.setViewportSize({ width: 390, height: 844 });
  await phone.goto(origin + '/trip-checklist.html');
  await phone.locator('input[type="checkbox"][value="demo-user"]').check();
  await phone.locator('#trip-date').fill('2026-10-10');
  await phone.locator('#preview-trip').click();
  assert.equal(await phone.locator('.sheet-order').count(), 1);
  assert.match(await phone.locator('.sheet-order').innerText(), /¥3,200/);
  assert.match(await phone.locator('.sheet-order').innerText(), /10 days · User-adjusted window/);
  assert.match(await phone.locator('.sheet-order').innerText(), /1 day before the calculated deadline/);
  assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await phone.screenshot({ path: path.join(out, 'phone-preview.png'), fullPage: true });
  await artifact('phone-preview.png');
  const phoneDownload = await downloaded(phone, 'phone');
  assert.equal(phoneDownload.bytes.toString().includes('Fictional Trail Shop'), false);
  assert.equal(await phone.evaluate(() => localStorage.getItem('returnby.v1')), fixtureRaw);
  assert.deepEqual(await phone.evaluate(() => window.__checklistWrites), []);
  mark('At 390px the selected user-adjusted order stays within the viewport and actually downloads its own one-order checklist.');

  const phoneFile = await observe(await context.newPage());
  await phoneFile.setViewportSize({ width: 390, height: 844 });
  await context.setOffline(true);
  await phoneFile.goto(pathToFileURL(path.join(out, phoneDownload.name)).href);
  assert.equal(await phoneFile.locator('.sheet-order h3').innerText(), 'Fictional Studio');
  assert.equal(await phoneFile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.match(await phoneFile.locator('.sheet-order').innerText(), /User-adjusted window/);
  await phoneFile.screenshot({ path: path.join(out, 'phone-offline-file.png'), fullPage: true });
  await artifact('phone-offline-file.png');
  await context.setOffline(false);
  mark('The one-order download reopens offline on a narrow screen with the same amount, source and usable page width.');

  assert.equal(result.downloads.length, 2);
  assert.deepEqual(result.page_errors, []);
  assert.deepEqual(result.external_requests, []);
  const after = await Promise.all(tracked.map(async name => ({ path: name, sha256: sha(await fs.readFile(path.join(root, name))) })));
  assert.deepEqual(after, sourceBefore);
  result.source_files = sourceBefore;
  result.runtime_files = [];
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else {
        const bytes = await fs.readFile(file);
        result.runtime_files.push({ path: path.relative(dist, file), bytes: bytes.length, sha256: sha(bytes) });
      }
    }
  }
  await walk(dist);
  mark('Every tracked source byte remains unchanged; the receiver used no external request and observed no product script error.');
  result.status = 'passed';
} catch (error) {
  result.status = 'failed';
  result.error = error.stack;
  if (lastPage && !lastPage.isClosed()) {
    try { await lastPage.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }); await artifact('failure.png'); } catch {}
  }
  process.exitCode = 1;
} finally {
  if (context) await context.close();
  if (server) await new Promise(resolve => server.close(resolve));
  if (context) await fs.rm(path.join(out, 'profile'), { recursive: true, force: false });
  result.finished_at = new Date().toISOString();
  result.native_browser_closed = Boolean(context);
  const receipt = JSON.stringify(result, null, 2) + '\n';
  await fs.writeFile(path.join(out, 'receipt.json'), receipt);
  console.log(JSON.stringify({ status: result.status, groups: result.groups, downloads: result.downloads, error: result.error, receipt_sha256: sha(receipt) }));
}
