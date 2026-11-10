import { expect, test, vi } from 'vitest';
import { reviewDuplicateIntake } from '../src/duplicate-intake';
import type { Order } from '../src/store';
const saved: Order = {id:'one',merchant:'Harbor Hardware',orderNo:'HH-880',orderDate:'2026-11-01',windowStartDate:'2026-11-08',windowDays:14,windowSource:'user',createdAt:'2026-11-10T12:00:00Z'};
test('matching numbered purchase can be cancelled with full original records intact', () => {
  const confirm=vi.fn((_message: string)=>false); const current=[saved];
  expect(reviewDuplicateIntake({merchant:' harbor HARDWARE ',orderNo:'hh-880 '},()=>current,confirm)).toBeNull();
  expect(confirm.mock.calls[0][0]).toContain('return by 2026-11-22'); expect(current).toEqual([saved]);
});
test('explicit separate purchase retains existing record and rereads after decision', () => {
  const read=vi.fn(()=>[saved]); expect(reviewDuplicateIntake(saved,read,()=>true)).toEqual([saved]); expect(read).toHaveBeenCalledTimes(2);
});
test('different or absent receipt identity needs no speculative duplicate warning', () => {
  for(const candidate of [{merchant:'Other store',orderNo:'HH-880'},{merchant:'Harbor Hardware',orderNo:''},{merchant:'',orderNo:'HH-880'}]) {
    const confirm=vi.fn((_message: string)=>false); expect(reviewDuplicateIntake(candidate,()=>[saved],confirm)).toEqual([saved]); expect(confirm).not.toHaveBeenCalled();
  }
});
test('a concurrent saved-list change during review keeps the draft instead of overwriting', () => {
  let reads=0; expect(()=>reviewDuplicateIntake(saved,()=>++reads===1?[saved]:[saved,{...saved,id:'two'}],()=>true)).toThrow('changed while');
});
