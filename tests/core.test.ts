import { describe, it, expect } from 'vitest';
import { parse, findDates } from '../src/parse';
import { dueDate, daysLeft, status } from '../src/deadline';
import { buildIcs } from '../src/ics';
import { lookup, knownMerchants } from '../src/policy';
import { samples } from '../src/samples';

describe('parse', () => {
  it('reads date formats', () => {
    for (const s of ['October 3, 2026', 'Oct 3, 2026', '10/03/2026', '2026-10-03', '3 Oct 2026'])
      expect(findDates(s)[0].date).toBe('2026-10-03');
  });
  it('parses sample 1', () => {
    const p = parse(samples[0], knownMerchants);
    expect(p).toMatchObject({ merchant: 'Northwind Outfitters', orderDate: '2026-10-03', orderNo: 'NW-48213', total: '$64.00' });
  });
  it('prefers date near "order"', () => {
    expect(parse('Ships Sep 1, 2026. Order placed on Aug 20, 2026.').orderDate).toBe('2026-08-20');
  });
  it('prefers an explicit order date over delivery near an order number', () => {
    for (const date of ['October 3, 2026', '3 Oct 2026', '2026-10-03', '10/03/2026']) {
      const p = parse(`From: Northwind Outfitters\nOrder #AB1234\nDelivery: October 10, 2026\nOrder date: ${date}\nSubtotal: $50.00\nTotal: $55.00`);
      expect(p).toMatchObject({ merchant: 'Northwind Outfitters', orderDate: '2026-10-03', orderNo: 'AB1234', total: '$55.00' });
      expect(p.found).toEqual({ merchant: true, orderDate: true, orderNo: true, total: true });
    }
  });
  it('matches explicit labels at original text offsets with case and whitespace variants', () => {
    for (const label of ['ORDER DATE ', 'Order date:', 'order\tdate : ', 'Order\ndate:\n', `Order date${' '.repeat(100)}`])
      expect(parse(`İİİ\nOrder #AB1234\nDelivery: October 10, 2026\n${label}October 3, 2026`).orderDate).toBe('2026-10-03');
    expect(parse('Order date: October 5, 2026\nOrder date: October 3, 2026').orderDate).toBe('2026-10-05');
  });
  it('retains date fallbacks when no valid date directly follows an explicit label', () => {
    for (const suffix of ['Preorder date: October 3, 2026', 'Order date revised to October 3, 2026', 'Order date - October 3, 2026', 'Order date: February 30, 2026\nReminder: October 3, 2026'])
      expect(parse(`Order #AB1234\nDelivery: October 10, 2026\n${suffix}`).orderDate).toBe('2026-10-10');
    expect(parse('Delivery October 10, 2026; reminder October 3, 2026').orderDate).toBe('2026-10-03');
    expect(parse('Order date: unknown').found.orderDate).toBe(false);
  });
  it('leaves unknowns blank', () => {
    const p = parse(samples[2], knownMerchants);
    expect(p.found).toEqual({ merchant: false, orderDate: false, orderNo: false, total: false });
  });
  it('does not mistake a subtotal for the order total', () => {
    const p = parse('From: Northwind Outfitters <orders@example.test>\nOrder #NW-48213\nOrder placed October 3, 2026\nSubtotal: $50.00\nShipping: $5.00\nTotal: $55.00');
    expect(p).toMatchObject({ merchant: 'Northwind Outfitters', orderDate: '2026-10-03', orderNo: 'NW-48213', total: '$55.00' });
    expect(p.found).toEqual({ merchant: true, orderDate: true, orderNo: true, total: true });
  });
  it('leaves total unknown when only embedded total labels exist', () => {
    for (const text of ['Subtotal: $50.00', 'Order subtotal: $50.00', 'SUBTOTAL: €9.00', 'runningtotal: £12.00']) {
      expect(parse(text).total).toBe('');
      expect(parse(text).found.total).toBe(false);
    }
  });
  it('preserves standalone labels, currency syntax and first-match behavior', () => {
    for (const [text, expected] of [
      ['Order Total: $1,234.50', '$1,234.50'],
      ['total € 9.00', '€9.00'],
      ['TOTAL:£12', '£12'],
      ['Total: $10.00\nOrder total: $12.00', '$10.00'],
    ]) expect(parse(text).total).toBe(expected);
  });
});

describe('deadline + policy', () => {
  it('computes', () => {
    expect(dueDate('2026-10-03', 30)).toBe('2026-11-02');
    expect(daysLeft('2026-11-02', '2026-10-04')).toBe(29);
    expect([status(10), status(5), status(2), status(-1)]).toEqual(['ok', 'soon', 'urgent', 'expired']);
    expect(lookup('Contoso Electronics')).toEqual({ days: 15, source: 'policy' });
    expect(lookup('Somewhere')).toEqual({ days: 30, source: 'default' });
  });
});

describe('ics', () => {
  it('builds RFC5545 all-day event with 3-day alarm', () => {
    const s = buildIcs({ id: 'x', merchant: 'Northwind, Inc', due: '2026-11-02' }, new Date('2026-10-04T00:00:00Z'));
    expect(s).toContain('DTSTART;VALUE=DATE:20261102\r\n');
    expect(s).toContain('DTEND;VALUE=DATE:20261103');
    expect(s).toContain('TRIGGER:-P3D');
    expect(s).toContain('Northwind\\, Inc');
  });
});
