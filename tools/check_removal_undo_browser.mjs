import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep, relative } from 'node:path';

const { chromium } = await import(process.env.RETURNBY_PLAYWRIGHT || 'playwright');
const root = resolve(process.env.RETURNBY_BUILD || 'dist');
const output = resolve(process.env.RETURNBY_UNDO_OUTPUT || 'test-results/removal-undo');
const key = 'returnby.v1';
const hash = value => createHash('sha256').update(value).digest('hex');
const groups = [], pageErrors = [], consoleErrors = [], externalRequests = [], served = new Map();
let browser, server, page, context, origin;
const sourceFiles = ['src/main.ts', 'src/removal-undo.ts', 'src/removal-undo-ui.ts', 'src/removal-undo.css', 'index.html', 'src/store.ts'];
const sourceHashes = async () => Object.fromEntries(await Promise.all(sourceFiles.map(async path => [path, hash(await readFile(path))])));
const before = await sourceHashes();
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]'), key);
const focused = page => page.evaluate(() => document.activeElement?.id);
const clickKey = async (page, selector) => { await page.locator(selector).focus(); await page.keyboard.press('Enter'); };

async function open(width = 1360) {
  await context?.close();
  context = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: 'UTC' });
  context.on('page', page => {
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  });
  context.on('request', request => { if (new URL(request.url()).origin !== origin) externalRequests.push(request.url()); });
  page = await context.newPage();
  await page.clock.install({ time: new Date('2026-10-08T12:00:00Z') });
  await page.goto(origin);
  return page;
}

async function draft(orderNo, merchant = 'Fictional Fern Studio') {
  await page.locator('#paste').fill(`From: ${merchant}\nOrder number: ${orderNo}\nOrder date: October 1, 2026\nTotal: $18.00`);
  await page.locator('#find').click();
  for (const [name, value] of Object.entries({ merchant, orderNo, orderDate: '2026-10-01', total: '$18.00', windowDays: '45' })) {
    await page.locator(`#preview [name=${name}]`).fill(value);
  }
}

async function add(orderNo, merchant) {
  await draft(orderNo, merchant);
  await page.locator('#preview button[type=submit]').click();
  return (await saved(page)).at(-1);
}

async function clear(accept) {
  page.once('dialog', dialog => accept ? dialog.accept() : dialog.dismiss());
  await page.locator('#clear').click();
}

async function capture(name) {
  await page.locator('#removal-undo').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(output, name), fullPage: false });
}

async function assertNoticeFits() {
  const bounds = await page.evaluate(() => {
    const ids = ['removal-undo', 'removal-description', 'undo-removal', 'keep-removed'];
    return {
      viewport: innerWidth, page: document.documentElement.scrollWidth,
      elements: ids.map(id => { const e = document.getElementById(id), b = e.getBoundingClientRect();
        return { id, left: b.left, right: b.right, width: b.width, height: b.height, scrollWidth: e.scrollWidth, clientWidth: e.clientWidth }; }),
    };
  });
  assert.ok(bounds.page <= bounds.viewport, 'page has no horizontal overflow while recovery is shown');
  for (const b of bounds.elements) {
    assert.ok(b.left >= 0 && b.right <= bounds.viewport, `${b.id} stays inside viewport`);
    assert.ok(b.scrollWidth <= b.clientWidth + 1, `${b.id} does not overflow horizontally`);
    if (b.id.endsWith('removal') || b.id === 'keep-removed') assert.ok(b.height >= 44, 'recovery action touch target');
  }
  return bounds;
}

await mkdir(output, { recursive: true });
try {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
  server = createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(root + sep)) return void response.writeHead(403).end();
    try {
      const bytes = await readFile(file);
      served.set(relative(root, file), { sha256: hash(bytes), bytes: bytes.length });
      response.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' }).end(bytes);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, executablePath: process.env.RETURNBY_CHROME || undefined });

  await open();
  const a = await add('REVIEWED-É-17', 'Fictional Fern <b>Studio</b>');
  const b = await add('SECOND-19');
  await draft('KEEP-MY-DRAFT');
  const paste = await page.locator('#paste').inputValue();
  await clickKey(page, `[data-del="${a.id}"]`);
  assert.deepEqual(await saved(page), [b]);
  assert.equal(await focused(page), 'undo-removal');
  assert.equal(await page.locator('#removal-description').textContent(), `${a.merchant} · #${a.orderNo}`);
  assert.equal(await page.locator('#removal-description').locator('*').count(), 0);
  await capture('desktop-undo.png');
  await page.keyboard.press('Enter');
  assert.deepEqual(await saved(page), [a, b]);
  assert.equal(await page.locator('#paste').inputValue(), paste);
  assert.equal(await page.locator('#preview [name=orderNo]').inputValue(), 'KEEP-MY-DRAFT');
  assert.equal(await focused(page), 'removal-status');
  assert.equal(await page.locator('#undo-removal').isVisible(), false);
  assert.equal(await page.locator('#keep-removed').textContent(), 'Dismiss');
  await clickKey(page, '#keep-removed');
  assert.equal(await focused(page), 'filter-all');
  assert.equal(await page.locator('#removal-undo').isVisible(), false);
  groups.push({ name: 'reviewed-save-keyboard-undo-preserves-fields-and-draft', passed: true, original: a });

  await clickKey(page, `[data-del="${a.id}"]`);
  await clickKey(page, `[data-del="${b.id}"]`);
  await page.clock.fastForward(60 * 60 * 1000);
  assert.equal(await page.locator('#undo-removal').isVisible(), true);
  await clickKey(page, '#undo-removal');
  assert.deepEqual(await saved(page), [b]);
  groups.push({ name: 'only-last-successful-removal-survives-one-hour-clock-advance', passed: true });

  await clickKey(page, `[data-del="${b.id}"]`);
  await clear(false);
  assert.equal(await page.locator('#undo-removal').isVisible(), true);
  await page.evaluate(() => {
    window.__undoSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'returnby.v1') throw new DOMException('Synthetic receiving quota refusal', 'QuotaExceededError');
      return window.__undoSetItem.call(this, key, value);
    };
  });
  await clear(true);
  assert.equal(await page.locator('#undo-removal').isVisible(), true);
  assert.deepEqual(await saved(page), []);
  assert.equal(await page.locator('#storage-error').isVisible(), true);
  await page.evaluate(() => { Storage.prototype.setItem = window.__undoSetItem; });
  await clickKey(page, '#undo-removal');
  assert.deepEqual(await saved(page), [b]);
  await clickKey(page, `[data-del="${b.id}"]`);
  await clear(true);
  assert.equal(await page.locator('#removal-undo').isVisible(), false);
  assert.deepEqual(await saved(page), []);
  groups.push({ name: 'cancelled-and-refused-clear-retain-recovery-successful-clear-discards', passed: true });

  const c = await add('READ-RETRY');
  await draft('UNSAVED-RETRY');
  await clickKey(page, `[data-del="${c.id}"]`);
  await page.evaluate(() => {
    window.__undoGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function(key) {
      if (key === 'returnby.v1') throw new DOMException('Synthetic receiving read refusal', 'SecurityError');
      return window.__undoGetItem.call(this, key);
    };
  });
  await clickKey(page, '#undo-removal');
  assert.equal(await page.locator('#storage-retry').isVisible(), true);
  assert.match(await page.locator('#removal-status').textContent(), /Retry loading/);
  await page.evaluate(() => { Storage.prototype.getItem = window.__undoGetItem; });
  await clickKey(page, '#undo-removal');
  assert.deepEqual(await saved(page), [], 'restored API access still needs the existing explicit loading gate');
  await clickKey(page, '#storage-retry');
  await clickKey(page, '#undo-removal');
  assert.deepEqual(await saved(page), [c]);
  assert.equal(await page.locator('#preview [name=orderNo]').inputValue(), 'UNSAVED-RETRY');
  groups.push({ name: 'read-refusal-loading-gate-and-undo-retry-preserve-draft', passed: true });

  await clickKey(page, `[data-del="${c.id}"]`);
  await page.reload();
  assert.equal(await page.locator('#removal-undo').isVisible(), false);
  assert.deepEqual(await saved(page), []);
  groups.push({ name: 'actual-page-reload-ends-transient-recovery', passed: true });

  await open(390);
  const phone = await add('PHONE-É-21', 'Fictional Paper <b>Shop</b>');
  await clickKey(page, `[data-del="${phone.id}"]`);
  const phoneBounds = await assertNoticeFits();
  await capture('phone-undo.png');
  await page.keyboard.press('Tab');
  assert.equal(await focused(page), 'keep-removed');
  await page.keyboard.press('Enter');
  assert.equal(await focused(page), 'filter-all');
  assert.deepEqual(await saved(page), []);
  const long = await add('N'.repeat(300), '<img src=x>' + 'Q'.repeat(300));
  await clickKey(page, `[data-del="${long.id}"]`);
  const longBounds = await assertNoticeFits();
  assert.equal(await page.locator('#removal-description').locator('*').count(), 0);
  assert.match(await page.locator('#removal-description').textContent(), /…/);
  await capture('phone-long-label.png');
  await clickKey(page, '#undo-removal');
  assert.deepEqual(await saved(page), [long], 'short notice does not truncate the recovered record');
  groups.push({ name: '390px-notice-actions-keyboard-literal-long-label-and-full-record', passed: true, phoneBounds, longBounds });

  assert.deepEqual(await sourceHashes(), before, 'executed source stays unchanged');
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(externalRequests, []);
  const receipt = {
    accepted: true, sourceHead: process.env.RETURNBY_SOURCE_HEAD || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    sourceHashes: before, build: root, node: process.version, browser: browser.version(),
    groups, pageErrors, consoleErrors, externalRequests, served: Object.fromEntries(served),
    limitations: ['Synthetic storage failures are injected before the real Storage operation.',
      'The clock advance checks one hour; no wall-clock wait is claimed.',
      'Long-field overflow check covers the new recovery notice, not pre-existing tracker-card layout.'],
  };
  await writeFile(resolve(output, 'receiving.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({ accepted: true, groups: groups.length, browser: browser.version(), receipt: resolve(output, 'receiving.json') }));
} catch (error) {
  try { await page?.screenshot({ path: resolve(output, 'failure.png') }); } catch {}
  await writeFile(resolve(output, 'failure.json'), JSON.stringify({ accepted: false, error: String(error.stack || error), groups, pageErrors, consoleErrors, externalRequests, sourceHashes: before }, null, 2) + '\n');
  throw error;
} finally {
  await context?.close();
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
}
