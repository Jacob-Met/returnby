import { describe, expect, it } from 'vitest';
import { parse } from '../src/parse';

describe('purchase date versus shipping and return dates', () => {
  it('does not promote a delivery estimate after an order number into a purchase date', () => {
    const p = parse('From: Sample Shop <receipts@sample.test>\nOrder #KEEP-2000\nExpected delivery: November 24, 2026\nReturn by: December 24, 2026\nTotal: $47.00');
    expect(p).toMatchObject({ orderDate: '', orderNo: 'KEEP-2000', total: '$47.00', found: { orderDate: false } });
    expect(p.dateWarning).toMatch(/purchase date/i);
  });

  it('prioritizes a clear purchase date even when delivery and return dates occur first', () => {
    const p = parse('Order #KEEP-2000\nExpected delivery: November 24, 2026\nReturn by: December 24, 2026\nPurchase date: November 12, 2026');
    expect(p.orderDate).toBe('2026-11-12');
    expect(p.dateWarning).toBeUndefined();
  });

  it('never falls back to shipping after a malformed purchase-date field', () => {
    const p = parse('Order ID: KEEP-2000\nOrder date: pending\nShipped on: November 13, 2026\nDeliver by: November 18, 2026');
    expect(p.orderDate).toBe('');
    expect(p.dateWarning).toMatch(/purchase date/i);
  });

  it('recognizes purchase statements and rejects adjacent shipment dates', () => {
    const p = parse('Your order was placed on November 2, 2026.\nShipping date: November 8, 2026\nReturns must arrive by December 2, 2026.');
    expect(p.orderDate).toBe('2026-11-02');
  });

  it('recognizes an explicit order date across whitespace and unrelated shipping rows', () => {
    const p = parse('Order # KEEP-2000\nDelivery date: November 20, 2026\nORDER  DATE :\n    November 9, 2026');
    expect(p.orderDate).toBe('2026-11-09');
  });

  it('does not create a purchase date from multiple unlabeled dates', () => {
    const p = parse('Sale update: November 2, 2026\nTransit estimate: November 8, 2026\nReturn-label expires: December 3, 2026');
    expect(p.orderDate).toBe('');
    expect(p.dateWarning).toMatch(/purchase date/i);
  });

  it('keeps an ambiguous explicit purchase date unresolved even with a clear ship date', () => {
    const p = parse('Order date: 05/11/2026\nShipped: November 8, 2026');
    expect(p.orderDate).toBe('');
    expect(p.dateWarning).toContain('05/11/2026');
  });

  it('recognizes a single neutral receipt date without shipping qualifiers', () => {
    const p = parse('Merchant: North Trail\nDate: November 3, 2026\nTotal: $25.00');
    expect(p.orderDate).toBe('2026-11-03');
  });
});
