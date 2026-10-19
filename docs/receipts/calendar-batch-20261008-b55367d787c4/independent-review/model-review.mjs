import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Independent receiving tests. Read frozen production source without modifying it.
const sourceRoot = process.env.RETURNBY_SOURCE || '/workspace/scratch/b55367d787c4/production/returnby';
const out = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ts = require(resolve(sourceRoot, 'node_modules/typescript'));
const hashes = {}, cache = new Map();
function sourceModule(name) {
  if (cache.has(name)) return cache.get(name);
  assert(['calendar-batch', 'deadline', 'ics'].includes(name));
  const path = resolve(sourceRoot, `src/${name}.ts`);
  const source = readFileSync(path, 'utf8');
  hashes[`src/${name}.ts`] = createHash('sha256').update(source).digest('hex');
  const result = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  }, fileName: path, reportDiagnostics: true });
  assert.equal(result.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  const module = { exports: {} };
  cache.set(name, module.exports);
  new Function('require', 'module', 'exports', result.outputText)(
    specifier => sourceModule(specifier.replace(/^\.\//, '')), module, module.exports,
  );
  return module.exports;
}
const { calendarRows, planCalendarBatch } = sourceModule('calendar-batch');
const { buildIcsCalendar } = sourceModule('ics');
const fixed = new Date('2026-10-08T12:34:56Z');
const order = (id, extra = {}) => ({ id, merchant: 'Fictional Shop', orderDate: '2026-10-01',
  windowDays: 30, windowSource: 'user', createdAt: '2026-10-01T12:00:00Z', ...extra });
const unfolded = content => content.replace(/\r\n[ \t]/g, '');
const textValue = value => value.replace(/\\([nN,;\\])/g, (_, character) => /[nN]/.test(character) ? '\n' : character);
const events = content => [...unfolded(content).matchAll(/BEGIN:VEVENT\r\n([\s\S]*?)END:VEVENT\r\n/g)].map(match => match[1]);
const checks = [];
function test(name, run) {
  const detail = run();
  checks.push({ name, result: 'pass', ...detail });
  console.log(`PASS ${name}`);
}
let failure = null;
const oldTimezone = process.env.TZ;
try {
  test('Distinct delimiter and Unicode identities round-trip without content-line injection', () => {
    const ids = ['A,B', 'A\\,B', 'A;B', 'A:B', 'A@B', '家具🛍️'];
    const title = 'École, gifts; \\literal\\n and CR\r\nBEGIN:VEVENT\nUID:injected\tend ' + '家具🛍️'.repeat(30);
    const original = Object.freeze(ids.map(id => Object.freeze(order(id, { merchant: title }))));
    const before = JSON.stringify(original);
    const reviewed = Object.freeze(calendarRows(original, '2026-10-08').map(row => Object.freeze(row)));
    const plan = planCalendarBatch([...original].reverse(), reviewed, [...ids].reverse(), fixed);
    const encoded = new TextEncoder().encode(plan.content);
    assert.equal(new TextDecoder('utf-8', { fatal: true }).decode(encoded), plan.content);
    assert(plan.content.endsWith('\r\n'));
    for (const line of plan.content.split('\r\n')) assert(Buffer.byteLength(line) <= 75);
    assert.equal(plan.content.replace(/\r\n/g, '').includes('\n'), false);
    const blocks = events(plan.content);
    assert.equal(blocks.length, ids.length);
    assert.deepEqual(blocks.map(block => textValue(block.match(/^UID:(.*)$/m)[1].replace(/\r$/, '')).replace(/@returnby$/, '')).sort(), [...ids].sort());
    for (const block of blocks) {
      const summary = block.match(/^SUMMARY:(.*)\r$/m)[1];
      assert.equal(textValue(summary), `Return deadline: ${title.replace(/\r\n/g, '\n')}`);
      assert(block.includes('DTSTART;VALUE=DATE:20261031\r\nDTEND;VALUE=DATE:20261101'));
      assert.equal((block.match(/BEGIN:VALARM/g) || []).length, 1);
      assert(block.includes('TRIGGER:-P3D'));
    }
    assert.equal(JSON.stringify(original), before);
    assert.equal(planCalendarBatch(original, reviewed, ids, fixed).content, plan.content);
    return { identities: ids.length, utf8Bytes: encoded.byteLength };
  });

  test('Selected ambiguity refuses while an unrelated ambiguous identity cannot replace a selection', () => {
    const selected = order('selected'), other = order('other');
    const rows = calendarRows([selected, other], '2026-10-08');
    const same = planCalendarBatch([other, { ...other, merchant: 'Duplicate other' }, selected], rows, ['selected'], fixed);
    assert.equal(same.count, 1);
    assert(same.content.includes('UID:selected@returnby'));
    assert.throws(() => planCalendarBatch([selected, { ...selected, merchant: 'Duplicate selected' }], rows, ['selected'], fixed), /changed or was removed/);
    assert.throws(() => planCalendarBatch([selected], [...rows, rows.find(row => row.order.id === 'selected')], ['selected'], fixed), /not ready for export/);
    const metadataOnly = { ...selected, total: '$999.00', createdAt: '2099-01-01T00:00:00Z', windowSource: 'default' };
    assert.equal(planCalendarBatch([metadataOnly], rows, ['selected'], fixed).content, same.content);
    return { selectedRefusal: true, unrelatedAmbiguityAllowed: true, nonexportedMetadataStable: true };
  });

  test('Gregorian leap, century, year limit and DST dates remain exact across four local time zones', () => {
    const cases = [
      ['2000-02-28', 1, '20000229', '20000301'],
      ['2100-02-28', 1, '21000301', '21000302'],
      ['2024-03-09', 2, '20240311', '20240312'],
      ['2024-11-02', 2, '20241104', '20241105'],
      ['2026-12-31', 1, '20270101', '20270102'],
      ['1000-01-01', 1, '10000102', '10000103'],
      ['9999-12-29', 1, '99991230', '99991231'],
    ];
    const zones = ['UTC', 'America/Los_Angeles', 'Pacific/Kiritimati', 'Asia/Kathmandu'];
    for (const zone of zones) {
      process.env.TZ = zone;
      for (const [orderDate, windowDays, due, end] of cases) {
        const current = [order('date', { orderDate, windowDays })];
        const rows = calendarRows(current, orderDate);
        assert.equal(rows[0].problem, null, `${zone} ${orderDate}`);
        assert.equal(rows[0].left, windowDays, `${zone} ${orderDate} day count`);
        const plan = planCalendarBatch(current, rows, ['date'], fixed);
        assert(plan.content.includes(`DTSTART;VALUE=DATE:${due}\r\nDTEND;VALUE=DATE:${end}`), `${zone} ${orderDate}`);
      }
    }
    return { zones, dateCasesPerZone: cases.length };
  });

  test('Escape expansion crosses the exact byte cap even when its lower bound does not', () => {
    const current = Array.from({ length: 260 }, (_, index) => order(`size-${index}`, { merchant: '\\'.repeat(4096) }));
    const rows = calendarRows(current, '2026-10-08');
    assert(rows.every(row => !row.problem));
    const unescapedLowerBound = current.reduce((sum, item) => sum + Buffer.byteLength(item.id) + 2 * Buffer.byteLength(`Return deadline: ${item.merchant}`), 0);
    assert(unescapedLowerBound < 4 * 1024 * 1024);
    const oversized = buildIcsCalendar(current.map(item => ({ ...item, due: '2026-10-31' })), fixed);
    assert(Buffer.byteLength(oversized) > 4 * 1024 * 1024);
    assert.throws(() => planCalendarBatch(current, rows, current.map(item => item.id), fixed), /larger than 4 MiB/);
    const reduced = planCalendarBatch(current, rows, [current[0].id], fixed);
    assert.equal(reduced.count, 1);
    assert(Buffer.byteLength(reduced.content) < 4 * 1024 * 1024);
    return { unescapedLowerBound, actualOversizedBytes: Buffer.byteLength(oversized), reducedBytes: Buffer.byteLength(reduced.content) };
  });
} catch (error) {
  failure = error.stack;
  console.error(failure);
  process.exitCode = 1;
} finally {
  if (oldTimezone === undefined) delete process.env.TZ; else process.env.TZ = oldTimezone;
  const receipt = { reviewer: 'estate-b55367d787c4 / engine', node: process.version, typescript: ts.version,
    productionSourceReadOnly: true, sourceRoot, sourceHashes: hashes, checks, failure };
  writeFileSync(resolve(out, 'model-review.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({ passed: checks.length, failure: Boolean(failure) }));
}
