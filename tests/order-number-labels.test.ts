import { describe, it, expect } from 'vitest';
import { parse } from '../src/parse';

describe('order-number field labels', () => {
  it.each([
    'Order notification', 'Order notice', 'Order identity',
    'Order identifier', 'Order numbering', 'Order numbered',
    'Order numberABCD', 'Order noABCD', 'Order idABCD',
    'Reorder ID: OLD-1234', 'Preorder #OLD-1234',
    'backorder number: OLD-1234', 'disorder no. OLD-1234',
  ])('leaves unrelated label text unknown: %s', (text) => {
    expect(parse(text).orderNo).toBe('');
    expect(parse(text).found.orderNo).toBe(false);
  });

  it.each([
    ['Order#ABCD', 'ABCD'],
    ['Order #: #ABCD', 'ABCD'],
    ['Order number: ABCD', 'ABCD'],
    ['ORDER NUMBER # MiXeD-123', 'MiXeD-123'],
    ['Order no: AB12', 'AB12'],
    ['Order no.:AB12', 'AB12'],
    ['Order no. #Ab-1', 'Ab-1'],
    ['Order id ABCD', 'ABCD'],
    ['OrderID:ABCD', 'ABCD'],
    ['OrderNumber:ABCD', 'ABCD'],
    ['OrderNo.:ABCD', 'ABCD'],
    ['Your Order\tno.\n#A1b2', 'A1b2'],
  ])('keeps existing genuine field syntax: %s', (text, expected) => {
    expect(parse(text).orderNo).toBe(expected);
    expect(parse(text).found.orderNo).toBe(true);
  });

  it.each([
    ['Order notification\nOrder ID: NEW-5678', 'NEW-5678'],
    ['Reorder ID: OLD-1234\nOrder ID: NEW-5678', 'NEW-5678'],
    ['Order identity: FAKE-1234\nOrder #REAL-9876', 'REAL-9876'],
    ['Order numberABCD\nORDER NO. #Right-21', 'Right-21'],
    ['Order no: A12\nOrder id: NEXT-55', 'NEXT-55'],
    ['Order ID: ---1\nOrder ID: VALID-1', 'VALID-1'],
    ['Order #FIRST-1\nOrder ID: SECOND-2', 'FIRST-1'],
  ])('selects the first genuine supported reference: %s', (text, expected) => {
    expect(parse(text).orderNo).toBe(expected);
    expect(parse(text).found.orderNo).toBe(true);
  });

  it('keeps complete receipt fields while ignoring a notification heading', () => {
    const text = 'From: Northwind Outfitters <orders@example.test>\nOrder notification\nOrder ID: New-5678\nOrder placed October 3, 2026\nTotal: $64.00';
    expect(parse(text, ['Northwind Outfitters'])).toEqual({
      merchant: 'Northwind Outfitters', orderDate: '2026-10-03',
      orderNo: 'New-5678', total: '$64.00',
      found: { merchant: true, orderDate: true, orderNo: true, total: true },
    });
  });
});
