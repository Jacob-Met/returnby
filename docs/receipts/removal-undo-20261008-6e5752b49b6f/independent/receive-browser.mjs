import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, readdir, mkdir, rm, statfs } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const [distArgument, outputArgument, playwrightArgument, chromiumArgument] = process.argv.slice(2);
if (![distArgument, outputArgument, playwrightArgument, chromiumArgument].every(Boolean)) throw new Error('Supply dist, output, Playwright module and Chromium executable.');
const dist = resolve(distArgument), output = resolve(outputArgument);
const sha = value => createHash('sha256').update(value).digest('hex');
await mkdir(output, { recursive: true });
const temporary = join(output, 'temporary-browser');
await mkdir(temporary, { recursive: true });
const capacity = await statfs(temporary);
assert.ok(capacity.bavail * capacity.bsize > 96 * 1024 * 1024, 'at least 96 MiB of native profile headroom is required');
process.env.TMPDIR = temporary;
const { chromium } = await import(pathToFileURL(resolve(playwrightArgument)));
const runtimeFiles = {};
async function recordFiles(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'captures') continue;
    const name = prefix + entry.name;
    if (entry.isDirectory()) await recordFiles(join(directory, entry.name), name + '/');
    else runtimeFiles[name] = sha(await readFile(join(directory, entry.name)));
  }
}
await recordFiles(dist);
const browserHash = sha(await readFile(resolve(chromiumArgument)));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(dist, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(dist + sep)) throw new Error('Outside receiving root');
    response.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream');
    response.end(await readFile(file));
  } catch { response.statusCode = 404; response.end('Not found'); }
});
await new Promise((yes, no) => { server.once('error', no); server.listen(0, '127.0.0.1', yes); });
const origin = `http://127.0.0.1:${server.address().port}`;
const errors = [], externalRequests = [], cases = [], downloads = [];
let browser;
const order = id => ({ id, merchant: `Receiving <${id}> “shop”`, orderNo: `REF-${id}`, total: '12.50',
  orderDate: '2026-10-01', windowDays: 30, windowSource: 'user', createdAt: '2026-10-01T00:00:00.000Z',
  extension: { original: ['keep', { value: 7 }], note: '界 🧭' } });
const initial = [order('A'), order('B')];
const clone = value => JSON.parse(JSON.stringify(value));
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('returnby.v1')));
const rawSaved = page => page.evaluate(() => localStorage.getItem('returnby.v1'));
async function observeWrites(page) {
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.undoReceiving = { attempts: [], refuse: 0 };
    Storage.prototype.setItem = function(key, value) {
      if (key === 'returnby.v1') {
        window.undoReceiving.attempts.push(JSON.parse(value));
        if (window.undoReceiving.refuse > 0) {
          window.undoReceiving.refuse--;
          throw new DOMException('Authored receiving refusal before write', 'QuotaExceededError');
        }
      }
      return original.call(this, key, value);
    };
  });
}
async function calendar(page, filename) {
  const receiving = page.waitForEvent('download');
  await page.locator('[data-ics="A"]').click();
  const download = await receiving;
  const data = await readFile(await download.path());
  await writeFile(join(output, filename), data);
  downloads.push({ file: filename, bytes: data.length, sha256: sha(data), suggested_filename: download.suggestedFilename() });
  return data.toString('utf8');
}
try {
  browser = await chromium.launch({ executablePath: resolve(chromiumArgument), headless: true });
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1200, height: 850 } });
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    externalRequests.push(route.request().url()); return route.abort();
  });
  const first = await context.newPage(), second = await context.newPage();
  for (const page of [first, second]) { page.setDefaultTimeout(7000); page.on('pageerror', error => errors.push(String(error))); }
  await first.goto(origin);
  await first.evaluate(value => localStorage.setItem('returnby.v1', JSON.stringify(value)), initial);
  await first.reload(); await second.goto(origin); await observeWrites(first);

  const beforeCalendar = await calendar(first, 'calendar-before.ics');
  await first.locator('[data-del="A"]').click();
  assert.deepEqual(await saved(first), [initial[1]]);
  await first.evaluate(() => { window.undoReceiving.refuse = 1; });
  await first.locator('#undo-removal').click();
  assert.deepEqual(await saved(first), [initial[1]]);
  assert.match(await first.locator('#removal-status').textContent(), /still available/i);

  // A real second tab edits the other return and saves a new reviewed return.
  await second.locator('[data-edit="B"]').click();
  await second.locator('#edit-window-days').fill('77');
  await second.locator('#edit-save').click();
  await second.locator('#sample').click();
  for (const [name, value] of Object.entries({ merchant: 'Fresh authored store', orderDate: '2026-10-03', orderNo: 'ADDED-IN-SECOND-TAB', total: '13.00', windowDays: '45' })) {
    await second.locator(`#preview [name="${name}"]`).fill(value);
  }
  await second.locator('#preview button[type="submit"]').click();
  const current = await saved(second);
  assert.equal(current.length, 2);
  assert.equal(current[0].windowDays, 77);
  assert.equal(current[1].orderNo, 'ADDED-IN-SECOND-TAB');
  assert.deepEqual(current[0].extension, initial[1].extension);
  await first.locator('#undo-removal').click();
  assert.deepEqual(await saved(first), [initial[0], ...current]);
  assert.equal(await first.evaluate(() => window.undoReceiving.attempts.length), 3);
  assert.equal(await first.evaluate(() => document.activeElement.id), 'removal-status');
  assert.equal(await first.locator('#storage-error').isHidden(), true);
  const afterCalendar = await calendar(first, 'calendar-after.ics');
  const content = text => text.split('\r\n').filter(line => !line.startsWith('DTSTAMP:'));
  assert.deepEqual(content(afterCalendar), content(beforeCalendar));
  await first.evaluate(() => document.querySelector('#undo-removal').click());
  assert.equal(await first.evaluate(() => window.undoReceiving.attempts.length), 3);
  cases.push({ name: 'refused undo retries against real second-tab editing and new-order saving', passed: true,
    detail: { original: initial[0], fresh_before_retry: current, restored: await saved(first), first_tab_write_attempts: 3,
      original_calendar_content_preserved_except_actual_generation_stamp: true, repeated_undo_does_not_write: true } });

  // A second, isolated pending removal receives structurally equal JSON whose
  // object keys were ordered differently by another writer.
  await second.evaluate(value => localStorage.setItem('returnby.v1', JSON.stringify(value)), initial);
  await first.reload(); await observeWrites(first);
  await first.locator('[data-del="A"]').click();
  const reordered = Object.fromEntries(Object.entries(initial[0]).reverse());
  reordered.extension = Object.fromEntries(Object.entries(reordered.extension).reverse());
  await second.evaluate(value => localStorage.setItem('returnby.v1', JSON.stringify(value)), [reordered, initial[1]]);
  const exactStoredBytes = await rawSaved(second);
  await first.locator('#undo-removal').click();
  assert.equal(await rawSaved(first), exactStoredBytes);
  assert.equal(await first.evaluate(() => window.undoReceiving.attempts.length), 1);
  assert.match(await first.locator('#removal-status').textContent(), /already in your tracker/i);
  assert.equal(await first.locator('#undo-removal').isHidden(), true);
  cases.push({ name: 'equal same-ID content with reordered JSON keys finishes without a write', passed: true,
    detail: { saved_bytes_unchanged: true, write_attempts_including_original_remove: 1 } });

  // A changed same-ID record refuses first; removing that conflict permits an
  // explicit retry from the still-preserved pending snapshot.
  await first.locator('[data-del="A"]').click();
  const changed = { ...initial[0], windowDays: 31 };
  await second.evaluate(value => localStorage.setItem('returnby.v1', JSON.stringify(value)), [changed, initial[1]]);
  const beforeRefusal = await rawSaved(second);
  await first.locator('#undo-removal').click();
  assert.equal(await rawSaved(first), beforeRefusal);
  assert.equal(await first.evaluate(() => window.undoReceiving.attempts.length), 2);
  assert.equal(await first.locator('#undo-removal').isVisible(), true);
  await second.evaluate(value => localStorage.setItem('returnby.v1', JSON.stringify(value)), [initial[1]]);
  await first.locator('#undo-removal').click();
  assert.deepEqual(await saved(first), initial);
  assert.equal(await first.evaluate(() => window.undoReceiving.attempts.length), 3);
  cases.push({ name: 'conflicting current identity refuses without losing the pending recovery', passed: true,
    detail: { conflict_bytes_unchanged: true, later_explicit_retry_restores_original: true } });
  assert.deepEqual(errors, []); assert.deepEqual(externalRequests, []);
  for (const [file, expected] of Object.entries(runtimeFiles)) assert.equal(sha(await readFile(join(dist, file))), expected);
  assert.equal(sha(await readFile(resolve(chromiumArgument))), browserHash);
  const report = { reviewer: 'estate-6e5752b49b6f/root', node: process.version, platform: process.platform, architecture: process.arch,
    browser: browser.version(), browser_path: resolve(chromiumArgument), browser_sha256: browserHash,
    source_receiving: 'e6877263ae20b2eb8ecd27cc2014badb7d4206d3', dist_path: dist, runtime_sha256: runtimeFiles,
    cases, downloads, page_errors: errors, external_requests: externalRequests, passed: true,
    limits: 'These scenarios preserve state observed at each fresh storage read; they do not establish atomic cross-tab transactions. Write refusal is an authored failure before the native setItem call.' };
  await writeFile(join(output, 'browser-receiving.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} catch (error) {
  const failed = { passed: false, runtime_sha256: runtimeFiles, cases, downloads, page_errors: errors, external_requests: externalRequests, error: error.stack };
  await writeFile(join(output, 'browser-failure.json'), JSON.stringify(failed, null, 2) + '\n');
  console.log(JSON.stringify(failed)); process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
  await rm(temporary, { recursive: true, force: true });
}
