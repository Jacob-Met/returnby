import { readFileSync } from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';
import { storageFixture, storedOrder } from './helpers/storage-fixture.mjs';

vi.mock('../src/style.css', () => ({}));
vi.mock('../src/edit.css', () => ({}));
afterEach(() => vi.unstubAllGlobals());

async function open(initial = [storedOrder('ORIGINAL')]) {
  vi.resetModules();
  const app = storageFixture(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), initial);
  const native = app.globals.localStorage;
  let readRefused = false;
  app.globals.localStorage = {
    getItem(key) { if (readRefused) throw Error('Receiving current-state read refusal'); return native.getItem(key); },
    setItem: native.setItem,
  };
  for (const [key, value] of Object.entries(app.globals)) vi.stubGlobal(key, value);
  await import('../src/main.ts');
  return {
    ...app,
    external(orders) { native.setItem('returnby.v1', JSON.stringify(orders)); },
    refuseRead(value) { readRefused = value; },
    reload() { app.elements.get('storage-retry').listeners.get('click')(); },
  };
}

test('new-order Save retains the freshly saved corrections, additions and extra fields', async () => {
  const app = await open();
  app.draft('LOCAL');
  const corrected = { ...storedOrder('ORIGINAL'), orderNo:'CORRECTED', windowDays:45, extension:{ keep:true } };
  const remote = storedOrder('REMOTE');
  app.external([corrected, remote]);
  app.submit();
  expect(app.persisted().slice(0, 2)).toEqual([corrected, remote]);
  expect(app.persisted()).toHaveLength(3);
  expect(app.persisted()[2].orderNo).toBe('LOCAL');
  expect(app.count()).toBe(3);
});

test('Remove preserves unseen additions without reviving an unrelated deleted return', async () => {
  const app = await open([storedOrder('ORIGINAL'), storedOrder('REMOVED-ELSEWHERE')]);
  const remote = storedOrder('REMOTE');
  app.external([storedOrder('ORIGINAL'), remote]);
  app.remove('ORIGINAL');
  expect(app.persisted()).toEqual([remote]);
  expect(app.count()).toBe(1);
});

test('a changed selected return is refreshed and retained until another Remove attempt', async () => {
  const app = await open();
  app.draft('LOCAL');
  const corrected = { ...storedOrder('ORIGINAL'), windowDays:45 };
  app.external([corrected]);
  const attempts = app.attempts.length;
  app.remove('ORIGINAL');
  expect(app.attempts).toHaveLength(attempts);
  expect(app.persisted()).toEqual([corrected]);
  expect(app.elements.get('storage-error').textContent).toMatch(/changed|review/i);
  expect(app.elements.get('paste').value).toBe('Unsaved email LOCAL');
  app.remove('ORIGINAL');
  expect(app.persisted()).toEqual([]);
});

test('a latest-read refusal protects storage and the draft through explicit loading retry', async () => {
  const app = await open();
  app.draft('LOCAL');
  const current = [storedOrder('ORIGINAL'), storedOrder('REMOTE')];
  app.external(current);
  const attempts = app.attempts.length;
  app.refuseRead(true);
  app.submit();
  expect(app.attempts).toHaveLength(attempts);
  expect(app.persisted()).toEqual(current);
  expect(app.elements.get('storage-retry').hidden).toBe(false);
  expect(app.elements.get('preview').fields.orderNo).toBe('LOCAL');
  app.refuseRead(false);
  app.reload();
  expect(app.elements.get('preview').fields.orderNo).toBe('LOCAL');
  app.submit();
  expect(app.persisted().slice(0, 2)).toEqual(current);
  expect(app.persisted()).toHaveLength(3);
});

test('write retry rereads subsequent remote orders and saves the draft exactly once', async () => {
  const app = await open();
  app.draft('LOCAL');
  app.external([storedOrder('ORIGINAL'), storedOrder('REMOTE-ONE')]);
  app.failNext();
  app.submit();
  const current = [...app.persisted(), storedOrder('REMOTE-TWO')];
  app.external(current);
  app.submit();
  expect(app.persisted().slice(0, 3)).toEqual(current);
  expect(app.persisted()).toHaveLength(4);
  expect(app.persisted().filter(order => order.orderNo === 'LOCAL')).toHaveLength(1);
});

test('missing or duplicated selected identities are never removed by an obsolete card', async () => {
  for (const current of [[storedOrder('REMOTE')], [storedOrder('ORIGINAL'), storedOrder('ORIGINAL')]]) {
    const app = await open();
    app.external(current);
    const attempts = app.attempts.length;
    app.remove('ORIGINAL');
    expect(app.attempts).toHaveLength(attempts);
    expect(app.persisted()).toEqual(current);
    expect(app.count()).toBe(current.length);
  }
});
