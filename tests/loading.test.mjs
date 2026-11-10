import { afterEach, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadingFixture } from './helpers/loading-fixture.mjs';
import { loadingCases } from './helpers/loading-cases.mjs';

vi.mock('../src/style.css', () => ({}));
afterEach(() => vi.unstubAllGlobals());

async function open(raw, failures = 0) {
  vi.resetModules();
  const app = loadingFixture(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), raw, failures);
  for (const [key, value] of Object.entries(app.globals)) vi.stubGlobal(key, value);
  await import('../src/main.ts');
  return app;
}

for (const [name, check] of loadingCases) test(name, async () => check(open));
