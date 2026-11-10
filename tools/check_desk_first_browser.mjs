import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

// End-to-end test against the compiled app, never a simulated view.
const { chromium } = await import(process.env.RETURNBY_PLAYWRIGHT || 'playwright');
const root = resolve(process.env.RETURNBY_BUILD || 'dist');
const media = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + sep)) return void response.writeHead(403).end();
  try { response.writeHead(200, { 'content-type': media[extname(file)] || 'application/octet-stream' }).end(await readFile(file)); }
  catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = 'http://127.0.0.1:' + server.address().port;
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.RETURNBY_CHROME ? { executablePath: process.env.RETURNBY_CHROME } : {}) });
  for (const viewport of [{width:1440,height:900},{width:390,height:844}]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [], external = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('request', req => { if (new URL(req.url()).origin !== origin) external.push(req.url()); });
    try {
      await page.goto(origin, { waitUntil: 'networkidle' });
      assert.equal(await page.locator('h1').textContent(), 'Return deadlines');
      assert.equal(await page.locator('.hero').count(), 0, 'promotional hero must not precede the workbench');
      const paste = await page.locator('#paste').boundingBox();
      assert(paste && paste.y >= 0 && paste.y < viewport.height, 'intake needs to start within first viewport');
      if (viewport.width > 900) {
        const tracked = await page.locator('#tracked-count').boundingBox();
        assert(tracked && tracked.y < viewport.height, 'saved tracker must be visible on desktop');
      }
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      assert(width <= viewport.width + 1, 'horizontal overflow at ' + viewport.width + ': ' + width);
      await page.locator('#sample').click();
      assert(await page.locator('#preview').isVisible(), 'fictional sample opens editable review');
      for (const [name, value] of Object.entries({
        merchant: 'Fictional Test Store', orderNo: 'DESK-FIRST-001',
        orderDate: '2026-11-01', windowDays: '30', total: '$12.00',
      })) await page.locator('#preview [name=' + name + ']').fill(value);
      await page.locator('#preview button[type=submit]').click();
      assert.equal(await page.locator('#tracked-count').textContent(), '1');
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await page.locator('#tracked-count').textContent(), '1', 'return should survive reload');
      assert.deepEqual(errors, [], 'no browser runtime errors');
      assert.deepEqual(external, [], 'no external requests for private order details');
      console.log('PASS ' + viewport.width + 'x' + viewport.height + ': intake, sample review, saved tracker, reload, no overflow');
    } finally {
      await context.close();
    }
  }
} finally {
  await browser?.close();
  await new Promise(done => server.close(done));
}

