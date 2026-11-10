import { describe, expect, it } from 'vitest';
import { parse } from '../src/parse';

describe('real exported-receipt body phrases, with explicit human review', () => {
  it('recognizes merchant, amount and identifier from common plain text messages', () => {
    expect(parse('Thank you for ordering from Lantern Outfitters.\nOrder confirmation: L-4812\nPlaced on November 2, 2026\nTotal: $92.00')).toMatchObject({
      merchant: 'Lantern Outfitters', orderNo: 'L-4812', orderDate: '2026-11-02', total: '$92.00',
    });
    expect(parse('Thanks for choosing Blue Tide Supply.\nOrder Number: BT-9904\nOrder Date: 2026-11-01\nAmount paid: $24.00')).toMatchObject({
      merchant: 'Blue Tide Supply', orderNo: 'BT-9904', orderDate: '2026-11-01', total: '$24.00',
      found: { merchant: true, orderDate: true, orderNo: true, total: true },
    });
    expect(parse('Café Rêve — thanks for shopping with us!\nYour order number is CR-5592\nPurchased 2026-10-30\nHandmade ceramic cup — $31.00.')).toMatchObject({
      merchant: 'Café Rêve', orderNo: 'CR-5592', orderDate: '2026-10-30', total: '',
      found: { merchant: true, orderDate: true, orderNo: true, total: false },
    });
    expect(parse('Merchant: Fern & Field\nOrder Number: FF-3841\nOrder Date: 2026-11-05\nTotal $19.00')).toMatchObject({
      merchant: 'Fern & Field', orderNo: 'FF-3841', orderDate: '2026-11-05', total: '$19.00',
    });
  });
  it('does not turn vague copy or status words into paid orders', () => {
    for (const text of [
      'This is an appointment note, not a new purchase.\nPlease review the old receipt only for reference.',
      'Your order number is pending.\nAmount refunded: $29.00',
      'Order confirmation: pending',
      'Thanks for choosing a shipping option today.',
    ]) {
      const receipt = parse(text);
      expect(receipt.orderNo).toBe('');
      expect(receipt.total).toBe('');
    }
    expect(parse('This product may be purchased from Lantern Outfitters.').merchant).toBe('');
    expect(parse('Thanks for choosing a shipping option today.').merchant).toBe('');
    expect(parse('Thanks for choosing our newsletter.').merchant).toBe('');
    expect(parse('Order confirmation: QX-8821').orderNo).toBe('QX-8821');
    expect(parse('Merchant: <script>alert(1)</script>').merchant).toBe('');
  });
  it('prioritizes actual Total over Amount paid when both are present', () => {
    expect(parse('Total: $31.00\nAmount paid: $14.00').total).toBe('$31.00');
    expect(parse('Subtotal: $19.00\nAmount refunded: $8.00').total).toBe('');
  });
});
