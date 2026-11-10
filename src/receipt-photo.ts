import { findDates, parse } from './parse';

export type ReceiptSuggestions = {
  merchant: string;
  orderDate: string;
  orderNo: string;
  total: string;
  notes: string[];
};

/** Suggestions from visible receipt text, never a return policy or a saved order. */
export function receiptSuggestions(text: string): ReceiptSuggestions {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const parsed = parse(text);
  const notes: string[] = [];
  // A printed store-number header is stronger evidence than a survey banner.
  // Do not infer the merchant from branded payment-card or footer text.
  const storefront = lines.slice(0, 14).map(line =>
    /^([\p{L}][\p{L}\p{M} &.'-]{1,69})\s*#\s*\d[\w.-]*\s*$/u.exec(line)?.[1]?.trim()
  ).find(name => name && !/^(?:receipt|transaction|invoice|register|cashier|terminal|order)\b/i.test(name));
  const merchant = parsed.merchant || storefront || lines.slice(0, 8).find(line =>
    line.length >= 2 && line.length <= 70 &&
    /[A-Za-z]{2}/.test(line) && !/\d{3}|[@<>]/.test(line) &&
    !/^(?:welcome|thank|receipt|invoice|tax invoice|customer copy|cashier|date|tel|phone|www\.|http)/i.test(line) &&
    !/\b(?:survey|feedback|give us|introducing|join|visa|mastercard|amex|credit|debit)\b/i.test(line) &&
    !/^(?:total|subtotal|tax|amount|cash|change)\b/i.test(line)
  ) || '';
  const dateLines = lines.filter(line => !/\b(?:return|refund|expire|expiry|delivery|deliver|ship)\b/i.test(line));
  const explicitDateLines = dateLines.filter(line => /\b(?:purchase[ds]?|transaction|sale|order|date)\b/i.test(line));
  let hits = explicitDateLines.flatMap(line => findDates(line).map(hit => ({ ...hit, line })));
  if (!hits.length) hits = dateLines.flatMap(line => findDates(line).map(hit => ({ ...hit, line })));
  const dates = [...new Set(hits.map(hit => hit.date))];
  let orderDate = dates.length === 1 ? dates[0] : '';
  const ambiguous = dateLines.some(line => {
    const numeric = /\b(\d{1,2})\/(\d{1,2})\/\d{4}\b/.exec(line);
    return numeric && +numeric[1] <= 12 && +numeric[2] <= 12 && numeric[1] !== numeric[2];
  });
  if (ambiguous) {
    orderDate = '';
    notes.push('The printed numeric date could mean two different dates. Enter the purchase date after checking the receipt.');
  } else if (!orderDate) {
    notes.push(dates.length > 1 ? 'Several dates appear on the receipt. Enter the purchase date.' : 'The purchase date was not clear. Enter it from the receipt.');
  }
  const receiptNo = /\b(?:receipt|transaction|invoice)\s*(?:#|number\b|no\b\.?|id\b)\s*:?\s*#?\s*([A-Z0-9][A-Z0-9-]{2,})/i.exec(text)?.[1] || '';
  const orderNo = parsed.orderNo || receiptNo;
  const totals = lines.flatMap(line => {
    const match = /^(?:(?:grand|order)\s+total|total(?:\s+(?:paid|amount|purchase))?|amount\s+(?:paid|due))\s*:?\s*([$€£]?\s*\d[\d,]*\.\d{2})(?:\s*(?:USD|EUR|GBP))?\s*$/i.exec(line);
    const amountFirst = /^([$€£]?\s*\d[\d,]*\.\d{2})\s+(?:(?:grand|order)\s+total|total(?:\s+(?:paid|amount|purchase))?|amount\s+(?:paid|due))\s*$/i.exec(line);
    return match || amountFirst ? [(match || amountFirst)![1].replace(/\s/g, '')] : [];
  });
  const distinctTotals = [...new Set(totals)];
  const total = distinctTotals.length === 1 ? distinctTotals[0] : '';
  if (distinctTotals.length > 1) notes.push('Different totals appear on the receipt. Check the final amount paid.');
  if (!merchant) notes.push('The store name was not clear. Enter the printed store name.');
  return { merchant, orderDate, orderNo, total, notes };
}

export function receiptFileProblem(file: Pick<File, 'type' | 'size'>): string | null {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    return 'Choose a JPG, PNG or WebP receipt photo. For HEIC or PDF, export a JPG first, or enter the purchase manually.';
  if (file.size > 20 * 1024 * 1024)
    return 'This photo is larger than 20 MB. Choose a smaller copy or enter the purchase manually.';
  if (!file.size) return 'This photo is empty. Choose another photo.';
  return null;
}
