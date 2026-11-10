import { readFileSync } from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';
import { storageFixture, storedOrder } from './helpers/storage-fixture.mjs';

const captured = vi.hoisted(() => ({ downloads: vi.fn(), openSingle: vi.fn() }));
vi.mock('../src/style.css', () => ({}));
vi.mock('../src/edit.css', () => ({}));
vi.mock('../src/calendar-batch-ui', () => ({
  bindCalendarBatch: () => ({ openSingle: captured.openSingle }),
  downloadCalendar: captured.downloads,
}));
afterEach(() => { vi.unstubAllGlobals(); captured.downloads.mockReset(); captured.openSingle.mockReset(); });

async function open(initial = [storedOrder('ORIGINAL')]) {
  vi.resetModules();
  const app = storageFixture(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), initial);
  const native = app.globals.localStorage;
  let refused = false;
  app.globals.localStorage = {
    getItem(key) { if (refused) throw Error('Storage read refused'); return native.getItem(key); },
    setItem: native.setItem,
  };
  for (const [key, value] of Object.entries(app.globals)) vi.stubGlobal(key, value);
  await import('../src/main.ts');
  return {
    ...app,
    external(rows) { native.setItem('returnby.v1', JSON.stringify(rows)); },
    refuseRead(value) { refused = value; },
    calendar(id) { app.elements.get('list').listeners.get('click')({ target: { dataset: { ics: id } } }); },
  };
}

test('single-card click rereads storage, retains unrelated changes and preserves unsaved form', async () => {
  const app = await open();
  app.draft('UNSAVED');
  const saved = { ...storedOrder('ORIGINAL'), total: '$99.00' };
  app.external([saved, storedOrder('OTHER')]);
  app.calendar('ORIGINAL');
  expect(captured.downloads).not.toHaveBeenCalled();
  expect(captured.openSingle).toHaveBeenCalledTimes(1);
  expect(captured.openSingle.mock.calls[0][0].id).toBe('ORIGINAL');
  expect(app.persisted()).toEqual([saved, storedOrder('OTHER')]);
  expect(app.elements.get('paste').value).toBe('Unsaved email UNSAVED');
});

test.each([
  ['edited', [{ ...storedOrder('ORIGINAL'), windowDays: 60 }]],
  ['removed', [storedOrder('OTHER')]],
  ['duplicated', [storedOrder('ORIGINAL'), storedOrder('ORIGINAL')]],
])('single-card click refuses a %s original until fresh review', async (_label, current) => {
  const app = await open();
  app.external(current);
  app.calendar('ORIGINAL');
  expect(captured.downloads).not.toHaveBeenCalled();
  expect(app.elements.get('storage-error').textContent).toMatch(/changed|removed|review/i);
  expect(app.persisted()).toEqual(current);
  expect(app.count()).toBe(current.length);
});

test('single-card click refuses unreadable storage without download or draft loss', async () => {
  const app = await open();
  app.draft('UNSAVED');
  app.refuseRead(true);
  app.calendar('ORIGINAL');
  expect(captured.downloads).not.toHaveBeenCalled();
  expect(app.elements.get('storage-retry').hidden).toBe(false);
  expect(app.elements.get('preview').fields.orderNo).toBe('UNSAVED');
});
