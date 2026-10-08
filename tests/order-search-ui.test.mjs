import { readFileSync } from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';
import { loadingFixture } from './helpers/loading-fixture.mjs';
import { storedOrder } from './helpers/storage-fixture.mjs';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

const initial = [
  { ...storedOrder('later'), merchant: 'North Star', orderNo: 'NS-900', orderDate: '2026-10-01', windowDays: 30 },
  { ...storedOrder('past'), merchant: 'South Shop', orderNo: 'NS-100', orderDate: '2026-09-01', windowDays: 30 },
  { ...storedOrder('soon'), merchant: 'North Star', orderNo: 'AB-200', orderDate: '2026-09-11', windowDays: 30 },
];

async function open(raw = JSON.stringify(initial), failures = 0) {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-08T12:00:00Z'));
  const app = loadingFixture(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), raw, failures);
  for (const [key, value] of Object.entries(app.globals)) vi.stubGlobal(key, value);
  await import('../src/main.ts');
  const element = id => app.elements.get(id);
  const dispatch = (id, type = 'click') => element(id).listeners.get(type)({ preventDefault() {} });
  return { ...app, element, dispatch,
    query(value) { element('order-search').value = value; dispatch('order-search', 'input'); },
    visible() { return [...element('list').innerHTML.matchAll(/data-edit="([^"]+)"/g)].map(match => match[1]); },
    counts() { return ['tracked-count', 'soon-count', 'expired-count'].map(id => element(id).textContent); },
  };
}

test('existing urgency controls keep deadline order and global counts without changing saved bytes', async () => {
  const app = await open();
  expect(app.visible()).toEqual(['past', 'soon', 'later']);
  expect(app.counts()).toEqual(['3', '1', '1']);
  app.dispatch('filter-due');
  expect(app.visible()).toEqual(['soon']);
  app.dispatch('filter-expired');
  expect(app.visible()).toEqual(['past']);
  expect(app.counts()).toEqual(['3', '1', '1']);
  expect(app.raw()).toBe(JSON.stringify(initial));
  expect(app.writes).toEqual([]);
});

test('store and order-number lookup intersect the chosen urgency filter without losing its state', async () => {
  const app = await open();
  app.query(' north   STAR ');
  expect(app.visible()).toEqual(['soon', 'later']);
  expect(app.element('search-status').textContent).toBe('Showing 2 of 3 saved returns.');
  app.dispatch('filter-due');
  expect(app.visible()).toEqual(['soon']);
  app.query('NS-');
  expect(app.visible()).toEqual([]);
  expect(app.element('list').innerHTML).toContain('No saved returns match this search');
  expect(app.element('filter-due').attributes['aria-pressed']).toBe('true');
  app.dispatch('filter-all');
  expect(app.visible()).toEqual(['past', 'later']);
  expect(app.counts()).toEqual(['3', '1', '1']);
  expect(app.writes).toEqual([]);
});

test('clearing a query restores the current date filter and input focus while retaining the new-order draft', async () => {
  const app = await open();
  app.draft('PRIVATE-DRAFT');
  app.dispatch('filter-expired');
  app.query('North');
  expect(app.visible()).toEqual([]);
  app.dispatch('clear-search');
  expect(app.element('order-search').value).toBe('');
  expect(app.element('clear-search').disabled).toBe(true);
  expect(app.globals.document.activeElement).toBe(app.element('order-search'));
  expect(app.visible()).toEqual(['past']);
  expect(app.element('paste').value).toBe('Unsaved email PRIVATE-DRAFT');
  expect(app.element('preview').hidden).toBe(false);
  expect(app.raw()).toBe(JSON.stringify(initial));
});

test('native input clearing restores all rows and searching markup stays literal', async () => {
  const orders = [...initial, { ...storedOrder('literal'), merchant: '<north> & Shop', orderNo: 'LIT-1' }];
  const app = await open(JSON.stringify(orders));
  app.query('<NORTH>');
  expect(app.visible()).toEqual(['literal']);
  expect(app.element('list').innerHTML).toContain('&lt;north&gt; &amp; Shop');
  app.query('<img src=x onerror=alert(1)>');
  expect(app.visible()).toEqual([]);
  expect(app.element('list').innerHTML).not.toContain('<img');
  app.query('');
  expect(app.visible()).toEqual(['past', 'soon', 'later', 'literal']);
  expect(app.raw()).toBe(JSON.stringify(orders));
});

test('a refused read reports unavailable search, retains its query and recovers from current saved rows', async () => {
  const app = await open();
  app.query('North');
  app.draft('RETRY-DRAFT');
  app.failRead();
  app.submit();
  expect(app.element('order-search').disabled).toBe(true);
  expect(app.element('search-status').textContent).toContain('unavailable');
  expect(app.counts()).toEqual(['—', '—', '—']);
  const addition = { ...storedOrder('newer'), merchant: 'North Addition' };
  app.setRaw(JSON.stringify([...initial, addition]));
  app.retry();
  expect(app.element('order-search').disabled).toBe(false);
  expect(app.element('order-search').value).toBe('North');
  expect(app.visible()).toEqual(['soon', 'later', 'newer']);
  expect(app.counts()).toEqual(['4', '1', '1']);
  expect(app.element('paste').value).toBe('Unsaved email RETRY-DRAFT');
  expect(app.writes).toEqual([]);
});

test('saving through an active query keeps all nonmatching and freshly added saved records', async () => {
  const app = await open();
  app.query('North');
  const addition = { ...storedOrder('other-tab'), merchant: 'Other Merchant' };
  app.setRaw(JSON.stringify([...initial, addition]));
  app.draft('SAVED-WITH-QUERY');
  app.element('preview').fields.merchant = 'North New Store';
  app.submit();
  expect(app.persisted().slice(0, 4)).toEqual([...initial, addition]);
  expect(app.persisted()[4]).toMatchObject({ merchant: 'North New Store', orderNo: 'SAVED-WITH-QUERY' });
  expect(app.visible()).toEqual(['soon', 'later', 'order-1']);
  expect(app.counts()).toEqual(['5', '1', '1']);
  expect(app.element('order-search').value).toBe('North');
  expect(app.writes).toHaveLength(1);
});

test('removing a searched row uses its saved identity and preserves unseen unrelated additions', async () => {
  const app = await open();
  app.query('#AB-200');
  expect(app.visible()).toEqual(['soon']);
  const addition = { ...storedOrder('unseen'), merchant: 'South Shop' };
  app.setRaw(JSON.stringify([...initial, addition]));
  app.remove('soon');
  expect(app.persisted()).toEqual([initial[0], initial[1], addition]);
  expect(app.visible()).toEqual([]);
  expect(app.counts()).toEqual(['3', '0', '1']);
  expect(app.writes).toHaveLength(1);
});

test('an empty saved tracker keeps its original entry guidance and search writes nothing', async () => {
  const app = await open('[]');
  app.query('Not saved');
  expect(app.element('list').innerHTML).toContain('No returns tracked yet');
  expect(app.element('search-status').textContent).toBe('Showing 0 of 0 saved returns.');
  expect(app.counts()).toEqual(['0', '0', '0']);
  expect(app.writes).toEqual([]);
});
