import { readFileSync } from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';
import { storageFixture, storedOrder } from './helpers/storage-fixture.mjs';

vi.mock('../src/style.css', () => ({}));
vi.mock('../src/edit.css', () => ({}));
afterEach(() => vi.unstubAllGlobals());

async function open(initial = [storedOrder('A')]) {
  vi.resetModules();
  const app = storageFixture(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), initial);
  for (const [key, value] of Object.entries(app.globals)) vi.stubGlobal(key, value);
  await import('../src/main.ts');
  return {
    ...app,
    remote(next) { app.globals.localStorage.setItem('returnby.v1', JSON.stringify(next)); },
  };
}

test('Clear refuses unreviewed additions saved by another tab before confirmation', async () => {
  const app = await open();
  app.draft('UNSAVED');
  const current = [storedOrder('A'), storedOrder('REMOTE')];
  app.remote(current);
  const before = app.attempts.length;
  app.clear();
  expect(app.persisted()).toEqual(current);
  expect(app.attempts).toHaveLength(before);
  expect(app.count()).toBe(2);
  expect(app.elements.get('storage-error').textContent).toMatch(/changed|review/i);
  expect(app.elements.get('paste').value).toBe('Unsaved email UNSAVED');
});

test('Clear refuses another tab write made while confirmation is open', async () => {
  const app = await open();
  app.draft('STILL-UNSAVED');
  const current = [storedOrder('A'), storedOrder('NEW-DURING-CONFIRM')];
  vi.stubGlobal('confirm', () => { app.remote(current); return true; });
  app.clear();
  expect(app.persisted()).toEqual(current);
  expect(app.count()).toBe(2);
  expect(app.elements.get('storage-error').textContent).toMatch(/changed|review/i);
  expect(app.elements.get('paste').value).toBe('Unsaved email STILL-UNSAVED');
});

test('Clear still removes unchanged visible returns after explicit confirmation', async () => {
  const app = await open([storedOrder('A'), storedOrder('B')]);
  app.clear();
  expect(app.persisted()).toEqual([]);
  expect(app.count()).toBe(0);
});
