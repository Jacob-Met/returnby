import { describe, expect, it } from 'vitest';
import { planRefundCalendar, refundReminderInstant } from '../src/refund-calendar';
import type { Order } from '../src/store';
const order: Order = { id:'purchase-1', merchant:'Paper & Pine', orderNo:'R-42', orderDate:'2026-11-01', windowDays:30, windowSource:'user', createdAt:'2026-11-01T12:00:00Z', refundState:'awaiting', refundAmount:'£24.00', refundNote:'PRIVATE DROP-OFF REFERENCE', refundFollowUpDate:'2026-11-17', refundUpdatedAt:'2026-11-10T12:00:00Z' };
const now = new Date(2026,10,10,12);
const when = {date:'2026-11-17',time:'09:30'};
describe('a useful outstanding-refund calendar handoff',()=>{
 it('exports the refund-check date, not the purchase deadline, with a distinct event and immediate alarm',()=>{
   const {content,at}=planRefundCalendar([order],order,when,now);
   const unfolded=content.replace(/\r\n /g,'');
   expect(at.getTime()).toBe(new Date(2026,10,17,9,30).getTime());
   expect(unfolded).toContain('UID:purchase-1@refund.returnby');
   expect(unfolded).toContain('SUMMARY:Check refund: Paper & Pine #R-42');
   expect(unfolded).toContain('Expected refund: £24.00.');
   expect(unfolded).toContain('TRIGGER:PT0S');
   expect(unfolded).not.toContain('PRIVATE DROP-OFF');
   expect(unfolded).not.toContain('Return deadline:');
 });
 it.each(['received','deleted','changed amount','changed date','duplicate'])('refuses %s while review was open',(kind)=>{
   const current=kind==='deleted'?[]:kind==='duplicate'?[order,{...order}]:[{...order,...(kind==='received'?{refundState:'received' as const}:kind==='changed amount'?{refundAmount:'£12'}:{refundFollowUpDate:'2026-11-18'})}];
   expect(()=>planRefundCalendar(current,order,when,now)).toThrow(/changed|removed/);
 });
 it('allows independent purchase corrections and never overwrites saved refund facts',()=>{
   const current={...order,windowDays:60,refundNote:'Updated private note'};
   const original=JSON.stringify(current);
   expect(planRefundCalendar([current],order,when,now).content).toContain('BEGIN:VEVENT');
   expect(JSON.stringify(current)).toBe(original);
 });
 it('allows rescheduling an overdue check without changing the saved check date',()=>{
   const overdue={...order,refundFollowUpDate:'2026-11-08'};
   expect(planRefundCalendar([overdue],overdue,when,now).at.getDate()).toBe(17);
   expect(overdue.refundFollowUpDate).toBe('2026-11-08');
 });
 it('rejects past or elapsed review times and invalid dates',()=>{
   for(const value of [{date:'2026-11-09',time:'12:00'},{date:'2026-11-10',time:'11:00'},{date:'2026-02-30',time:'12:00'},{date:'2026-11-17',time:'24:00'}])
     expect(()=>refundReminderInstant(value,now)).toThrow();
   expect(()=>planRefundCalendar([order],order,when,new Date(2026,10,17,9,31))).toThrow(/future/);
 });
 it('escapes line injection and folds all physical lines to 75 UTF-8 bytes',()=>{
   const unusual={...order,merchant:'長い店名'.repeat(40)+'\nBEGIN:VEVENT',orderNo:'one;two,three'};
   const {content}=planRefundCalendar([unusual],unusual,when,now);
   expect(content.split('\r\n').filter(line=>line==='BEGIN:VEVENT')).toHaveLength(1);
   expect(content.replace(/\r\n /g,'')).toContain('\\nBEGIN:VEVENT');
   for(const line of content.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
 });
});