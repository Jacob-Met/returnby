import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const source = process.argv[2]
  ? pathToFileURL(resolve(process.argv[2]))
  : new URL('../../../src/parse.ts', import.meta.url);
const { parse } = await import(source.href);
const dates = [
  ['October 3, 2026', '2026-10-03'],
  ['Octopus 3, 2026', ''],
  ['May 6, 2026', '2026-05-06'],
  ['Mayonnaise 6, 2026', ''],
];
const labels = [
  ['Order ID: GOOD-4826', 'GOOD-4826'],
  ['Order notification', ''],
  ['Reorder ID: OLD-4826\nOrder no.: NEW-4826', 'NEW-4826'],
  ['Order identity: FAKE-4826', ''],
];
const checks = [];
const expectedRecord = (orderDate, orderNo, total) => ({
  merchant: 'Example Outfitters', orderDate, orderNo, total,
  found: {merchant: true, orderDate: Boolean(orderDate), orderNo: Boolean(orderNo), total: Boolean(total)},
});
for (const [dateText, orderDate] of dates) {
  for (const [labelText, orderNo] of labels) {
    const input = `From: Example Outfitters <receipts@example.test>\n${labelText}\nOrder placed ${dateText}\nSubtotal: $10.00\nTotal: $64.50`;
    checks.push({label: `combined ${dateText} / ${labelText}`, input, expected: expectedRecord(orderDate, orderNo, '$64.50')});
  }
}
for (const [labelText, orderNo] of labels) {
  const input = `From: Example Outfitters <receipts@example.test>\n${labelText}\nOrder placed February 29, 2028\nSubtotal: $10.00`;
  checks.push({label: `subtotal preservation / ${labelText}`, input, expected: expectedRecord('2028-02-29', orderNo, '')});
}
const results = checks.map(check => {
  let actual, error;
  try { actual = parse(check.input); assert.deepEqual(actual, check.expected); }
  catch (failure) { error = String(failure); }
  return {...check, actual, pass: !error, ...(error ? {error} : {})};
});
const receipt = {
  schema: 'hamon.returnby.combined-parser.v1',
  node: process.version,
  source: source.pathname,
  source_sha256: createHash('sha256').update(readFileSync(source)).digest('hex'),
  receiver_sha256: createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),
  passed: results.filter(row => row.pass).length,
  failed: results.filter(row => !row.pass).length,
  checks: results.length,
  scope: 'Actual public parser exports; fictional receipts; all output fields checked; no provider, browser, storage or installed-adoption claim.',
  results,
};
console.log(JSON.stringify(receipt, null, 2));
process.exitCode = receipt.failed ? 1 : 0;
