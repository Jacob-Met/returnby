// Optional acceptance against a real local production build; fictional orders only.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createHash } from 'node:crypto';

const { chromium } = await import(process.env.RETURNBY_PLAYWRIGHT || 'playwright');
const build = resolve(process.env.RETURNBY_BUILD || 'dist');
const baseline = process.env.RETURNBY_BASELINE_BUILD && resolve(process.env.RETURNBY_BASELINE_BUILD);
const out = resolve(process.env.RETURNBY_EVIDENCE || 'order-search-browser-evidence');
await mkdir(out, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    const old = pathname.startsWith('/baseline/');
    const root = old ? baseline : build;
    if (!root) throw Error('Baseline not configured');
    const relative = decodeURIComponent(old ? pathname.slice('/baseline/'.length) : pathname.slice(1));
    const file = resolve(root, relative || 'index.html');
    if (!file.startsWith(root + sep)) throw Error('Outside local build');
    const bytes = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(bytes);
  } catch { response.writeHead(404).end('Missing local fixture asset'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true,
  ...(process.env.RETURNBY_CHROME ? { executablePath: process.env.RETURNBY_CHROME } : {}),
  ...(process.env.RETURNBY_DOWNLOAD_DIR ? { downloadsPath: process.env.RETURNBY_DOWNLOAD_DIR } : {}),
});
const fixed = new Date('2026-10-08T12:00:00Z');
const contexts = [], errors = [], external = [], checks = {}, downloads = [];
const order = (id, merchant, orderNo, date = '2026-10-01', days = 30) => ({ id, merchant,
  ...(orderNo === undefined ? {} : { orderNo }), total: '$8.00', orderDate: date,
  windowDays: days, windowSource: 'default', createdAt: '2026-10-01T00:00:00Z' });
const initial = [order('later', 'North Star', 'NS-900'), order('past', 'South Shop', 'NS-100', '2026-09-01'),
  order('soon', 'North Star', 'AB-200', '2026-09-11')];
const raw = page => page.evaluate(() => localStorage.getItem('returnby.v1'));
const saved = async page => JSON.parse(await raw(page) || '[]');
const visible = page => page.locator('#list [data-edit]').evaluateAll(elements => elements.map(element => element.dataset.edit));
const counts = page => page.locator('#tracked-count, #soon-count, #expired-count').allTextContents();
const query = page => page.getByRole('searchbox', { name: 'Search store or order number' });
const backup = orders => ({ schema: 'returnby.backup', version: 1, exportedAt: fixed.toISOString(), orders });

async function open(orders = initial, { width = 1440, height = 1000, pathname = '/' } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, timezoneId: 'UTC', acceptDownloads: true });
  contexts.push(ctx);
  await ctx.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    external.push(route.request().url()); return route.abort();
  });
  ctx.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  await ctx.addInitScript(({ value, origin }) => {
    if (location.origin !== origin) return;
    if (localStorage.getItem('returnby.v1') === null) localStorage.setItem('returnby.v1', JSON.stringify(value));
  }, { value: orders, origin });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(fixed);
  await page.goto(origin + pathname, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const set = Storage.prototype.setItem;
    window.lookupWrites = 0;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'returnby.v1') window.lookupWrites++;
      return set.call(this, key, value);
    };
  });
  return { page, ctx };
}

async function download(page, action, filename) {
  const waiting = page.waitForEvent('download');
  await action();
  const item = await waiting;
  const bytes = await readFile(await item.path());
  await writeFile(resolve(out, filename), bytes);
  downloads.push({ filename, suggestedFilename: item.suggestedFilename(), bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex') });
  return bytes.toString('utf8');
}

let failure;
try {
  if (baseline) {
    const { page } = await open(initial, { pathname: '/baseline/' });
    assert.equal(await page.locator('#order-search').count(), 0);
    assert.deepEqual(await visible(page), ['past', 'soon', 'later']);
    await page.locator('#filter-due').click();
    assert.deepEqual(await visible(page), ['soon']);
    assert.deepEqual(await counts(page), ['3', '1', '1']);
    assert.equal(await raw(page), JSON.stringify(initial));
    checks.baseline = { lookupControls: 0, existingUrgencyControl: 'pass', savedBytesExact: true };
    await page.context().close();
  }

  {
    const { page } = await open();
    await query(page).fill(' north   STAR ');
    assert.deepEqual(await visible(page), ['soon', 'later']);
    assert.equal(await page.locator('#search-status').innerText(), 'Showing 2 of 3 saved returns.');
    await page.locator('#filter-due').click();
    assert.deepEqual(await visible(page), ['soon']);
    await query(page).fill('#NS-100');
    assert.deepEqual(await visible(page), []);
    await page.locator('#filter-expired').click();
    assert.deepEqual(await visible(page), ['past']);
    await page.locator('#clear-search').click();
    assert.equal(await query(page).inputValue(), '');
    assert(await page.locator('#clear-search').isDisabled());
    assert.equal(await page.evaluate(() => document.activeElement.id), 'order-search');
    assert.deepEqual(await visible(page), ['past']);
    await query(page).fill('not found');
    await query(page).press('Escape');
    assert.equal(await query(page).inputValue(), '');
    assert.deepEqual(await visible(page), ['past']);
    assert.deepEqual(await counts(page), ['3', '1', '1']);
    assert.equal(await raw(page), JSON.stringify(initial));
    assert.equal(await page.evaluate(() => window.lookupWrites), 0);
    checks.lookupFilterClearKeyboard = 'pass';
  }

  {
    const literal = order('literal', '<North> & Shop', 'LIT-1');
    const missing = order('no-number', 'Unknown Number Shop', undefined);
    const { page } = await open([...initial, literal, missing]);
    await query(page).fill('<NORTH>');
    assert.deepEqual(await visible(page), ['literal']);
    assert.match(await page.locator('#list').innerText(), /<North> & Shop/);
    await query(page).fill('<img src=x onerror=alert(1)>');
    assert.deepEqual(await visible(page), []);
    assert.equal(await page.locator('#list img').count(), 0);
    await query(page).fill('Unknown Number');
    assert.deepEqual(await visible(page), ['no-number']);
    await query(page).fill('    ');
    assert.equal((await visible(page)).length, 5);
    assert.equal(await raw(page), JSON.stringify([...initial, literal, missing]));
    checks.literalTextAndOptionalNumber = 'pass';
  }

  {
    const { page } = await open();
    await page.locator('#paste').fill('UNSAVED FICTIONAL EMAIL — retain this separate draft');
    await page.locator('#find').click();
    const draft = await page.locator('#preview').innerHTML();
    await query(page).fill('North');
    await page.locator('[data-edit="soon"]').click();
    await page.locator('#edit-merchant').fill('Renamed Shop');
    await page.locator('#edit-save').click();
    assert.deepEqual(await saved(page), [initial[0], initial[1], { ...initial[2], merchant: 'Renamed Shop' }]);
    assert.deepEqual(await visible(page), ['later']);
    assert.equal(await query(page).inputValue(), 'North');
    assert.equal(await page.locator('#preview').innerHTML(), draft);
    assert.equal(await page.locator('#paste').inputValue(), 'UNSAVED FICTIONAL EMAIL — retain this separate draft');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'filter-all');
    assert.deepEqual(await counts(page), ['3', '1', '1']);
    checks.editMovesOutOfQueryWithDraftAndIdentityPreserved = 'pass';
  }

  {
    const { page } = await open();
    await query(page).fill('North');
    await page.locator('#backup-heading').click();
    const exported = JSON.parse(await download(page, () => page.locator('#backup-export').click(), 'all-orders-backup.json'));
    assert.deepEqual(exported.orders, initial);
    const incoming = order('imported', 'North Imported Shop', 'IMP-1', '2026-10-01', 45);
    await page.locator('#backup-file').setInputFiles({ name: 'fictional-search-receiving.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup([incoming]))) });
    await page.waitForFunction(() => !document.querySelector('#backup-apply').disabled);
    await page.locator('#backup-apply').click();
    assert.deepEqual(await saved(page), [...initial, incoming]);
    assert.deepEqual(await visible(page), ['soon', 'later', 'imported']);
    assert.deepEqual(await counts(page), ['4', '1', '1']);
    await query(page).fill('no tracker matches');
    await page.locator('#filter-due').click();
    assert.deepEqual(await visible(page), []);
    await page.locator('#calendar-open').click();
    assert.equal(await page.locator('#calendar-choices input').count(), 4);
    assert.equal(await page.locator('#calendar-choices input:checked').count(), 1);
    assert(await page.locator('#calendar-choices label').filter({ hasText: '#AB-200' }).locator('input').isChecked());
    await page.locator('#calendar-select-all').click();
    const ics = await download(page, () => page.locator('#calendar-download').click(), 'reviewed-all-reminders.ics');
    const uids = [...ics.matchAll(/^UID:(.+)\r?$/gm)].map(match => match[1]);
    assert.deepEqual(uids, ['past@returnby', 'soon@returnby', 'later@returnby', 'imported@returnby']);
    assert.equal(await query(page).inputValue(), 'no tracker matches');
    assert.deepEqual(await saved(page), [...initial, incoming]);
    assert.equal(await page.evaluate(() => window.lookupWrites), 1);
    checks.wholeBackupRestoreAndIndependentCalendarSelection = 'pass';
  }

  {
    const { page, ctx } = await open();
    await query(page).fill('#AB-200');
    const other = await ctx.newPage();
    await other.goto(origin, { waitUntil: 'networkidle' });
    const addition = order('other-tab', 'South Unseen', 'NEW-1');
    await other.evaluate(value => localStorage.setItem('returnby.v1', JSON.stringify(value)), [...initial, addition]);
    await page.locator('[data-del="soon"]').click();
    assert.deepEqual(await saved(page), [initial[0], initial[1], addition]);
    assert.deepEqual(await visible(page), []);
    assert.deepEqual(await counts(page), ['3', '0', '1']);
    assert.equal(await query(page).inputValue(), '#AB-200');
    checks.searchedRemovalPreservesTrueSecondTabAddition = 'pass';
  }

  {
    const { page } = await open(initial, { width: 390, height: 844 });
    await query(page).fill('North');
    await page.locator('#paste').fill('UNSAVED RETRY DRAFT');
    await page.locator('#find').click();
    await page.locator('#preview [name=orderDate]').fill('2026-10-08');
    await page.evaluate(() => {
      const get = Storage.prototype.getItem;
      window.lookupReadRefused = true;
      Storage.prototype.getItem = function(key) {
        if (key === 'returnby.v1' && window.lookupReadRefused) throw Error('Authored read refusal');
        return get.call(this, key);
      };
    });
    await page.locator('#preview button[type=submit]').click();
    assert(await query(page).isDisabled());
    assert.match(await page.locator('#search-status').innerText(), /unavailable/);
    assert.deepEqual(await counts(page), ['—', '—', '—']);
    await page.evaluate(() => { window.lookupReadRefused = false; });
    await page.locator('#storage-retry').click();
    assert(await query(page).isEnabled());
    assert.equal(await query(page).inputValue(), 'North');
    assert.deepEqual(await visible(page), ['soon', 'later']);
    assert.equal(await page.locator('#paste').inputValue(), 'UNSAVED RETRY DRAFT');
    assert.equal(await raw(page), JSON.stringify(initial));
    assert.equal(await page.evaluate(() => window.lookupWrites), 0);
    await query(page).focus();
    await page.locator('.ledger-panel').screenshot({ path: resolve(out, 'saved-order-lookup-mobile.png') });
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth,
      input: document.querySelector('#order-search').getBoundingClientRect().width,
      clear: document.querySelector('#clear-search').getBoundingClientRect().width }));
    assert(dimensions.document <= dimensions.viewport);
    assert(dimensions.input > 100 && dimensions.clear > 70);
    checks.phoneReadRefusalRetryAndLayout = dimensions;
  }

  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
} catch (error) { failure = error; }
finally {
  const result = { status: failure ? 'failed' : 'pass', browser: browser.version(), checks,
    downloads, browserErrors: errors, externalRequests: external,
    ...(failure ? { error: String(failure.stack || failure) } : {}) };
  await writeFile(resolve(out, 'browser-result.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  for (const ctx of contexts) await ctx.close();
  await browser.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
if (failure) throw failure;
