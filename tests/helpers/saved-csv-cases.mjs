import assert from 'node:assert/strict';
import { createSavedReturnsCsv, MAX_SAVED_CSV_BYTES, SAVED_CSV_COLUMNS } from '../../src/saved-returns-csv.ts';

const stamp = new Date('2026-10-08T13:02:03.456Z');
const order = (changes = {}) => ({ id: 'RETURN-A', merchant: 'Fictional river shop', orderNo: '00042',
  total: 'EUR 15.20', orderDate: '2024-02-28', windowDays: 2, windowSource: 'user',
  createdAt: '2024-02-28T10:15:00+01:00', ...changes });
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
// Independent small CSV reader: consume quoted/unquoted fields and require
// well-formed row boundaries. Assertions compare decoded cells, not substrings.
export function readCsv(content) {
  assert.equal(content[0], '\ufeff');
  const source = content.slice(1), rows = [];
  let row = [], field = '', state = 'start';
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (state === 'quoted') {
      if (char === '"' && source[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') state = 'closed';
      else field += char;
      continue;
    }
    if (state === 'start' && char === '"') { state = 'quoted'; continue; }
    if (char === ',') { row.push(field); field = ''; state = 'start'; continue; }
    if (char === '\r' && source[index + 1] === '\n') {
      row.push(field); rows.push(row); row = []; field = ''; state = 'start'; index += 1; continue;
    }
    assert.notEqual(state, 'closed', 'Data after a closing field quote');
    assert.notEqual(char, '"', 'Unescaped field quote');
    assert.ok(char !== '\r' && char !== '\n', 'Unquoted newline');
    state = 'plain'; field += char;
  }
  assert.equal(state, 'start'); assert.deepEqual(row, []); assert.equal(field, '');
  return rows;
}

export const savedCsvCases = [
  ['projects approved fields and uses exact native leap-day deadlines without changing input', () => {
    const source = freeze([order({ originalEmail: 'PRIVATE-SYNTHETIC-EMAIL', extra: { secret: true } })]);
    const before = JSON.stringify(source);
    const output = createSavedReturnsCsv(source, stamp);
    assert.deepEqual(readCsv(output.content), [[...SAVED_CSV_COLUMNS], [
      'RETURN-A', 'Fictional river shop', '00042', 'EUR 15.20', '2024-02-28', '2', 'user', '2024-03-01', '2024-02-28T10:15:00+01:00'
    ]]);
    assert.equal(output.count, 1); assert.equal(output.protectedCells, 0);
    assert.equal(output.filename, 'returnby-returns-2026-10-08.csv');
    assert.equal(output.bytes, Buffer.byteLength(output.content));
    assert.ok(!output.content.includes('PRIVATE-SYNTHETIC-EMAIL'));
    assert.equal(JSON.stringify(source), before);
  }],
  ['retains literal commas, embedded quotes, CRLF, tabs and supplementary Unicode in decoded CSV cells', () => {
    const source = [order({ merchant: 'North, "river" 🧭\r\nshop', orderNo: 'AB\t42', total: 'as entered: "15,20"\rnext' })];
    const output = createSavedReturnsCsv(source, stamp);
    const [, row] = readCsv(output.content);
    assert.equal(row[1], source[0].merchant); assert.equal(row[2], source[0].orderNo); assert.equal(row[3], source[0].total);
    assert.equal(row.length, 9); assert.equal(output.protectedCells, 0);
    assert.ok(output.content.includes('"North, ""river"" 🧭\r\nshop"'));
    assert.equal(output.bytes, Buffer.byteLength(output.content, 'utf8'));
  }],
  ['neutralizes formula-like text including leading whitespace and reports exact prefixed-cell count', () => {
    const inputs = [
      order({ id: 'A', merchant: '=HYPERLINK("https://example.invalid")', orderNo: ' +SUM(1,2)', total: '\tordinary' }),
      order({ id: 'B', merchant: '\u200b@SUM(1,2)', orderNo: '-100', total: '\r\ntext' }),
      order({ id: 'C', merchant: "'=already literal", orderNo: 'A-100', total: '£15.20' })
    ];
    const before = JSON.stringify(inputs);
    const output = createSavedReturnsCsv(inputs, stamp), rows = readCsv(output.content).slice(1);
    assert.equal(output.protectedCells, 6);
    assert.deepEqual(rows[0].slice(1, 4), ["'=HYPERLINK(\"https://example.invalid\")", "' +SUM(1,2)", "'\tordinary"]);
    assert.deepEqual(rows[1].slice(1, 4), ["'\u200b@SUM(1,2)", "'-100", "'\r\ntext"]);
    assert.deepEqual(rows[2].slice(1, 4), ["'=already literal", 'A-100', '£15.20']);
    assert.equal(JSON.stringify(inputs), before);
  }],
  ['preserves literal leading BOM characters and still protects BOM-prefixed formula text', () => {
    const source = freeze([order({ merchant: '\ufeffordinary store', orderNo: '\ufeff=SUM(1,2)', total: '\ufeff-3.00' })]);
    const before = JSON.stringify(source), output = createSavedReturnsCsv(source, stamp);
    const row = readCsv(output.content)[1];
    assert.deepEqual(row.slice(1, 4), ['\ufeffordinary store', "'\ufeff=SUM(1,2)", "'\ufeff-3.00"]);
    assert.equal(output.protectedCells, 2);
    assert.equal(output.bytes, Buffer.byteLength(output.content, 'utf8'));
    assert.equal(JSON.stringify(source), before);
  }],
  ['sorts by native deadline then exact saved ID without changing recorded attribution or timestamps', () => {
    const source = freeze([
      order({ id: 'Z', orderDate: '2024-12-31', windowDays: 1, windowSource: 'policy' }),
      order({ id: 'B', orderDate: '2024-03-09', windowDays: 2, windowSource: 'default' }),
      order({ id: 'A', orderDate: '2024-03-10', windowDays: 1, windowSource: 'user' })
    ]);
    const rows = readCsv(createSavedReturnsCsv(source, stamp).content).slice(1);
    assert.deepEqual(rows.map(row => [row[0], row[6], row[7]]), [
      ['A', 'user', '2024-03-11'], ['B', 'default', '2024-03-11'], ['Z', 'policy', '2025-01-01']
    ]);
    assert.deepEqual(source.map(row => row.id), ['Z', 'B', 'A']);
    assert.ok(rows.every(row => row[8] === '2024-02-28T10:15:00+01:00'));
  }],
  ['keeps optional saved text empty and numeric-looking order numbers exact in file bytes', () => {
    const row = order(); delete row.orderNo; delete row.total;
    const rows = readCsv(createSavedReturnsCsv([row, order({ id: 'B', orderNo: '00000000000001234567890', total: '0.00' })], stamp).content);
    assert.deepEqual(rows.find(row => row[0] === 'RETURN-A').slice(2, 4), ['', '']);
    assert.deepEqual(rows.find(row => row[0] === 'B').slice(2, 4), ['00000000000001234567890', '0.00']);
    assert.equal(Object.hasOwn(row, 'orderNo'), false);
  }],
  ['refuses a whole inconsistent tracker rather than emitting valid-looking partial rows', () => {
    const invalid = [
      [order(), order()], [order(), order({ id: 'B', orderDate: '2024-02-30' })],
      [order({ windowDays: 1.5 })], [order({ windowDays: Infinity })],
      [order({ windowSource: 'verified-live-store' })], [order({ createdAt: 'no timestamp' })],
      { orders: [order()] }, []
    ];
    for (const source of invalid) {
      const before = JSON.stringify(source);
      assert.throws(() => createSavedReturnsCsv(source, stamp));
      assert.equal(JSON.stringify(source), before);
    }
  }],
  ['refuses lossy or unsupported CSV text while retaining exact valid Unicode and ignored extra fields', () => {
    for (const text of ['before\0after', 'before\u0001after', 'before\ud800after', 'before\udfffafter', 'before\u007fafter']) {
      const source = [order({ merchant: text })], before = JSON.stringify(source);
      assert.throws(() => createSavedReturnsCsv(source, stamp), /cannot be represented safely in CSV/);
      assert.equal(JSON.stringify(source), before);
    }
    const input = [order({ merchant: '𐐷 🧭', ignoredEmail: '\0\ud800' })];
    assert.equal(readCsv(createSavedReturnsCsv(input, stamp).content)[1][1], '𐐷 🧭');
  }],
  ['admits the existing 10000-order bound and refuses larger or oversized saved data', () => {
    const source = Array.from({ length: 10000 }, (_, index) => order({ id: `R${String(index).padStart(5, '0')}` }));
    const output = createSavedReturnsCsv(source, stamp);
    const rows = readCsv(output.content);
    assert.equal(output.count, 10000); assert.equal(rows.length, 10001);
    assert.equal(rows.at(-1)[0], 'R09999'); assert.ok(output.bytes <= MAX_SAVED_CSV_BYTES);
    assert.throws(() => createSavedReturnsCsv([...source, order({ id: 'EXTRA' })], stamp), /10,000/);
    const large = Array.from({ length: 300 }, (_, index) => order({ id: `L${index}`, merchant: '界'.repeat(4096), orderNo: '界'.repeat(4096) }));
    assert.throws(() => createSavedReturnsCsv(large, stamp), /5 MiB/);
  }],
  ['has deterministic bytes at a pinned timestamp and rejects an unusable export timestamp', () => {
    const source = [order()];
    assert.deepEqual(createSavedReturnsCsv(source, stamp), createSavedReturnsCsv(source, new Date(stamp)));
    for (const date of [new Date(NaN), new Date('0999-12-31T23:00:00Z'), new Date('+010000-01-01T00:00:00Z')]) {
      assert.throws(() => createSavedReturnsCsv(source, date), /timestamp/);
    }
    assert.equal(stamp.toISOString(), '2026-10-08T13:02:03.456Z');
  }],
];
