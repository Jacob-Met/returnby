import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
const { chromium } = await import(process.env.RETURNBY_PLAYWRIGHT || 'playwright');

const port = 4183;
const base = process.env.RETURNBY_BASE_URL || 'http://127.0.0.1:' + port + '/';
const server = process.env.RETURNBY_BASE_URL ? null
  : spawn('node', ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
const browser = await chromium.launch({ headless: true, executablePath: process.env.RETURNBY_CHROME || '/usr/local/bin/google-chrome', args: ['--no-sandbox'] });
const contexts = [];
const unexpected = [];
async function open(path = '', width = 390, height = 844) {
  const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true });
  contexts.push(context);
  const page = await context.newPage();
  page.on('pageerror', error => unexpected.push(error.message));
  await page.goto(base + path, { waitUntil: 'networkidle' });
  return page;
}
try {
  for (let n = 0; n < 80; n++) {
    try { if ((await fetch(base)).ok) break; }
    catch {}
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  const page = await open('', 1440, 900);
  await page.locator('#paste').fill('From: Invented Harbor Shop\nOrder number: COUNTER-711\nOrder placed on October 1, 2026\nTotal: $39.20');
  await page.locator('#find').click();
  for (const [name, value] of Object.entries({ merchant: 'Invented Harbor Shop', orderNo: 'COUNTER-711', orderDate: '2026-10-01', total: '$39.20', windowDays: '45' }))
    await page.locator('#preview [name=' + name + ']').fill(value);
  await page.locator('#preview button[type=submit]').click();
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 1000;
    const context = canvas.getContext('2d');
    context.fillStyle = '#f5f1e6'; context.fillRect(0, 0, 600, 1000);
    context.fillStyle = '#292b28'; context.font = 'bold 39px sans-serif';
    context.fillText('HARBOR SHOP', 65, 92);
    context.font = '24px monospace'; context.fillText('COUNTER-711', 65, 155);
    context.fillText('DATE 2026-10-01', 65, 203);
    context.fillText('ORIGINAL PAPER RECEIPT', 65, 303);
    context.fillText('TOTAL    $39.20', 65, 395);
    context.strokeStyle = '#454545';
    for (let n = 0; n < 90; n++) {
      const x = 75 + n * 5;
      context.lineWidth = n % 3 ? 2 : 4;
      context.beginPath(); context.moveTo(x, 720); context.lineTo(x, 800); context.stroke();
    }
    return canvas.toDataURL('image/png');
  });
  await page.locator('button[data-receipt]').first().click();
  await page.locator('.receipt-proof-input input').setInputFiles({
    name: 'fictitious-paper-receipt.png', mimeType: 'image/png', buffer: Buffer.from(png.split(',')[1], 'base64'),
  });
  await page.waitForFunction(() => document.querySelector('.receipt-proof-message')?.textContent?.includes('Original photo saved'));
  await page.locator('.receipt-proof-dialog [data-proof=rotate]').click();
  await page.locator('.receipt-proof-dialog .receipt-proof-close').click();

  const trip = await page.context().newPage();
  await trip.goto(base + 'trip-checklist.html', { waitUntil: 'networkidle' });
  const selector = trip.locator('#order-options input[type=checkbox]').first();
  if (!(await selector.isChecked())) await selector.check();
  await trip.locator('#preview-trip').click();
  const image = trip.locator('#checklist-preview .sheet-receipt img');
  await image.waitFor({ state: 'visible', timeout: 5000 }).catch(async () => {
    console.log('TRIP DEBUG:', JSON.stringify({
      notice: await trip.locator('#trip-notice').innerText(),
      previewHidden: await trip.locator('#checklist-preview').isHidden(),
      count: await trip.locator('#checklist-preview .sheet-receipt img').count(),
      buttonDisabled: await trip.locator('#preview-trip').isDisabled(),
      read: await trip.locator('#read-message').innerText(),
      sheetText: (await trip.locator('#checklist-preview').innerText()).slice(0,350),
    }));
    throw new Error('trip preview did not include receipt');
  });
  assert.equal(await image.count(), 1);
  const dimensions = await image.evaluate(el => [el.naturalWidth, el.naturalHeight]);
  assert(dimensions[0] > dimensions[1], 'saved quarter-turn rotation must appear in the printable proof');
  assert.match(await trip.locator('#trip-notice').innerText(), /original paper receipt/);
  assert.equal(await trip.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const expected = trip.waitForEvent('download');
  await trip.locator('#download-checklist').click();
  const file = await expected;
  const offlineFile = '/tmp/gpt6-p7n4-portable-trip.html';
  await file.saveAs(offlineFile);
  const content = await readFile(offlineFile, 'utf8');
  assert.match(content, /^<!doctype html>/i);
  assert(content.includes('data:image/jpeg;base64,'));
  assert(content.includes('COUNTER-711'));
  assert(!content.includes(base + 'receipt'), 'saved image must not refer to running app');
  assert.match(file.suggestedFilename(), /^returnby-trip-2026-\d\d-\d\d\.html$/);
  const offline = await browser.newContext({ viewport: { width: 390, height: 844 } });
  contexts.push(offline);
  const opened = await offline.newPage();
  opened.on('request', request => {
    if (request.url().startsWith('http')) unexpected.push('Offline file called ' + request.url());
  });
  await opened.goto('file://' + offlineFile, { waitUntil: 'load' });
  const offlineImage = opened.locator('.sheet-receipt img');
  await offlineImage.waitFor({ state: 'visible' });
  const offlineDimensions = await offlineImage.evaluate(el => [el.naturalWidth, el.naturalHeight, el.complete]);
  assert.deepEqual(offlineDimensions, [...dimensions, true]);
  assert.equal(await opened.locator('#original-receipts').count(), 1);
  await opened.locator('#original-receipts').screenshot({ path: '/tmp/gpt6-p7n4-portable-receipt-phone.png' });
  await opened.setViewportSize({ width: 1440, height: 900 });
  await opened.locator('#original-receipts').screenshot({ path: '/tmp/gpt6-p7n4-portable-receipt-desktop.png' });
  // A browser without readable photo storage still gets a usable paper-free sheet,
  // with a clear warning instead of a silent missing receipt.
  const noPhoto = await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
  contexts.push(noPhoto);
  await noPhoto.addInitScript(() => Object.defineProperty(window, 'indexedDB', {get(){throw new Error('blocked photo database');}}));
  const blocked = await noPhoto.newPage();
  await blocked.goto(base, { waitUntil:'networkidle' });
  const savedOrders = await page.evaluate(() => localStorage.getItem('returnby.v1'));
  await blocked.evaluate(value => localStorage.setItem('returnby.v1', value), savedOrders);
  await blocked.goto(base + 'trip-checklist.html', {waitUntil:'networkidle'});
  await blocked.locator('#order-options input[type=checkbox]').first().check();
  await blocked.locator('#preview-trip').click();
  await blocked.waitForFunction(() => document.querySelector('#trip-notice')?.textContent?.includes('Saved photo storage could not be read'));
  assert(await blocked.locator('#download-checklist').isEnabled());
  assert.equal(await blocked.locator('.sheet-receipt').count(),0);
  const paperlessDownload = blocked.waitForEvent('download');
  await blocked.locator('#download-checklist').click();
  assert(!(await readFile(await (await paperlessDownload).path(), 'utf8')).includes('data:image/jpeg;base64,'));
  assert.deepEqual(unexpected, []);
  console.log(JSON.stringify({savedOriginalOpenedWithoutApp: true, rotatedDimensions: offlineDimensions, singleReceipt: true, localOnly: true, bytes: content.length, errorCount: unexpected.length}, null, 2));
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
  server?.kill('SIGTERM');
}
