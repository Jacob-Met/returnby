import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bindOrderEditor } from '../src/edit-ui';
import { storageFixture, storedOrder } from './helpers/storage-fixture.mjs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
afterEach(() => vi.unstubAllGlobals());

function setup() {
  const original = storedOrder('saved-1');
  const other = storedOrder('saved-2');
  const app = storageFixture(html, [original, other]);
  const get = id => app.elements.get(id);
  app.globals.document.querySelectorAll = () => [];
  for (const element of app.elements.values()) element.removeAttribute = key => { delete element.attributes[key]; };
  const dialog = get('edit-dialog');
  dialog.open = false;
  dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; dialog.listeners.get('close')(); };
  for (const [name, value] of Object.entries(app.globals)) vi.stubGlobal(name, value);
  const state = { current: [original, other], refuseRead: false, refuseWrite: false, writes: [], refreshes: 0 };
  const editor = bindOrderEditor({
    getOrders: () => [original, other],
    read: () => { if (state.refuseRead) throw Error('Authored read refusal'); return state.current; },
    commit: next => {
      if (state.refuseWrite) return false;
      state.writes.push(next); state.current = next; return true;
    },
    refresh: () => { state.refreshes++; },
  });
  const dispatch = (id, type) => get(id).listeners.get(type)({ preventDefault() {} });
  return {
    ...app, state, original, other, dialog, get, editor,
    input(id, value) { get(id).value = value; dispatch('edit-form', 'input'); },
    save: () => dispatch('edit-form', 'submit'),
    cancel: () => dispatch('edit-cancel', 'click'),
  };
}

describe('saved-order editor handlers', () => {
  it('previews the proposed deadline before saving and Cancel writes nothing', () => {
    const app = setup();
    app.editor.open('saved-1');
    expect(app.get('edit-current-deadline').textContent).toBe('2026-10-31');
    app.input('edit-window-days', '45');
    expect(app.get('edit-proposed-deadline').textContent).toBe('2026-11-15');
    expect(app.state.writes).toEqual([]);
    app.cancel();
    expect(app.dialog.open).toBe(false);
    expect(app.state.current[0]).toBe(app.original);
  });

  it('saves the selected order once while retaining unrelated orders and the new-order draft', () => {
    const app = setup();
    app.draft('UNSAVED');
    app.editor.open('saved-1');
    app.input('edit-order-date', '2026-10-03');
    app.input('edit-window-days', '45');
    app.save();
    expect(app.state.writes).toHaveLength(1);
    expect(app.state.current[0]).toMatchObject({ id: app.original.id, createdAt: app.original.createdAt, orderDate: '2026-10-03', windowDays: 45 });
    expect(app.state.current[1]).toBe(app.other);
    expect(app.get('paste').value).toBe('Unsaved email UNSAVED');
    expect(app.get('preview').hidden).toBe(false);
    expect(app.dialog.open).toBe(false);
    expect(app.get('edit-feedback').textContent).toContain('2026-11-17');
  });

  it('retains the draft and saved data through a failed write and a successful retry', () => {
    const app = setup();
    app.editor.open('saved-1');
    app.input('edit-total', '$25.00');
    app.state.refuseWrite = true;
    app.save();
    expect(app.dialog.open).toBe(true);
    expect(app.state.current[0]).toBe(app.original);
    expect(app.get('edit-total').value).toBe('$25.00');
    expect(app.get('edit-message').textContent).toContain("Couldn't save");
    app.state.refuseWrite = false;
    app.save();
    expect(app.state.writes).toHaveLength(1);
    expect(app.state.current[0].total).toBe('$25.00');
  });

  it('retains the draft through read refusal and detects a target changed before retry', () => {
    const app = setup();
    app.editor.open('saved-1');
    app.input('edit-window-days', '45');
    app.state.refuseRead = true;
    app.save();
    expect(app.get('edit-message').textContent).toContain("Couldn't read");
    app.state.refuseRead = false;
    app.state.current = [{ ...app.original, total: '$90.00' }, app.other];
    app.save();
    expect(app.get('edit-message').textContent).toContain('changed while');
    expect(app.state.refreshes).toBe(1);
    expect(app.state.writes).toEqual([]);
    expect(app.dialog.open).toBe(true);
    expect(app.get('edit-window-days').value).toBe('45');
  });

  it('uses a freshly read tracker to preserve a newly added unrelated order', () => {
    const app = setup();
    app.editor.open('saved-1');
    app.input('edit-total', '$25.00');
    const added = storedOrder('added-after-open');
    app.state.current = [...app.state.current, added];
    app.save();
    expect(app.state.current[2]).toBe(added);
  });

  it('does not resurrect a deleted order or write an unchanged review', () => {
    const app = setup();
    app.editor.open('saved-1');
    app.save();
    expect(app.state.writes).toEqual([]);
    expect(app.dialog.open).toBe(false);
    app.editor.open('saved-1');
    app.input('edit-total', '$25.00');
    app.state.current = [app.other];
    app.save();
    expect(app.get('edit-message').textContent).toContain('removed while');
    expect(app.state.writes).toEqual([]);
    expect(app.state.current).toEqual([app.other]);
  });

  it('blocks invalid values in the preview and again at the submit boundary', () => {
    const app = setup();
    app.editor.open('saved-1');
    app.input('edit-window-days', '0');
    expect(app.get('edit-save').disabled).toBe(true);
    expect(app.get('edit-window-days').attributes['aria-invalid']).toBe('true');
    app.save();
    expect(app.state.writes).toEqual([]);
    expect(app.dialog.open).toBe(true);
    app.input('edit-window-days', '45');
    expect(app.get('edit-save').disabled).toBe(false);
    app.get('edit-order-date').value = '2026-02-30';
    app.save();
    expect(app.state.writes).toEqual([]);
    expect(app.get('edit-message').textContent).toContain('valid order date');
  });
});
