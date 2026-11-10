import { describe, it, expect } from 'vitest';
import { manualPurchase } from '../src/manual-purchase';
const valid = { merchant: '  Paper & Pine  ', orderDate: '2026-11-10', windowDays: '14', orderNo: 'P-101', total: '£42.50' };
describe('manual receipt purchase', () => {
  it('preserves reviewed receipt fields with explicit user rule and exact deadline', () => {
    const result = manualPurchase(valid, 'paper', '2026-11-10T12:00:00Z');
    expect(result.due).toBe('2026-11-24');
    expect(result.order).toEqual({ id:'paper', createdAt:'2026-11-10T12:00:00Z', merchant:'Paper & Pine', orderDate:'2026-11-10', windowDays:14, windowSource:'user', orderNo:'P-101', total:'£42.50' });
  });
  it('uses a confirmed start before first save while preserving purchase date', () => {
    const result = manualPurchase({...valid, windowStartDate:'2026-11-14'}, 'paper', '2026-11-10T12:00:00Z');
    expect(result.due).toBe('2026-11-28');
    expect(result.order.orderDate).toBe('2026-11-10');
    expect(result.order.windowStartDate).toBe('2026-11-14');
  });
  it.each([{windowStartDate:'2026-02-30'},{merchant:'  '},{orderDate:''},{orderDate:'2026-02-30'},{windowDays:''},{windowDays:'1.5'},{windowDays:'0'},{orderDate:'9999-12-30',windowDays:'1'}])('refuses incomplete or unexportable receipt details %j', change => {
    expect(()=>manualPurchase({...valid,...change}, 'id','2026-11-10T12:00:00Z')).toThrow();
  });
});
