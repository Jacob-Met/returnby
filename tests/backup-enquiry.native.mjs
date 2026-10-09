/** Native node:test qualification; synthetic saved backups, never a real shopper. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { inspectBackupEnquiry, prepareBackupEnquiry } from '../tools/backup_enquiry_model.mjs';

const cli = fileURLToPath(new URL('../tools/backup_enquiry.mjs', import.meta.url));
const root = process.env.RETURNBY_AUTHOR_FIXTURES;
if (!root || existsSync(root)) throw new Error('Choose an absent owned fixture directory.');
mkdirSync(root);
const logs = join(root, '_logs'); mkdirSync(logs);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = object => Buffer.from(JSON.stringify(object), 'utf8');
const saved = {
  id: 'open-A', merchant: 'Shop 名 <literal>', orderNo: 'Ref-7', total: 'EUR 42 & pending',
  orderDate: '2026-10-01', windowDays: 30, windowSource: 'user',
  createdAt: '2026-10-02T00:00:00.000Z',
};
const completed = { ...saved, id: 'closed-B', completedAt: '2026-10-08T01:02:03.000Z' };
const backup = (rows = [saved], version = 1) => json({
  schema: 'returnby.backup', version, exportedAt: '2026-10-09T00:00:00.000Z', orders: rows,
});
const details = (request = 'instructions', extra = {}) => json({
  schema: 'returnby.enquiry-details', version: 1, request,
  items: 'Shoes\r\nSize 40', reason: 'Unworn & unused', signature: 'Alex', ...extra,
});
const selected = bytes => ({ expectedSha256: hash(bytes), orderId: 'open-A' });
const file = (name, bytes) => { const path = join(root, name); writeFileSync(path, bytes, { flag: 'wx' }); return path; };
const input = file('backup.json', backup());
const detailPath = file('details.json', details());
let sequence = 0;
const children = [];
function record(label, result, rawStdout = true) {
  const id = String(++sequence).padStart(3, '0');
  const stdoutPath = join(logs, id + '.stdout.bin'), stderrPath = join(logs, id + '.stderr.bin');
  writeFileSync(stdoutPath, result.stdout || Buffer.alloc(0), { flag: 'wx' });
  writeFileSync(stderrPath, result.stderr || Buffer.alloc(0), { flag: 'wx' });
  const row = {
    label, pid: result.pid, actual_exit: result.status,
    signal: result.signal ?? null, timeout_or_spawn_error: result.error ? String(result.error) : null,
    stdout_observation: rawStdout ? 'complete captured raw bytes' : 'read end closed before child delivery; no stdout capture',
    stdout: { path: stdoutPath, bytes: (result.stdout || Buffer.alloc(0)).length, sha256: hash(result.stdout || Buffer.alloc(0)) },
    stderr: { path: stderrPath, bytes: (result.stderr || Buffer.alloc(0)).length, sha256: hash(result.stderr || Buffer.alloc(0)) },
  };
  writeFileSync(join(logs, id + '.json'), JSON.stringify(row) + '\n', { flag: 'wx' });
  children.push(row);
  assert.equal(row.timeout_or_spawn_error, null);
  assert.equal(row.signal, null);
  return result;
}
function run(label, args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root, encoding: null, timeout: 20_000, maxBuffer: 1024 * 1024, windowsHide: true,
  });
  return record(label, result);
}
function asynchronous(label, args, closeStdout = false) {
  const child = spawn(process.execPath, [cli, ...args], {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  const stdout = [], stderr = [];
  let size = 0, error;
  if (closeStdout) child.stdout.destroy();
  else child.stdout.on('data', bytes => {
    size += bytes.length;
    if (size > 1024 * 1024) { error = new Error('Owned child output cap exceeded'); child.kill(); }
    else stdout.push(bytes);
  });
  child.stderr.on('data', bytes => {
    size += bytes.length;
    if (size > 1024 * 1024) { error = new Error('Owned child output cap exceeded'); child.kill(); }
    else stderr.push(bytes);
  });
  child.on('error', e => { error = e; });
  return new Promise(resolve => {
    const timer = setTimeout(() => { error = new Error('Owned child deadline'); child.kill(); }, 20_000);
    child.once('close', (status, signal) => {
      clearTimeout(timer);
      resolve(record(label, {
        pid: child.pid, status, signal, error,
        stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr),
      }, !closeStdout));
    });
  });
}
const args = output => ['prepare', '--input', input, '--expected-sha256', hash(backup()),
  '--id', 'open-A', '--details', detailPath, '--output', output];
const plain = draft => Buffer.from(draft.text, 'utf8');
const prepared = () => prepareBackupEnquiry(backup(), selected(backup()), details());
function refused(value) { assert.throws(value, error => error.code === 'RETURNBY_BACKUP_ENQUIRY_REFUSAL'); }

test('synchronous inspection retains complete source order and recorded states', () => {
  const bytes = backup([completed, { ...saved, id: 'open-C', orderNo: undefined, total: undefined }], 2);
  const result = inspectBackupEnquiry(bytes);
  assert.equal(result instanceof Promise, false);
  assert.deepEqual(Object.keys(result), ['schema', 'source', 'backupVersion', 'counts', 'orders']);
  assert.deepEqual(result.source, { bytes: bytes.length, sha256: hash(bytes) });
  assert.deepEqual(result.counts, { total: 2, open: 1, completed: 1 });
  assert.deepEqual(result.orders.map(row => [row.position, row.state, row.order.id]),
    [[1, 'recorded-completed', 'closed-B'], [2, 'recorded-open', 'open-C']]);
  assert.equal(result.orders[1].order.orderNo, '');
  assert.equal(result.orders[1].order.total, '');
  assert.equal(result.orders[0].order.completedAt, completed.completedAt);
  assert(Object.isFrozen(result) && Object.isFrozen(result.source) && Object.isFrozen(result.counts));
  assert(Object.isFrozen(result.orders) && result.orders.every(x => Object.isFrozen(x) && Object.isFrozen(x.order)));
  bytes.fill(0); assert.equal(result.orders[1].order.merchant, saved.merchant);
});

test('all three synchronous drafts use existing question texts and exact formatter framing', () => {
  const requests = {
    instructions: ['Return instructions enquiry', 'Could you confirm whether these items can be returned and how to arrange it?'],
    exchange: ['Exchange options enquiry', 'Could you confirm whether an exchange is possible and what options and steps are available?'],
    eligibility: ['Return eligibility enquiry', 'Could you confirm whether these items are eligible for a return?'],
  };
  for (const [request, [subject, question]] of Object.entries(requests)) {
    const bytes = backup(), d = details(request);
    const value = prepareBackupEnquiry(bytes, selected(bytes), d);
    assert.equal(value instanceof Promise, false);
    assert.deepEqual(Object.keys(value), ['source', 'details', 'orderId', 'request', 'subject', 'body', 'text', 'outputBytes', 'outputSha256']);
    const expected = 'Subject: ' + subject + '\r\n\r\nHello,\r\n\r\nI would like to ask about the following order.\r\n\r\n' +
      'Store: Shop 名 <literal>\r\nOrder number: Ref-7\r\nOrder date: 2026-10-01\r\n\r\n' +
      'Items I am asking about:\r\nShoes\r\nSize 40\r\n\r\nReason or context:\r\nUnworn & unused\r\n\r\n' +
      question + '\r\nPlease include the relevant deadline, any charges, and any packaging or proof-of-purchase requirements.\r\n\r\nThank you,\r\nAlex\r\n';
    assert.equal(value.text, expected);
    assert.equal(value.outputBytes, Buffer.byteLength(expected));
    assert.equal(value.outputSha256, hash(Buffer.from(expected)));
    assert(!value.body.includes(saved.total));
    assert(Object.isFrozen(value) && Object.isFrozen(value.source) && Object.isFrozen(value.details));
  }
});

test('omitted optional fields and empty reason/signature preserve native wording', () => {
  const bytes = backup([{ ...saved, merchant: '', orderNo: undefined, total: undefined }]);
  const value = prepareBackupEnquiry(bytes, selected(bytes), details('exchange', { reason: '', signature: '' }));
  assert(value.text.includes('Store: Not recorded\r\nOrder number: Not recorded\r\n'));
  assert(value.text.endsWith('\r\n\r\nThank you.\r\n'));
  assert(!value.text.includes('Reason or context:'));
});

test('full file admission precedes selected-row filtering, including completed rows', () => {
  for (const rows of [
    [saved, { ...completed, windowDays: 0 }],
    [saved, { ...completed, privateEmail: 'synthetic-for-refusal' }],
    [saved, { ...completed, id: saved.id }],
  ]) {
    const bytes = backup(rows, 2);
    refused(() => prepareBackupEnquiry(bytes, selected(bytes), details()));
    refused(() => inspectBackupEnquiry(bytes));
  }
});

test('unknown/completed IDs, exact hash and selection shape refuse synchronously', () => {
  const bytes = backup([saved, completed], 2);
  for (const selection of [
    { expectedSha256: hash(bytes), orderId: 'OPEN-A' },
    { expectedSha256: hash(bytes), orderId: completed.id },
    { expectedSha256: '0'.repeat(64), orderId: saved.id },
    { expectedSha256: hash(bytes).toUpperCase(), orderId: saved.id },
    { expectedSha256: hash(bytes).slice(1), orderId: saved.id },
    { expectedSha256: hash(bytes), orderId: saved.id, extra: true },
  ]) refused(() => prepareBackupEnquiry(bytes, selection, details()));
});

test('strict UTF8, leading BOM and JSON refusals preserve inherited admission', () => {
  for (const bytes of [Buffer.from([0xff]), Buffer.concat([Buffer.from([0xef,0xbb,0xbf]), backup()]), Buffer.from('{}')]) {
    refused(() => inspectBackupEnquiry(bytes));
    refused(() => prepareBackupEnquiry(bytes, selected(bytes), details()));
  }
  for (const bytes of [Buffer.from([0xff]), Buffer.concat([Buffer.from([0xef,0xbb,0xbf]), details()]), Buffer.from('{}')]) {
    refused(() => prepareBackupEnquiry(backup(), selected(backup()), bytes));
  }
});

test('details exact schema and existing UTF16 field limits', () => {
  for (const changes of [
    { schema: 'wrong' }, { version: 2 }, { request: 'refund' }, { extra: true },
    { items: '' }, { items: ' ' }, { items: 'a'.repeat(2001) },
    { reason: 'a'.repeat(4001) }, { signature: 'a'.repeat(201) }, { reason: null },
  ]) refused(() => prepareBackupEnquiry(backup(), selected(backup()), details('instructions', changes)));
  assert(prepareBackupEnquiry(backup(), selected(backup()), details('instructions', {
    items: 'a'.repeat(2000), reason: 'b'.repeat(4000), signature: 'c'.repeat(200),
  })).text.length > 6000);
});

test('duplicate details JSON key uses ordinary last-value semantics', () => {
  const text = details().toString().replace('"request":"instructions"', '"request":"exchange","request":"eligibility"');
  const value = prepareBackupEnquiry(backup(), selected(backup()), Buffer.from(text));
  assert.equal(value.request, 'eligibility');
  assert.equal(value.subject, 'Return eligibility enquiry');
});

test('raw details inclusive 64KiB and backup inclusive 5MiB boundaries', () => {
  const d = details(), exactDetails = Buffer.concat([d, Buffer.alloc(65536 - d.length, 32)]);
  assert(prepareBackupEnquiry(backup(), selected(backup()), exactDetails));
  refused(() => prepareBackupEnquiry(backup(), selected(backup()), Buffer.concat([exactDetails, Buffer.from(' ')])));
  const b = backup(), exact = Buffer.concat([b, Buffer.alloc(5 * 1024 * 1024 - b.length, 32)]);
  assert.equal(inspectBackupEnquiry(exact).source.bytes, 5 * 1024 * 1024);
  refused(() => inspectBackupEnquiry(Buffer.concat([exact, Buffer.from(' ')])));
  const path = file('backup-exact.json', exact);
  const result = run('CLI exact raw backup bound', ['inspect', '--input', path]);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).source.sha256, hash(exact));
});

test('normal CLI inspection has exact complete compact UTF8/LF bytes', () => {
  const result = run('inspect complete', ['inspect', '--input', input]);
  assert.equal(result.status, 0);
  assert.deepEqual(result.stdout, Buffer.from(JSON.stringify(inspectBackupEnquiry(backup())) + '\n'));
  assert.equal(result.stderr.length, 0);
});

test('normal CLI prepare emits complete exact receipt after exact CRLF file', () => {
  const output = join(root, 'draft 名.txt'), value = prepared();
  const result = run('prepare complete', args(output));
  assert.equal(result.status, 0);
  assert.deepEqual(readFileSync(output), plain(value));
  const expected = {
    schema: 'returnby.backup-enquiry-published.v1', source: value.source, details: value.details,
    orderId: value.orderId, request: value.request,
    output: { path: output, bytes: value.outputBytes, sha256: value.outputSha256 },
    notice: 'Draft only. Review the saved text and recipient before sending.',
  };
  assert.deepEqual(result.stdout, Buffer.from(JSON.stringify(expected) + '\n'));
  assert.equal(result.stderr.length, 0);
});

test('existing file, directory and input/details aliases remain unchanged', () => {
  const existing = file('existing.txt', Buffer.from('existing sentinel'));
  const directory = join(root, 'existing-dir'); mkdirSync(directory);
  const before = [existing, input, detailPath].map(x => readFileSync(x));
  for (const output of [existing, directory, input, detailPath]) {
    const result = run('existing output protection ' + output, args(output));
    assert.equal(result.status, 2); assert.equal(result.stdout.length, 0);
    assert.match(result.stderr.toString(), /^backup enquiry:/);
  }
  [existing, input, detailPath].forEach((x, i) => assert.deepEqual(readFileSync(x), before[i]));
  assert(statSync(directory).isDirectory());
  assert.equal(readdirSync(directory).length, 0);
});

test('late invalid rows and mismatch do not create output or parent paths', () => {
  const late = file('late-invalid.json', backup([saved, { ...completed, windowDays: 0 }], 2));
  const absentParent = join(root, 'must-stay-absent');
  const output = join(absentParent, 'draft.txt');
  const badArgs = args(output); badArgs[badArgs.indexOf('--input') + 1] = late;
  badArgs[badArgs.indexOf('--expected-sha256') + 1] = hash(readFileSync(late));
  const malformed = run('late malformed before publication', badArgs);
  assert.equal(malformed.status, 2); assert.equal(malformed.stdout.length, 0);
  assert.equal(existsSync(absentParent), false);
  const wrong = args(join(root, 'wrong-hash.txt'));
  wrong[wrong.indexOf('--expected-sha256') + 1] = '0'.repeat(64);
  const mismatch = run('hash mismatch before publication', wrong);
  assert.equal(mismatch.status, 2); assert.equal(mismatch.stdout.length, 0);
  assert.equal(existsSync(join(root, 'wrong-hash.txt')), false);
});

test('strict command flags and explicit help use truthful outcomes', () => {
  for (const invalid of [[], ['prepare'], ['inspect', '--input', input, '--input', input],
    ['inspect', '--input', input, '--details', detailPath], ['inspect', '--input', '--file'],
    ['inspect', '--input', input, 'excess']]) {
    const result = run('argument refusal', invalid);
    assert.equal(result.status, 2); assert.equal(result.stdout.length, 0);
    assert.match(result.stderr.toString(), /^backup enquiry:/);
  }
  const help = run('explicit help', ['--help']);
  assert.equal(help.status, 0); assert(help.stdout.toString().includes('Draft') || help.stdout.toString().includes('draft'));
});

test('opened directory backup refuses without output', () => {
  const result = run('directory input refusal', ['inspect', '--input', root]);
  assert.equal(result.status, 2); assert.equal(result.stdout.length, 0);
});

test('two real contender CLIs publish at most one complete unchanged target', async () => {
  const output = join(root, 'rival.txt');
  const results = await Promise.all([
    asynchronous('rival publisher one', args(output)),
    asynchronous('rival publisher two', args(output)),
  ]);
  assert.deepEqual(results.map(x => x.status).sort(), [0, 2]);
  assert.deepEqual(readFileSync(output), plain(prepared()));
  assert.equal(results.find(x => x.status === 2).stdout.length, 0);
});

test('real closed stdout remains nonzero after complete published draft', async () => {
  const output = join(root, 'receipt-unverified.txt');
  const result = await asynchronous('real preclosed stdout after publish', args(output), true);
  assert.notEqual(result.status, 0);
  assert.deepEqual(readFileSync(output), plain(prepared()));
  assert.match(result.stderr.toString(), /^backup enquiry:/);
});

test('all controlled child cases close and all private staging is cleaned', () => {
  assert(children.length > 0);
  assert(children.every(x => Number.isInteger(x.actual_exit) && x.signal === null && !x.timeout_or_spawn_error));
  assert.equal(readdirSync(root).some(x => x.startsWith('.returnby-enquiry-')), false);
  assert.deepEqual(readFileSync(input), backup());
  assert.deepEqual(readFileSync(detailPath), details());
  writeFileSync(join(root, 'children.json'), JSON.stringify({
    schema: 'returnby-backup-enquiry-author-children-v1', child_count: children.length,
    cases: children, concurrency: 'one sequential test worker; exactly two owned contender CLIs in one deliberate race',
    product_network_workers: 0,
  }, null, 2) + '\n', { flag: 'wx' });
});
