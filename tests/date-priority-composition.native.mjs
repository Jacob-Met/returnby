// Receive the existing explicit-date span with retained month, reference and total fixes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const parserUrl = process.argv[2] ? pathToFileURL(resolve(process.argv[2])) : new URL('../src/parse.ts', import.meta.url);
const deadlineUrl = process.argv[3] ? pathToFileURL(resolve(process.argv[3])) : new URL('../src/deadline.ts', import.meta.url);
const { parse } = await import(parserUrl.href);
const { dueDate } = await import(deadlineUrl.href);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const header = 'From: Sample Shop <receipts@example.test>\nOrder notification\nReorder ID: OLD-1000\nOrder ID: KEEP-2000\n';
const totals = '\nSubtotal: $42.00\nTotal: $47.00';
const expected = (orderDate, total = '$47.00') => ({
  merchant: 'Sample Shop', orderDate, orderNo: 'KEEP-2000', total,
  found: { merchant: true, orderDate: Boolean(orderDate), orderNo: true, total: Boolean(total) },
});
const cases = [];
const add = (name, body, date, due, total = '$47.00') => cases.push({name, input:header + body + (total ? totals : '\nSubtotal: $42.00'), expected:expected(date, total), expectedDue:due});
for (const date of ['October 3, 2026', '3 Oct 2026', '2026-10-03', '10/03/2026']) {
  add('explicit date format ' + date, 'Delivery: October 10, 2026\nOrder date: ' + date, '2026-10-03', '2026-11-02');
}
for (const label of ['ORDER DATE ', 'order\tdate : ', 'Order\ndate:\n', 'Order date' + ' '.repeat(80)]) {
  add('explicit label ' + JSON.stringify(label), 'Delivery: October 10, 2026\n' + label + 'October 3, 2026', '2026-10-03', '2026-11-02');
}
add('earliest explicit text order', 'Delivery: October 10, 2026\nOrder date: 2026-10-05\nOrder date: October 3, 2026', '2026-10-05', '2026-11-04');
add('invalid explicit then valid explicit', 'Delivery: March 10, 2027\nOrder date: February 29, 2027\nOrder date: March 1, 2027', '2027-03-01', '2027-03-31');
add('unknown explicit then valid explicit', 'Delivery: March 10, 2027\nOrder date: pending\nOrder date: March 1, 2027', '2027-03-01', '2027-03-31');
add('false month then valid explicit', 'Delivery: October 10, 2026\nOrder date: Octopus 1, 2026\nOrder date: October 3, 2026', '2026-10-03', '2026-11-02');
add('leap day and subtotal-only', 'Delivery: March 10, 2028\nOrder date: 29 February 2028', '2028-02-29', '2028-03-30', '');
for (const suffix of ['Preorder date: October 3, 2026', 'Order date revised to October 3, 2026', 'Order date - October 3, 2026', 'Order date: February 30, 2026\nReminder: October 3, 2026']) {
  add('retained non-direct fallback ' + suffix, 'Delivery: October 10, 2026\n' + suffix, '2026-10-10', '2026-11-09');
}
add('impostor only preserves other fields', 'Order date: Mayonnaise 6, 2026', '', null);
add('invalid only preserves other fields', 'Order date: February 29, 2027', '', null);
add('unknown only preserves other fields', 'Order date: unknown', '', null);
add('valid recovery after refusals', 'Delivery: May 15, 2026\nOrder date: May 6, 2026', '2026-05-06', '2026-06-05');
cases.push({name:'original offsets despite lowercase-expanding prefix', input:'İİİ😀\n'+header+'Delivery: October 10, 2026\nOrder date: October 3, 2026'+totals, expected:expected('2026-10-03'), expectedDue:'2026-11-02'});

const results = cases.map(test => {
  let actual, actualDue, error;
  try {
    actual = parse(test.input);
    actualDue = actual.orderDate ? dueDate(actual.orderDate, 30) : null;
    assert.deepEqual(actual, test.expected);
    assert.equal(actualDue, test.expectedDue);
  } catch (failure) { error = String(failure); }
  return {...test, actual, actualDue, pass:!error, ...(error ? {error} : {})};
});
const report = {
  schema:'hamon.returnby.date-priority-composition.author.v1', node:process.version,
  parser:{path:fileURLToPath(parserUrl),sha256:sha(readFileSync(parserUrl))},
  deadline:{path:fileURLToPath(deadlineUrl),sha256:sha(readFileSync(deadlineUrl))},
  receiver_sha256:sha(readFileSync(new URL(import.meta.url))),
  checks:results.length, passed:results.filter(x=>x.pass).length, failed:results.filter(x=>!x.pass).length,
  scope:'Actual existing public parse and dueDate functions on fictional receipts; no UI, storage, policy selection, maintained Vitest/build, deployment or installed-adoption claim.',
  results,
};
console.log(JSON.stringify(report,null,2));
process.exitCode = report.failed ? 1 : 0;
