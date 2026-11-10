import { readFileSync } from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';
import { storageFixture, storedOrder } from './helpers/storage-fixture.mjs';

afterEach(() => vi.unstubAllGlobals());

async function open(initial) {
  vi.resetModules();
  const app = storageFixture(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), initial);
  const storage = app.globals.localStorage;
  let readRefused = false;
  app.globals.localStorage = {
    getItem(key) { if (readRefused) throw Error('Receiving read refusal'); return storage.getItem(key); },
    setItem: storage.setItem,
  };
  for (const [key, value] of Object.entries(app.globals)) vi.stubGlobal(key, value);
  await import('../src/main.ts');
  const click = id => app.elements.get(id).listeners.get('click')({ preventDefault() {} });
  return {
    ...app, click, undo: () => click('undo-removal'), keep: () => click('keep-removed'),
    external(orders) { storage.setItem('returnby.v1', JSON.stringify(orders)); },
    refuseRead(value) { readRefused = value; },
    panel: () => app.elements.get('removal-undo'), status: () => app.elements.get('removal-status').textContent,
    focused: () => app.globals.document.activeElement?.id,
  };
}

test('successful removal offers keyboard recovery and restores original details without disturbing a draft', async () => {
  const removed = { ...storedOrder('A'), windowDays: 90, windowSource: 'user', extension: { keep: true } };
  const app = await open([removed, storedOrder('B')]);
  app.draft('UNSAVED');
  app.remove('A');
  expect(app.persisted()).toEqual([storedOrder('B')]);
  expect(app.panel().hidden).toBe(false);
  expect(app.focused()).toBe('undo-removal');
  app.external([{ ...storedOrder('B'), total: '$99' }, storedOrder('NEW')]);
  app.undo();
  expect(app.persisted()).toEqual([removed, { ...storedOrder('B'), total: '$99' }, storedOrder('NEW')]);
  expect(app.elements.get('preview').fields.orderNo).toBe('UNSAVED');
  expect(app.elements.get('paste').value).toBe('Unsaved email UNSAVED');
  expect(app.focused()).toBe('removal-status');
  expect(app.elements.get('undo-removal').hidden).toBe(true);
  const writes = app.attempts.length;
  app.undo();
  expect(app.attempts).toHaveLength(writes);
});

test('failed and stale removals keep the previous recovery; next successful removal replaces it', async () => {
  const app = await open([storedOrder('A'), storedOrder('B')]);
  app.remove('A');
  app.failNext(); app.remove('B');
  app.undo();
  expect(app.persisted()).toEqual([storedOrder('A'), storedOrder('B')]);
  app.remove('A');
  app.external([]); app.remove('B');
  app.undo();
  expect(app.persisted()).toEqual([storedOrder('A')]);
  app.external([storedOrder('A'), storedOrder('B')]);
  app.click('storage-retry');
  app.remove('A'); app.remove('B'); app.undo();
  expect(app.persisted()).toEqual([storedOrder('B')]);
});

test('failed restoration retains recovery and fresh read retry preserves later storage changes', async () => {
  const app = await open([storedOrder('A'), storedOrder('B')]);
  app.remove('A');
  app.failNext(); app.undo();
  expect(app.persisted()).toEqual([storedOrder('B')]);
  expect(app.status()).toMatch(/still available/);
  app.external([storedOrder('NEW')]);
  app.refuseRead(true); app.undo();
  expect(app.elements.get('storage-retry').hidden).toBe(false);
  expect(app.status()).toMatch(/Retry loading/);
  app.refuseRead(false); app.click('storage-retry'); app.undo();
  expect(app.persisted()).toEqual([storedOrder('A'), storedOrder('NEW')]);
});

test('conflicts retain recovery, while an exact already restored record causes no write', async () => {
  const app = await open([storedOrder('A')]);
  app.remove('A');
  app.external([{ ...storedOrder('A'), windowDays: 5 }]);
  const writes = app.attempts.length;
  app.undo();
  expect(app.attempts).toHaveLength(writes);
  expect(app.count()).toBe(1);
  expect(app.status()).toMatch(/already in use/);
  const reordered = Object.fromEntries(Object.entries(storedOrder('A')).reverse());
  app.external([storedOrder('NEW'), reordered]);
  const before = app.attempts.length;
  app.undo();
  expect(app.attempts).toHaveLength(before);
  expect(app.persisted()).toEqual([storedOrder('NEW'), storedOrder('A')]);
  expect(app.count()).toBe(2);
  expect(app.status()).toMatch(/already in your tracker/);
});

test('Keep removed only discards recovery and returns focus to the selected filter', async () => {
  const app = await open([storedOrder('A')]);
  app.click('filter-expired'); app.remove('A');
  const writes = app.attempts.length;
  app.keep();
  expect(app.panel().hidden).toBe(true);
  expect(app.focused()).toBe('filter-expired');
  app.undo();
  expect(app.attempts).toHaveLength(writes);
  expect(app.persisted()).toEqual([]);
});

test('only a successful confirmed clear ends the recovery', async () => {
  const app = await open([storedOrder('A'), storedOrder('B')]);
  app.remove('A');
  app.confirm(false); app.clear();
  expect(app.panel().hidden).toBe(false);
  app.confirm(true); app.failNext(); app.clear();
  expect(app.panel().hidden).toBe(false);
  app.undo();
  expect(app.persisted()).toEqual([storedOrder('A'), storedOrder('B')]);
  app.remove('A'); app.clear();
  expect(app.panel().hidden).toBe(true);
  app.undo();
  expect(app.persisted()).toEqual([]);
});
