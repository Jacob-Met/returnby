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


describe('creased print recognition', () => {
  it('finds a domain-corroborated printed brand and the labelled paid total', async () => {
    const { damagedReceiptSuggestions } = await import('../src/receipt-photo');
    const text = 'wT Lah Re wT WESTER\nrian WN EERE\n» Brixx SR\nRCP Village Circle\n' +
      'SUB-TOTAL $13.45\n= TOTAL" § $14.46\nwww.brixxpizza.com';
    expect(damagedReceiptSuggestions(text)).toMatchObject({merchant:'Brixx',total:'$14.46',orderDate:''});
  });
  it('recovers the real creased receipt brand from the header immediately above its address', async () => {
    const { damagedReceiptSuggestions } = await import('../src/receipt-photo');
    const text = 'NTN Brixx NK\n~ 501 Meadaumont Village Circle Ws\nLow Chace pty, NC 27517\n' +
      'FRI NOVEMBER 16,2018\nSUB-TOTAL $13.45\nTOTAL 3 $14.46\nwih. br 1xxg12za.com';
    expect(damagedReceiptSuggestions(text)).toMatchObject({merchant:'Brixx',total:'$14.46'});
  });
  it('does not infer a merchant from a stray titlecase token without two-line address', async () => {
    const { damagedReceiptSuggestions } = await import('../src/receipt-photo');
    expect(damagedReceiptSuggestions('NTN Brixx NK\n501 Village Circle\nTOTAL $14.46').merchant).toBe('');
  });
  it('does not turn uncorroborated noise, a web footer or a subtotal into purchase facts', async () => {
    const { damagedReceiptSuggestions } = await import('../src/receipt-photo');
    expect(damagedReceiptSuggestions('rian WN EERE\nSUB-TOTAL $13.45\nwww.brixxpizza.com'))
      .toMatchObject({merchant:'',total:''});
  });
  it('does not decide between competing labelled paid totals', async () => {
    const { damagedReceiptSuggestions } = await import('../src/receipt-photo');
    const result = damagedReceiptSuggestions('Brixx\nTOTAL $14.46\nTOTAL $19.46\nwww.brixxpizza.com');
    expect(result.total).toBe('');
    expect(result.notes.join(' ')).toMatch(/Different printed totals/);
  });
});

describe('different real photographed receipt layouts', () => {
  it('keeps the short-first-word store above its address, not the dinner item', () => {
    const result = receiptSuggestions('New Asia Buffet\n14727.5 Rinaldi St\nSan Fernando, CA 91340\nWeekEnd Dinner\nTOTAL : 33.92');
    expect(result).toMatchObject({ merchant: 'New Asia Buffet', total: '33.92' });
  });
  it('keeps a multiword shop with a plus sign above an isolated item line', () => {
    const result = receiptSuggestions('JRHGE THA!\nce —\nSUKHOTHAI SUSHI + ASIAN\nFUSION\nTotal $28.04');
    expect(result.merchant).toBe('SUKHOTHAI SUSHI + ASIAN');
  });
  it('does not treat a dish or server as the merchant when the heading disappeared', () => {
    expect(receiptSuggestions('Rye 10yr (2 620.00)\nSirloin\nTotal 179.94').merchant).toBe('');
    expect(receiptSuggestions('15700 Bellflower Blvd\nBellflower CA 90706\nNathalie\n2 Enchi Omelete').merchant).toBe('');
    expect(receiptSuggestions('1 lass House Hine\n1 Veal Zingarte\ncargo bourautoonme\nTOTAL:').merchant).toBe('');
    expect(receiptSuggestions('Roosevelt Field     ha\n0480 TABLE 101\nCoffee 2.95').merchant).toBe('');
  });
  it('fills the now-missing merchant from a second genuine-photo OCR pass', async () => {
    const { mergeReceiptSuggestions } = await import('../src/receipt-photo');
    expect(mergeReceiptSuggestions(
      receiptSuggestions('Rye 10yr (2 620.00)\nSirloin\nTotal 179.94'),
      receiptSuggestions("SASKA'S\n3768 Mission Blvd\nSan Diego CA 92109\nTotal 179.94")
    ).merchant).toBe("SASKA'S");
    expect(mergeReceiptSuggestions(
      receiptSuggestions('15700 Bellflower Blvd\nBellflower CA 90706\nNathalie\n2 Enchi Omelete'),
      receiptSuggestions('Loaded Cafe\nBellflower Blvd\nTotal Due 48.53')
    ).merchant).toBe('Loaded Cafe');
  });
  it('recovers the labelled paid total after a time stamp without taking subtotal', () => {
    expect(receiptSuggestions('GRAND LUX CAFE\nSub Total: 63.75\nSub Total: 69.25\n04/25 17:42 TOTAL: 69.25').total).toBe('69.25');
    expect(receiptSuggestions('Loaded Cafe\nSUBTOTAL 44.32\n10:51AM TOTAL DUE 48.53').total).toBe('48.53');
  });
  it('does not confidently keep a digit that disagrees with the card charge', () => {
    const result = receiptSuggestions('Taco Bell\nTotal 1.61\nVisa 7.61');
    expect(result.total).toBe('');
    expect(result.notes.join(' ')).toMatch(/card charge disagree/);
  });
  it('does not decide between contradictory OCR reads of a labelled total', async () => {
    const { mergeReceiptSuggestions } = await import('../src/receipt-photo');
    const result = mergeReceiptSuggestions(
      receiptSuggestions('Total $14.46'),
      receiptSuggestions('Total $19.46'),
    );
    expect(result.total).toBe('');
    expect(result.notes.join(' ')).toMatch(/OCR readings/);
  });
  it('completes a folded merchant prefix when the second heading includes the same suffix', async () => {
    const { mergeReceiptSuggestions } = await import('../src/receipt-photo');
    const result = mergeReceiptSuggestions(
      receiptSuggestions('TRADING COMPANY\nTotal Due 50.29'),
      receiptSuggestions('HAMMOCKS TRADING COMPANY\nTotal Due 50.29'),
    );
    expect(result.merchant).toBe('HAMMOCKS TRADING COMPANY');
  });
});
