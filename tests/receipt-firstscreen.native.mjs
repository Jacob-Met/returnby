import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../batch-intake.html', import.meta.url), 'utf8');

test('first-screen imported email and mobile spacing', () => {
  const chooser = html.indexOf('id="batch-files"');
  assert(chooser > 0);
  assert(chooser < html.indexOf('id="batch-paste"'));
  assert.match(html, /Open a receipt\.<br> Or paste the text\./);
  assert.match(html, /confirmations<br> <em>to the same desk/);
});
