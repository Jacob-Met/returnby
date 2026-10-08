// SPDX-License-Identifier: MIT
// Compare the existing public single-order API byte for byte against its pin.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const [baselinePath, candidatePath, typescriptPath, reportPath] = process.argv.slice(2);
assert(baselinePath && candidatePath && typescriptPath && reportPath);
const ts = (await import(pathToFileURL(typescriptPath).href)).default;
async function loadModule(filename) {
  const source = await fs.readFile(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return {
    module: await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64')),
    sha256: crypto.createHash('sha256').update(source).digest('hex'),
  };
}
const before = await loadModule(baselinePath);
const after = await loadModule(candidatePath);
const dates = ['2026-01-31', '2026-12-31', '2028-02-29', '2026-03-08'];
const texts = [
  { id: 'stable-id', merchant: 'Example merchant', orderNo: '123' },
  { id: 'blank-merchant', merchant: '' },
  { id: 'literal-id', merchant: 'Store,;\\\r\nBEGIN:VEVENT', orderNo: 'A;B,C\\D\nE' },
  { id: '🙂雪'.repeat(30), merchant: '返品🙂'.repeat(45), orderNo: '注文票'.repeat(30) },
  { id: 'control-id', merchant: 'Before\u0000\u0001\u007fAfter', orderNo: '' },
];
const stamps = ['2026-10-08T12:34:56.789Z', '2030-01-01T00:00:00.000Z'];
const outputs = [];
for (const due of dates) for (const text of texts) for (const stamp of stamps) {
  const order = { ...text, due };
  const expected = before.module.buildIcs(order, new Date(stamp));
  const actual = after.module.buildIcs(order, new Date(stamp));
  assert.equal(actual, expected, JSON.stringify({ order, stamp }));
  outputs.push({ order, stamp, bytes: Buffer.byteLength(actual), sha256: crypto.createHash('sha256').update(actual).digest('hex') });
}
const report = {
  passed: true,
  cases: outputs.length,
  baseline: { path: baselinePath, sha256: before.sha256 },
  candidate: { path: candidatePath, sha256: after.sha256 },
  timezone: process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone,
  outputs,
};
await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: true, cases: outputs.length, baseline: before.sha256, candidate: after.sha256 }));
