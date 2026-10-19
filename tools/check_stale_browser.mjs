import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const { chromium } = await import(process.env.RETURNBY_PLAYWRIGHT || 'playwright');
const root = resolve(process.env.RETURNBY_BUILD || 'dist');
const output = resolve(process.env.RETURNBY_STALE_OUTPUT || 'test-results/stale-actions');
const key = 'returnby.v1';
const receipts = [];
let browser, server, origin;

before(async () => {
  await mkdir(output, { recursive: true });
  const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png' };
  server = createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(root + sep)) return void response.writeHead(403).end();
    try { response.writeHead(200, { 'content-type':types[extname(file)] || 'application/octet-stream' }).end(await readFile(file)); }
    catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless:true, executablePath:process.env.RETURNBY_CHROME || undefined });
});
after(async () => {
  await writeFile(resolve(output, 'results.json'), JSON.stringify({ browser:browser?.version(), build:root, receipts }, null, 2) + '\n');
  await browser?.close();
  await new Promise(resolve => server?.close(resolve));
});

const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]'), key);
async function open(context) {
  const page = await context.newPage();
  await page.goto(origin);
  await page.waitForFunction(() => document.querySelector('#tracked-count')?.textContent !== null);
  return page;
}
async function draft(page, orderNo) {
  await page.locator('#paste').fill(`From: Fictional Marsh Supplies\nOrder number: ${orderNo}\nOrder date: October 1, 2026\nTotal: $12.00`);
  await page.locator('#find').click();
  for (const [name,value] of Object.entries({ merchant:'Fictional Marsh Supplies', orderNo, orderDate:'2026-10-01', total:'$12.00', windowDays:'30' })) {
    await page.locator(`#preview [name=${name}]`).fill(value);
  }
}
async function add(page, orderNo) {
  await draft(page, orderNo);
  await page.locator('#preview button[type=submit]').click();
}
async function edit(page, id, orderNo) {
  await page.locator(`[data-edit="${id}"]`).click();
  await page.locator('#edit-order-no').fill(orderNo);
  await page.locator('#edit-window-days').fill('45');
  await page.locator('#edit-save').click();
}
async function setup() {
  const context = await browser.newContext({ viewport:{ width:390, height:844 } });
  const errors=[], external=[];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  context.on('request', request => { if (new URL(request.url()).origin !== origin) external.push(request.url()); });
  const first = await open(context);
  await add(first, 'ORIGINAL');
  const initial = await saved(first);
  const second = await open(context);
  return { context, first, second, initial, errors, external };
}

test('saving a new reviewed order from a stale tab retains another tab’s corrections and additions', async () => {
  const game = await setup();
  try {
    await draft(game.second, 'LOCAL-NEW');
    await edit(game.first, game.initial[0].id, 'CORRECTED-ELSEWHERE');
    await add(game.first, 'REMOTE-NEW');
    const before = await saved(game.first);
    await game.second.locator('#preview button[type=submit]').click();
    const after = await saved(game.second);
    assert.equal(after.length, 3, 'a stale new-order save must not discard a newly saved return');
    assert.deepEqual(after.slice(0, 2), before, 'existing corrections and identities remain exact');
    assert.equal(after[2].orderNo, 'LOCAL-NEW');
    assert.equal(await game.second.locator('#tracked-count').textContent(), '3');
    assert.equal(await game.second.locator('#paste').inputValue(), '');
    assert.deepEqual(game.errors, []); assert.deepEqual(game.external, []);
    receipts.push({ case:'stale-new-order', before, after });
  } finally { await game.context.close(); }
});

test('removing a still-current return keeps unseen additions and does not resurrect another removed order', async () => {
  const game = await setup();
  try {
    await add(game.first, 'REMOVE-ELSEWHERE');
    const other = (await saved(game.first))[1];
    await game.second.reload();
    await game.first.locator(`[data-del="${other.id}"]`).click();
    await add(game.first, 'KEEP-REMOTE');
    const expected = (await saved(game.first)).filter(order => order.id !== game.initial[0].id);
    await game.second.locator(`[data-del="${game.initial[0].id}"]`).click();
    assert.deepEqual(await saved(game.second), expected, 'Remove acts on the freshly saved tracker');
    assert.equal(await game.second.locator('#tracked-count').textContent(), '1');
    receipts.push({ case:'stale-remove-unrelated', expected });
  } finally { await game.context.close(); }
});

test('a return changed since it was displayed must be reviewed before a new Remove attempt', async () => {
  const game = await setup();
  try {
    await draft(game.second, 'PRESERVE-MY-DRAFT');
    const paste = await game.second.locator('#paste').inputValue();
    await edit(game.first, game.initial[0].id, 'CORRECTED-ELSEWHERE');
    const expected = await saved(game.first);
    await game.second.locator(`[data-del="${game.initial[0].id}"]`).click();
    assert.deepEqual(await saved(game.second), expected, 'a stale Remove cannot erase an unreviewed correction');
    assert.match(await game.second.locator('#storage-error').textContent(), /changed|review/i);
    assert.match(await game.second.locator('#list').textContent(), /CORRECTED-ELSEWHERE/);
    assert.equal(await game.second.locator('#paste').inputValue(), paste);
    assert.equal(await game.second.locator('#preview [name=orderNo]').inputValue(), 'PRESERVE-MY-DRAFT');
    assert.equal(await game.second.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await game.second.screenshot({ path:resolve(output,'changed-return-phone.png'), fullPage:true });
    await game.second.locator(`[data-del="${game.initial[0].id}"]`).click();
    assert.deepEqual(await saved(game.second), [], 'the newly displayed correction can be deliberately removed');
    receipts.push({ case:'changed-target-review', protected_order:expected[0], draft_preserved:true });
  } finally { await game.context.close(); }
});

test('an unreadable latest tracker blocks a new save and retains its draft through loading retry', async () => {
  const game = await setup();
  try {
    await draft(game.second, 'LOCAL-RETRY');
    await add(game.first, 'REMOTE-KEEP');
    const expected = await saved(game.first);
    await game.second.evaluate(key => {
      const get=Storage.prototype.getItem;
      window.refuseLatestRead=true;
      Storage.prototype.getItem=function(name) { if(name===key && window.refuseLatestRead) throw new DOMException('receiving read refusal','SecurityError'); return get.call(this,name); };
    }, key);
    await game.second.locator('#preview button[type=submit]').click();
    assert.deepEqual(await saved(game.first), expected, 'failed current-state read must not become permission to overwrite it');
    assert.equal(await game.second.locator('#preview [name=orderNo]').inputValue(), 'LOCAL-RETRY');
    assert.equal(await game.second.locator('#storage-retry').isVisible(), true);
    await game.second.evaluate(() => { window.refuseLatestRead=false; });
    await game.second.locator('#storage-retry').click();
    assert.equal(await game.second.locator('#preview [name=orderNo]').inputValue(), 'LOCAL-RETRY');
    await game.second.locator('#preview button[type=submit]').click();
    const after = await saved(game.second);
    assert.deepEqual(after.slice(0,2), expected);
    assert.equal(after[2].orderNo, 'LOCAL-RETRY');
    receipts.push({ case:'read-refusal-retry', preserved:expected, after });
  } finally { await game.context.close(); }
});

test('retrying a failed new-order write rereads additions made after the failed attempt', async () => {
  const game = await setup();
  try {
    await draft(game.second, 'LOCAL-RETRY');
    await add(game.first, 'REMOTE-ONE');
    const before=await saved(game.first);
    await game.second.evaluate(key => {
      const set=Storage.prototype.setItem;
      window.refuseLatestWrite=true;
      Storage.prototype.setItem=function(name,value) { if(name===key && window.refuseLatestWrite) throw new DOMException('receiving quota refusal','QuotaExceededError'); return set.call(this,name,value); };
    }, key);
    await game.second.locator('#preview button[type=submit]').click();
    assert.deepEqual(await saved(game.first), before);
    assert.equal(await game.second.locator('#preview [name=orderNo]').inputValue(), 'LOCAL-RETRY');
    await add(game.first, 'REMOTE-TWO');
    const expected=await saved(game.first);
    await game.second.evaluate(() => { window.refuseLatestWrite=false; });
    await game.second.locator('#preview button[type=submit]').click();
    const after=await saved(game.second);
    assert.equal(after.length, 4, 'retry must preserve orders saved while the write was unavailable');
    assert.deepEqual(after.slice(0,3),expected);
    assert.equal(after[3].orderNo,'LOCAL-RETRY');
    assert.equal(after.filter(order=>order.orderNo==='LOCAL-RETRY').length,1);
    receipts.push({ case:'write-refusal-reread', preserved:expected, after });
  } finally { await game.context.close(); }
});
