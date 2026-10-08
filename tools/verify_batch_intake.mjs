import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = path.resolve(process.argv[2] ?? '.');
const out = path.resolve(process.argv[3] ?? '');
const chromePath = process.env.CHROME_PATH;
if (!process.argv[3] || !chromePath) throw new Error('Usage: CHROME_PATH=/path/to/chromium node tools/verify_batch_intake.mjs <checkout> <new-evidence-directory> [baseline-dist]');
fs.mkdirSync(out, { recursive: false });
fs.mkdirSync(path.join(out, 'fixtures'));
fs.mkdirSync(path.join(out, 'profile'));
const baselineDist = process.argv[4] ? path.resolve(process.argv[4]) : null;
const hash = data => createHash('sha256').update(data).digest('hex');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const receipt = {
  schema: 'returnby.batch-intake-browser.v1', startedAt: new Date().toISOString(),
  receiverSha256: hash(fs.readFileSync(new URL(import.meta.url))), chromePath,
  fixtureKind: 'Fictional local confirmations and saved orders only',
  source: [], build: [], groups: [], pageErrors: [], consoleErrors: [], externalRequests: [],
  artifacts: [], observations: {}, failure: null,
};
const git = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' });
assert.equal(git.status, 0, git.stderr);
receipt.source = [...new Set(git.stdout.split('\0').filter(Boolean))].sort().map(name => ({
  path: name, sha256: hash(fs.readFileSync(path.join(root, name))),
}));
function filesBelow(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? filesBelow(path.join(directory, entry.name), prefix + entry.name + '/')
    : [{ path: prefix + entry.name, sha256: hash(fs.readFileSync(path.join(directory, entry.name))) }]);
}
receipt.build = filesBelow(path.join(root, 'dist'));
if (baselineDist) receipt.baselineBuild = filesBelow(baselineDist);
const writeReceipt = () => fs.writeFileSync(path.join(out, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
const mark = name => { receipt.groups.push(name); writeReceipt(); console.log(JSON.stringify({ passed: name })); };
const artifact = (name, data) => {
  fs.writeFileSync(path.join(out, name), data);
  receipt.artifacts.push({ path: name, bytes: data.length, sha256: hash(data) });
};
const email = 'From: Contoso\nOrder #ABC-1234\nOrder date: October 3, 2026\nTotal: $34.50';
const secondEmail = 'From: Paper & Pine <local>\nOrder #PP-1234\nOrder date: October 4, 2026\nTotal: €18.20';
const baseOrder = {
  id: 'old-saved', merchant: 'Old Shop', orderNo: 'OLD-1', total: '€12,50',
  orderDate: '2026-09-01', windowDays: 30, windowSource: 'user',
  createdAt: '2026-09-02T08:00:00.000Z', completedAt: '2026-09-10T12:00:00.000Z',
  extra: { untouched: ['Keep this', 4, null], nested: { on: true } },
};
const fixture = (name, text) => {
  const filename = path.join(out, 'fixtures', name);
  fs.writeFileSync(filename, text);
  return filename;
};
const aFile = fixture('first.txt', email);
const bFile = fixture('second.txt', secondEmail);
const heldFile = fixture('held.txt', 'Unparsed confirmation. Keep this raw note for later review.');
const badFile = fixture('invalid-utf8.txt', Buffer.from([0xff, 0xfe, 0xff]));
const largeFile = fixture('too-large.txt', 'x'.repeat(102401));

class CDP {
  constructor(url) {
    this.next = 1;
    this.pending = new Map();
    this.listeners = [];
    this.socket = new WebSocket(url);
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const request = this.pending.get(message.id);
        if (request) {
          clearTimeout(request.timer);
          this.pending.delete(message.id);
          if (message.error) request.reject(new Error(JSON.stringify(message.error)));
          else request.resolve(message.result);
        }
      } else for (const listener of this.listeners) listener(message);
    });
  }
  async send(method, params = {}, sessionId) {
    await this.ready;
    const id = this.next++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('CDP timeout: ' + method));
      }, 25000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  close() { this.socket.close(); }
}

let server, browser, cdp, origin, currentGroup = 'launch';
const browserLogs = [];
let activeDist = path.join(root, 'dist');
async function openPage(relative = 'batch-intake.html', width = 1440, height = 1000) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (method, params) => cdp.send(method, params, sessionId);
  const page = { targetId, sessionId, send, acceptDialog: false };
  cdp.listeners.push(message => {
    if (message.sessionId !== sessionId) return;
    if (message.method === 'Runtime.exceptionThrown') receipt.pageErrors.push(message.params.exceptionDetails.text + ' ' + (message.params.exceptionDetails.exception?.description ?? ''));
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') receipt.consoleErrors.push(message.params.args.map(arg => arg.value ?? arg.description).join(' '));
    if (message.method === 'Network.requestWillBeSent') {
      const url = message.params.request.url;
      if (!url.startsWith(origin) && !url.startsWith('data:') && url !== 'about:blank') receipt.externalRequests.push(url);
    }
    if (message.method === 'Page.javascriptDialogOpening' && page.acceptDialog) {
      send('Page.handleJavaScriptDialog', { accept: true }).catch(error => { receipt.pageErrors.push(String(error)); });
    }
  });
  page.evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  };
  page.wait = async expression => {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      if (await page.evaluate(expression)) return;
      await pause(60);
    }
    throw new Error('Browser condition did not become true: ' + expression);
  };
  page.fill = async (selector, value) => page.evaluate('(() => { const e=document.querySelector(' + JSON.stringify(selector) + '); if(!e)throw new Error("Missing field"); e.focus(); e.value=' + JSON.stringify(value) + '; e.dispatchEvent(new Event("input",{bubbles:true})); })()');
  page.click = async selector => {
    const box = await page.evaluate('(() => { const e=document.querySelector(' + JSON.stringify(selector) + '); if(!e||e.disabled)throw new Error("Missing or disabled click target"); e.scrollIntoView({block:"center"}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()');
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1, ...box });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1, ...box });
  };
  page.key = async (key, code, keyCode) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode });
  };
  page.selectFiles = async filenames => {
    const { root: dom } = await send('DOM.getDocument', { depth: 0 });
    const { nodeId } = await send('DOM.querySelector', { nodeId: dom.nodeId, selector: '#batch-files' });
    await send('DOM.setFileInputFiles', { nodeId, files: filenames });
  };
  page.capture = async name => {
    const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    artifact(name, Buffer.from(result.data, 'base64'));
  };
  page.close = () => cdp.send('Target.closeTarget', { targetId });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: origin + relative });
  await page.wait('document.readyState === "complete"');
  return page;
}
const saved = page => page.evaluate('localStorage.getItem("returnby.v1")');
async function seed(page, records = [baseOrder]) {
  await page.evaluate('localStorage.setItem("returnby.v1",' + JSON.stringify(JSON.stringify(records)) + ')');
}
async function pasteOne(page, text = email) {
  await page.fill('#batch-paste', text);
  await page.click('#batch-add');
  await page.wait('document.querySelectorAll(".batch-card").length>0');
}
const card = (index, field) => '.batch-card:nth-child(' + index + ') ' + field;
async function reviewOne(page, index = 1) {
  await page.click(card(index, '[data-reviewed]'));
  assert.equal(await page.evaluate('document.querySelector(' + JSON.stringify(card(index, '[data-reviewed]')) + ').checked'), true);
}

try {
  server = http.createServer((request, response) => {
    try {
      const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
      const filename = path.resolve(activeDist, relative);
      if (!filename.startsWith(activeDist + path.sep)) { response.writeHead(403); response.end(); return; }
      const data = fs.readFileSync(filename);
      response.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' })[path.extname(filename)] || 'application/octet-stream');
      response.end(data);
    } catch { response.writeHead(404); response.end('Not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = 'http://127.0.0.1:' + server.address().port + '/';
  browser = spawn(chromePath, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--disable-background-networking', '--disable-component-update', '--disable-sync',
    '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0',
    '--user-data-dir=' + path.join(out, 'profile'), 'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  let socketUrl;
  browser.stdout.on('data', data => browserLogs.push(data.toString()));
  browser.stderr.on('data', data => {
    const text = data.toString();
    browserLogs.push(text);
    const match = text.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (match) socketUrl = match[1];
  });
  const deadline = Date.now() + 45000;
  while (!socketUrl && Date.now() < deadline && browser.exitCode === null) await pause(100);
  if (!socketUrl) throw new Error('Private Chromium did not expose a DevTools endpoint: ' + browserLogs.join('').slice(-4000));
  cdp = new CDP(socketUrl);
  await cdp.ready;
  receipt.browser = await cdp.send('Browser.getVersion');
  if (baselineDist) {
    currentGroup = 'baseline';
    activeDist = baselineDist;
    const old = await openPage('index.html');
    assert.equal(await old.evaluate('Array.from(document.links).filter(a=>a.getAttribute("href")==="./batch-intake.html").length'), 0);
    await old.evaluate('localStorage.clear()');
    await old.fill('#paste', email);
    await old.click('#find');
    assert.equal(await old.evaluate('document.querySelector("#preview [name=merchant]").value'), 'Contoso');
    await old.click('#preview button[type=submit]');
    assert.equal(JSON.parse(await saved(old)).length, 1);
    receipt.observations.baseline = { batchEntryAbsent: true, ordinaryReviewSavePassed: true };
    await old.capture('baseline-original-tracker.png');
    await old.close();
    activeDist = path.join(root, 'dist');
    mark('Original production page has no batch entry; ordinary review/save works');
  }

  currentGroup = 'files-and-selected-save';
  const p = await openPage();
  await seed(p);
  await p.evaluate('window.__writes=0; const original=Storage.prototype.setItem; Storage.prototype.setItem=function(k,v){if(k==="returnby.v1")window.__writes++;return original.call(this,k,v)};');
  await p.selectFiles([aFile, bFile, heldFile]);
  await p.wait('document.querySelectorAll(".batch-card").length===3');
  assert.equal(await p.evaluate('document.querySelectorAll("[data-reviewed]:checked").length'), 0);
  await p.fill(card(1, '[data-field=merchant]'), 'Changed & <Shop>');
  await p.fill(card(1, '[data-field=total]'), '$44.70');
  await p.fill(card(1, '[data-field=windowDays]'), '45');
  await reviewOne(p, 1);
  await reviewOne(p, 2);
  await p.click('#batch-preview');
  assert.equal(await p.evaluate('document.querySelectorAll(".batch-final-order").length'), 2);
  assert.equal(await p.evaluate('document.querySelector("#batch-final-orders").textContent.includes("Changed & <Shop>")'), true);
  assert.equal(await p.evaluate('document.querySelector("#batch-final-orders shop")'), null);
  assert.equal(await p.evaluate('window.__writes'), 0);
  await p.capture('desktop-final-review.png');
  await p.click('#batch-save');
  await p.wait('!document.querySelector("#batch-success").hidden');
  const added = JSON.parse(await saved(p));
  assert.equal(added.length, 3);
  assert.deepEqual(added[0], baseOrder);
  assert.equal(added[1].merchant, 'Changed & <Shop>');
  assert.equal(added[1].total, '$44.70');
  assert.equal(added[1].windowDays, 45);
  assert.equal(added[1].windowSource, 'user');
  assert.equal(added[2].merchant, 'Paper & Pine <local>');
  assert.equal(new Set(added.map(order => order.id)).size, 3);
  assert.equal('text' in added[1], false);
  assert.equal('label' in added[1], false);
  assert.equal(await p.evaluate('window.__writes'), 1);
  assert.equal(await p.evaluate('document.querySelectorAll(".batch-card").length'), 1);
  assert.equal(await p.evaluate('document.querySelector(".batch-card pre").textContent'), 'Unparsed confirmation. Keep this raw note for later review.');
  artifact('selected-append.json', Buffer.from(await saved(p)));
  const tracker = await openPage('index.html');
  assert.equal(await tracker.evaluate('document.querySelectorAll("#list .card").length'), 3);
  assert.equal(await tracker.evaluate('document.querySelector("#list").textContent.includes("2026-11-17")'), true);
  await tracker.close();
  await p.close();
  mark('Real local file selection, corrections, one selected append, exact prior fields and ordinary tracker receiving');

  currentGroup = 'duplicates-and-keyboard';
  const duplicate = await openPage();
  await seed(duplicate, [{ ...baseOrder, merchant: ' contoso ', orderNo: 'abc-1234' }]);
  await duplicate.selectFiles([aFile, aFile]);
  await duplicate.wait('document.querySelectorAll(".batch-card").length===2');
  await reviewOne(duplicate, 1);
  await reviewOne(duplicate, 2);
  await duplicate.click('#batch-preview');
  assert.equal(await duplicate.evaluate('document.querySelectorAll("#batch-duplicate-list li").length'), 2);
  assert.equal(await duplicate.evaluate('document.querySelector("#batch-save").disabled'), true);
  await duplicate.evaluate('document.querySelector("#batch-duplicate-ack").focus()');
  await duplicate.key(' ', 'Space', 32);
  assert.equal(await duplicate.evaluate('document.querySelector("#batch-duplicate-ack").checked'), true);
  assert.equal(await duplicate.evaluate('document.querySelector("#batch-save").disabled'), false);
  await duplicate.click('#batch-save');
  assert.equal(JSON.parse(await saved(duplicate)).length, 3);
  await duplicate.close();
  mark('Possible duplicate matches require an actual keyboard acknowledgement and never silently drop rows');

  currentGroup = 'second-tab-freshness';
  const stale = await openPage();
  await seed(stale);
  await pasteOne(stale);
  await reviewOne(stale);
  await stale.click('#batch-preview');
  const other = await openPage('index.html');
  await other.fill('#paste', 'From: Other Local Shop\nOrder #NEW-7788\nOrder date: October 5, 2026\nTotal: $18.00');
  await other.click('#find');
  await other.click('#preview button[type=submit]');
  const newer = await saved(other);
  assert.equal(JSON.parse(newer).length, 2);
  await stale.click('#batch-save');
  assert.match(await stale.evaluate('document.querySelector("#batch-error").textContent'), /changed after this preview/);
  assert.equal(await saved(stale), newer);
  assert.equal(await stale.evaluate('document.querySelectorAll(".batch-card").length'), 1);
  await stale.click('#batch-preview');
  await stale.click('#batch-save');
  const refreshed = JSON.parse(await saved(stale));
  assert.equal(refreshed.length, 3);
  assert.deepEqual(refreshed.slice(0, 2), JSON.parse(newer));
  artifact('second-tab-refreshed-append.json', Buffer.from(await saved(stale)));
  await other.close();
  await stale.close();
  mark('Actual second tracker tab changes are refused by the old preview and retained after fresh review');

  currentGroup = 'controlled-storage-refusals';
  const retry = await openPage();
  await seed(retry);
  await pasteOne(retry);
  await retry.fill(card(1, '[data-field=total]'), '$71.10 exact correction');
  await reviewOne(retry);
  const before = await saved(retry);
  await retry.evaluate('window.__realGet=Storage.prototype.getItem; Storage.prototype.getItem=function(k){if(k==="returnby.v1")throw new Error("controlled read refusal");return window.__realGet.call(this,k)}');
  await retry.click('#batch-preview');
  assert.match(await retry.evaluate('document.querySelector("#batch-error").textContent'), /could not be read/);
  assert.equal(await retry.evaluate('document.querySelectorAll("[data-reviewed]:checked").length'), 1);
  await retry.evaluate('Storage.prototype.getItem=window.__realGet');
  assert.equal(await saved(retry), before);
  await retry.click('#batch-preview');
  await retry.evaluate('window.__realSet=Storage.prototype.setItem; Storage.prototype.setItem=function(k,v){if(k==="returnby.v1"){window.__attempt=v;throw new Error("controlled quota refusal")}return window.__realSet.call(this,k,v)}');
  await retry.click('#batch-save');
  assert.match(await retry.evaluate('document.querySelector("#batch-error").textContent'), /could not be saved/);
  assert.equal(await saved(retry), before);
  assert.equal(await retry.evaluate('document.querySelector("#batch-final").hidden'), false);
  const attempted = await retry.evaluate('window.__attempt');
  await retry.evaluate('Storage.prototype.setItem=window.__realSet');
  await retry.click('#batch-save');
  assert.equal(await saved(retry), attempted);
  assert.equal(JSON.parse(attempted)[1].total, '$71.10 exact correction');
  await retry.close();
  mark('Controlled browser read/write refusals retain corrections and exact preview IDs/timestamps through retry');

  currentGroup = 'invalid-file-group-and-late-read';
  const invalid = await openPage();
  await seed(invalid);
  await pasteOne(invalid);
  await invalid.fill(card(1, '[data-field=total]'), 'Keep this correction');
  const invalidBefore = await saved(invalid);
  await invalid.selectFiles([bFile, badFile]);
  await invalid.wait('!document.querySelector("#batch-error").hidden && !document.querySelector("#batch-files").disabled');
  assert.equal(await invalid.evaluate('document.querySelectorAll(".batch-card").length'), 1);
  assert.equal(await invalid.evaluate('document.querySelector("[data-field=total]").value'), 'Keep this correction');
  assert.equal(await saved(invalid), invalidBefore);
  await invalid.selectFiles([largeFile]);
  await invalid.wait('document.querySelector("#batch-error").textContent.includes("100 KiB")');
  assert.equal(await invalid.evaluate('document.querySelectorAll(".batch-card").length'), 1);
  await invalid.evaluate('window.__realArrayBuffer=File.prototype.arrayBuffer; File.prototype.arrayBuffer=function(){return new Promise(resolve=>{window.__releaseFile=()=>resolve(new TextEncoder().encode("'+email.replaceAll('\n','\\n')+'").buffer)})}');
  await invalid.selectFiles([bFile]);
  await invalid.wait('typeof window.__releaseFile==="function"');
  invalid.acceptDialog = true;
  await invalid.click('#batch-discard');
  await invalid.wait('document.querySelectorAll(".batch-card").length===0');
  await invalid.evaluate('window.__releaseFile(); File.prototype.arrayBuffer=window.__realArrayBuffer');
  await invalid.evaluate('new Promise(resolve=>setTimeout(resolve,100))');
  assert.equal(await invalid.evaluate('document.querySelectorAll(".batch-card").length'), 0);
  assert.equal(await saved(invalid), invalidBefore);
  await invalid.close();
  mark('Unreadable or oversize selected files preserve existing work; late file completion cannot revive a discarded batch');

  currentGroup = 'edit-invalidation-and-phone';
  const phone = await openPage('batch-intake.html', 390, 844);
  await seed(phone, []);
  await pasteOne(phone);
  await reviewOne(phone);
  await phone.click('#batch-preview');
  await phone.fill(card(1, '[data-field=total]'), '£99.00');
  assert.equal(await phone.evaluate('document.querySelector("#batch-final").hidden'), true);
  assert.equal(await phone.evaluate('document.querySelector("[data-reviewed]").checked'), false);
  assert.equal(await phone.evaluate('document.activeElement.dataset.field'), 'total');
  await phone.evaluate('document.querySelector("[data-reviewed]").focus()');
  await phone.key(' ', 'Space', 32);
  assert.equal(await phone.evaluate('document.querySelector("[data-reviewed]").checked'), true);
  await phone.key('Tab', 'Tab', 9);
  assert.equal(await phone.evaluate('document.activeElement.id'), 'batch-preview');
  await phone.key('Enter', 'Enter', 13);
  await phone.wait('!document.querySelector("#batch-final").hidden');
  assert.equal(await phone.evaluate('document.activeElement.id'), 'batch-final-title');
  assert.equal(await phone.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
  await phone.capture('phone-final-review.png');
  await phone.evaluate('window.scrollTo(0,0)');
  await phone.capture('phone-intake.png');
  await phone.click('#batch-save');
  assert.equal(JSON.parse(await saved(phone))[0].total, '£99.00');
  assert.equal(await phone.evaluate('document.activeElement.id'), 'batch-success');
  await phone.close();
  mark('Edits retire approval without losing field focus; narrow layout and keyboard review/save remain usable');

  assert.deepEqual(receipt.pageErrors, []);
  assert.deepEqual(receipt.consoleErrors, []);
  assert.deepEqual(receipt.externalRequests, []);
  const after = receipt.source.map(item => ({ ...item, actual: hash(fs.readFileSync(path.join(root, item.path))) }));
  assert.ok(after.every(item => item.sha256 === item.actual), 'Source changed during browser receiving');
  receipt.sourceUnchanged = true;
  receipt.completedAt = new Date().toISOString();
  receipt.result = 'passed';
} catch (error) {
  receipt.failure = { group: currentGroup, message: error.message, stack: error.stack };
  receipt.result = 'failed';
  process.exitCode = 1;
} finally {
  artifact('chromium.log', Buffer.from(browserLogs.join('')));
  writeReceipt();
  if (cdp) { try { await cdp.send('Browser.close'); } catch {} cdp.close(); }
  if (browser && browser.exitCode === null) browser.kill('SIGTERM');
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  console.log(JSON.stringify({ result: receipt.result, groups: receipt.groups.length, failure: receipt.failure }));
}
