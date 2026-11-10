import { describe, expect, it } from 'vitest';
import { buildIcs } from '../src/ics';
import { editDraft, EditConflict, planEdit, previewEdit } from '../src/edit';
import type { EditDraft } from '../src/edit';
import type { Order } from '../src/store';

const saved: Order = {
  id: 'saved-1', merchant: 'Northwind Outfitters', orderNo: 'N-17', total: '$12.00',
  orderDate: '2026-10-01', windowDays: 30, windowSource: 'policy', createdAt: '2026-10-01T14:00:00Z',
};
const correction = (values: Partial<EditDraft> = {}) => ({ ...editDraft(saved), ...values });

describe('saved-order correction', () => {
  it('reviews the new date without mutating the original', () => {
    const before = JSON.stringify(saved);
    const review = previewEdit(saved, correction({ orderDate: '2026-10-03', windowDays: '45' }));
    expect(review.due).toBe('2026-11-17');
    expect(review.order).toMatchObject({ id: saved.id, createdAt: saved.createdAt, windowSource: 'user' });
    expect(JSON.stringify(saved)).toBe(before);
  });

  it('replaces exactly one record and retains a concurrently added unrelated order', () => {
    const other = { ...saved, id: 'other', total: '$88.00' };
    const incoming = { ...saved, id: 'new-since-review' };
    const current = [other, saved, incoming];
    const result = planEdit(current, saved, correction({ total: '$15.00' }));
    expect(result.changed).toBe(true);
    expect(result.next).toHaveLength(3);
    expect(result.next[0]).toBe(other);
    expect(result.next[2]).toBe(incoming);
    expect(result.next[1].total).toBe('$15.00');
    expect(current[1].total).toBe('$12.00');
  });

  it('preserves calendar identity when the deadline is corrected', () => {
    const before = buildIcs({ ...saved, due: '2026-10-31' }, new Date('2026-10-08T00:00:00Z'));
    const review = previewEdit(saved, correction({ windowDays: '45' }));
    const after = buildIcs({ ...review.order, due: review.due }, new Date('2026-10-08T00:00:00Z'));
    expect(before.match(/^UID:.*$/m)?.[0]).toBe(after.match(/^UID:.*$/m)?.[0]);
    expect(after).toContain('DTSTART;VALUE=DATE:20261115');
  });

  it('retains historical attribution when only the date or details change', () => {
    const historical = { ...saved, merchant: 'Unlisted Shop', windowDays: 45, windowSource: 'default' as const };
    const review = previewEdit(historical, { ...editDraft(historical), orderDate: '2026-10-03', total: '$20' });
    expect(review.order.windowDays).toBe(45);
    expect(review.order.windowSource).toBe('default');
  });

  it.each([
    ['Contoso Electronics', '15', 'policy'],
    ['Contoso Electronics', '30', 'user'],
    ['Unknown Fictional Shop', '30', 'default'],
    ['Unknown Fictional Shop', '45', 'user'],
  ])('attributes %s / %s days to the submitted details', (merchant, windowDays, source) => {
    expect(previewEdit(saved, correction({ merchant, windowDays })).order.windowSource).toBe(source);
  });

  it('preserves extra saved fields and omitted optional fields', () => {
    const { orderNo: _number, total: _total, ...withoutOptional } = saved;
    const original = { ...withoutOptional, retained: { source: 'existing local metadata' } };
    const result = planEdit([original], original, { ...editDraft(original), orderDate: '2026-10-02' });
    expect(result.order).not.toHaveProperty('orderNo');
    expect(result.order).not.toHaveProperty('total');
    expect(result.order).toHaveProperty('retained', original.retained);
  });

  it('treats unchanged details as a no-write result', () => {
    const current = [saved];
    const result = planEdit(current, saved, correction());
    expect(result.changed).toBe(false);
    expect(result.next).toBe(current);
  });

  it.each(['', '2026-02-29', '2026-02-30', '2026-13-01', '2026-10-1', '0999-01-01', '10000-01-01'])('rejects invalid date %s', orderDate => {
    expect(() => previewEdit(saved, correction({ orderDate }))).toThrow(/valid order date/);
  });

  it('accepts leap day and computes across a year boundary', () => {
    expect(previewEdit(saved, correction({ orderDate: '2028-02-29', windowDays: '1' })).due).toBe('2028-03-01');
    expect(previewEdit(saved, correction({ orderDate: '2026-12-31', windowDays: '1' })).due).toBe('2027-01-01');
  });

  it.each(['', '0', '-1', '1.5', 'Infinity', 'NaN', '1e2', '0x10', '3700001', '9007199254740992'])('rejects invalid window %s without fallback', windowDays => {
    expect(() => previewEdit(saved, correction({ windowDays }))).toThrow(/positive whole number/);
  });

  it('rejects a window that overflows the supported date range', () => {
    expect(() => previewEdit(saved, correction({ orderDate: '9999-12-31', windowDays: '1' }))).toThrow(/end within/);
  });

  it('keeps the calendar reminder exclusive end date inside the supported range', () => {
    expect(() => previewEdit(saved, correction({ orderDate: '9999-12-30', windowDays: '1' }))).toThrow(/calendar reminder/);
    const review = previewEdit(saved, correction({ orderDate: '9999-12-29', windowDays: '1' }));
    expect(review.due).toBe('9999-12-30');
    expect(buildIcs({ ...review.order, due: review.due })).toContain('DTEND;VALUE=DATE:99991231');
  });

  it('preserves markup-like details as text and bounds text fields', () => {
    const merchant = '<img src=x onerror=alert(1)> & "shop"';
    expect(previewEdit(saved, correction({ merchant })).order.merchant).toBe(merchant);
    expect(() => previewEdit(saved, correction({ total: 'x'.repeat(4097) }))).toThrow(/4,096/);
  });

  it.each([
    [[], 'removed'],
    [[{ ...saved, windowDays: 90 }], 'changed'],
    [[saved, { ...saved }], 'More than one'],
  ])('refuses a stale or ambiguous target', (current, message) => {
    expect(() => planEdit(current as Order[], saved, correction({ total: '$20' }))).toThrow(message as string);
    expect(() => planEdit(current as Order[], saved, correction({ total: '$20' }))).toThrow(EditConflict);
  });
});
