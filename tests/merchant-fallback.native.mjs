#!/usr/bin/env node
// Dependency-free source regression: Node 24+ with built-in TypeScript stripping.
// Optional source root permits the unchanged course to receive an original snapshot.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(process.argv[2] ?? resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const paths = ['src/parse.ts', 'src/policy.ts', 'data/policies.json'];
const bodies = await Promise.all(paths.map(path => readFile(resolve(root, path))));
const { parse } = await import(pathToFileURL(resolve(root, paths[0])));
const originalImport = "import policies from '../data/policies.json';";
const policySource = bodies[1].toString('utf8');
assert.equal(policySource.split(originalImport).length, 2, 'one known policy JSON import');
const jsonUrl = 'data:application/json;base64,' + bodies[2].toString('base64');
const policyJs = stripTypeScriptTypes(policySource.replace(originalImport,
  'import policies from ' + JSON.stringify(jsonUrl) + " with { type: 'json' };"));
const { lookup, knownMerchants } = await import('data:text/javascript;base64,' + Buffer.from(policyJs).toString('base64'));

const cases = [];
const add = (label, text, merchant, policy, known = knownMerchants) =>
  cases.push({ label, text, merchant, policy, known });
const unknown = [
  'Contosocial', 'NotContoso', 'Fabrikamatic', 'Tailspinner', 'AdventureWorksheets',
  'éContoso', 'Contosoé', '中Contoso', 'Contoso中', '\u0301Contoso', 'Contoso\u0301',
  '2Contoso', 'Contoso2', '_Contoso', 'Contoso_', '𝟚Contoso', 'Contoso𝟚',
  '𐐀Contoso', 'Contoso𐐀', 'Contosocial\nFabrikamatic',
];
for (const text of unknown) add('embedded: ' + text, text, '', { days: 30, source: 'default' });
for (const [text, merchant, days] of [
  ['Contoso', 'contoso', 15], ['CONTOSO', 'contoso', 15],
  ['Contoso Electronics', 'Contoso Electronics', 15],
  ['cOnToSo eLeCtRoNiCs', 'Contoso Electronics', 15],
  ['(Contoso)', 'contoso', 15], ['Contoso—receipt', 'contoso', 15],
  ['Receipt: Contoso!', 'contoso', 15], ['🛍Contoso🧾', 'contoso', 15],
  ['Northwind Outfitters', 'Northwind Outfitters', 30],
  ['Fabrikam', 'fabrikam', 60], ['Tailspin Toys', 'Tailspin Toys', 90],
  ['Adventure Works', 'Adventure Works', 45], ['ADVENTUREWORKS', 'adventureworks', 45],
  ['Contosocial\nFabrikam', 'fabrikam', 60],
  ['Contosocial\nContoso', 'contoso', 15],
  ['Tailspin\nContoso', 'contoso', 15],
  ['From: Contosocial <orders@example.test>\nContoso', 'Contosocial', 30],
  ['From: "Fictional Shop" <orders@contoso.test>\nContoso', 'Fictional Shop', 30],
  ['From: orders@fabrikam.test\nContoso', 'Fabrikam', 60],
]) add('control: ' + text, text, merchant, { days, source: days === 30 && ['Contosocial', 'Fictional Shop'].includes(merchant) ? 'default' : 'policy' });
for (const [label, text, merchant, known] of [
  ['literal dot matches', '(A.CME)', 'A.CME', ['A.CME']],
  ['literal dot refuses wildcard', 'AXCME', '', ['A.CME']],
  ['literal plus matches', 'C++ receipt', 'C++', ['C++']],
  ['literal brackets match', '[Shop] receipt', '[Shop]', ['[Shop]']],
  ['literal regex sequence matches', '(A.*B)', 'A.*B', ['A.*B']],
  ['literal regex refuses wildcard', 'AzzB', '', ['A.*B']],
  ['configured order stays first', 'Beta, Alpha', 'Alpha', ['Alpha', 'Beta']],
  ['empty known list', 'Contoso', '', []],
  ['empty alias preserves original stop', 'Contoso', '', ['', 'Contoso']],
]) add(label, text, merchant, { days: 30, source: 'default' }, known);

const suffix = '\nOrder #AB1234\nOrder date: 2026-10-03\nTotal: $12.00';
const results = [];
for (const item of cases) {
  const input = item.text + suffix;
  const actual = parse(input, item.known);
  const expected = {
    merchant: item.merchant, orderDate: '2026-10-03', orderNo: 'AB1234', total: '$12.00',
    found: { merchant: !!item.merchant, orderDate: true, orderNo: true, total: true },
  };
  const policy = lookup(actual.merchant);
  let error = null;
  try { assert.deepEqual(actual, expected); assert.deepEqual(policy, item.policy); }
  catch (e) { error = e.message; }
  results.push({ label: item.label, input, expected, actual, expectedPolicy: item.policy, actualPolicy: policy, pass: error === null, error });
}
const report = {
  schema: 'returnby.merchant-fallback-regression.v1',
  node: process.version,
  loader: 'Exact parser imported via built-in TypeScript stripping; exact policy stripped with only its static JSON import resolved to exact repository data and the Node-required JSON import attribute.',
  inputs: paths.map((path, i) => ({ path, bytes: bodies[i].length, sha256: createHash('sha256').update(bodies[i]).digest('hex') })),
  counts: { total: results.length, passed: results.filter(x => x.pass).length, failed: results.filter(x => !x.pass).length },
  results,
};
console.log(JSON.stringify(report, null, 2));
if (report.counts.failed) process.exitCode = 1;
