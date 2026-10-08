import { afterEach, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { storageFixture } from './helpers/storage-fixture.mjs';
import { submittedPolicyCases } from './helpers/submitted-policy-cases.mjs';

vi.mock('../src/style.css', () => ({}));
afterEach(() => vi.unstubAllGlobals());

async function open(initial) {
  vi.resetModules();
  const app = storageFixture(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), initial);
  for (const [key, value] of Object.entries(app.globals)) vi.stubGlobal(key, value);
  await import('../src/main.ts');
  return app;
}

for (const [name, check] of submittedPolicyCases) test(name, async () => check(open));
