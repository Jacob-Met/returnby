import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const source = process.argv[2]
  ? pathToFileURL(resolve(process.argv[2]))
  : new URL('../src/parse.ts', import.meta.url);
const { parse } = await import(source.href);
const cases = [
  ...[
    ['Order#ABCD', 'ABCD'],
    ['Order # ABCD', 'ABCD'],
    ['Order#: #ABCD', 'ABCD'],
    ['Order number: ABCD', 'ABCD'],
    ['ORDER NUMBER # MiXeD-123', 'MiXeD-123'],
    ['Order no: AB12', 'AB12'],
    ['Order no.:AB12', 'AB12'],
    ['Order no. #Ab-1', 'Ab-1'],
    ['Order id ABCD', 'ABCD'],
    ['OrderID:ABCD', 'ABCD'],
    ['OrderNumber:ABCD', 'ABCD'],
    ['OrderNo.:ABCD', 'ABCD'],
    ['Order#1-23', '1-23'],
    ['Your Order\tno.\n#A1b2', 'A1b2'],
    ['Reference (Order ID: AbcD-1234)', 'AbcD-1234'],
    ['Order ID: 1234', '1234'],
  ].map(([input, expected]) => ({ kind: 'supported', input, expected })),
  ...[
    'Order notification', 'Order notice', 'Order identity',
    'Order identifier', 'Order numbering', 'Order numbered',
    'Order numberABCD', 'Order noABCD', 'Order idABCD',
    'Reorder ID: OLD-1234', 'Preorder #OLD-1234',
    'backorder number: OLD-1234', 'disorder no. OLD-1234',
    'order_notification #OLD-1234', 'preorderID:OLD-1234',
    'Order notification #OLD-1234',
  ].map(input => ({ kind: 'unrelated-label', input, expected: '' })),
  ...[
    ['Order notification\nOrder ID: NEW-5678', 'NEW-5678'],
    ['Reorder ID: OLD-1234\nOrder ID: NEW-5678', 'NEW-5678'],
    ['Order identity: FAKE-1234\nOrder #REAL-9876', 'REAL-9876'],
    ['Order numberABCD\nORDER NO. #Right-21', 'Right-21'],
    ['Order no: A12\nOrder id: NEXT-55', 'NEXT-55'],
    ['Order ID: ---1\nOrder ID: VALID-1', 'VALID-1'],
    ['Order #FIRST-1\nOrder ID: SECOND-2', 'FIRST-1'],
    ['İİİ\nOrder #MiXeD-99', 'MiXeD-99'],
    ['Order number: ABCD\nOrder notification', 'ABCD'],
    ['Order #123', ''],
    ['Unlabelled ABCD', ''],
    ['', ''],
  ].map(([input, expected]) => ({ kind: 'recovery-and-preservation', input, expected })),
];

const results = cases.map(({kind, input, expected}) => {
  const actual = parse(input);
  const pass = actual.orderNo === expected && actual.found.orderNo === Boolean(expected);
  return { kind, input, expected, actual, pass };
});
const fullInput = 'From: Northwind Outfitters <orders@example.test>\nOrder notification\nOrder ID: New-5678\nOrder placed October 3, 2026\nTotal: $64.00';
const expectedFull = {
  merchant: 'Northwind Outfitters', orderDate: '2026-10-03', orderNo: 'New-5678', total: '$64.00',
  found: { merchant: true, orderDate: true, orderNo: true, total: true },
};
let fullPass = true;
const actualFull = parse(fullInput, ['Northwind Outfitters']);
try { assert.deepEqual(actualFull, expectedFull); } catch { fullPass = false; }
results.push({kind: 'complete-receipt', input: fullInput, expected: expectedFull, actual: actualFull, pass: fullPass});
const receipt = {
  node: process.version, source: fileURLToPath(source),
  cases: results.length,
  passed: results.filter(row => row.pass).length,
  failed: results.filter(row => !row.pass).length,
  results,
};
console.log(JSON.stringify(receipt, null, 2));
if (receipt.failed) process.exitCode = 1;
