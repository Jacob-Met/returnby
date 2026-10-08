import { afterEach, expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { exportBackup } from '../src/backup';
import { loadingFixture } from './helpers/loading-fixture.mjs';
import { storedOrder } from './helpers/storage-fixture.mjs';

vi.mock('../src/style.css', () => ({}));
vi.mock('../src/backup.css', () => ({}));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function open(raw = null, readFailures = 0) {
  vi.resetModules();
  const app = loadingFixture(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), raw, readFailures);
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
  vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { blobs.push(blob); return 'blob:combined-review'; });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  await import('../src/main.ts');
  const click = id => element(id).listeners.get('click')({ preventDefault() {} });
  const choose = content => {
    element('backup-file').files = [{ size: new TextEncoder().encode(content).length, text: async () => content }];
    return element('backup-file').listeners.get('change')();
  };
  const find = email => {
    element('paste').value = email;
    click('find');
    // Native showPreview generated these input attributes. The inert form
    // boundary supplies their values to the real submit handler; actual DOM
    // input behavior is covered separately by the browser receiving journey.
    const decode = value => value.replace(/&(amp|lt|gt|quot);/g,
      (_, key) => ({ amp: '&', lt: '<', gt: '>', quot: '"' })[key]);
    element('preview').fields = Object.fromEntries(
      [...element('preview').innerHTML.matchAll(/<input name="([^"]+)"[^>]* value="([^"]*)"/g)]
        .map(([, name, value]) => [name, decode(value)]));
  };
  return { ...app, element, click, choose, find, downloads, blobs };
}

test('corrected subtotal and reviewed attribution survive refused save, download, and fresh restore', async () => {
  const source = await open();
  source.find('From: Contoso Electronics <orders@example.test>\nOrder #CT-48130\nOrder placed October 3, 2026\nSubtotal: $50.00\nShipping: $5.00\nTotal: $55.00');
  expect(source.element('preview').fields.total).toBe('$55.00');
  expect(source.element('preview').fields.windowDays).toBe('15');
  source.element('preview').fields.merchant = 'Unlisted Review Store';
  source.failWrite(); source.submit();
  expect(source.raw()).toBeNull();
  expect(source.element('preview').hidden).toBe(false);
  expect(source.element('preview').fields.total).toBe('$55.00');
  source.submit();
  expect(source.persisted()).toHaveLength(1);
  expect(source.persisted()[0]).toMatchObject({ merchant: 'Unlisted Review Store', total: '$55.00', windowDays: 15, windowSource: 'user' });
  const approved = source.persisted();
  source.element('paste').value = 'UNSAVED PRIVATE EMAIL';
  source.click('backup-export');
  const backup = await source.blobs[0].text();
  expect(JSON.parse(backup).orders).toEqual(approved);
  expect(backup).not.toContain('UNSAVED PRIVATE EMAIL');
  const receiver = await open();
  await receiver.choose(backup);
  expect(receiver.element('backup-rows').children[0].textContent).toContain('$55.00');
  expect(receiver.raw()).toBeNull();
  receiver.click('backup-apply');
  expect(receiver.persisted()).toEqual(approved);
  expect(receiver.element('list').innerHTML).toContain('YOUR RULE / 15 DAYS');
  receiver.click('backup-export');
  expect(JSON.parse(await receiver.blobs[0].text()).orders).toEqual(approved);
});

test('initial read refusal blocks backup and ordinary writes until explicit recovery retains saved rows', async () => {
  const original = [storedOrder('SAVED-A')];
  const raw = JSON.stringify(original);
  const app = await open(raw, 100);
  expect(app.element('storage-retry').hidden).toBe(false);
  app.draft('UNSAVED-DRAFT'); app.submit(); app.click('backup-export');
  const incoming = { ...storedOrder('RESTORED-B'), total: '$55.00' };
  await app.choose(exportBackup([incoming]));
  expect(app.writes).toHaveLength(0);
  expect(app.downloads).toHaveLength(0);
  expect(app.raw()).toBe(raw);
  expect(app.element('paste').value).toBe('Unsaved email UNSAVED-DRAFT');
  app.failRead(0);
  await app.choose(exportBackup([incoming]));
  app.click('backup-apply');
  expect(app.writes).toHaveLength(0);
  expect(app.element('backup-preview').hidden).toBe(false);
  expect(app.retry()).toBe(true);
  expect(app.count()).toBe(1);
  app.click('backup-apply');
  expect(app.persisted()).toEqual([...original, incoming]);
  expect(app.writes).toHaveLength(1);
  expect(app.element('paste').value).toBe('Unsaved email UNSAVED-DRAFT');
  app.click('backup-export');
  expect(JSON.parse(await app.blobs[0].text()).orders).toEqual([...original, incoming]);
});

test('empty stored bytes refuse backup export and import until an explicit confirmed reset', async () => {
  const app = await open('');
  const incoming = storedOrder('RESTORED-A');
  app.click('backup-export');
  await app.choose(exportBackup([incoming]));
  app.click('backup-apply');
  expect(app.downloads).toHaveLength(0);
  expect(app.writes).toHaveLength(0);
  expect(app.raw()).toBe('');
  expect(app.element('storage-retry').hidden).toBe(false);
  expect(app.element('backup-message').attributes.role).toBe('alert');
  app.confirm(false); app.clear();
  expect(app.raw()).toBe('');
  app.confirm(true); app.clear();
  expect(app.raw()).toBe('[]');
  expect(app.element('storage-retry').hidden).toBe(true);
  await app.choose(exportBackup([incoming])); app.click('backup-apply');
  expect(app.persisted()).toEqual([incoming]);
  app.click('backup-export');
  expect(JSON.parse(await app.blobs[0].text()).orders).toEqual([incoming]);
});
