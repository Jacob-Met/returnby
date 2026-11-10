import { it, expect } from 'vitest';
import { deliveryReview } from '../src/delivery-review';
it.each([
'You have 30 days from delivery to return your items.',
'Return period: 30 days from the delivery date.',
'Return within 30 days of the delivery date.',
'Return within 30 days from the date your order was delivered.',
'Returns accepted within 30 days\n of delivery.',
'Return window starts on delivery; item not delivered yet.'
])('requires review for %s', text => { expect(deliveryReview(text).required).toBe(true); expect(deliveryReview(text).date).toBeUndefined(); });
it('does not confirm a mentioned delivery date',()=>expect(deliveryReview('Delivered: November 8, 2026\nReturn within 30 days of delivery.')).toEqual({required:true,date:'2026-11-08'}));
it('keeps conflicting delivery dates unresolved',()=>expect(deliveryReview('Delivered: November 8, 2026\nDelivered: November 9, 2026\nReturn within 30 days of delivery.').date).toBeUndefined());
it('does not treat ordinary shipping estimates as a return clock',()=>expect(deliveryReview('Delivery within 3 days. Return within 30 days of purchase.').required).toBe(false));
