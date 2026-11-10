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
