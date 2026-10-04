export type Parsed = {
  merchant: string;
  orderDate: string; // YYYY-MM-DD or ''
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
  const mon = '(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\\.?';
  const patterns: [RegExp, (m: RegExpExecArray) => string][] = [
    [new RegExp(`\\b${mon}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, 'gi'),
      (m) => iso(+m[3], MONTHS[m[1].toLowerCase()], +m[2])],
    [new RegExp(`\\b(\\d{1,2})\\s+${mon}\\s+(\\d{4})\\b`, 'gi'),
      (m) => iso(+m[3], MONTHS[m[2].toLowerCase()], +m[1])],
    [/\b(\d{4})-(\d{2})-(\d{2})\b/g, (m) => iso(+m[1], +m[2], +m[3])],
    [/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, (m) => iso(+m[3], +m[1], +m[2])], // US order
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

function pickOrderDate(text: string): string {
  const hits = findDates(text);
  if (!hits.length) return '';
  const lower = text.toLowerCase();
  for (const h of hits) {
    const before = lower.slice(Math.max(0, h.index - 40), h.index);
    if (/(order|placed|purchased|ordered)/.test(before)) return h.date;
  }
  return hits.map((h) => h.date).sort()[0];
}

function pickMerchant(text: string, known: string[]): string {
  const from = /^\s*from:\s*(.+)$/im.exec(text);
  if (from) {
    const name = from[1].replace(/<[^>]*>/, '').replace(/["']/g, '').trim();
    if (name && !name.includes('@')) return name;
    const dom = /@([a-z0-9-]+)\./i.exec(from[1]);
    if (dom) return dom[1].charAt(0).toUpperCase() + dom[1].slice(1);
  }
  const lower = text.toLowerCase();
  for (const k of known) if (lower.includes(k.toLowerCase())) return k;
  return '';
}

export function parse(text: string, knownMerchants: string[] = []): Parsed {
  const merchant = pickMerchant(text, knownMerchants);
  const orderDate = pickOrderDate(text);
  const no = /order\s*(?:#|number|no\.?|id)\s*:?\s*#?\s*([A-Z0-9][A-Z0-9-]{3,})/i.exec(text);
  const tot = /(?:order\s+)?total\s*:?\s*([$€£]\s?\d[\d,]*(?:\.\d{2})?)/i.exec(text);
  const orderNo = no ? no[1] : '';
  const total = tot ? tot[1].replace(/\s/g, '') : '';
  return {
    merchant, orderDate, orderNo, total,
    found: { merchant: !!merchant, orderDate: !!orderDate, orderNo: !!orderNo, total: !!total },
  };
}
