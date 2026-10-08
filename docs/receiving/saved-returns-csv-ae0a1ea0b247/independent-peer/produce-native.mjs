import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

const [source, inputFile, outputDir] = process.argv.slice(2);
assert(source && inputFile && outputDir, 'source, authored input, and output directory required');
const frozenCommit = process.env.RETURNBY_CSV_REVIEW_COMMIT || '539756d55036adf51b24b4f824faf06bca31a15d';
const expectedModuleBlob = process.env.RETURNBY_CSV_REVIEW_BLOB || '448d7441efd9637a763d2674a44353cd7db155b8';
const relativeFiles = ['src/saved-returns-csv.ts', 'src/backup.ts', 'src/deadline.ts', 'src/store.ts'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
function readPins() {
  return relativeFiles.map(relative => {
    const bytes = fs.readFileSync(path.join(source, relative));
    const expected = execFileSync('git', ['rev-parse', `${frozenCommit}:${relative}`], {cwd: source, encoding: 'utf8'}).trim();
    assert.equal(blob(bytes), expected, `frozen source ${relative}`);
    return {path: relative, blob: expected, sha256: hash(bytes), bytes: bytes.length};
  });
}
const before = readPins();
assert.equal(before[0].blob, expectedModuleBlob);
const sourceUrl = pathToFileURL(source + path.sep).href;
// Native Node type stripping; resolve only the three observed extensionless
// imports inside this exact source closure. No implementation substitutes.
registerHooks({resolve(specifier, context, nextResolve) {
  if (context.parentURL?.startsWith(sourceUrl) && ['./backup', './deadline', './store'].includes(specifier)) {
    return nextResolve(specifier + '.ts', context);
  }
  return nextResolve(specifier, context);
}});
const { createSavedReturnsCsv } = await import(pathToFileURL(path.join(source, 'src/saved-returns-csv.ts')));
const { exportBackup } = await import(pathToFileURL(path.join(source, 'src/backup.ts')));
const { dueDate } = await import(pathToFileURL(path.join(source, 'src/deadline.ts')));
const inputBytes = fs.readFileSync(inputFile);
const records = JSON.parse(inputBytes);
for (const record of records) Object.freeze(record);
Object.freeze(records);
const unchangedInput = JSON.stringify(records);
const exportedAt = new Date('2026-10-08T23:30:00-04:00');
const originalTime = exportedAt.getTime();
const output = createSavedReturnsCsv(records, exportedAt);
const backup = exportBackup(records, exportedAt);
assert.equal(JSON.stringify(records), unchangedInput, 'approved and ignored input fields stay unchanged');
assert.equal(exportedAt.getTime(), originalTime, 'caller timestamp is not mutated');
assert.deepEqual(readPins(), before, 'all four exercised source files unchanged');
assert.equal(hash(fs.readFileSync(inputFile)), hash(inputBytes), 'authored file unchanged');
assert.equal(output.bytes, Buffer.byteLength(output.content, 'utf8'));
fs.mkdirSync(outputDir, {recursive: true});
const csvFile = path.join(outputDir, 'actual-saved-returns.csv');
fs.writeFileSync(csvFile, output.content, 'utf8');
fs.writeFileSync(path.join(outputDir, 'actual-approved-backup.json'), backup, 'utf8');
const receipt = {
  sourceCommit: frozenCommit, node: process.version, timezone: process.env.TZ,
  csv: {filename: output.filename, count: output.count, protectedCells: output.protectedCells,
    bytes: output.bytes, sha256: hash(fs.readFileSync(csvFile))},
  nativeDeadlines: records.map(record => ({id: record.id, due: dueDate(record.orderDate, record.windowDays)})),
  inputSha256: hash(inputBytes), inputUnchanged: true, timestampUnchanged: true,
  sourceBefore: before, sourceAfter: readPins(),
};
fs.writeFileSync(path.join(outputDir, 'native-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({timezone: process.env.TZ, rows: output.count, protectedCells: output.protectedCells, bytes: output.bytes, outputDir}));
