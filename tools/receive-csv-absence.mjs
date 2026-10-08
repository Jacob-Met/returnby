import './register-source-ts.mjs';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const { exportBackup, parseBackup } = await import('../src/backup.ts');
const { dueDate } = await import('../src/deadline.ts');
const fixture = [{ id: 'RETURN-A', merchant: 'Fictional river shop', orderNo: '00042', total: 'EUR 15.20',
  orderDate: '2024-02-28', windowDays: 2, windowSource: 'user', createdAt: '2024-02-28T10:15:00Z',
  originalEmail: 'SYNTHETIC RAW EMAIL: MUST NOT EXPORT' }];
const before = JSON.stringify(fixture);
const admitted = parseBackup(exportBackup(fixture, new Date('2026-10-08T12:00:00Z')));
assert.equal(dueDate(admitted[0].orderDate, admitted[0].windowDays), '2024-03-01');
assert.equal(Object.hasOwn(admitted[0], 'originalEmail'), false);
assert.equal(JSON.stringify(fixture), before);
const manifest = JSON.parse(readFileSync(new URL('../source-pin.json', import.meta.url), 'utf8'));
for (const item of manifest.materialized) {
  const bytes = readFileSync(new URL('../' + item.path, import.meta.url));
  assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), item.sha);
}
const hasModule = existsSync(new URL('../src/saved-returns-csv.ts', import.meta.url));
const hasControl = /saved-returns-csv/.test(readFileSync(new URL('../index.html', import.meta.url), 'utf8'));
assert.equal(hasModule, false); assert.equal(hasControl, false);
const receipt = { recordedAt: new Date().toISOString(), source: manifest.receivingBase, tree: manifest.receivingTree,
  verifiedRuntimeLeaves: manifest.materialized.length, result: 'EXPECTED_FEATURE_ABSENCE',
  nativeControl: { backupProjection: 'PASS', nativeLeapDeadline: '2024-03-01', callerUnchanged: true },
  missing: { csvModule: !hasModule, csvControl: !hasControl },
  qualification: 'Source-level feature absence plus actual native admission/date control; not an actual browser receiving run.' };
writeFileSync(new URL('../docs/receiving/saved-returns-csv-ae0a1ea0b247/baseline-absence.json', import.meta.url), JSON.stringify(receipt, null, 2) + '\n');
process.stdout.write(JSON.stringify(receipt, null, 2) + '\n');
