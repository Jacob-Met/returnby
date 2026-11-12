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

test('recognized returned duration cannot be saved against order date for pending delivery',()=>{
 const row=appendConfirmations([],[{label:'pending',text:'Store: Birch\nOrder date: November 4, 2026\nItems may be returned within 21 days after delivery. Awaiting delivery.'}],()=> 'pending')[0];
 expect(row.fields.windowDays).toBe('21');
 expect(()=>validateDraft(row)).toThrow(/delivery/);
 row.fields.windowStartDate='2026-11-10';expect(validateDraft(row).windowStartDate).toBe('2026-11-10');
});

test.each([
 ['Return parcels must be shipped within 14 days.', 'ship-by'],
 ['Returns must be postmarked by November 21, 2026.', 'ship-by'],
 ['Drop off returns at the store by November 21, 2026.', 'drop-off-by'],
 ['Bring returned items to the counter before November 21, 2026.', 'drop-off-by'],
 ['The merchant must receive returned parcels by November 21, 2026.', 'arrive-by'],
 ['Returned parcels must arrive at our warehouse within 30 days.', 'arrive-by'],
] as const)('dated return handoff must be chosen, not silently treated as return-by: %s', (text, kind) => {
 const review=receiptPolicy(text);
 expect(review.actionKinds).toContain(kind);
 expect(review.actionRequired).toBe(true);
 expect(review.actionConflict).toBe(false);
 expect(review.passages).toContain(text);
});

test('a merchant arrival instruction cannot be silently converted into a shipping deadline',()=>{
 const text='Returns must be shipped within 14 days. Returned parcels must arrive at our warehouse within 21 days.';
 const review=receiptPolicy(text);
 expect(review.actionKinds).toEqual(['ship-by','arrive-by']);
 expect(review.actionConflict).toBe(true);
 expect(review.needsChoice).toBe(true);
 expect(review.passages).toHaveLength(2);
 expect(receiptWindow(text,30)).toBe('');
 const row=appendConfirmations([], [{label:'mixed.txt',text:'Store: Cedar Goods\nOrder date: November 1, 2026\n'+text}],()=> 'mixed')[0];
 expect(row.fields.windowDays).toBe('');
 row.fields.windowDays='14';
 expect(()=>validateDraft(row)).toThrow(/Choose what must happen/);
 row.fields.deadlineRequirement='arrive-by';
 expect(validateDraft(row).deadlineRequirement).toBe('arrive-by');
 row.fields.deadlineRequirement='ship-by';
 expect(validateDraft(row).deadlineRequirement).toBe('ship-by');
 row.fields.deadlineRequirement='untrusted-label';
 expect(()=>validateDraft(row)).toThrow(/supported return deadline/);
});

test('a separate return-label expiry and unrelated delivery date do not pretend to specify a handoff',()=>{
 const text='Your order will be delivered within 3 days. Return shipping label expires within 14 days. Returns accepted within 30 days.';
 const review=receiptPolicy(text);
 expect(review.actionRequired).toBe(false);
 expect(review.actionKinds).toEqual([]);
 expect(receiptWindow(text,30)).toBe('');
});

test('a single merchant-arrival policy still needs an explicit saved action choice',()=>{
 const text='Store: Cedar Goods\nOrder date: November 1, 2026\nReturns must be received by our warehouse within 30 days.';
 const row=appendConfirmations([],[{label:'arrival.txt',text}],()=> 'arrive')[0];
 expect(row.fields.windowDays).toBe('30');
 expect(()=>validateDraft(row)).toThrow(/Choose what must happen/);
 row.fields.deadlineRequirement='arrive-by';
 expect(validateDraft(row).deadlineRequirement).toBe('arrive-by');
});
