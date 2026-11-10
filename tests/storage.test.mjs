import { afterEach, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { storageFixture } from './helpers/storage-fixture.mjs';
import { storageCases } from './helpers/storage-cases.mjs';

vi.mock('../src/style.css', () => ({}));
afterEach(() => vi.unstubAllGlobals());

async function open(initial) {
  vi.resetModules();
  const app = storageFixture(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), initial);
  for (const [key, value] of Object.entries(app.globals)) vi.stubGlobal(key, value);
  await import('../src/main.ts');
  return app;
}

for (const [name, check] of storageCases) test(name, async () => check(open));
