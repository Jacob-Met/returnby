import type { Word } from 'tesseract.js';

export type PrintedFields = { merchant: string; total: string };
type ReceiptWord = Pick<Word, 'text' | 'bbox' | 'confidence'>;
type ReceiptBlock = { paragraphs: { lines: { words: ReceiptWord[]; bbox: Word['bbox'] }[] }[] };
type Row = { words: ReceiptWord[]; text: string; box: Word['bbox'] };

const cleanWord = (text: string) => text.toLowerCase().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
const nameKey = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();
const moneyKey = (text: string) => text.replace(/[$£€,\s]/g, '');

function linesFrom(blocks: ReceiptBlock[]): Row[] {
  return blocks.flatMap(block => block.paragraphs.flatMap(paragraph =>
    paragraph.lines.map(line => ({ words: line.words, text: line.words.map(word => word.text).join(' ').trim(), box: line.bbox }))));
}

function printedHeading(rows: Row[]): string {
  const street = /^\s*\d{1,6}(?:\.\d+)?\s+.+\b(?:st(?:reet)?|ave(?:nue)?|rd|road|blvd|boulevard|dr(?:ive)?|pike|way|ln|lane|ct|court)\b/i;
  for (const address of rows.filter(row => street.test(row.text))) {
    const ah = Math.max(1, address.box.y1 - address.box.y0);
    const near = rows.filter(row => {
      const h = row.box.y1 - row.box.y0;
      const gap = address.box.y0 - row.box.y1;
      return h >= ah * .55 && gap >= -ah * .25 && gap < 4 * Math.max(h, ah) &&
        row.box.x0 < address.box.x1 && row.box.x1 > address.box.x0;
    }).sort((a, b) => b.box.y1 - a.box.y1);
    const row = near[0];
    if (!row || row.words.some(word => word.confidence < 65)) continue;
    const name = row.text.trim();
    if (name.length < 3 || name.length > 70 || !/^\p{L}[\p{L}\p{M} .&'’+-]*\p{L}$/u.test(name) ||
        /\b(?:address|cashier|order|receipt|server|table|thank|total|guest|pay|deliver|phone|survey)\b/i.test(name)) continue;
    return name;
  }
  return '';
}

function printedTotal(rows: Row[]): string {
  const all = rows.flatMap(row => row.words);
  const totals = new Map<string, string>();
  for (const word of all) {
    const token = cleanWord(word.text);
    if ((token !== 'total' && token !== 'due') || word.confidence < 55) continue;
    const box = word.bbox, height = Math.max(1, box.y1 - box.y0);
    const centerY = (box.y0 + box.y1) / 2;
    const sameRow = all.filter(other => {
      if (other === word) return false;
      const b = other.bbox;
      return Math.abs((b.y0 + b.y1) / 2 - centerY) <= .50 * Math.max(height, b.y1 - b.y0);
    });
    const before = sameRow.filter(other => other.bbox.x1 <= box.x0 &&
      box.x0 - other.bbox.x1 < height * 4).sort((a, b) => b.bbox.x1 - a.bbox.x1)[0];
    const prefix = before ? cleanWord(before.text) : '';
    if (token === 'due' ? !['balance', 'amount', 'total'].includes(prefix) : ['sub', 'subtotal', 'tax'].includes(prefix)) continue;
    const after = sameRow.filter(other => other.bbox.x0 >= box.x1).sort((a,b) => a.bbox.x0 - b.bbox.x0);
    const amounts = after.filter(other => /^[$€£]?(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}$/.test(other.text));
    if (amounts.length !== 1 || amounts[0]!.confidence < 65) continue;
    const value = amounts[0]!;
    if (after.some(other => other.bbox.x0 < value.bbox.x0 && /[\p{L}\d]/u.test(other.text) &&
        !/^(?:due|paid|amount)$/i.test(cleanWord(other.text)))) continue;
    if (Number(moneyKey(value.text)) > 0) totals.set(moneyKey(value.text), value.text);
  }
  return totals.size === 1 ? [...totals.values()][0]! : '';
}

/** Read physical rows before OCR's column ordering separates labels and amounts. */
export function readPrintedFields(blocks: ReceiptBlock[] | null | undefined): PrintedFields {
  const rows = linesFrom(blocks || []);
  return { merchant: printedHeading(rows), total: printedTotal(rows) };
}

/** Two independent image reads must agree; competing readings remain for review. */
export function agreedPrintedFields(views: PrintedFields[]): PrintedFields {
  function agree(field: keyof PrintedFields, key: (value: string) => string): string {
    const nonempty = views.map(view => view[field]).filter(Boolean);
    return nonempty.length >= 2 && new Set(nonempty.map(key)).size === 1 ? nonempty[0]! : '';
  }
  return { merchant: agree('merchant', nameKey), total: agree('total', moneyKey) };
}
