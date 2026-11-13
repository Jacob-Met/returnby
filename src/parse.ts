import { numericDate, reviewNumericDate } from './numeric-date';
export type Parsed = {
  merchant: string;
  orderDate: string; // YYYY-MM-DD or ''
  dateWarning?: string;
  orderNo: string;
  total: string;
  found: { merchant: boolean; orderDate: boolean; orderNo: boolean; total: boolean };
};

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => {
  if (m < 1 || m > 12 || d < 1 || d > 31) return '';
  const dt = new Date(y, m - 1, d);
  if (dt.getMonth() !== m - 1) return '';
  return `${y}-${pad(m)}-${pad(d)}`;
};

type Hit = { date: string; index: number };

export function findDates(text: string): Hit[] {
  const hits: Hit[] = [];
  const mon = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember|t)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?';
  const patterns: [RegExp, (m: RegExpExecArray) => string][] = [
    [new RegExp(`\\b${mon}\\s*,?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, 'gi'),
      (m) => iso(+m[3], MONTHS[m[1].slice(0, 3).toLowerCase()], +m[2])],
    [new RegExp(`\\b(\\d{1,2})\\s+${mon}\\s+(\\d{4})\\b`, 'gi'),
      (m) => iso(+m[3], MONTHS[m[2].slice(0, 3).toLowerCase()], +m[1])],
    [/\b(\d{4})-(\d{2})-(\d{2})\b/g, (m) => iso(+m[1], +m[2], +m[3])],
    [/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, (m) => numericDate(+m[3], +m[1], +m[2])],
  ];
  for (const [re, conv] of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const d = conv(m);
      if (d) hits.push({ date: d, index: m.index });
    }
  }
  return hits.sort((a, b) => a.index - b.index);
}

type OrderDatePick = { date: string; warning?: string };

// Purchase dates require purchase language. "Order #" near an expected
// delivery date is not a purchase-date label.
function pickOrderDate(text: string, hits: Hit[]): OrderDatePick {
  if (!hits.length) return { date: '' };
  const explicitPurchase = /(?:^|[\r\n])\s*(?:order\s+date|purchase\s+date|date\s+of\s+purchase|transaction\s+date|sale\s+date|order\s+placed(?:\s+on)?|placed\s+on|purchased(?:\s+on)?|ordered(?:\s+on)?|date\s+ordered)\s*[:=\-–—]?\s*$/i;
  const purchaseSentence = /\b(?:your\s+)?order\s+(?:was\s+)?placed\s+on\s*$|\border\s*#\s*[A-Z0-9-]+\s+was\s+placed\s+on\s*$/i;
  const explicit = hits.find(h => {
    const before = text.slice(Math.max(0, h.index - 240), h.index);
    return explicitPurchase.test(before) || purchaseSentence.test(before.slice(-100));
  });
  if (explicit) return { date: explicit.date };

  // One neutral Date field is usable on a till receipt. Shipping, refund and
  // return dates cannot stand in for the original purchase date.
  if (hits.length === 1) {
    const h = hits[0];
    const lineStart = text.lastIndexOf('\n', h.index - 1) + 1;
    if (/^\s*date\s*:\s*$/i.test(text.slice(lineStart, h.index))) return { date: h.date };
  }
  return {
    date: '',
    warning: 'The receipt shows dates but no clear purchase date. Check the original order or receipt and enter the purchase date before saving a deadline.',
  };
}

function pickMerchant(text: string, known: string[]): string {
  const from = /^\s*from:\s*(.+)$/im.exec(text);
  if (from) {
    const name = from[1].replace(/<[^>]*>/, '').replace(/["']/g, '').trim();
    if (name && !name.includes('@')) return name;
    const dom = /@([a-z0-9-]+)\./i.exec(from[1]);
    if (dom) return dom[1].charAt(0).toUpperCase() + dom[1].slice(1);
  }
  // Exported .eml text supplies the *body*, not the From header. Accept only
  // self-identifying store phrases; never infer an unrelated merchant from an
  // arbitrary product/attachment mention. Every proposed field remains editable.
  const bodyMerchant = [
    /^\s*(?:merchant|store|retailer)\s*:\s*([^\r\n]{2,80})\s*$/im,
    /^\s*(?:thank you|thanks) for (?:ordering|shopping) (?:from|with) ([^\r\n.!?]{2,80})[.!?]?\s*$/im,
    /^\s*(?:thank you|thanks) for choosing ([^\r\n.!?]{2,80})[.!?]?\s*$/im,
    /^\s*([^\r\n.!?]{2,80})\s+[—–-]\s+thanks for shopping with us[.!?]?\s*$/im,
  ];
  for (const [index, pattern] of bodyMerchant.entries()) {
    const candidate = pattern.exec(text)?.[1]?.trim();
    // Generic "thanks for choosing a shipping option" is not a store name.
    if (index === 2 && candidate && !/^\p{Lu}/u.test(candidate)) continue;
    if (candidate && /^[\p{L}\p{N}]/u.test(candidate) && !/[<>@]/.test(candidate)) return candidate;
  }
  const lower = text.toLowerCase();
  for (const k of known) if (lower.includes(k.toLowerCase())) return k;
  return '';
}

export function parse(text: string, knownMerchants: string[] = []): Parsed {
  const merchant = pickMerchant(text, knownMerchants);
  const hits = findDates(text);
  const choice = pickOrderDate(text, hits);
  const dateReview = reviewNumericDate(text, choice.date, hits);
  const orderDate = dateReview.date;
  const no = /\border\s*(?:#|number\b|no\b\.?|id\b)\s*:?\s*#?\s*([A-Z0-9][A-Z0-9-]{3,})/i.exec(text);
  const tot = /\b(?:order\s+)?total\s*:?\s*([$€£]\s?\d[\d,]*(?:\.\d{2})?)/i.exec(text);
  // Some common receipts phrase an ID as "Your order number is XX-0001".
  // Require a digit for this extra syntax; otherwise a status word such as
  // "pending" could be mistaken for an identifier.
  const alternateNo = no ? null : /\byour\s+order\s+number\s+is\s+([A-Z0-9][A-Z0-9-]{3,})\b/i.exec(text);
  const confirmationNo = no || alternateNo ? null : /\border\s+confirmation\s*:\s*#?\s*([A-Z0-9][A-Z0-9-]{3,})\b/i.exec(text);
  const candidateNo = alternateNo?.[1] || confirmationNo?.[1] || '';
  const orderNo = no ? no[1] : /\d/.test(candidateNo) ? candidateNo : '';
  const alternateTotal = tot ? null : /\bamount\s+paid\s*:\s*([$€£]\s?\d[\d,]*(?:\.\d{2})?)/i.exec(text);
  const total = (tot ? tot[1] : alternateTotal?.[1] || '').replace(/\s/g, '');
  return {
    merchant, orderDate, orderNo, total,
    ...(dateReview.warning || choice.warning ? {dateWarning:dateReview.warning || choice.warning} : {}),
    found: { merchant: !!merchant, orderDate: !!orderDate, orderNo: !!orderNo, total: !!total },
  };
}
