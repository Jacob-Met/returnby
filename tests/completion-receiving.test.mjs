import { readFileSync } from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';
import { exportBackup, parseBackup } from '../src/backup';
import { calendarRows, initialCalendarSelection } from '../src/calendar-batch';
import { storageFixture, storedOrder } from './helpers/storage-fixture.mjs';

afterEach(() => vi.unstubAllGlobals());
const completedAt = '2026-10-08T12:34:56.000Z';

test('approved backup round trip retains a completed return and its reviewed details', () => {
  const original = { ...storedOrder('DONE'), completedAt };
  const contents = exportBackup([original]);
  expect(JSON.parse(contents).version).toBe(2);
  expect(parseBackup(contents)).toEqual([original]);
});

test('calendar eligibility excludes completed returns while retaining open returns', () => {
  const rows = calendarRows([storedOrder('OPEN'), { ...storedOrder('DONE'), completedAt }], '2026-10-08');
  expect(initialCalendarSelection(rows, 'all')).toEqual(['OPEN']);
});

test('the actual tracker offers completion without removing the saved identity', async () => {
  vi.resetModules();
  const app = storageFixture(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), [storedOrder('OPEN')]);
  for (const [key, value] of Object.entries(app.globals)) vi.stubGlobal(key, value);
  await import('../src/main.ts');
  expect(app.elements.get('list').innerHTML).toContain('data-complete="OPEN"');
  app.elements.get('list').listeners.get('click')({ target: { dataset: { complete: 'OPEN' } } });
  const saved = app.persisted()[0];
  expect(saved.id).toBe('OPEN');
  expect(saved.createdAt).toBe(storedOrder('OPEN').createdAt);
  expect(typeof saved.completedAt).toBe('string');
  expect(app.count()).toBe(0);
});
