import { readFileSync } from 'node:fs';
import { URL as NativeURL } from 'node:url';
import { afterEach, expect, test, vi } from 'vitest';
import { storageFixture, storedOrder } from './helpers/storage-fixture.mjs';

afterEach(() => vi.unstubAllGlobals());
const completedAt = '2026-10-08T12:34:56.000Z';

async function open(initial = [storedOrder('A')]) {
  vi.resetModules();
  const app = storageFixture(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), initial);
  const storage = app.globals.localStorage;
  let refuseRead = false, allocations = 0;
  const downloads = [];
  app.globals.localStorage = {
    getItem(key) { if (refuseRead) throw Error('Private current-read refusal'); return storage.getItem(key); },
    setItem: storage.setItem,
  };
  app.globals.document.createElement = () => ({ href: '', download: '', click() { downloads.push(this.download); } });
  app.globals.URL = class extends NativeURL {
    static createObjectURL() { allocations++; return 'blob:private-fixture'; }
    static revokeObjectURL() {}
  };
  for (const [key, value] of Object.entries(app.globals)) vi.stubGlobal(key, value);
  await import('../src/main.ts');
  const click = (id, dataset = {}) => app.elements.get(id).listeners.get('click')({ target: { dataset } });
  return { ...app, downloads, allocations: () => allocations,
    complete: id => click('list', { complete: id }), reopen: id => click('list', { reopen: id }),
    reminder: id => click('list', { ics: id }), history: () => click('filter-completed'), active: () => click('filter-all'),
    external(rows) { storage.setItem('returnby.v1', JSON.stringify(rows)); },
    refuseRead(value) { refuseRead = value; }, retry: () => click('storage-retry'),
  };
}

test('actual Complete and Reopen handlers retain history, quiet counts, draft and action focus', async () => {
  const original = { ...storedOrder('A'), orderDate: '2025-01-01' };
  const app = await open([original]);
  app.draft('UNSAVED');
  app.complete('A');
  const done = app.persisted()[0];
  expect(done).toMatchObject(original);
  expect(typeof done.completedAt).toBe('string');
  expect(app.count()).toBe(0);
  expect(app.elements.get('expired-count').textContent).toBe('0');
  expect(app.elements.get('completed-count').textContent).toBe('1');
  expect(app.globals.document.activeElement.id).toBe('completion-feedback');
  app.history();
  const html = app.elements.get('list').innerHTML;
  expect(html).toContain('COMPLETED');
  expect(html).toContain('$8.00');
  expect(html).toContain('Original return-by 2025-01-31');
  expect(html).toContain('data-edit="A"');
  expect(html).toContain('data-del="A"');
  expect(html).not.toMatch(/progressbar|data-ics|days-left|PAST DUE/);
  app.reopen('A');
  expect(app.persisted()).toEqual([original]);
  expect(app.count()).toBe(1);
  expect(app.elements.get('expired-count').textContent).toBe('1');
  expect(app.elements.get('paste').value).toBe('Unsaved email UNSAVED');
  expect(app.elements.get('preview').fields.orderNo).toBe('UNSAVED');
});

test('a refused completion write retains active UI and a retry preserves subsequent unrelated writes', async () => {
  const app = await open();
  app.draft('UNSAVED');
  app.failNext();
  app.complete('A');
  expect(app.persisted()).toEqual([storedOrder('A')]);
  expect(app.count()).toBe(1);
  expect(app.elements.get('list').innerHTML).toContain('data-complete="A"');
  expect(app.elements.get('storage-error').hidden).toBe(false);
  app.external([storedOrder('A'), storedOrder('OTHER-TAB')]);
  app.complete('A');
  expect(app.persisted()[1]).toEqual(storedOrder('OTHER-TAB'));
  expect(app.persisted()[0].completedAt).toBeDefined();
  const attempts = app.attempts.length, stamp = app.persisted()[0].completedAt;
  app.complete('A');
  expect(app.attempts).toHaveLength(attempts);
  expect(app.persisted()[0].completedAt).toBe(stamp);
  expect(app.elements.get('paste').value).toBe('Unsaved email UNSAVED');
});

test('stale status actions refresh and refuse before any write, then permit an explicit reviewed action', async () => {
  const app = await open();
  const corrected = { ...storedOrder('A'), total: '$99.00' };
  app.external([corrected, storedOrder('OTHER')]);
  const attempts = app.attempts.length;
  app.complete('A');
  expect(app.attempts).toHaveLength(attempts);
  expect(app.persisted()).toEqual([corrected, storedOrder('OTHER')]);
  expect(app.elements.get('storage-error').textContent).toMatch(/changed|review/i);
  app.complete('A');
  expect(app.persisted()[0]).toMatchObject({ ...corrected, completedAt: expect.any(String) });
  const reopenedElsewhere = { ...corrected, total: '$101.00' };
  app.external([reopenedElsewhere]);
  const beforeReopen = app.attempts.length;
  app.reopen('A');
  expect(app.attempts).toHaveLength(beforeReopen);
  expect(app.persisted()).toEqual([reopenedElsewhere]);
});

test('read refusal prevents completion until explicit reload; invalid saved markers also fail closed', async () => {
  const app = await open();
  app.draft('RETAIN');
  app.refuseRead(true);
  app.complete('A');
  expect(app.attempts).toHaveLength(0);
  expect(app.elements.get('storage-retry').hidden).toBe(false);
  app.refuseRead(false); app.retry(); app.complete('A');
  expect(app.persisted()[0].completedAt).toBeDefined();
  expect(app.elements.get('paste').value).toBe('Unsaved email RETAIN');
  for (const value of ['', false, 12, null, '2026-02-30T12:00:00Z']) {
    const invalid = await open([{ ...storedOrder('BAD'), completedAt: value }]);
    expect(invalid.elements.get('tracked-count').textContent).toBe('—');
    expect(invalid.attempts).toHaveLength(0);
    expect(invalid.persisted()[0].completedAt).toEqual(value);
  }
});

test('the actual single-reminder handler refuses stale completion without allocating a file', async () => {
  const app = await open();
  app.external([{ ...storedOrder('A'), completedAt }]);
  const attempts = app.attempts.length;
  app.reminder('A');
  expect(app.allocations()).toBe(0);
  expect(app.downloads).toEqual([]);
  expect(app.attempts).toHaveLength(attempts);
  expect(app.elements.get('storage-error').textContent).toMatch(/changed|review/i);
  app.reminder('A');
  expect(app.allocations()).toBe(0);
  expect(app.elements.get('storage-error').textContent).toMatch(/completed/);
  app.reopen('A'); app.reminder('A');
  expect(app.allocations()).toBe(1);
  expect(app.downloads).toHaveLength(1);
});
