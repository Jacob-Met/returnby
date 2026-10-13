import { describe, expect, it } from 'vitest';
import { findDates, parse } from '../src/parse';

const months = [
  ['January', 'Jan'], ['February', 'Feb'], ['March', 'Mar'], ['April', 'Apr'],
  ['May', 'May'], ['June', 'Jun'], ['July', 'Jul'], ['August', 'Aug'],
  ['September', 'Sep'], ['October', 'Oct'], ['November', 'Nov'], ['December', 'Dec'],
];

describe('exact English month tokens', () => {
  it.each(months)('retains complete %s names and %s abbreviations in both orders', (full, short) => {
    const month = months.findIndex(([name]) => name === full) + 1;
    const date = `2026-${String(month).padStart(2, '0')}-09`;
    for (const token of [full, short, full.toUpperCase(), `${short.toLowerCase()}.`]) {
      for (const text of [`${token} 9, 2026`, `9 ${token} 2026`]) {
        expect(findDates(text), text).toEqual([{ date, index: 0 }]);
      }
    }
  });

  it('retains Sep, Sept, optional periods, whitespace and month-first ordinals', () => {
    for (const text of ['Sept 9, 2026', '9 Sept. 2026', 'September. 9th, 2026', 'sEp.\t9th\n2026']) {
      expect(findDates(text), text).toEqual([{ date: '2026-09-09', index: 0 }]);
    }
  });

  it.each([
    'Janitor', 'Febrile', 'Marchandise', 'Apricot', 'Mayhem', 'Juniper', 'Julyish',
    'Augustus', 'Septet', 'Sepia', 'Octopus', 'Novel', 'Decimal',
    'Janua', 'Februa', 'Marc', 'Apri', 'Septem', 'Octob', 'Novem', 'Decem',
  ])('refuses the arbitrary month-prefix word %s in both orders', (token) => {
    for (const text of [`${token} 9, 2026`, `9 ${token} 2026`]) {
      expect(findDates(text), text).toEqual([]);
      expect(parse(`Order placed: ${text}`).found.orderDate, text).toBe(false);
    }
  });

  it('returns only actual dates with their original offsets and input order', () => {
    const text = '🧾 Octopus 3, 2026; 2026-12-09; March 8, 2026; 7 Sept. 2026; 02/29/2024';
    expect(findDates(text)).toEqual([
      { date: '2026-12-09', index: text.indexOf('2026-12-09') },
      { date: '2026-03-08', index: text.indexOf('March') },
      { date: '2026-09-07', index: text.indexOf('7 Sept.') },
      { date: '2024-02-29', index: text.indexOf('02/29/2024') },
    ]);
  });

  it('preserves calendar validation and numeric formats', () => {
    expect(findDates('February 29, 2026; 31 April 2026; 2026-13-03; 02/30/2024')).toEqual([]);
    for (const text of ['February 29, 2024', '29 Feb. 2024', '2024-02-29', '02/29/2024']) {
      expect(findDates(text), text).toEqual([{ date: '2024-02-29', index: 0 }]);
    }
  });

  it('recovers after correcting a false month while retaining unrelated receipt fields', () => {
    const receipt = 'From: Example Shop <orders@example.test>\nOrder #AB-1234\nOrder placed: Octopus 3, 2026\nSubtotal: $10.00\nTotal: $12.00';
    const rejected = parse(receipt);
    expect(rejected).toEqual({
      merchant: 'Example Shop', orderNo: 'AB-1234', total: '$12.00', orderDate: '',
      found: { merchant: true, orderNo: true, total: true, orderDate: false },
    });
    expect(parse(receipt.replace('Octopus', 'October'))).toEqual({
      ...rejected, orderDate: '2026-10-03', found: { ...rejected.found, orderDate: true },
    });
    expect(parse(receipt)).toEqual(rejected);
  });
});
