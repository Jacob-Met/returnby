import { describe, expect, it } from 'vitest';
import { receiptSuggestions, receiptFileProblem } from '../src/receipt-photo';

describe('printed receipt review suggestions', () => {
  it('keeps the final paid total, printed identity and purchase date together', () => {
    const result = receiptSuggestions('PAPER & PINE\n18 Market Street\nPurchase date: November 10, 2026\nReceipt # PP-8421\nNotebook 14.00\nSubtotal 14.00\nTax 1.12\nTOTAL $15.12\nReturn by December 10, 2026');
    expect(result).toMatchObject({merchant:'PAPER & PINE',orderDate:'2026-11-10',orderNo:'PP-8421',total:'$15.12'});
  });
  it('does not silently choose a month/day ordering for an ambiguous paper date', () => {
    const result = receiptSuggestions('RIVER BOOKS\nTransaction # RB-9083\nDate: 11/10/2026\nTotal 42.50');
    expect(result.orderDate).toBe('');
    expect(result.notes.join(' ')).toMatch(/two different dates/);
    expect(result.total).toBe('42.50');
  });
  it('leaves conflicting totals for human review instead of choosing the first', () => {
    const result = receiptSuggestions('TOTAL $42.00\nTotal paid $38.00\nPurchase date: 2026-11-10');
    expect(result.total).toBe('');
    expect(result.notes.join(' ')).toMatch(/Different totals/);
  });
  it('does not call a return deadline the purchase date', () => {
    const result = receiptSuggestions('MOSS STUDIO\nReturn by 2026-12-01\nSubtotal $80.00\nTOTAL £84.50');
    expect(result.orderDate).toBe('');
    expect(result.total).toBe('£84.50');
  });
  it('keeps missing source facts empty and never supplies a policy', () => {
    const result = receiptSuggestions('Thank you\nCustomer copy\nTel 555 0100\n');
    expect(result).toMatchObject({merchant:'',orderDate:'',orderNo:'',total:''});
    expect(result).not.toHaveProperty('windowDays');
    expect(result).not.toHaveProperty('windowStartDate');
  });
  it('gives an actionable response for phone formats the reader cannot decode', () => {
    expect(receiptFileProblem({type:'image/heic',size:2000})).toMatch(/export a JPG/);
    expect(receiptFileProblem({type:'application/pdf',size:2000})).toMatch(/JPG/);
    expect(receiptFileProblem({type:'image/jpeg',size:2000})).toBe(null);
  });
});

describe('observed photographed-receipt failures', () => {
  it('prefers the printed store-number header over survey text and payment-card branding', () => {
    const result = receiptSuggestions('y ack @ survey Walmart go\ngive us feed QDDMH15VEC on\nThank you\nwalmart #5.\nWM super center\nBEST BUY VISA-1694\n31.53 TOTAL PURCHASE\n09/11/21');
    expect(result.merchant).toBe('walmart');
    expect(result.total).toBe('31.53');
    expect(result.orderDate).toBe('');
  });
  it('does not turn a survey banner into a store if no storefront is legible', () => {
    expect(receiptSuggestions('Give us feedback\nJoin today\nThank you\nTOTAL $9.50').merchant).toBe('');
  });
});

describe('source-first faint print merging', () => {
  it('fills truly absent printed facts but does not overrule legible ones', async () => {
    const { mergeReceiptSuggestions } = await import('../src/receipt-photo');
    const first = receiptSuggestions('PAPER & PINE\nPurchase date: 2026-11-10');
    const faded = receiptSuggestions('OTHER SHOP\nPurchase date: 2026-11-09\nTOTAL $24.30');
    expect(mergeReceiptSuggestions(first, faded)).toMatchObject({
      merchant: 'PAPER & PINE', orderDate: '2026-11-10', total: '$24.30', recoveredCount: 1,
    });
  });
  it('does not use a partial recovery to choose between conflicting printed dates or totals', async () => {
    const { mergeReceiptSuggestions } = await import('../src/receipt-photo');
    const first = receiptSuggestions('DATE 2026-11-10\nDATE 2026-11-11\nTOTAL $42.00\nTotal paid $38.00');
    const faded = receiptSuggestions('DATE 2026-11-10\nTOTAL $42.00');
    const result = mergeReceiptSuggestions(first, faded);
    expect(result.orderDate).toBe('');
    expect(result.total).toBe('');
    expect(result.notes.join(' ')).toMatch(/Several dates|Different totals/);
  });
});


describe('wrinkled real receipt safety', () => {
  it('does not invent a merchant out of low-quality header fragments', () => {
    const primary = receiptSuggestions('501 umot Vil\nSA   —  |  NC\nFRI NOVEVBE');
    const second = receiptSuggestions('Noy ay ih\nBn Ol DY pe\nNL SEEN\ni FRI NOVEMBER 16, 2018\nHECK #17114');
    expect(primary.merchant).toBe('');
    expect(second.merchant).toBe('');
  });
});
