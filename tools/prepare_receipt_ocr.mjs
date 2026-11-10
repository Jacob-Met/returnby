import { mkdir, copyFile, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const out = join(root, 'public', 'receipt-ocr');
await mkdir(join(out, 'core'), { recursive: true });
await mkdir(join(out, 'lang'), { recursive: true });
const packagePath = name => join(root, 'node_modules', name);
await copyFile(join(packagePath('tesseract.js'), 'dist', 'worker.min.js'), join(out, 'worker.min.js'));
const cores = (await readdir(packagePath('tesseract.js-core'))).filter(name => /^tesseract-core.*\.wasm\.js$/.test(name));
if (!cores.length) throw new Error('Installed Tesseract core files are missing.');
for (const name of cores) await copyFile(join(packagePath('tesseract.js-core'), name), join(out, 'core', name));
await copyFile(join(packagePath('@tesseract.js-data/eng'), '4.0.0_best_int', 'eng.traineddata.gz'), join(out, 'lang', 'eng.traineddata.gz'));
const versions = {};
for (const name of ['tesseract.js', 'tesseract.js-core', '@tesseract.js-data/eng']) {
  versions[name] = JSON.parse(await readFile(join(packagePath(name), 'package.json'), 'utf8')).version;
}
await copyFile(join(packagePath('tesseract.js'), 'LICENSE.md'), join(out, 'LICENSE-tesseract.js'));
await copyFile(join(packagePath('tesseract.js-core'), 'LICENSE'), join(out, 'LICENSE-tesseract.js-core'));
await writeFile(join(out, 'ABOUT.txt'), 'Local English receipt reader. Tesseract.js and Tesseract core: Apache-2.0.\nEnglish traineddata: Apache-2.0, https://github.com/naptha/tessdata\n'+JSON.stringify(versions,null,2)+'\n');
console.log('Packaged local receipt reader', versions, cores.length, 'core assets');
