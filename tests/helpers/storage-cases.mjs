import assert from 'node:assert/strict';
import { storedOrder } from './storage-fixture.mjs';

export const storageCases = [
  ['failed add preserves the draft and retry stores exactly one order', async open => {
    const app = await open([]); app.draft('ONE'); app.failNext();
    assert.doesNotThrow(() => app.submit());
    app.refresh(); assert.equal(app.count(), 0); assert.deepEqual(app.persisted(), []);
    assert.equal(app.elements.get('preview').hidden, false);
    assert.equal(app.elements.get('paste').value, 'Unsaved email ONE');
    assert.equal(app.elements.get('preview').fields.orderNo, 'ONE');
    const error = app.elements.get('storage-error');
    assert.equal(error.hidden, false); assert.ok(error.textContent.length > 0);
    assert.equal(app.globals.document.activeElement, error);
    app.submit(); assert.equal(app.count(), 1); assert.equal(app.persisted().length, 1);
    assert.equal(app.persisted()[0].orderNo, 'ONE');
    assert.equal(app.elements.get('preview').hidden, true);
    assert.equal(app.elements.get('paste').value, '');
    assert.equal(error.hidden, true); assert.equal(error.textContent, '');
  }],
  ['repeated refused adds cannot accumulate hidden orders', async open => {
    const app = await open([]); app.draft('RETRY'); app.failNext(2);
    app.submit(); app.submit(); app.refresh(); assert.equal(app.count(), 0);
    app.submit(); assert.equal(app.persisted().length, 1);
    assert.deepEqual(app.attempts.map(rows => rows.length), [1, 1, 1]);
  }],
  ['failed remove cannot erase a saved row from the next successful add', async open => {
    const app = await open([storedOrder('A'), storedOrder('B')]); app.failNext();
    assert.doesNotThrow(() => app.remove('A')); app.refresh(); assert.equal(app.count(), 2);
    assert.deepEqual(app.persisted().map(row => row.id), ['A', 'B']);
    app.draft('C'); app.submit();
    assert.deepEqual(app.persisted().map(row => row.orderNo), ['A', 'B', 'C']);
    assert.equal(app.elements.get('storage-error').hidden, true);
  }],
  ['failed clear cannot erase saved rows from the next successful add', async open => {
    const app = await open([storedOrder('A'), storedOrder('B')]); app.failNext();
    assert.doesNotThrow(() => app.clear()); app.refresh(); assert.equal(app.count(), 2);
    app.draft('C'); app.submit();
    assert.deepEqual(app.persisted().map(row => row.orderNo), ['A', 'B', 'C']);
  }],
  ['canceled clear and successful remove/clear keep their prior behavior', async open => {
    const app = await open([storedOrder('A'), storedOrder('B')]); app.confirm(false);
    app.clear(); assert.equal(app.attempts.length, 0); assert.equal(app.count(), 2);
    app.remove('A'); assert.equal(app.count(), 1);
    assert.deepEqual(app.persisted().map(row => row.id), ['B']);
    app.confirm(true); app.clear(); assert.equal(app.count(), 0); assert.deepEqual(app.persisted(), []);
  }],
  ['the error region is hidden initially and exposes its accessible focus target', async open => {
    const app = await open([]); const error = app.elements.get('storage-error');
    assert.ok(error); assert.equal(error.hidden, true);
    assert.equal(error.attributes.role, 'alert'); assert.equal(error.attributes.tabindex, '-1');
  }],
];
