import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const source = process.argv[2];
const output = process.argv[3];
const sourceUrl = pathToFileURL(source + path.sep).href;
registerHooks({resolve(specifier, context, nextResolve) {
  if (context.parentURL?.startsWith(sourceUrl) && ['./backup', './deadline', './store'].includes(specifier)) {
    return nextResolve(specifier + '.ts', context);
  }
  return nextResolve(specifier, context);
}});
const { createSavedReturnsCsv } = await import(pathToFileURL(path.join(source, 'src/saved-returns-csv.ts')));
const { exportBackup, parseBackup } = await import(pathToFileURL(path.join(source, 'src/backup.ts')));
const cases = [
  ['plain-leading-bom', '\ufeffNorth Store'],
  ['formula-leading-bom', '\ufeff=1+1'],
  ['ordinary-formula-control', '=1+1'],
  ['genuine-unpaired-surrogate-control', '\ud800'],
];
const rows = cases.map(([name, merchant]) => {
  const record = {id:'bom-case', merchant, orderDate:'2026-10-08', windowDays:30,
    windowSource:'user', createdAt:'2026-10-08T12:00:00Z'};
  const roundTrip = parseBackup(exportBackup([record], new Date('2026-10-08T12:00:00Z')));
  let csv;
  try {
    const actual = createSavedReturnsCsv([record], new Date('2026-10-08T12:00:00Z'));
    csv = {status:'accepted', protectedCells:actual.protectedCells};
  } catch (error) { csv = {status:'refused', name:error.constructor.name, message:error.message}; }
  const encoded = new TextEncoder().encode(merchant);
  return {name, codePoints:[...merchant].map(c => c.codePointAt(0).toString(16)),
    nativeBackupExact:roundTrip[0].merchant === merchant,
    defaultDecoderPreserves:new TextDecoder().decode(encoded) === merchant,
    bomPreservingDecoderPreserves:new TextDecoder('utf-8', {ignoreBOM:true}).decode(encoded) === merchant,
    csv};
});
const b=fs.readFileSync(path.join(source,'src/saved-returns-csv.ts'));
const receipt={node:process.version, moduleBlob:createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex'),
  moduleSha256:createHash('sha256').update(b).digest('hex'),cases:rows};
fs.writeFileSync(output, JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt));
