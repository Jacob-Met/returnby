import { describe, it, expect, vi } from 'vitest';
import { reviewPurchaseAddition } from '../src/purchase-addition';
import type { Order } from '../src/store';
const order = (id: string, merchant = 'Northstar', orderNo = 'NS-842'): Order => ({id, merchant, orderNo, orderDate:'2026-11-05',windowDays:30,windowSource:'user',createdAt:'2026-11-10T00:00:00Z'});
describe('review another single purchase', () => {
 it('does not interrupt unrelated or unidentified purchases', () => {
  const confirm=vi.fn();const current=[order('old')];
  expect(reviewPurchaseAddition(current,order('new','Elsewhere'),()=>current,confirm)).toHaveLength(2);
  expect(reviewPurchaseAddition(current,order('new','Northstar',''),()=>current,confirm)).toHaveLength(2);
  expect(confirm).not.toHaveBeenCalled();
 });
 it('recognizes matching store and order number despite case and outer whitespace', () => {
  const current=[order('old')],confirm=vi.fn(()=>false);
  expect(reviewPurchaseAddition(current,order('new',' northSTAR ',' ns-842 '),()=>current,confirm)).toBeNull();
  expect(current).toHaveLength(1);expect(confirm).toHaveBeenCalledOnce();
 });
 it('allows an explicitly separate record and preserves existing fields', () => {
  const current=[{...order('old'),windowStartDate:'2026-11-09'}];
  const result=reviewPurchaseAddition(current,order('new'),()=>structuredClone(current),()=>true)!;
  expect(result.map(x=>x.id)).toEqual(['old','new']);expect(result[0].windowStartDate).toBe('2026-11-09');
 });
 it('does not overwrite another tab change while acknowledgement was open', () => {
  const current=[order('old')],latest=[...current,order('another','Other')];
  expect(()=>reviewPurchaseAddition(current,order('new'),()=>latest,()=>true)).toThrow('Saved returns changed');
  expect(latest).toHaveLength(2);
 });
 it('refuses an unreadable reread after confirmation', () => {
  expect(()=>reviewPurchaseAddition([order('old')],order('new'),()=>null,()=>true)).toThrow('Nothing was added');
 });
});
