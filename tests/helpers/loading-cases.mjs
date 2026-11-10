import assert from 'node:assert/strict';
import { storedOrder } from './storage-fixture.mjs';

const initial = () => JSON.stringify([storedOrder('SAVED-A')]);
function blocked(app, raw) {
  assert.equal(app.raw(), raw);
  const error = app.elements.get('storage-error');
  assert.equal(error.hidden, false);
  assert.match(error.textContent, /load saved returns/i);
  assert.equal(app.globals.document.activeElement, error);
  assert.equal(app.elements.get('storage-retry')?.hidden, false);
  for (const id of ['tracked-count', 'soon-count', 'expired-count']) {
    assert.equal(app.elements.get(id).textContent, '—');
  }
}

export const loadingCases = [
  ['a failed initial read cannot erase an existing return through a later save', async open => {
    const raw = initial(); const app = await open(raw, 1);
    app.draft('NEW-B'); app.submit(); app.refresh();
    assert.equal(app.raw(), raw); assert.equal(app.writes.length, 0);
    assert.equal(app.elements.get('preview').hidden, false);
    assert.equal(app.elements.get('preview').fields.orderNo, 'NEW-B');
    blocked(app, raw);
  }],
  ['retry loading restores saved rows and preserves the unsaved draft before append', async open => {
    const raw = initial(); const app = await open(raw, 1);
    app.draft('NEW-B'); assert.equal(app.retry(), true);
    assert.equal(app.count(), 1); assert.equal(app.raw(), raw); assert.equal(app.writes.length, 0);
    assert.equal(app.elements.get('preview').fields.orderNo, 'NEW-B');
    assert.equal(app.elements.get('paste').value, 'Unsaved email NEW-B');
    assert.equal(app.elements.get('storage-error').hidden, true);
    assert.equal(app.elements.get('storage-retry').hidden, true);
    app.submit();
    assert.deepEqual(app.persisted().map(row => row.orderNo), ['SAVED-A', 'NEW-B']);
    assert.equal(app.count(), 2);
  }],
  ['repeated loading failures leave bytes and the blocked state intact', async open => {
    const raw = initial(); const app = await open(raw, 3);
    for (let i = 0; i < 2; i++) { assert.equal(app.retry(), true); blocked(app, raw); }
    app.draft('NEW-B'); app.submit(); assert.equal(app.writes.length, 0);
    assert.equal(app.retry(), true); assert.equal(app.count(), 1);
    app.submit(); assert.equal(app.persisted().length, 2);
  }],
  ['invalid JSON and non-array roots are preserved without a startup crash or write', async open => {
    for (const raw of ['', '{', 'null', '{}', 'false', '42', '"saved"']) {
      const app = await open(raw); app.draft('NEW-B'); app.submit();
      assert.equal(app.raw(), raw); assert.equal(app.writes.length, 0); blocked(app, raw);
    }
  }],
  ['a malformed record blocks the whole list instead of silently discarding valid rows', async open => {
    const badRecords = [null, {}, { ...storedOrder('BAD'), windowDays: '30' },
      { ...storedOrder('BAD'), merchant: 12 }, { ...storedOrder('BAD'), orderDate: null },
      { ...storedOrder('BAD'), orderNo: {} }, { ...storedOrder('BAD'), windowSource: 'unknown' }];
    for (const bad of badRecords) {
      const raw = JSON.stringify([storedOrder('SAVED-A'), bad]);
      const app = await open(raw); app.draft('NEW-B'); app.submit();
      assert.equal(app.raw(), raw); assert.equal(app.writes.length, 0); blocked(app, raw);
    }
  }],
  ['corrected stored bytes can be retried without clearing or replacing the draft', async open => {
    const app = await open('{'); app.draft('NEW-B');
    app.setRaw(initial()); assert.equal(app.retry(), true);
    assert.equal(app.writes.length, 0); assert.equal(app.count(), 1);
    app.submit(); assert.deepEqual(app.persisted().map(row => row.orderNo), ['SAVED-A', 'NEW-B']);
  }],
  ['canceling an explicit reset preserves blocked bytes and permits later retry', async open => {
    const raw = initial(); const app = await open(raw, 1);
    app.confirm(false); app.clear();
    assert.equal(app.raw(), raw); assert.equal(app.writes.length, 0); blocked(app, raw);
    assert.equal(app.retry(), true); assert.equal(app.count(), 1);
  }],
  ['confirmed reset is the explicit recovery path for unreadable stored data', async open => {
    const app = await open('{'); app.confirm(true); app.clear();
    assert.equal(app.raw(), '[]'); assert.equal(app.count(), 0);
    assert.equal(app.elements.get('storage-error').hidden, true);
    assert.equal(app.elements.get('storage-retry').hidden, true);
    app.draft('NEW-B'); app.submit(); assert.equal(app.persisted().length, 1);
  }],
  ['a refused reset leaves the original data protected until successful retry', async open => {
    const raw = initial(); const app = await open(raw, 1);
    app.failWrite(); app.clear(); assert.equal(app.raw(), raw);
    assert.equal(app.elements.get('storage-error').hidden, false);
    assert.equal(app.elements.get('storage-retry')?.hidden, false);
    app.draft('NEW-B'); app.submit(); assert.equal(app.writes.length, 1);
    assert.equal(app.raw(), raw); assert.equal(app.retry(), true);
    app.submit(); assert.deepEqual(app.persisted().map(row => row.orderNo), ['SAVED-A', 'NEW-B']);
  }],
  ['valid stored records including unknown extra fields survive the normal save path', async open => {
    const saved = { ...storedOrder('SAVED-A'), extra: { authored: true } };
    const raw = JSON.stringify([saved]); const app = await open(raw);
    assert.equal(app.count(), 1); assert.equal(app.raw(), raw);
    assert.equal(app.elements.get('storage-error').hidden, true);
    app.draft('NEW-B'); app.submit(); assert.deepEqual(app.persisted()[0], saved);
    assert.equal(app.persisted()[1].windowSource, 'default');
  }],
  ['an absent key starts empty without showing a loading error', async open => {
    const app = await open(null);
    assert.equal(app.count(), 0); assert.equal(app.elements.get('storage-error').hidden, true);
    assert.equal(app.elements.get('storage-retry')?.hidden, true);
    app.draft('NEW-B'); app.submit(); assert.equal(app.persisted().length, 1);
  }],
];
