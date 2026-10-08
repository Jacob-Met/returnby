import { afterEach, expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { exportBackup, MAX_BACKUP_BYTES } from '../src/backup';
import { storageFixture, storedOrder } from './helpers/storage-fixture.mjs';

vi.mock('../src/style.css', () => ({}));
vi.mock('../src/backup.css', () => ({}));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function open(initial = []) {
  vi.resetModules();
  const app = storageFixture(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), initial);
  const element = id => app.elements.get(id);
  const Element = element('backup-rows').constructor;
  element('backup-rows').replaceChildren = (...children) => { element('backup-rows').children = children; };
  const downloads = [], blobs = [];
  app.globals.document.createElement = tag => {
    const node = new Element('', '');
    node.tagName = tag;
    node.click = () => downloads.push(node);
    return node;
  };
  for (const [key, value] of Object.entries(app.globals)) vi.stubGlobal(key, value);
  vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { blobs.push(blob); return 'blob:fixture'; });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  await import('../src/main.ts');
  const click = id => element(id).listeners.get('click')({ preventDefault() {} });
  const choose = (content, size = new TextEncoder().encode(content).length) => {
    element('backup-file').files = [{ size, text: () => Promise.resolve(content) }];
    return element('backup-file').listeners.get('change')();
  };
  return { ...app, element, click, choose, downloads, blobs };
}

test('preview and cancel preserve storage, native tracker, and an unsaved email draft', async () => {
  const app = await open([storedOrder('saved')]); app.draft('DRAFT');
  const bytes = app.globals.localStorage.getItem('returnby.v1');
  await app.choose(exportBackup([storedOrder('restore')]));
  expect(app.element('backup-summary').textContent).toBe('1 to add · 0 already saved · 0 conflicting');
  expect(app.element('backup-preview').hidden).toBe(false);
  expect(app.attempts).toHaveLength(0);
  expect(app.count()).toBe(1);
  app.click('backup-cancel'); app.click('backup-apply');
  expect(app.globals.localStorage.getItem('returnby.v1')).toBe(bytes);
  expect(app.element('backup-preview').hidden).toBe(true);
  expect(app.element('paste').value).toBe('Unsaved email DRAFT');
  expect(app.element('preview').hidden).toBe(false);
});

test('confirmed import updates the real tracker once, preserves source/draft and skips repeats', async () => {
  const app = await open([storedOrder('saved')]); app.draft('DRAFT');
  const incoming = { ...storedOrder('restore'), merchant: 'Another Shop', windowDays: 47, windowSource: 'user' };
  const file = exportBackup([storedOrder('saved'), incoming]);
  await app.choose(file); app.click('backup-apply');
  expect(app.persisted()).toEqual([storedOrder('saved'), incoming]);
  expect(app.count()).toBe(2);
  expect(app.element('list').innerHTML).toContain('YOUR RULE / 47 DAYS');
  expect(app.element('paste').value).toBe('Unsaved email DRAFT');
  expect(app.element('preview').hidden).toBe(false);
  await app.choose(file);
  expect(app.element('backup-apply').disabled).toBe(true);
  app.click('backup-apply');
  expect(app.attempts).toHaveLength(1);
});

test('a restored historical fallback displays its saved days without applying the current fallback', async () => {
  const app = await open();
  const historical = { ...storedOrder('historical'), windowDays: 45, windowSource: 'default' };
  await app.choose(exportBackup([historical])); app.click('backup-apply');
  expect(app.persisted()).toEqual([historical]);
  expect(app.element('list').innerHTML).toContain('45-DAY FALLBACK');
  expect(app.element('list').innerHTML).not.toContain('30-DAY FALLBACK');
});

test('conflict in one row blocks every addition and exposes the changed attribution', async () => {
  const app = await open([storedOrder('saved')]);
  await app.choose(exportBackup([storedOrder('new'), { ...storedOrder('saved'), windowSource: 'user' }]));
  expect(app.element('backup-apply').disabled).toBe(true);
  expect(app.element('backup-summary').textContent).toContain('1 conflicting');
  expect(app.element('backup-rows').children[1].textContent).toContain('windowSource');
  app.click('backup-apply');
  expect(app.attempts).toHaveLength(0);
  expect(app.persisted()).toEqual([storedOrder('saved')]);
});

test('a byte-limit overflow in the combined tracker is refused before any import write', async () => {
  const initial = ['saved-a', 'saved-b'].map(id => ({ ...storedOrder(id), merchant: 'A'.repeat(4096), orderNo: 'B'.repeat(4096), total: 'C'.repeat(4096) }));
  const app = await open(initial);
  const bytes = app.globals.localStorage.getItem('returnby.v1');
  const nearLimit = Array.from({ length: 8000 }, (_, i) => ({
    ...storedOrder(`order-${i}`), merchant: 'M'.repeat(490), orderNo: '', total: '', createdAt: '2026-10-01T09:10:11.000Z',
  }));
  await app.choose(exportBackup(nearLimit));
  expect(app.element('backup-preview').hidden).toBe(true);
  expect(app.element('backup-message').textContent).toMatch(/combined.*5 MiB/);
  expect(app.globals.localStorage.getItem('returnby.v1')).toBe(bytes);
  expect(app.attempts).toHaveLength(0);
  expect(app.count()).toBe(2);
});

test.each(['unsupported version', 'foreign window source', 'malformed JSON', 'late bad row', 'oversized file'])('%s does not commit any rows', async kind => {
  const app = await open([storedOrder('saved')]);
  const file = JSON.parse(exportBackup([storedOrder('new'), storedOrder('other')]));
  if (kind === 'unsupported version') file.version = 3;
  if (kind === 'foreign window source') file.orders[1].windowSource = 'retailer-verified';
  if (kind === 'late bad row') file.orders[1].windowDays = false;
  await app.choose(kind === 'malformed JSON' ? '{' : JSON.stringify(file), kind === 'oversized file' ? MAX_BACKUP_BYTES + 1 : undefined);
  expect(app.element('backup-preview').hidden).toBe(true);
  expect(app.element('backup-message').attributes.role).toBe('alert');
  expect(app.attempts).toHaveLength(0);
  expect(app.persisted()).toEqual([storedOrder('saved')]);
});

test('quota refusal keeps prior bytes, native memory, both previews, and supports a single retry', async () => {
  const app = await open([storedOrder('saved')]); app.draft('DRAFT');
  const bytes = app.globals.localStorage.getItem('returnby.v1');
  await app.choose(exportBackup([storedOrder('new')])); app.failNext(); app.click('backup-apply');
  app.refresh();
  expect(app.count()).toBe(1);
  expect(app.globals.localStorage.getItem('returnby.v1')).toBe(bytes);
  expect(app.element('backup-preview').hidden).toBe(false);
  expect(app.element('backup-apply').disabled).toBe(false);
  expect(app.element('storage-error').hidden).toBe(false);
  expect(app.element('paste').value).toBe('Unsaved email DRAFT');
  expect(app.element('preview').hidden).toBe(false);
  app.click('backup-apply');
  expect(app.count()).toBe(2);
  expect(app.persisted().map(row => row.id)).toEqual(['saved', 'new']);
  expect(app.attempts.map(rows => rows.length)).toEqual([2, 2]);
  expect(app.element('storage-error').hidden).toBe(true);
});

test('serialization failure at the native save boundary cannot change bytes or native memory', async () => {
  const app = await open([storedOrder('saved')]);
  const bytes = app.globals.localStorage.getItem('returnby.v1');
  await app.choose(exportBackup([storedOrder('new')]));
  const stringify = JSON.stringify;
  let refusals = 0;
  const spy = vi.spyOn(JSON, 'stringify').mockImplementation((...args) => {
    if (Array.isArray(args[0]) && args[0].length === 2) {
      refusals++;
      throw new TypeError('Synthetic serialization refusal at save');
    }
    return stringify(...args);
  });
  app.click('backup-apply'); spy.mockRestore(); app.refresh();
  expect(refusals).toBe(1);
  expect(app.attempts).toHaveLength(0);
  expect(app.globals.localStorage.getItem('returnby.v1')).toBe(bytes);
  expect(app.count()).toBe(1);
  expect(app.element('backup-preview').hidden).toBe(false);
  app.click('backup-apply'); expect(app.count()).toBe(2);
});

test('a changed persisted baseline refreshes the review before a subsequent confirmation', async () => {
  const app = await open([storedOrder('saved')]);
  await app.choose(exportBackup([storedOrder('incoming')]));
  app.globals.localStorage.setItem('returnby.v1', JSON.stringify([storedOrder('saved'), storedOrder('elsewhere')]));
  app.click('backup-apply');
  expect(app.element('backup-message').textContent).toContain('changed since the preview');
  expect(app.persisted().map(row => row.id)).toEqual(['saved', 'elsewhere']);
  expect(app.attempts).toHaveLength(1);
  app.click('backup-apply');
  expect(app.persisted().map(row => row.id)).toEqual(['saved', 'elsewhere', 'incoming']);
  expect(app.count()).toBe(3);
});

test.each(['unreadable', 'broken JSON', 'unexpected shape'])('existing %s storage prevents import and export', async kind => {
  const app = await open([storedOrder('saved')]);
  app.globals.localStorage.getItem = () => {
    if (kind === 'unreadable') throw Error('Storage unavailable');
    return kind === 'broken JSON' ? '{' : '{"unexpected":true}';
  };
  await app.choose(exportBackup([storedOrder('incoming')]));
  app.click('backup-apply'); app.click('backup-export');
  expect(app.attempts).toHaveLength(0);
  expect(app.count()).toBe(1);
  expect(app.downloads).toHaveLength(0);
  expect(app.element('backup-message').attributes.role).toBe('alert');
});

test('cancel or a newer file selection invalidates a pending asynchronous read', async () => {
  const app = await open();
  let resolve;
  const startSlow = () => {
    app.element('backup-file').files = [{ size: 10, text: () => new Promise(done => { resolve = done; }) }];
    return app.element('backup-file').listeners.get('change')();
  };
  const cancelled = startSlow(); app.click('backup-cancel');
  resolve(exportBackup([storedOrder('old')])); await cancelled;
  expect(app.element('backup-preview').hidden).toBe(true);
  const replaced = startSlow();
  await app.choose(exportBackup([storedOrder('new')]));
  resolve(exportBackup([storedOrder('old')])); await replaced;
  app.click('backup-apply');
  expect(app.persisted().map(row => row.id)).toEqual(['new']);
});

test('large previews page through every order and render imported text without HTML', async () => {
  const app = await open();
  const payload = '<img src=x onerror=alert(1)>';
  await app.choose(exportBackup(Array.from({ length: 26 }, (_, i) => ({ ...storedOrder(String(i)), merchant: payload }))));
  expect(app.element('backup-rows').children).toHaveLength(25);
  expect(app.element('backup-rows').children[0].textContent).toContain(payload);
  expect(app.element('backup-rows').children[0].innerHTML).toBe('');
  expect(app.element('backup-page').textContent).toBe('1–25 of 26 orders');
  app.click('backup-next');
  expect(app.element('backup-rows').children).toHaveLength(1);
  expect(app.element('backup-page').textContent).toBe('26–26 of 26 orders');
  expect(app.element('backup-next').disabled).toBe(true);
  app.click('backup-previous');
  expect(app.element('backup-rows').children).toHaveLength(25);
});

test('the download contains saved reviewed details, preserves attribution, and excludes the current raw email draft', async () => {
  const saved = { ...storedOrder('saved'), windowSource: 'policy' };
  const app = await open([saved]); app.draft('SECRET RAW EMAIL');
  app.click('backup-export');
  expect(app.downloads).toHaveLength(1);
  expect(app.downloads[0].download).toMatch(/^returnby-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const content = await app.blobs[0].text();
  expect(JSON.parse(content).orders).toEqual([saved]);
  expect(content).not.toContain('SECRET RAW EMAIL');
  expect(app.attempts).toHaveLength(0);
});
