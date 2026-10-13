import { describe, expect, it } from 'vitest';
import { parse } from '../src/parse';

const continuedAmounts = [
  '$12.3', '$12.3456', '€1.234,56', '£12.34,56',
  '$12.34.56', '$1,234.567', '$0.1', '$123456789.0123',
];

describe('total decimal-tail admission', () => {
  it.each(continuedAmounts)('does not mark the numeric prefix of %s as recognized', amount => {
    const result = parse('Total: ' + amount);
    expect(result.total).toBe('');
    expect(result.found.total).toBe(false);
  });

  it.each([
    ['Order Total: $1,234.50', '$1,234.50'],
    ['total € 9.00', '€9.00'],
    ['TOTAL:£12', '£12'],
    ['Total: €19,99', '€19,99'],
    ['Total: $0.00', '$0.00'],
    ['Total: $000.00', '$000.00'],
    ['Total: $12.34. Thank you.', '$12.34'],
    ['Total: $12.34, thanks', '$12.34'],
    ['Total: $12.34!', '$12.34'],
    ['Total: $12.34 USD', '$12.34'],
    ['Total: $12.', '$12'],
  ])('keeps the existing complete amount in %s', (text, expected) => {
    expect(parse(text).total).toBe(expected);
    expect(parse(text).found.total).toBe(true);
  });

  it.each([
    ['Total: $12.3\nOrder total: $12.30', '$12.30'],
    ['Total: €1.234,56\nTotal: €1,234.56', '€1,234.56'],
    ['Total: $10.00\nOrder total: $12.3456', '$10.00'],
    ['Subtotal: $50.00\nTotal: $55.00', '$55.00'],
    ['Subtotal: $50.00\nTotal: $12.3', ''],
  ])('selects the first complete supported label in %s', (text, expected) => {
    const result = parse(text);
    expect(result.total).toBe(expected);
    expect(result.found.total).toBe(expected !== '');
  });

  it('keeps every non-total field and flag when a partial amount needs review', () => {
    const prefix = 'From: Fictional Example Store <orders@example.test>\n'
      + 'Order #AB-12345\nOrder date: October 3, 2026\n';
    for (const amount of continuedAmounts) {
      expect(parse(prefix + 'Total: ' + amount)).toEqual({
        merchant: 'Fictional Example Store',
        orderDate: '2026-10-03',
        orderNo: 'AB-12345',
        total: '',
        found: { merchant: true, orderDate: true, orderNo: true, total: false },
      });
    }
  });
});
