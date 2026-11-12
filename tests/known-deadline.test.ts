import {expect,test} from 'vitest';
import {windowDaysFromDeadline} from '../src/known-deadline';
test('fixed holiday deadline needs no mental arithmetic',()=>{
 expect(windowDaysFromDeadline('2026-11-10','2027-01-08')).toBe(59);
 expect(windowDaysFromDeadline('2026-12-25','2027-01-08')).toBe(14);
});
test('delivery start and leap days use civil dates',()=>{
 expect(windowDaysFromDeadline('2026-11-14','2027-01-08')).toBe(55);
 expect(windowDaysFromDeadline('2028-02-28','2028-03-01')).toBe(2);
});
test('invalid or reversed dates cannot silently create a different deadline',()=>{
 for(const dates of [['2026-02-30','2026-03-10'],['2026-11-10','2026-11-09'],['2026-11-10','2026-11-10'],['2026-11-10','9999-12-31']]){
 expect(()=>windowDaysFromDeadline(...dates as [string,string])).toThrow();
 }
});

test('receipt deadline suggestions follow only explicit action deadline cues',async()=>{
 const {suggestedMerchantDeadlineDate}=await import('../src/known-deadline');
 for(const [sentence,date] of [
   ['Return parcel must arrive by December 12, 2026.','2026-12-12'],
   ['Ship your return by 2026-12-09.','2026-12-09'],
   ['Drop off return at store on or before 12 December 2026.','2026-12-12'],
   ['Return parcel must arrive no later than December 12, 2026.','2026-12-12'],
 ]){
   expect(suggestedMerchantDeadlineDate([sentence])).toBe(date);
 }
 for(const sentence of [
   'Return parcel must arrive by 12/11/2026.',
   'Return parcel must arrive within 30 days after purchase on November 1, 2026.',
   'The item was purchased November 1, 2026; the merchant must receive it within 30 days.',
   'Return parcel must arrive by December 12.',
   'We will ship your refund on December 13, 2026.',
 ]){
   expect(suggestedMerchantDeadlineDate([sentence])).toBeUndefined();
 }
 expect(suggestedMerchantDeadlineDate([
   'Ship your return by December 9, 2026.',
   'Merchant must receive the return by December 12, 2026.',
 ])).toBeUndefined();
});
