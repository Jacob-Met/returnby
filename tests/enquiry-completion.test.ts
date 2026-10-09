import { describe, expect, it } from 'vitest';
import type { Order } from '../src/store';
import { planCompletion } from '../src/completion';
import { assertSnapshotCurrent, parseSavedOrders, readSavedOrders, SAVED_ORDERS_KEY } from '../src/trip-checklist';
import { buildEnquiry, formatEnquiry, type EnquiryInput } from '../src/enquiry';

// Authored composition controls. No native execution is claimed by this contribution.
const order = (id: string, overrides: Partial<Order> = {}): Order => ({
  id, merchant: 'Fictional <Shop> & Co', orderNo: '00042',
  total: 'USD 001.20', orderDate: '2026-10-03', windowDays: 30,
  windowSource: 'user', createdAt: '2026-10-03T12:00:00Z', ...overrides,
});
const input: EnquiryInput = {
  items: 'Blue shirt\nSize M', reason: '', request: 'instructions', signature: '',
};
const expectedBody = [
  'Hello,', '', 'I would like to ask about the following order.', '',
  'Store: Fictional <Shop> & Co', 'Order number: 00042', 'Order date: 2026-10-03', '',
  'Items I am asking about:', 'Blue shirt\nSize M', '',
  'Could you confirm whether these items can be returned and how to arrange it?',
  'Please include the relevant deadline, any charges, and any packaging or proof-of-purchase requirements.',
  '', 'Thank you.',
].join('\n');
const completedAt = '2026-10-07T12:00:00Z';
const reader = (raw: string | null) => ({
  getItem(key: string) { expect(key).toBe(SAVED_ORDERS_KEY); return raw; },
});

describe('enquiry composed with the unchanged completed-return reader', () => {
  it('offers only open identities in original order while retaining every raw byte', () => {
    const rows = [
      order('open-A'),
      { ...order('closed-C', { completedAt }), evidence: { note: '<literal> 😀' } },
      order('open-B', { merchant: 'Second shop' }),
    ];
    const raw = JSON.stringify(rows, null, 2);
    const snapshot = readSavedOrders(reader(raw));
    const before = JSON.stringify(snapshot);
    expect(snapshot.orders.map(row => row.id)).toEqual(['open-A', 'open-B']);
    expect(snapshot.raw).toBe(raw);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.orders)).toBe(true);
    expect(buildEnquiry(snapshot, 'open-A', input).body).toBe(expectedBody);
    expect(() => buildEnquiry(snapshot, 'closed-C', input)).toThrow('Choose a saved order');
    expect(JSON.stringify(snapshot)).toBe(before);
    expect(JSON.stringify(rows, null, 2)).toBe(raw);
  });

  it('does not invent an open order from a completed-only collection', () => {
    const raw = JSON.stringify([order('closed-C', { completedAt })]);
    const snapshot = parseSavedOrders(raw);
    expect(snapshot.orders).toEqual([]);
    expect(snapshot.raw).toBe(raw);
    expect(() => buildEnquiry(snapshot, 'closed-C', input)).toThrow('Choose a saved order');
    expect(() => buildEnquiry(snapshot, '', input)).toThrow('Choose a saved order');
  });

  it('admits every hidden row before filtering, including markers, fields and duplicate identities', () => {
    const open = order('open-A');
    const hidden = order('closed-C', { completedAt });
    for (const invalid of [
      { ...hidden, completedAt: null },
      { ...hidden, completedAt: '2026-10-07' },
      { ...hidden, merchant: 3 },
      { ...hidden, orderDate: '2026-02-30' },
      { ...hidden, id: open.id },
    ]) {
      const raw = JSON.stringify([open, invalid]);
      expect(() => parseSavedOrders(raw)).toThrow();
      expect(JSON.stringify([open, invalid])).toBe(raw);
    }
  });

  it('binds preparation to Complete/Reopen and restores the same literal enquiry after explicit reread', () => {
    const initial = [order('open-A'), order('open-B', { merchant: 'Other shop' })];
    const initialBytes = JSON.stringify(initial);
    const snapshot = parseSavedOrders(initialBytes);
    const draft = buildEnquiry(snapshot, 'open-A', input);
    const completed = planCompletion(initial, initial[0], 'complete', new Date('2026-10-09T10:00:00Z'));
    const completedRaw = JSON.stringify(completed.next);
    expect(completed.changed).toBe(true);
    expect(() => assertSnapshotCurrent(snapshot, reader(completedRaw))).toThrow('Saved orders changed');
    const refreshed = parseSavedOrders(completedRaw);
    expect(refreshed.orders.map(row => row.id)).toEqual(['open-B']);
    expect(() => buildEnquiry(refreshed, 'open-A', input)).toThrow('Choose a saved order');

    const reopened = planCompletion(completed.next, completed.order, 'reopen');
    const reopenedRaw = JSON.stringify(reopened.next);
    expect(reopened.changed).toBe(true);
    expect(reopened.next).toEqual(initial);
    expect(() => assertSnapshotCurrent(refreshed, reader(reopenedRaw))).toThrow('Saved orders changed');
    const fresh = parseSavedOrders(reopenedRaw);
    expect(fresh.orders.map(row => row.id)).toEqual(['open-A', 'open-B']);
    expect(buildEnquiry(fresh, 'open-A', input)).toEqual(draft);
    expect(formatEnquiry(draft.subject, draft.body)).toBe(
      'Subject: Return instructions enquiry\r\n\r\n' + expectedBody.replace(/\n/g, '\r\n') + '\r\n',
    );
    expect(JSON.stringify(initial)).toBe(initialBytes);
    // Exact-value freshness deliberately has no revision counter: restoring the
    // exact original raw value makes that original snapshot current again.
    expect(reopenedRaw).toBe(initialBytes);
    expect(() => assertSnapshotCurrent(snapshot, reader(reopenedRaw))).not.toThrow();
  });

  it('refuses a stale snapshot even when only a hidden unknown field or raw whitespace changes', () => {
    const rows = [order('open-A'), { ...order('closed-C', { completedAt }), note: 'before' }];
    const raw = JSON.stringify(rows);
    const snapshot = parseSavedOrders(raw);
    const changes = [
      JSON.stringify([rows[0], { ...rows[1], note: 'after' }]),
      JSON.stringify(rows, null, 2),
    ];
    for (const changed of changes) {
      expect(parseSavedOrders(changed).orders).toEqual(snapshot.orders);
      expect(() => assertSnapshotCurrent(snapshot, reader(changed))).toThrow('Saved orders changed');
    }
    expect(snapshot.raw).toBe(raw);
  });

  it('keeps nested marker-like evidence literal and outside the lifecycle model or message', () => {
    const raw = JSON.stringify([{ ...order('open-A'), evidence: { completedAt, total: 'not money' } }]);
    const snapshot = parseSavedOrders(raw);
    expect(snapshot.orders.map(row => row.id)).toEqual(['open-A']);
    expect(snapshot.raw).toBe(raw);
    const draft = buildEnquiry(snapshot, 'open-A', input);
    expect(draft.body).toBe(expectedBody);
    expect(draft.body).not.toContain(completedAt);
    expect(draft.body).not.toContain('not money');
    expect(draft.body).not.toContain('USD 001.20');
    expect(draft.body).not.toContain('2026-11-02');
  });

  it('propagates read refusal without changing the retained snapshot or already authored draft', () => {
    const raw = JSON.stringify([order('open-A')]);
    const snapshot = parseSavedOrders(raw);
    const draft = buildEnquiry(snapshot, 'open-A', input);
    const before = JSON.stringify({ snapshot, draft });
    const unavailable = { getItem() { throw new Error('fictional denied storage'); } };
    expect(() => readSavedOrders(unavailable)).toThrow('Saved orders could not be read');
    expect(() => assertSnapshotCurrent(snapshot, unavailable)).toThrow('Saved orders could not be read');
    expect(JSON.stringify({ snapshot, draft })).toBe(before);
    expect(() => assertSnapshotCurrent(snapshot, reader(raw))).not.toThrow();
  });
});
