import {test,expect} from 'vitest';
import {receiptPolicy,receiptWindow} from '../src/receipt-policy';
import {appendConfirmations,validateDraft} from '../src/batch-intake';
test.each(['Returns within 21 days after delivery.','You may return this purchase within 21 days of purchase.','Our 21-day return policy applies.','Returns within\n21 days after delivery.'])('ordinary receipt term proposes21: %s',text=>{
 expect(receiptWindow(text,30)).toBe('21');expect(receiptPolicy(text).needsChoice).toBe(false);
});
test.each(['Returns within 30 days. Electronics returns within 14 days.','Returns within 30 days, or 14 days for electronics.','Returns within 21 business days.','Returns within 30 days except final sale.','Final sale. No returns.','Returns within 3 weeks.'])('conditional terms never inherit a plausible fallback: %s',text=>{
 expect(receiptWindow(text,30)).toBe('');expect(receiptPolicy(text).needsChoice).toBe(true);
});
test('shipping and warranty periods alone are not a return policy',()=>{
 expect(receiptWindow('Delivery within 3 days. Warranty lasts 90 days.',30)).toBe('30');
});
test('reviewed batch uses receipt days and refuses unresolved contradictory window',()=>{
 const base='From: Cedar Goods\nOrder #: ABC123\nOrder date: November 1, 2026\nTotal: $42\n';
 const a=appendConfirmations([],[{label:'one',text:base+'Returns within 21 days of purchase.'}],()=> 'one')[0];
 expect(a.fields.windowDays).toBe('21');expect(validateDraft(a).windowSource).toBe('user');
 const b=appendConfirmations([],[{label:'two',text:base+'Returns within 30 days. Electronics returns within 14 days.'}],()=> 'two')[0];
 expect(()=>validateDraft(b)).toThrow(/window/);
 b.fields.windowDays='14';expect(validateDraft(b).windowDays).toBe(14);
});

test('evidence quotes return terms without unrelated receipt identity',()=>{expect(receiptPolicy('From: Birch Trail\nOrder: AB123\nReturns within 21 days.').passages).toEqual(['Returns within 21 days.']);});

test.each([
 'Return label valid for 14 days.',
 'Return shipping label expires after 14 days.',
 'Returns within 30 days if unopened. Opened goods cannot be returned.',
 'Returns within 30 days. Opened goods cannot be returned.',
 'Returns accepted only for unused items within 30 days.',
 'Return authorization valid for 14 days.',
])('eligibility conditions and label expiry never choose a return deadline: %s',text=>{
 expect(receiptWindow(text,30)).toBe('');expect(receiptPolicy(text).needsChoice).toBe(true);
});
test('separate restriction is visible beside the numerical policy',()=>{
 expect(receiptPolicy('Returns within 30 days. Opened goods cannot be returned.').passages).toEqual(['Returns within 30 days.','Opened goods cannot be returned.']);
});

test.each([
 'Items must be returned within 14 days of delivery.',
 'Items must be returned within\n14 days of delivery.',
 'Returning an item is allowed within 14 days of purchase.',
])('ordinary return inflections preserve receipt evidence: %s', text => {
 expect(receiptWindow(text,30)).toBe('14');
 expect(receiptPolicy(text).passages).toHaveLength(1);
});
test.each([
 'Returns accepted within 30 days of delivery. Sale items must be returned within 14 days.',
 'Returns accepted within 30 days of delivery. Sale items must be returned within\n14 days.',
 'Sale items must be returned within 14 days.',
 'Items must be returned within 2 weeks.',
])('qualifications cannot disappear behind a general or fallback rule: %s', text => {
 expect(receiptWindow(text,30)).toBe('');
 expect(receiptPolicy(text).needsChoice).toBe(true);
});
test('both general and sale exception remain visible', () => {
 const text='Returns accepted within 30 days of delivery. Sale items must be returned within 14 days.';
 expect(receiptPolicy(text).passages).toEqual(['Returns accepted within 30 days of delivery.','Sale items must be returned within 14 days.']);
 const row=appendConfirmations([],[{label:'sale',text:'Store: Meadow\nOrder date: November 1, 2026\n'+text}],()=> 'sale')[0];
 expect(row.fields.windowDays).toBe('');
});
