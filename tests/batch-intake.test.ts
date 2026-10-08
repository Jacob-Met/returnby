import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  appendConfirmations, validateDraft, prepareBatch, commitBatch,
  BatchIntakeError, MAX_BATCH_BYTES, MAX_CONFIRMATION_BYTES, type BatchDraft,
} from '../src/batch-intake';

const email = 'From: Contoso\nOrder #ABC-1234\nOrder date: October 3, 2026\nTotal: $34.50';
const base = {
  id: 'saved-original', merchant: 'Old Shop', orderNo: 'OLD-1', total: '€12,50',
  orderDate: '2026-09-01', windowDays: 30, windowSource: 'user',
  createdAt: '2026-09-02T08:00:00.000Z',
};
const clock = () => new Date('2026-10-08T20:00:00.000Z');
const ids = (prefix = 'new') => { let count = 0; return () => prefix + '-' + ++count; };
function draft(label = 'receipt.txt'): BatchDraft {
  return appendConfirmations([], [{ label, text: email }], ids('draft'))[0];
}
function selected(label = 'receipt.txt'): BatchDraft {
  return { ...draft(label), reviewed: true };
}
function storage(initial: string | null = null) {
  let raw = initial;
  let reads = 0;
  let writes = 0;
  const port = {
    getItem(key: string) { expect(key).toBe('returnby.v1'); reads++; return raw; },
    setItem(key: string, value: string) { expect(key).toBe('returnby.v1'); writes++; raw = value; },
  };
  vi.stubGlobal('localStorage', port);
  return { port, raw: () => raw, replace: (value: string | null) => { raw = value; }, writes: () => writes, reads: () => reads };
}
afterEach(() => vi.unstubAllGlobals());

describe('local confirmations and explicit field review', () => {
  it('uses the shipped parser and policy without approving extraction', () => {
    const value = draft();
    expect(value.fields).toEqual({
      merchant: 'Contoso', orderNo: 'ABC-1234', total: '$34.50',
      orderDate: '2026-10-03', windowDays: '15',
    });
    expect(value.text).toBe(email);
    expect(value.reviewed).toBe(false);
    expect(Object.values(value.found).every(Boolean)).toBe(true);
  });

  it('appends ordered separate sources without replacing corrections or review state', () => {
    const first = selected('first.txt');
    first.fields.total = 'corrected amount';
    const before = structuredClone(first);
    const result = appendConfirmations([first], [{ label: 'second.txt', text: email }], ids('next-draft'));
    expect(result.map(item => item.label)).toEqual(['first.txt', 'second.txt']);
    expect(result[0]).toEqual(before);
    expect(first).toEqual(before);
    expect(result[1].reviewed).toBe(false);
  });

  it.each([
    [{ label: 'empty.txt', text: '   ' }],
    [{ label: 'binary.txt', text: 'bad\0text' }],
    [{ label: 'x'.repeat(257), text: email }],
    [{ label: 'large.txt', text: 'é'.repeat(MAX_CONFIRMATION_BYTES / 2 + 1) }],
    Array.from({ length: 21 }, (_, i) => ({ label: i + '.txt', text: email })),
    Array.from({ length: 11 }, (_, i) => ({ label: i + '.txt', text: 'a'.repeat(MAX_CONFIRMATION_BYTES) })),
  ].map(incoming => ({ incoming })))('refuses the complete incoming group while retaining previous drafts', ({ incoming }) => {
    const existing = selected('kept.txt');
    const before = structuredClone(existing);
    expect(() => appendConfirmations([existing], incoming, ids('new-draft'))).toThrow(BatchIntakeError);
    expect(existing).toEqual(before);
  });

  it('counts existing text toward the total byte bound', () => {
    const existing = Array.from({ length: 10 }, (_, i) => ({
      ...draft(), id: 'old-' + i, text: 'a'.repeat(MAX_CONFIRMATION_BYTES),
    }));
    const remaining = MAX_BATCH_BYTES - 10 * MAX_CONFIRMATION_BYTES;
    expect(() => appendConfirmations(existing, [{ label: 'one.txt', text: 'a'.repeat(remaining + 1) }], ids())).toThrow(/1 MiB/);
  });

  it('refuses a repeated generated draft identifier instead of replacing a row', () => {
    const first = draft();
    expect(() => appendConfirmations([first], [{ label: 'second.txt', text: email }], () => first.id)).toThrow(/identifier/);
  });

  it.each(['', '2026-02-30', '0999-12-30', '2026-13-01'])('refuses unsupported order date %s', orderDate => {
    const value = selected();
    value.fields.orderDate = orderDate;
    expect(() => validateDraft(value)).toThrow(BatchIntakeError);
  });

  it.each(['', '0', '-3', '1.5', 'NaN', 'Infinity', '9007199254740991'])('refuses uncalculable window %s before preparing a write', windowDays => {
    const value = selected();
    value.fields.windowDays = windowDays;
    expect(() => validateDraft(value)).toThrow(BatchIntakeError);
  });

  it('refuses a deadline whose next calendar day cannot be represented', () => {
    const value = selected();
    value.fields.orderDate = '9999-12-30';
    value.fields.windowDays = '1';
    expect(() => validateDraft(value)).toThrow(/export/);
  });

  it('attributes corrected fields to the submitted merchant and chosen days', () => {
    const value = selected();
    value.fields.merchant = 'Unlisted Paper Shop';
    expect(validateDraft(value).windowSource).toBe('user');
    value.fields.windowDays = '30';
    expect(validateDraft(value).windowSource).toBe('default');
    value.fields.merchant = 'Contoso';
    value.fields.windowDays = '15';
    expect(validateDraft(value).windowSource).toBe('policy');
  });
});

describe('immutable reviewed append through the native store', () => {
  it('preserves every existing JSON field and appends only explicitly selected reviewed fields', () => {
    const previous = [{ ...base, completedAt: '2026-09-10T12:00:00.000Z', extra: { labels: ['Keep', 3, null], nested: { enabled: true } } }];
    const state = storage(JSON.stringify(previous));
    const first = selected();
    first.fields.total = 'USD 34.50 — literal';
    const held = draft('not-selected.txt');
    held.id = 'held';
    const review = prepareBatch([first, held], state.port, { makeId: ids(), now: clock });
    expect(state.writes()).toBe(0);
    expect(review.existingCount).toBe(1);
    expect(review.orders[0].createdAt).toBe('2026-10-08T20:00:00.000Z');
    expect(Object.isFrozen(review)).toBe(true);
    expect(Object.isFrozen(review.orders[0])).toBe(true);
    expect(commitBatch(review, state.port)).toEqual([first.id]);
    expect(state.writes()).toBe(1);
    const saved = JSON.parse(state.raw()!);
    expect(saved[0]).toEqual(previous[0]);
    expect(saved[1]).toEqual({
      id: 'new-1', createdAt: '2026-10-08T20:00:00.000Z',
      merchant: 'Contoso', orderNo: 'ABC-1234', total: 'USD 34.50 — literal',
      orderDate: '2026-10-03', windowDays: 15, windowSource: 'policy',
    });
    expect(saved[1]).not.toHaveProperty('text');
    expect(saved[1]).not.toHaveProperty('label');
    expect(saved).toHaveLength(2);
  });

  it('keeps the final preview independent of later draft-object mutations', () => {
    const state = storage();
    const value = selected();
    const review = prepareBatch([value], state.port, { makeId: ids(), now: clock });
    value.fields.merchant = 'Changed afterward';
    expect(review.orders[0].merchant).toBe('Contoso');
    expect(JSON.parse(review.nextRaw)[0].merchant).toBe('Contoso');
  });

  it('does not treat an unreviewed or late-invalid order as partially saveable', () => {
    const state = storage();
    expect(() => prepareBatch([draft()], state.port)).toThrow(/select/);
    const good = selected();
    const bad = { ...selected(), id: 'second', fields: { ...selected().fields, orderDate: '' } };
    expect(() => prepareBatch([good, bad], state.port)).toThrow(/real order date/);
    expect(state.writes()).toBe(0);
    expect(state.raw()).toBeNull();
  });

  it.each(['not json', '{}', '[null]', JSON.stringify([{ ...base, orderDate: '2026-02-30' }]), JSON.stringify([base, base])])(
    'refuses the whole existing saved collection %s', raw => {
      const state = storage(raw);
      expect(() => prepareBatch([selected()], state.port)).toThrow(/complete saved list/);
      expect(state.raw()).toBe(raw);
      expect(state.writes()).toBe(0);
    },
  );

  it('refuses a combined list over the shipped reader count without a write', () => {
    const previous = Array.from({ length: 2000 }, (_, i) => ({ ...base, id: 'old-' + i }));
    const state = storage(JSON.stringify(previous));
    expect(() => prepareBatch([selected()], state.port, { makeId: ids() })).toThrow(/appended list/);
    expect(state.writes()).toBe(0);
  });

  it('refuses a generated identity colliding with existing or newly prepared IDs', () => {
    const state = storage(JSON.stringify([base]));
    expect(() => prepareBatch([selected()], state.port, { makeId: () => base.id })).toThrow(/identifier/);
    const second = { ...selected(), id: 'second-draft' };
    expect(() => prepareBatch([selected(), second], state.port, { makeId: () => 'same-new-id' })).toThrow(/identifier/);
    expect(state.writes()).toBe(0);
  });

  it('requires explicit acknowledgement of saved and within-batch identity matches', () => {
    const state = storage(JSON.stringify([{ ...base, merchant: ' contoso ', orderNo: 'abc-1234' }]));
    const first = selected('a.txt');
    const second = { ...selected('b.txt'), id: 'second-draft' };
    const review = prepareBatch([first, second], state.port, { makeId: ids(), now: clock });
    expect(review.duplicates).toHaveLength(2);
    expect(review.duplicates[0].match).toContain('saved order');
    expect(review.duplicates[1].match).toContain('confirmation a.txt');
    expect(() => commitBatch(review, state.port)).toThrow(/acknowledge/);
    expect(state.writes()).toBe(0);
    expect(commitBatch(review, state.port, true)).toHaveLength(2);
    expect(JSON.parse(state.raw()!)).toHaveLength(3);
  });

  it('does not infer a duplicate from an unknown store or missing order number', () => {
    const state = storage(JSON.stringify([{ ...base, merchant: '', orderNo: '' }]));
    const value = selected();
    value.fields.merchant = '';
    value.fields.orderNo = '';
    const review = prepareBatch([value], state.port, { makeId: ids(), now: clock });
    expect(review.duplicates).toEqual([]);
  });

  it('refuses a stale snapshot and retains the newer exact bytes', () => {
    const state = storage(JSON.stringify([base]));
    const review = prepareBatch([selected()], state.port, { makeId: ids(), now: clock });
    const newer = JSON.stringify([{ ...base, total: 'corrected elsewhere', unknown: 9 }]);
    state.replace(newer);
    expect(() => commitBatch(review, state.port)).toThrow(/changed/);
    expect(state.raw()).toBe(newer);
    expect(state.writes()).toBe(0);
    const fresh = prepareBatch([selected()], state.port, { makeId: ids(), now: clock });
    commitBatch(fresh, state.port);
    expect(JSON.parse(state.raw()!)[0]).toEqual(JSON.parse(newer)[0]);
  });

  it('refuses both initial and final read failures without a write', () => {
    const state = storage();
    expect(() => prepareBatch([selected()], { getItem() { throw new Error('blocked'); } })).toThrow(/could not be read/);
    const review = prepareBatch([selected()], state.port, { makeId: ids(), now: clock });
    expect(() => commitBatch(review, { getItem() { throw new Error('blocked'); } })).toThrow(/could not be read/);
    expect(state.writes()).toBe(0);
  });

  it('retains the exact preview for a refused write and succeeds once on retry', () => {
    const state = storage();
    const value = selected();
    const review = prepareBatch([value], state.port, { makeId: ids(), now: clock });
    const before = structuredClone(value);
    expect(() => commitBatch(review, state.port, false, () => { throw new Error('quota'); })).toThrow(/could not be saved/);
    expect(value).toEqual(before);
    expect(state.raw()).toBeNull();
    commitBatch(review, state.port);
    expect(state.writes()).toBe(1);
    expect(() => commitBatch(review, state.port)).toThrow(/fresh selection preview/);
    expect(state.writes()).toBe(1);
  });

  it('does not append again if an outgoing writer changed storage and then threw', () => {
    const state = storage();
    const review = prepareBatch([selected()], state.port, { makeId: ids(), now: clock });
    expect(() => commitBatch(review, state.port, false, orders => {
      state.port.setItem('returnby.v1', JSON.stringify(orders));
      throw new Error('reported late failure');
    })).toThrow(/could not be saved/);
    expect(() => commitBatch(review, state.port)).toThrow(/changed/);
    expect(state.writes()).toBe(1);
    expect(JSON.parse(state.raw()!)).toHaveLength(1);
  });
});
