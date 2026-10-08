import { describe, expect, it } from 'vitest';
import { orderForDisplay } from '../src/list-order';

const row = (id: string, merchant: string, left: number) => ({
  o: { id, merchant, note: 'retained ' + id }, left,
});
const ids = (rows: ReturnType<typeof row>[]) => rows.map(r => r.o.id);

describe('saved-list store order', () => {
  it('keeps the existing deadline sequence and its exact row identities by default', () => {
    const rows = [row('late', 'Zeta', -2), row('soon', 'Acme', 1), row('later', 'Zeta', 3)];
    const result = orderForDisplay(rows, 'deadline');
    expect(ids(result)).toEqual(['late', 'soon', 'later']);
    expect(result).not.toBe(rows);
    result.forEach((r, i) => expect(r).toBe(rows[i]));
  });

  it('brings a store together and uses deadlines within it without changing saved values', () => {
    const rows = [row('z1', 'Zeta', -1), row('a', 'Acme', 0), row('z2', 'Zeta', 2), row('b', 'Birch', 3)];
    const before = JSON.stringify(rows);
    const result = orderForDisplay(rows, 'store');
    expect(ids(result)).toEqual(['a', 'b', 'z1', 'z2']);
    expect(JSON.stringify(rows)).toBe(before);
    expect(new Set(result)).toEqual(new Set(rows));
  });

  it('keeps case, spacing and canonically equivalent names contiguous without merging records', () => {
    const rows = [row('z', 'Zulu', 0), row('a2', '  ACME   Books ', 3), row('e2', 'Cafe\u0301', 2),
      row('a1', 'acme books', 1), row('e1', 'Caf\u00e9', 1)];
    expect(ids(orderForDisplay(rows, 'store'))).toEqual(['a1', 'a2', 'e1', 'e2', 'z']);
    expect(rows[1].o.merchant).toBe('  ACME   Books ');
    expect(rows[2].o.merchant).toBe('Cafe\u0301');
  });

  it('keeps equal store/deadline rows stable and unnamed stores last', () => {
    const rows = [row('blank1', '', -10), row('a-first', 'Acme', 1),
      row('blank2', ' \t ', -2), row('a-second', 'ACME', 1), row('z', 'Zulu', 20)];
    expect(ids(orderForDisplay(rows, 'store'))).toEqual(['a-first', 'a-second', 'z', 'blank1', 'blank2']);
  });

  it('preserves filter membership and can restore deadline order after a store view', () => {
    const rows = [row('old', 'Acme', -1), row('z1', 'Zeta', 0), row('a', 'Acme', 5), row('z2', 'Zeta', 8)];
    const due = rows.filter(r => r.left >= 0 && r.left <= 7);
    expect(ids(orderForDisplay(due, 'store'))).toEqual(['a', 'z1']);
    expect(ids(orderForDisplay(rows, 'deadline'))).toEqual(['old', 'z1', 'a', 'z2']);
    expect(ids(rows)).toEqual(['old', 'z1', 'a', 'z2']);
  });
});
