import {describe,it,expect} from 'vitest';
import {manualPurchase} from '../src/manual-purchase';
import {editDraft,previewEdit} from '../src/edit';
import {exportBackup,parseBackup} from '../src/backup';
const draft={merchant:'Harbor Shoes',orderDate:'2026-11-01',windowStartDate:'',windowDays:'60',fixedDeadline:'2026-12-31',orderNo:'H1',total:'£75'};
describe('explicit retailer deadline intent',()=>{
 it('survives a saved/reloaded edit and backup with a changed clock',()=>{
  const saved=manualPurchase(draft,'fixed','2026-11-10T00:00:00Z').order;
  const restored=parseBackup(exportBackup([saved]))[0];
  const review=previewEdit(restored,{...editDraft(restored),windowStartDate:'2026-11-08'});
  expect(review.due).toBe('2026-12-31');expect(review.order.windowDays).toBe(53);expect(review.order.fixedDeadline).toBe('2026-12-31');
 });
 it('retains duration semantics for legacy purchases and explicit duration choice',()=>{
  const legacy=manualPurchase({...draft,fixedDeadline:''},'legacy','2026-11-10T00:00:00Z').order;
  expect(previewEdit(legacy,{...editDraft(legacy),windowStartDate:'2026-11-08'}).due).toBe('2027-01-07');
  const fixed=manualPurchase(draft,'fixed','2026-11-10T00:00:00Z').order;
  const duration=previewEdit(fixed,{...editDraft(fixed),fixedDeadline:'',windowDays:'14'});
  expect(duration.due).toBe('2026-11-15');expect(duration.order.fixedDeadline).toBeUndefined();
 });
 it('refuses a clock later than the fixed deadline without replacing the original',()=>{
  const saved=manualPurchase(draft,'fixed','2026-11-10T00:00:00Z').order;
  expect(()=>previewEdit(saved,{...editDraft(saved),windowStartDate:'2027-01-01'})).toThrow();
  expect(saved.fixedDeadline).toBe('2026-12-31');
 });
});
