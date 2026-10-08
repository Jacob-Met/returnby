import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { isDeepStrictEqual } from 'node:util';

const require = createRequire(import.meta.url);
const argv = process.argv.slice(2);
const arg = name => argv[argv.indexOf(name) + 1];
const root = arg('--root');
const variant = arg('--variant');
const output = arg('--output');
if (!root || !output || !['baseline', 'candidate'].includes(variant)) throw new Error('Use --root ROOT --variant baseline|candidate --output NEW_DIRECTORY');
const playwrightRoot = process.env.RETURNBY_PLAYWRIGHT_ROOT || '/home/jacob/.cache/returnby-backup-8b336fefde84/node_modules/playwright';
const chrome = process.env.RETURNBY_CHROME || '/home/jacob/.cache/puppeteer/chrome/linux-154.0.8037.57/chrome-linux64/chrome';
const { chromium } = require(playwrightRoot);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const readJson = async name => JSON.parse(await fs.readFile(path.join(root, name), 'utf8'));
const expected = await readJson('expected.json');
const custody = await readJson('evidence/source-custody.json');
const build = await readJson('evidence/' + variant + '-build.json');
const sourceRoot = path.join(root, variant);
const dist = path.join(sourceRoot, 'dist');
await fs.mkdir(output, { recursive: false, mode: 0o700 });
const receipt = {
  startedAt: new Date().toISOString(),
  variant,
  contract_sha256: hash(await fs.readFile(path.join(root, 'contract.md'))),
  expected_sha256: hash(await fs.readFile(path.join(root, 'expected.json'))),
  driver_sha256: hash(await fs.readFile(new URL(import.meta.url))),
  source_commit: '8a4141ad26f068f10992677c715f0b8f7c126581',
  source_custody_sha256: hash(await fs.readFile(path.join(root, 'evidence/source-custody.json'))),
  source_heads: { undo: custody.baseline_head, csv: custody.csv_head, shared_base: custody.receiving_base },
  runtime: { node: process.version, platform: process.platform, arch: process.arch, playwright: require(path.join(playwrightRoot, 'package.json')).version, chrome: execFileSync(chrome, ['--version'], { encoding: 'utf8' }).trim() },
  assertions: [], observations: {}, downloads: [], pageErrors: [], blockedExternal: [], requests: [],
  boundary: 'Real built app, real two-tab UI actions and actual browser downloads; fictional store seeded once. Storage shim only records writes and injects the explicitly named first-tab read refusal. No product function is replaced.'
};
function progress(stage) { process.stdout.write(JSON.stringify({ at: new Date().toISOString(), stage }) + '\n'); }
function check(name, condition, detail) {
  progress('assert ' + name + ': ' + Boolean(condition));
  receipt.assertions.push({ name, pass: Boolean(condition), ...(detail === undefined ? {} : { detail }) });
  if (!condition) throw new Error('Receiving assertion failed: ' + name);
}
async function verifyFiles() {
  const observations = [];
  for (const item of custody[variant]) {
    const bytes = await fs.readFile(path.join(sourceRoot, item.path));
    if (hash(bytes) !== item.sha256 || bytes.length !== item.bytes) throw new Error('Source pin mismatch: ' + item.path);
    observations.push({ path: item.path, sha256: hash(bytes), bytes: bytes.length });
  }
  for (const item of build.artifacts) {
    const bytes = await fs.readFile(path.join(sourceRoot, item.path));
    if (hash(bytes) !== item.sha256 || bytes.length !== item.bytes) throw new Error('Build pin mismatch: ' + item.path);
  }
  return observations;
}
function parseCsv(buffer) {
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer);
  if (!text.startsWith('\uFEFF')) throw new Error('Expected the author CSV UTF-8 BOM');
  const input = text.slice(1);
  const rows = [];
  let row = [], field = '', quoted = false, closed = false, started = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') { field += '"'; i++; }
        else { quoted = false; closed = true; }
      } else field += ch;
      continue;
    }
    if (ch === '"' && !started && !closed) { quoted = true; started = true; continue; }
    if (ch === ',' || ch === '\r' || ch === '\n') {
      row.push(field); field = ''; closed = false; started = false;
      if (ch !== ',') {
        if (ch === '\r' && input[i + 1] === '\n') i++;
        rows.push(row); row = [];
      }
      continue;
    }
    if (closed) throw new Error('Unexpected text after a quoted CSV field');
    field += ch; started = true;
  }
  if (quoted) throw new Error('Unclosed CSV quote');
  if (row.length || field.length || started || closed) { row.push(field); rows.push(row); }
  return rows;
}
const expectedRows = [expected.columns, ...[...expected.restored].sort((a, b) => expected.dueById[a.id].localeCompare(expected.dueById[b.id]) || a.id.localeCompare(b.id)).map(o => [
  o.id, o.merchant, o.orderNo ?? '', o.total ?? '', o.orderDate, String(o.windowDays), o.windowSource, expected.dueById[o.id], o.createdAt
])];
async function saved(page) { return page.evaluate(() => localStorage.getItem('returnby.v1')); }
async function view(page) {
  return page.evaluate(() => {
    const field = name => document.querySelector('#preview [name="' + name + '"]')?.value ?? null;
    return {
      draft: { paste: document.querySelector('#paste').value, merchant: field('merchant'), orderDate: field('orderDate'), orderNo: field('orderNo'), total: field('total'), windowDays: field('windowDays') },
      draftVisible: !document.querySelector('#preview').hidden,
      filter: ['all', 'due', 'expired'].find(mode => document.querySelector('#filter-' + mode).getAttribute('aria-pressed') === 'true'),
      visibleIds: [...document.querySelectorAll('#list [data-edit]')].map(el => el.dataset.edit),
      recovery: {
        panelVisible: !document.querySelector('#removal-undo').hidden,
        undoVisible: !document.querySelector('#undo-removal').hidden,
        title: document.querySelector('#removal-title').textContent,
        description: document.querySelector('#removal-description').textContent,
        status: document.querySelector('#removal-status').textContent,
      },
      writes: window.__receiving.writes.length,
    };
  });
}
let context, server, shortRoot;
const downloadEvents = [];
async function actualDownload(page, label) {
  const pending = page.waitForEvent('download', { timeout: 10000 });
  await page.locator('#saved-returns-csv').click();
  const download = await pending;
  const file = path.join(output, label + '.csv');
  await download.saveAs(file);
  const failure = await download.failure();
  const bytes = await fs.readFile(file);
  const rows = parseCsv(bytes);
  const item = { label, file: path.basename(file), suggestedFilename: download.suggestedFilename(), bytes: bytes.length, sha256: hash(bytes), failure, rows };
  receipt.downloads.push(item);
  check(label + '_actual_download_complete_fields', failure === null && isDeepStrictEqual(rows, expectedRows), { actual: rows, expected: expectedRows, failure });
  return item;
}
try {
  progress('source verification');
  receipt.observations.source_before = await verifyFiles();
  progress('source verified');
  shortRoot = await fs.mkdtemp('/home/jacob/rb49-');
  process.env.TMPDIR = shortRoot;
  receipt.browser_fixture = { short_owned_tmp: shortRoot, timezoneId: 'UTC', viewport: { width: 1280, height: 900 } };
  server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      const relative = decodeURIComponent(url.pathname) === '/' ? 'index.html' : decodeURIComponent(url.pathname).slice(1);
      const file = path.resolve(dist, relative);
      if (!file.startsWith(dist + path.sep)) { res.writeHead(403).end(); return; }
      const content = await fs.readFile(file);
      const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' }[path.extname(file)] || 'application/octet-stream';
      res.writeHead(200, { 'content-type': mime, 'cache-control': 'no-store' }); res.end(content);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = 'http://127.0.0.1:' + server.address().port + '/';
  receipt.loopback_origin = baseUrl;
  progress('browser launch');
  context = await chromium.launchPersistentContext(path.join(shortRoot, 'p'), {
    executablePath: chrome, headless: true, acceptDownloads: true,
    timezoneId: 'UTC', viewport: { width: 1280, height: 900 },
    env: { ...process.env, TMPDIR: shortRoot },
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-first-run', '--disable-background-networking', '--disable-component-update']
  });
  progress('browser launched');
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== new URL(baseUrl).origin) {
      receipt.blockedExternal.push(url.href); return route.abort();
    }
    receipt.requests.push({ url: url.href, method: route.request().method() }); return route.continue();
  });
  await context.addInitScript(() => {
    window.__receiving = { writes: [], refuseRead: false };
    const originalGet = Storage.prototype.getItem;
    const originalSet = Storage.prototype.setItem;
    Storage.prototype.getItem = function(key) {
      if (this === window.localStorage && key === 'returnby.v1' && window.__receiving.refuseRead) throw new DOMException('receiving read refusal', 'SecurityError');
      return originalGet.call(this, key);
    };
    Storage.prototype.setItem = function(key, value) {
      if (this === window.localStorage && key === 'returnby.v1') window.__receiving.writes.push({ key, value });
      return originalSet.call(this, key, value);
    };
  });
  const pageA = context.pages()[0] || await context.newPage();
  pageA.on('pageerror', error => receipt.pageErrors.push({ tab: 'A', message: String(error) }));
  pageA.on('download', download => downloadEvents.push(download.suggestedFilename()));
  progress('tab A initial navigation');
  await pageA.goto(baseUrl, { waitUntil: 'networkidle' });
  check('undo_controls_from_received_pr24', await pageA.locator('#undo-removal').count() === 1);
  const actionCount = await pageA.locator('#saved-returns-csv').count();
  if (variant === 'baseline') {
    receipt.assertions.push({ name: 'csv_composition_entrypoint', pass: actionCount === 1, detail: { actual: actionCount, expected: 1 } });
    receipt.observations.not_run = 'Original Undo-only source has no saved-return CSV action. Standalone Undo tests are not repeated.';
    await pageA.screenshot({ path: path.join(output, 'baseline-no-csv.png'), fullPage: true });
  } else {
    check('csv_composition_entrypoint', actionCount === 1);
    receipt.observations.browser_today = await pageA.evaluate(() => new Date().toISOString().slice(0, 10));
    check('frozen_filter_date_precondition', receipt.observations.browser_today === '2026-10-08');
    await pageA.evaluate(initial => localStorage.setItem('returnby.v1', JSON.stringify(initial)), expected.initial);
    receipt.observations.fixture_seed = { count: 1, fictional: true, method: 'Set initial localStorage only in a fresh owned browser profile, then load the actual app.' };
    progress('tab A seeded reload');
    await pageA.reload({ waitUntil: 'networkidle' });
    const pageB = await context.newPage();
    pageB.on('pageerror', error => receipt.pageErrors.push({ tab: 'B', message: String(error) }));
    progress('tab B navigation');
    await pageB.goto(baseUrl, { waitUntil: 'networkidle' });
    check('seed_received_by_both_real_tabs', isDeepStrictEqual(JSON.parse(await saved(pageA)), expected.initial) && isDeepStrictEqual(JSON.parse(await saved(pageB)), expected.initial));
    await pageA.locator('[data-del="' + expected.initial[0].id + '"]').click();
    const removed = expected.initial.slice(1);
    check('real_remove_retains_pending_recovery', isDeepStrictEqual(JSON.parse(await saved(pageB)), removed) && (await view(pageA)).recovery.undoVisible);
    await pageB.locator('[data-edit="' + expected.peerIntent.id + '"]').click();
    await pageB.locator('#edit-order-no').fill(expected.peerIntent.orderNo);
    progress('tab B save click');
    await pageB.locator('#edit-save').click();
    const afterPeer = [expected.peerIntent, expected.initial[2]];
    receipt.observations.after_peer_edit = JSON.parse(await saved(pageB));
    check('real_second_tab_edit_preserves_removal_and_other_fields', isDeepStrictEqual(receipt.observations.after_peer_edit, afterPeer) && !await pageB.locator('#edit-dialog').isVisible(), { actual: receipt.observations.after_peer_edit, expected: afterPeer });
    await pageA.locator('#paste').fill(expected.unsavedDraft.paste);
    await pageA.locator('#find').click();
    for (const [name, value] of Object.entries(expected.unsavedDraft)) if (name !== 'paste') await pageA.locator('#preview [name="' + name + '"]').fill(value);
    await pageA.locator('#filter-expired').click();
    const beforeUndo = await view(pageA);
    check('unsaved_draft_and_filter_frozen_before_undo', isDeepStrictEqual(beforeUndo.draft, expected.unsavedDraft) && beforeUndo.draftVisible && beforeUndo.filter === 'expired');
    await pageA.locator('#undo-removal').click();
    const afterUndo = await view(pageA);
    receipt.observations.after_first_undo = { state: JSON.parse(await saved(pageB)), view: afterUndo };
    check('undo_restores_exact_target_and_current_peer_edit', isDeepStrictEqual(receipt.observations.after_first_undo.state, expected.restored), { actual: receipt.observations.after_first_undo.state, expected: expected.restored });
    check('undo_preserves_unsaved_draft_and_active_filter', isDeepStrictEqual(afterUndo.draft, expected.unsavedDraft) && afterUndo.draftVisible && afterUndo.filter === 'expired' && isDeepStrictEqual(afterUndo.visibleIds, [expected.peerIntent.id]) && !afterUndo.recovery.undoVisible);
    const firstBefore = { raw: await saved(pageB), a: await view(pageA), b: await view(pageB) };
    const first = await actualDownload(pageA, 'after-peer-edit-and-undo');
    const firstAfter = { raw: await saved(pageB), a: await view(pageA), b: await view(pageB) };
    check('whole_tracker_csv_is_read_only_and_preserves_ui', isDeepStrictEqual(firstBefore, firstAfter) && first.rows.length === 4, { before: firstBefore, after: firstAfter });
    await pageA.screenshot({ path: path.join(output, 'undo-csv-complete.png'), fullPage: true });
    await pageA.locator('#filter-all').click();
    await pageA.locator('[data-del="' + expected.initial[0].id + '"]').click();
    await pageA.locator('#filter-expired').click();
    const refusalBefore = { raw: await saved(pageB), a: await view(pageA), b: await view(pageB), downloads: downloadEvents.length };
    check('second_removal_has_recoverable_target_and_retained_draft', isDeepStrictEqual(JSON.parse(refusalBefore.raw), afterPeer) && refusalBefore.a.recovery.undoVisible && isDeepStrictEqual(refusalBefore.a.draft, expected.unsavedDraft));
    await pageA.evaluate(() => { window.__receiving.refuseRead = true; });
    const absentDownload = pageA.waitForEvent('download', { timeout: 700 }).then(async download => {
      await download.saveAs(path.join(output, 'refused-unexpected.csv'));
      return { name: download.suggestedFilename() };
    }).catch(error => {
      if (error.name !== 'TimeoutError') throw error;
      return null;
    });
    await pageA.locator('#saved-returns-csv').click();
    const unexpected = await absentDownload;
    const refusalAfter = { raw: await saved(pageB), a: await view(pageA), b: await view(pageB), downloads: downloadEvents.length };
    const refusalMessage = await pageA.locator('#saved-csv-message').textContent();
    receipt.observations.refused_read = { before: refusalBefore, after: refusalAfter, message: refusalMessage, unexpected_download: unexpected };
    check('refused_csv_read_downloads_nothing_and_explains_failure', unexpected === null && refusalAfter.downloads === refusalBefore.downloads && /Could not download saved returns/.test(refusalMessage) && /receiving read refusal/.test(refusalMessage) && await pageA.locator('#saved-csv-message').isVisible());
    check('refused_csv_preserves_store_recovery_draft_and_filter', isDeepStrictEqual(refusalBefore, refusalAfter));
    await pageA.screenshot({ path: path.join(output, 'csv-read-refusal.png'), fullPage: true });
    await pageA.evaluate(() => { window.__receiving.refuseRead = false; });
    await pageA.locator('#undo-removal').click();
    const retryBefore = { raw: await saved(pageB), a: await view(pageA), b: await view(pageB) };
    check('undo_remains_usable_after_csv_read_refusal', isDeepStrictEqual(JSON.parse(retryBefore.raw), expected.restored) && !retryBefore.a.recovery.undoVisible && isDeepStrictEqual(retryBefore.a.draft, expected.unsavedDraft) && retryBefore.a.filter === 'expired');
    const second = await actualDownload(pageA, 'after-read-refusal-and-undo');
    const retryAfter = { raw: await saved(pageB), a: await view(pageA), b: await view(pageB) };
    check('retry_csv_preserves_data_and_ui_without_storage_writes', isDeepStrictEqual(retryBefore, retryAfter) && first.sha256 === second.sha256 && downloadEvents.length === 2);
    receipt.observations.final = { saved: JSON.parse(await saved(pageB)), a: await view(pageA), b: await view(pageB), downloads: downloadEvents, aWrites: await pageA.evaluate(() => window.__receiving.writes), bWrites: await pageB.evaluate(() => window.__receiving.writes) };
    check('no_product_runtime_error_or_external_request', receipt.pageErrors.length === 0 && receipt.blockedExternal.length === 0);
  }
} catch (error) {
  receipt.error = { name: error.name, message: error.message, stack: error.stack };
  progress('caught ' + error.message);
  await fs.writeFile(path.join(output, 'pre-close-error.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
} finally {
  progress('closing browser');
  try { if (context) await context.close(); } catch (error) { receipt.browser_close_error = String(error); }
  progress('closing server');
  try { if (server) await new Promise(resolve => server.close(resolve)); } catch (error) { receipt.server_close_error = String(error); }
  progress('final source verification');
  try { receipt.observations.source_after = await verifyFiles(); } catch (error) { receipt.source_after_error = String(error); }
  if (shortRoot) {
    try { await fs.rm(shortRoot, { recursive: true, force: false }); receipt.own_browser_fixture_removed = true; }
    catch (error) { receipt.own_browser_fixture_remove_error = String(error); }
  }
  receipt.finishedAt = new Date().toISOString();
  receipt.pass = receipt.assertions.filter(x => x.pass).length;
  receipt.fail = receipt.assertions.filter(x => !x.pass).length;
  receipt.completed = !receipt.error && !receipt.source_after_error;
  await fs.writeFile(path.join(output, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  process.stdout.write(JSON.stringify({ variant, pass: receipt.pass, fail: receipt.fail, completed: receipt.completed, error: receipt.error?.message, receipt: path.join(output, 'receipt.json'), downloads: receipt.downloads.map(({ label, bytes, sha256 }) => ({ label, bytes, sha256 })) }) + '\n');
  process.exitCode = receipt.completed && receipt.fail === 0 ? 0 : 1;
}
