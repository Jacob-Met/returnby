import {describe,it,expect} from 'vitest';
import {parse,findDates} from '../src/parse';
import {appendConfirmations,validateDraft} from '../src/batch-intake';
describe('receipt numeric date review',()=>{
 it.each(['05/11/2026','11/05/2026'])('keeps %s unresolved instead of shifting the deadline',date=>{const p=parse('From: John Lewis <orders@johnlewis.com>\nOrder date: '+date+'\nTotal: £79.00');expect(p.orderDate).toBe('');expect(p.found.orderDate).toBe(false);expect(p.dateWarning).toMatch(/could mean/);expect(p.total).toBe('£79.00');});
 it.each([['13/11/2026','2026-11-13'],['11/23/2026','2026-11-23'],['11/11/2026','2026-11-11'],['2026-11-05','2026-11-05'],['5 November 2026','2026-11-05']])('retains unambiguous %s', (date,expected)=>{const p=parse('Order date: '+date);expect(p.orderDate).toBe(expected);expect(p.dateWarning).toBeUndefined();});
 it('does not replace an ambiguous purchase with a clear shipping date',()=>{const p=parse('Order date: 05/11/2026\nShipping date: 2026-11-08');expect(p.orderDate).toBe('');expect(p.dateWarning).toContain('05/11/2026');});
 it('keeps explicit ISO purchase despite unrelated ambiguous shipping',()=>{expect(parse('Shipping date: 05/11/2026\nOrder date: 2026-11-01').orderDate).toBe('2026-11-01');});
 it('does not guess from currency and rejects invalid calendar values',()=>{expect(parse('Order date: 05/11/2026\nTotal: $79.00').orderDate).toBe('');expect(findDates('31/02/2026 02/30/2026')).toEqual([]);});
 it('batch keeps the warning and requires correction before review',()=>{const [d]=appendConfirmations([],[{label:'UK receipt',text:'From: John Lewis\nOrder date: 05/11/2026\nTotal: £79.00'}],()=> 'case');expect(d.dateWarning).toContain('5 November');expect(()=>validateDraft(d)).toThrow(/order date/);expect(validateDraft({...d,fields:{...d.fields,orderDate:'2026-11-05'}}).orderDate).toBe('2026-11-05');});
});
