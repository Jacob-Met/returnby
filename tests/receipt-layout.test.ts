import { describe, expect, it } from 'vitest';
import { agreedPrintedFields, readPrintedFields } from '../src/receipt-layout';

function word(text: string, x: number, y: number, width = 44) {
  return { text, confidence: 95, bbox: { x0:x, y0:y, x1:x+width, y1:y+15 } };
}

function block(...words: ReturnType<typeof word>[]) {
  const bbox = { x0: Math.min(...words.map(w=>w.bbox.x0)), y0:Math.min(...words.map(w=>w.bbox.y0)),
    x1: Math.max(...words.map(w=>w.bbox.x1)), y1:Math.max(...words.map(w=>w.bbox.y1)) };
  return { paragraphs: [{ lines: [{words, bbox}] }] };
}

describe('printed receipt rows', () => {
  it('pairs a total across independent columns and excludes the adjacent subtotal', () => {
    const rows = [block(word('Sub', 10,100,26),word('Total',44,100)),block(word('21.00',250,100)),
      block(word('Total:',12,130)),block(word('$23.10',250,131))];
    expect(readPrintedFields(rows).total).toBe('$23.10');
    expect(readPrintedFields(rows.slice(0,2)).total).toBe('');
  });
  it('declines two possible right-hand values or conflicting printed totals', () => {
    const row = [block(word('Total:',10,150)),block(word('$13.00',110,151)),block(word('18.00',220,150))];
    expect(readPrintedFields(row).total).toBe('');
    expect(readPrintedFields([row[0]!,row[1]!,block(word('Total:',10,180)),block(word('18.00',220,180))]).total).toBe('');
  });
  it('requires agreement across registered image reads', () => {
    const a = {merchant:'', total:'$23.10'}, b = {merchant:'', total:'23.10'};
    expect(agreedPrintedFields([a]).total).toBe('');
    expect(agreedPrintedFields([a,b]).total).toBe('$23.10');
    expect(agreedPrintedFields([a,b,{merchant:'', total:'28.10'}]).total).toBe('');
  });
  it('accepts a short initial only as a physical heading above the printed street address', () => {
    const header = block(word("JT's",30,10),word('Diner',84,10));
    const address=block(word('37011',15,34),word('Cook',70,34),word('Street',120,34));
    expect(readPrintedFields([header,address]).merchant).toBe("JT's Diner");
    expect(readPrintedFields([header]).merchant).toBe('');
  });
});
