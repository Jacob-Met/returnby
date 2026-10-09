import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const supplied = process.argv[2];
if (!supplied) throw new Error('Supply the absolute path to an already installed esbuild module; this builder installs nothing.');
const { build, version } = await import(pathToFileURL(path.resolve(supplied)).href);
const result = await build({ entryPoints: [path.join(here, 'calendar-ui.mjs')], bundle: true, write: false,
  platform: 'browser', format: 'iife', target: 'es2022', charset: 'utf8', legalComments: 'inline', metafile: true });
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const sha = data => createHash('sha256').update(data).digest('hex');
const csp = createHash('sha256').update(js).digest('base64');
const template = readFileSync(path.join(here, 'calendar.template.html'), 'utf8');
if (template.split('__BUNDLE__').length !== 2 || template.split('__CSP_HASH__').length !== 2) throw new Error('Template placeholders must be unique.');
const output = template.replace('__CSP_HASH__', csp).replace('__BUNDLE__', () => js);
writeFileSync(path.join(here, 'calendar.html'), output, { encoding: 'utf8' });
console.log(JSON.stringify({ esbuild: version, htmlBytes: Buffer.byteLength(output), htmlSha256: sha(output),
  scriptSha256: sha(js), csp, inputs: Object.keys(result.metafile.inputs).map(p => ({ path: p, sha256: sha(readFileSync(p)) })) }, null, 2));
