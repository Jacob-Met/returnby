const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const [source, built, output] = process.argv.slice(2).map(value => path.resolve(value));
fs.mkdirSync(output, { recursive: true });
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const files = ['src/saved-returns-csv.ts', 'src/saved-returns-csv-ui.ts', 'src/main.ts', 'index.html', 'src/backup.ts', 'src/deadline.ts', 'src/store.ts'];
const sourcePins = () => Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(path.join(source, file)))]));
const before = sourcePins();
const receipt = { startedAt: new Date().toISOString(), source, built, sourcePins: before, driverSha256: hash(fs.readFileSync(__filename)),
  receiving: 'Actual compiled app and native downloads. Supplementary local Vite5.4.21 build; not a substitute for native locked Vitest/Vite8 CI.',
  controlledFaults: 'Explicitly instrumented one-call storage-read and object-URL failures; no claim of naturally occurring browser faults.',
  groups: [], downloads: [], pageErrors: [], externalRequestsAborted: [] };
const fixture = [
  { id: 'A', merchant: '=Q1, "river" 🧭', orderNo: '00042', total: 'EUR 15.20', orderDate: '2026-10-01', windowDays: 2, windowSource: 'user', createdAt: '2026-10-01T10:00:00Z', originalEmail: 'SYNTHETIC-RAW-EMAIL-MUST-NOT-EXPORT' },
  { id: 'B', merchant: 'Fictional hill shop', orderNo: 'B-17', total: '$40.00', orderDate: '2026-10-01', windowDays: 30, windowSource: 'default', createdAt: '2026-10-01T10:01:00Z' },
  { id: 'C', merchant: 'Fictional harbour shop', orderNo: '000000000001234567890', total: 'as entered', orderDate: '2026-10-07', windowDays: 2, windowSource: 'policy', createdAt: '2026-10-07T10:00:00Z' }
];
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = http.createServer((request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = path.resolve(built, '.' + (requestPath === '/' ? '/index.html' : requestPath));
  if (file !== built && !file.startsWith(built + path.sep)) { response.writeHead(403).end(); return; }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404).end(); return; }
  response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
  response.end(fs.readFileSync(file));
});
let browser;
async function run(name, fn) {
  const group = { name };
  try { group.evidence = await fn(); group.status = 'PASS'; }
  catch (error) { group.status = 'FAIL'; group.error = error.stack; throw error; }
  finally { receipt.groups.push(group); }
}
async function context(options = {}, rows = fixture) {
  const ctx = await browser.newContext(options);
  await ctx.addInitScript(({ rows }) => {
    if (location.protocol.startsWith('http') && localStorage.getItem('returnby.v1') === null) localStorage.setItem('returnby.v1', JSON.stringify(rows));
    window.__csvLife = { created: [], revoked: [], downloads: 0 };
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = blob => {
      if (window.__failCsvUrl) { window.__failCsvUrl = false; throw new Error('Controlled URL refusal'); }
      const url = create(blob); window.__csvLife.created.push({ url, type: blob.type, size: blob.size }); return url;
    };
    URL.revokeObjectURL = url => { window.__csvLife.revoked.push(url); return revoke(url); };
    const read = Storage.prototype.getItem;
    Storage.prototype.getItem = function(key) {
      if (key === 'returnby.v1' && window.__failCsvRead) { window.__failCsvRead = false; throw new Error('Controlled storage read refusal'); }
      return read.call(this, key);
    };
  }, { rows });
  await ctx.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1:') || url.startsWith('blob:') || url.startsWith('data:')) return route.continue();
    receipt.externalRequestsAborted.push(url); return route.abort();
  });
  ctx.on('page', page => page.on('pageerror', error => receipt.pageErrors.push(error.message)));
  return ctx;
}
async function snapshot(page) {
  return page.evaluate(() => ({ saved: localStorage.getItem('returnby.v1'), paste: document.querySelector('#paste').value,
    form: [...new FormData(document.querySelector('#preview')).entries()], previewHidden: document.querySelector('#preview').hidden,
    filter: [...document.querySelectorAll('.filter')].map(button => [button.id, button.getAttribute('aria-pressed')]),
    cards: document.querySelector('#list').innerHTML, importHidden: document.querySelector('#backup-preview').hidden,
    importSummary: document.querySelector('#backup-summary').textContent, importRows: document.querySelector('#backup-rows').innerHTML,
    editorOpen: document.querySelector('#edit-dialog').open }));
}
function parseCsv(file) {
  return JSON.parse(execFileSync(process.env.CODEX_PRIMARY_RUNTIME_PYTHON || 'python3', ['-c',
    'import csv,io,json,sys; data=open(sys.argv[1],"rb").read(); assert data[:3]==b"\\xef\\xbb\\xbf"; print(json.dumps(list(csv.reader(io.StringIO(data.decode("utf-8-sig"),newline=""))),ensure_ascii=True))', file], { encoding: 'utf8' }));
}
async function download(page, name, keyboard = false) {
  const pending = page.waitForEvent('download');
  const button = page.locator('#saved-returns-csv');
  if (keyboard) { await button.focus(); await page.keyboard.press('Enter'); }
  else await button.click();
  const result = await pending;
  assert.match(result.suggestedFilename(), /^returnby-returns-\d{4}-\d{2}-\d{2}\.csv$/);
  const file = path.join(output, name); await result.saveAs(file);
  const bytes = fs.readFileSync(file); const rows = parseCsv(file);
  receipt.downloads.push({ file: name, filename: result.suggestedFilename(), bytes: bytes.length, sha256: hash(bytes), dataRows: rows.length - 1 });
  return rows;
}
async function addReturn(page, merchant) {
  await page.locator('#paste').fill('Fictional order for a receiving test');
  await page.locator('#find').click();
  for (const [name, value] of Object.entries({ merchant, orderDate: '2026-10-08', orderNo: '00077', total: 'JPY 3200', windowDays: '14' })) {
    await page.locator(`#preview [name="${name}"]`).fill(value);
  }
  await page.locator('#preview button[type="submit"]').click();
  await page.waitForFunction(() => document.querySelector('#preview').hidden);
}
(async () => {
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}/`;
    browser = await chromium.launch({ executablePath: '/workspace/scratch/ae0a1ea0b247/browser-tools/runtime/chromium', headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    receipt.chromium = browser.version();
    const ctx = await context({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage(); await page.goto(url);
    await page.locator('#saved-returns-csv').waitFor();
    await page.locator('#paste').fill('UNSAVED-PASTE-NEVER-EXPORTED'); await page.locator('#find').click();
    await page.locator('#preview [name="merchant"]').fill('Uncommitted reviewed merchant');
    await page.locator('#filter-due').click();
    await run('Keyboard download exports the complete saved tracker and preserves the active unsaved form/filter', async () => {
      const before = await snapshot(page), rows = await download(page, '01-all-saved.csv', true);
      assert.equal(rows.length, 4); assert.equal(rows[0].length, 9);
      assert.deepEqual(rows.slice(1).map(row => row[0]), ['A', 'C', 'B']);
      assert.equal(rows[1][1], "'=Q1, \"river\" 🧭"); assert.equal(rows[1][2], '00042');
      assert.equal(rows[1][3], 'EUR 15.20'); assert.equal(rows[1][7], '2026-10-03');
      assert.ok(!JSON.stringify(rows).includes('SYNTHETIC-RAW-EMAIL')); assert.ok(!JSON.stringify(rows).includes('UNSAVED-PASTE'));
      assert.deepEqual(await snapshot(page), before);
      assert.match(await page.locator('#saved-csv-message').textContent(), /all 3 currently saved returns.*1 cell has/);
      return { actualNativeDownload: true, csvRows: 3, visibleDateFilterDidNotLimitExport: true, protectedCells: 1, stateUnchanged: true };
    });
    const second = await ctx.newPage(); await second.goto(url);
    await run('A second tab native Save is included by a fresh export without changing the first tab view', async () => {
      await addReturn(second, 'Later saved return');
      const before = await snapshot(page), rows = await download(page, '02-current-storage.csv');
      assert.equal(rows.length, 5); assert.ok(rows.some(row => row[1] === 'Later saved return'));
      assert.deepEqual(await snapshot(page), before);
      return { csvRows: 4, secondTabUsedActualSave: true, firstTabViewAndDraftPreserved: true };
    });
    await run('An actual admitted backup preview remains pending while CSV contains only currently saved records', async () => {
      const incoming = { ...fixture[1], id: 'INCOMING', merchant: 'Not yet imported' };
      const backup = path.join(output, 'incoming-backup.json');
      fs.writeFileSync(backup, JSON.stringify({ schema: 'returnby.backup', version: 1, exportedAt: '2026-10-08T12:00:00Z', orders: [incoming] }));
      await page.locator('#backup-heading').click(); await page.locator('#backup-file').setInputFiles(backup);
      await page.waitForFunction(() => !document.querySelector('#backup-preview').hidden);
      const before = await snapshot(page), rows = await download(page, '03-pending-import.csv');
      assert.equal(rows.length, 5); assert.ok(!rows.some(row => row[0] === 'INCOMING'));
      assert.deepEqual(await snapshot(page), before);
      return { realFilePreview: true, pendingImportNotExported: true, previewAndActiveStateUnchanged: true };
    });
    await run('Controlled read refusal preserves work; retry rereads a subsequent native second-tab Save', async () => {
      const before = await snapshot(page); let refusedDownloads = 0;
      const count = () => refusedDownloads++; page.on('download', count);
      await page.evaluate(() => { window.__failCsvRead = true; }); await page.locator('#saved-returns-csv').click();
      await page.waitForFunction(() => document.querySelector('#saved-csv-message').textContent.includes('Controlled storage read refusal'));
      page.off('download', count); assert.equal(refusedDownloads, 0); assert.deepEqual(await snapshot(page), before);
      await addReturn(second, 'Added before explicit retry');
      const retryBefore = await snapshot(page), rows = await download(page, '04-read-retry.csv');
      assert.equal(rows.length, 6); assert.ok(rows.some(row => row[1] === 'Added before explicit retry'));
      assert.deepEqual(await snapshot(page), retryBefore);
      return { controlledFault: 'one storage getItem refusal', refusalDownloads: 0, retryCsvRows: 5, currentStateUnchanged: true };
    });
    await run('Controlled object-URL refusal preserves work and recovers with normal URL cleanup', async () => {
      const before = await snapshot(page); let refusedDownloads = 0;
      const count = () => refusedDownloads++; page.on('download', count);
      await page.evaluate(() => { window.__failCsvUrl = true; }); await page.locator('#saved-returns-csv').click();
      await page.waitForFunction(() => document.querySelector('#saved-csv-message').textContent.includes('Controlled URL refusal'));
      page.off('download', count); assert.equal(refusedDownloads, 0); assert.deepEqual(await snapshot(page), before);
      const rows = await download(page, '05-url-retry.csv'); assert.equal(rows.length, 6);
      await page.waitForFunction(() => window.__csvLife.created.length === window.__csvLife.revoked.length);
      const life = await page.evaluate(() => window.__csvLife);
      assert.ok(life.created.every(row => row.type === 'text/csv;charset=utf-8' && life.revoked.includes(row.url)));
      assert.equal(await page.locator('a[download]').count(), 0); assert.deepEqual(await snapshot(page), before);
      return { controlledFault: 'one object-URL refusal', refusalDownloads: 0, createdAndRevoked: life.created.length, noAnchorLeft: true, stateUnchanged: true };
    });
    const phoneCtx = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const phone = await phoneCtx.newPage(); await phone.goto(url);
    await run('Phone control and actual download fit the viewport and preserve saved records', async () => {
      const before = await snapshot(phone), rows = await download(phone, '06-phone.csv'); assert.equal(rows.length, 4);
      await phone.locator('#saved-csv-title').scrollIntoViewIfNeeded();
      const bounds = await phone.locator('#saved-returns-csv').boundingBox(); assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390);
      const width = await phone.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }));
      assert.ok(width.page <= width.viewport); assert.deepEqual(await snapshot(phone), before);
      await phone.screenshot({ path: path.join(output, 'phone-csv-control.jpg'), type: 'jpeg', quality: 85 });
      return { viewport: '390x844', noHorizontalOverflow: true, controlBounds: bounds, actualDownloadRows: 3, stateUnchanged: true };
    });
    const emptyCtx = await context({ viewport: { width: 1280, height: 900 } }, []);
    const empty = await emptyCtx.newPage(); await empty.goto(url);
    await run('Empty saved tracker refuses without creating a file or changing storage', async () => {
      const before = await snapshot(empty); let downloads = 0; empty.on('download', () => downloads++);
      await empty.locator('#saved-returns-csv').click();
      await empty.waitForFunction(() => document.querySelector('#saved-csv-message').textContent.includes('Save a return before'));
      assert.equal(downloads, 0); assert.deepEqual(await snapshot(empty), before);
      return { downloads: 0, explicitEmptyMessage: true, stateUnchanged: true };
    });
    assert.deepEqual(receipt.pageErrors, []);
    receipt.result = 'PASS';
  } catch (error) { receipt.result = 'FAIL'; receipt.error = error.stack; process.exitCode = 1; }
  finally {
    if (browser) await browser.close(); await new Promise(resolve => server.close(resolve));
    receipt.sourcePinsAfter = sourcePins(); receipt.sourceUnchanged = JSON.stringify(receipt.sourcePinsAfter) === JSON.stringify(before);
    if (!receipt.sourceUnchanged) { receipt.result = 'FAIL'; process.exitCode = 1; }
    receipt.finishedAt = new Date().toISOString();
    for (const file of fs.readdirSync(output)) if (/\.(png|jpg)$/.test(file)) receipt.screenshot = { file, sha256: hash(fs.readFileSync(path.join(output, file))) };
    fs.writeFileSync(path.join(output, 'browser-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
    process.stdout.write(JSON.stringify({ result: receipt.result, groups: receipt.groups.map(({ name, status, error }) => ({ name, status, error })),
      downloads: receipt.downloads.length, sourceUnchanged: receipt.sourceUnchanged, error: receipt.error }, null, 2) + '\n');
  }
})();
