// Independent lexical receiving, authored from original parse.ts and the public tracker contract.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [sourceArgument, destinationArgument] = process.argv.slice(2);
if (!sourceArgument || !destinationArgument) throw new Error('usage: node receive_month_tokens.mjs source-parse.ts report.json');
const source = resolve(sourceArgument), destination = resolve(destinationArgument);
const sourceBytes = readFileSync(source);
const sourceSha = createHash('sha256').update(sourceBytes).digest('hex');
globalThis.fetch = () => { throw new Error('network is outside this receiving contract'); };
const selected = await import(pathToFileURL(source).href);
if (typeof selected.findDates !== 'function' || typeof selected.parse !== 'function') throw new Error('public parser exports are absent');

// The spelling table is an independent English calendar oracle, not extracted from the candidate.
const months = [
  ['01', 'January', 'Jan'], ['02', 'February', 'Feb'], ['03', 'March', 'Mar'],
  ['04', 'April', 'Apr'], ['05', 'May', 'May'], ['06', 'June', 'Jun'],
  ['07', 'July', 'Jul'], ['08', 'August', 'Aug'], ['09', 'September', 'Sep'],
  ['10', 'October', 'Oct'], ['11', 'November', 'Nov'], ['12', 'December', 'Dec'],
];
const checks = [];
function dates(label, input, expected) {
  checks.push({label, operation: 'findDates', input, expected});
}
for (const [number, full, abbreviation] of months) {
  dates('full-month-first-' + number, full + ' 15, 2026', [{date: '2026-' + number + '-15', index: 0}]);
  dates('full-day-first-' + number, '15 ' + full.toLowerCase() + ' 2026', [{date: '2026-' + number + '-15', index: 0}]);
  dates('abbreviation-' + number, abbreviation.toUpperCase() + '. 15th, 2026', [{date: '2026-' + number + '-15', index: 0}]);
}
dates('four-letter-sept', '15 Sept. 2026', [{date: '2026-09-15', index: 0}]);
dates('full-name-period', '15 FEBRUARY. 2028', [{date: '2028-02-15', index: 0}]);
dates('mixed-case-ordinal', 'jAnUaRy 21ST, 2026', [{date: '2026-01-21', index: 0}]);

const impostors = ['Janitor', 'Janua', 'Februaryness', 'Febrile', 'Marching', 'Market',
  'Aprilish', 'Apricot', 'Mayonnaise', 'Maybe', 'Junior', 'Juniper', 'Julyish', 'Juliet',
  'Augustus', 'Augury', 'Septic', 'Septemberish', 'Octopus', 'Octoberly', 'Novel', 'Novemberish',
  'Decaf', 'Decemberish'];
for (const word of impostors) {
  dates('word-refusal-month-first-' + word, word + ' 15, 2026', []);
  dates('word-refusal-day-first-' + word, '15 ' + word + ' 2026', []);
}
for (const input of ['XJanuary 15, 2026', '15 XMarch 2026', 'Mar2 15, 2026', '15 September2 2026'])
  dates('adjacent-token-refusal-' + input, input, []);

dates('unicode-prefix-offsets', '😀 Order received: September 15, 2026\nNext: Jan. 2, 2027', [
  {date: '2026-09-15', index: 19}, {date: '2027-01-02', index: 44},
]);
dates('mixed-format-text-order', 'x 05/06/2026\nx 2026-04-02\nx March 1, 2026', [
  {date: '2026-05-06', index: 2}, {date: '2026-04-02', index: 15}, {date: '2026-03-01', index: 28},
]);
dates('same-date-repeated-preserved', 'May 3, 2026; 2026-05-03', [
  {date: '2026-05-03', index: 0}, {date: '2026-05-03', index: 13},
]);
dates('valid-leap-day', 'February 29, 2028', [{date: '2028-02-29', index: 0}]);
dates('numeric-us-order', '03/04/2026', [{date: '2026-03-04', index: 0}]);
dates('numeric-iso', '2026-12-09', [{date: '2026-12-09', index: 0}]);
for (const input of ['February 29, 2027', 'April 31, 2026', 'June 0, 2026', '2026-02-30', '13/01/2026'])
  dates('invalid-calendar-control-' + input, input, []);

const envelope = (date) => 'From: Example Mart <receipts@example.test>\nOrder number: ZX-4826\nOrder date: ' + date + '\nTotal: $24.50';
const record = (date) => ({merchant:'Example Mart', orderDate:date, orderNo:'ZX-4826', total:'$24.50',
  found:{merchant:true, orderDate:date !== '', orderNo:true, total:true}});
checks.push({label:'actual-parse-refuses-impostor', operation:'parse', input:envelope('Mayonnaise 6, 2026'), expected:record('')});
checks.push({label:'actual-parse-valid-after-refusal', operation:'parse', input:envelope('May 6, 2026'), expected:record('2026-05-06')});
checks.push({label:'actual-parse-day-first', operation:'parse', input:envelope('6 SEPT. 2026'), expected:record('2026-09-06')});
checks.push({label:'actual-parse-other-fields-without-date', operation:'parse', input:envelope('date pending'), expected:record('')});

const results = checks.map(test => {
  let actual, error;
  try { actual = selected[test.operation](test.input); } catch (failure) { error = String(failure); }
  return {...test, actual, ...(error ? {error} : {}), pass:!error && JSON.stringify(actual) === JSON.stringify(test.expected)};
});
const report = {schema:'hamon.returnby.month-token-independent.v1', source, source_sha256:sourceSha,
  receiver_sha256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),
  node:process.version, timezone:process.env.TZ ?? null, checks:results.length,
  passed:results.filter(x=>x.pass).length, failed:results.filter(x=>!x.pass).length,
  scope:'Actual unmodified public TypeScript parser exports; no browser, storage, policy, deadline, deployment or Actions claim.', results};
writeFileSync(destination, JSON.stringify(report, null, 2) + '\n', {flag:'wx'});
console.log(JSON.stringify({source_sha256:sourceSha, checks:report.checks, passed:report.passed, failed:report.failed}));
process.exitCode = report.failed ? 1 : 0;
