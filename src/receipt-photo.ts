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
  ).find(name => name && !/^(?:receipt|transaction|invoice|register|cashier|terminal|order|check|heck|bill|table|ticket)\b/i.test(name));
  // Stop searching for a shop header at the first street address, item or
  // register line. With cropped photos the surviving item text may start
  // halfway down the receipt: a dish or server name is not a merchant.
  const bodyIndex = lines.slice(0, 14).findIndex(line =>
    /^\d{1,6}(?:\.\d+)?\s+\p{L}{2,}/u.test(line) ||
    /(?:^|\s)[$€£]?\d[\d,]*\.\d{2}(?:\b|$)/.test(line) ||
    /^(?:server|cashier|table|guests?|order|date|receipt|register)\s*[:#]/i.test(line));
  const header = lines.slice(0, Math.min(8, bodyIndex >= 0 ? bodyIndex : 8));
  const headerName = header.find(line => {
    const first = /^(\p{L}{3,})/u.exec(line)?.[1];
    return !!first && (first.length >= 4 || /\s+\p{L}{4,}/u.test(line)) &&
      line.length >= 2 && line.length <= 70 &&
      // OCR columns separated by wide spacing are not one printed name.
      !/\s{3,}/.test(line) &&
      /^[\p{L}\p{M}\p{N} &.'’+-]+$/u.test(line) &&
      !/\d{3}|[@<>]/.test(line) &&
      !/^(?:welcome|thank|receipt|invoice|tax invoice|customer copy|cashier|date|tel|phone|www\.|http)/i.test(line) &&
      !/\b(?:survey|feedback|give us|introducing|join|visa|mastercard|amex|credit|debit|server|svr|table|guest|cashier)\b/i.test(line) &&
      !/^(?:total|subtotal|tax|amount|cash|change)\b/i.test(line);
  });
  const merchant = storefront || parsed.merchant || headerName || '';
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
    const match = /^(?:(?:grand|order)\s+total|total(?:\s+(?:paid|amount|purchase|due))?|amount\s+(?:paid|due))\s*:?\s*([$€£]?\s*\d[\d,]*\.\d{2})(?:\s*(?:USD|EUR|GBP))?\s*$/i.exec(line);
    const amountFirst = /^([$€£]?\s*\d[\d,]*\.\d{2})\s+(?:(?:grand|order)\s+total|total(?:\s+(?:paid|amount|purchase|due))?|amount\s+(?:paid|due))\s*$/i.exec(line);
    // Restaurant bills often print the time immediately before TOTAL or
    // TOTAL DUE; unlike a plain subtotal this is a final-amount label.
    const afterTime = /^(?:(?:\d{1,2}\/\d{1,2}\s+)?\d{1,2}:\d{2}(?:\s*[AP]M)?\s+)(?:grand\s+|order\s+)?total(?:\s+(?:due|paid|amount|purchase))?\s*:?\s*([$€£]?\s*\d[\d,]*\.\d{2})\s*$/i.exec(line);
    // A one-letter OCR gutter or stray punctuation can precede an otherwise
    // complete line. Never infer totals from arbitrary item-name prefixes.
    const gutter = /^(?:[a-z]\s{2,}|[:|;]\s+)(?:grand\s+|order\s+)?total(?:\s+(?:due|paid|amount|purchase))?\s*:?\s*([$€£]?\s*\d[\d,]*\.\d{2})\s*[|:]?\s*$/i.exec(line);
    const amount = (match || amountFirst || afterTime || gutter)?.[1];
    return amount ? [amount.replace(/\s/g, '')] : [];
  });
  const distinctTotals = [...new Set(totals)];
  let total = distinctTotals.length === 1 ? distinctTotals[0] : '';
  // A conflicting payment-card charge is evidence that OCR may have confused
  // a digit in TOTAL. Keep the amount empty for a human to compare with the
  // photo rather than confidently suggest the wrong price.
  const paid = lines.flatMap(line => {
    const hit = /^(?:visa|mastercard|master card|amex|discover|debit|credit card)\s*:?\s*[$€£]?\s*(\d[\d,]*\.\d{2})\s*$/i.exec(line);
    return hit ? [hit[1].replace(/,/g, '')] : [];
  });
  if (total && paid.length && paid.some(amount => Number(amount) !== Number(total.replace(/[$€£,]/g, '')))) {
    total = '';
    notes.push('The printed total and card charge disagree. Check the amount paid against the original receipt.');
  }
  if (distinctTotals.length > 1) notes.push('Different totals appear on the receipt. Check the final amount paid.');
  if (!merchant) notes.push('The store name was not clear. Enter the printed store name.');
  return { merchant, orderDate, orderNo, total, notes };
}

/**
 * A damaged-image pass fills only facts supported by specific printed anchors.
 * A store name needs either the printed website or a two-line street/location
 * address; an amount needs its own TOTAL label and currency mark.
 */
export function damagedReceiptSuggestions(text: string): ReceiptSuggestions {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const notes: string[] = [];
  const websiteAt = lines.findIndex(line => /\b(?:www|wwe)\s*\./i.test(line));
  const website = lines.slice(Math.max(0, websiteAt)).join(' ');
  const domain = /\b(?:www|wwe)\s*\.\s*([a-z][a-z0-9-]{4,50})\.(?:com|net|org|co\.[a-z]{2})\b/i.exec(website)?.[1]?.toLowerCase();
  let merchant = '';
  if (domain) {
    const header = lines.slice(0, Math.min(16, websiteAt < 0 ? 16 : websiteAt));
    for (const line of header) {
      const words = line.match(/\b[A-Za-z]{4,24}\b/g) || [];
      const match = words.find(word => domain.startsWith(word.toLowerCase()) &&
        word.length >= domain.length * .45 &&
        !/^(?:total|subtot|thanks|visit|order|store|date|paid|receipt)$/i.test(word));
      if (match) { merchant = match[0]!.toUpperCase() + match.slice(1).toLowerCase(); break; }
    }
  }
  if (!merchant) {
    // A clearly printed brand immediately above a street address is stronger
    // than a distorted website footer. Require a second address line with
    // state/postal evidence so a lone crease artifact is never a store.
    const street = lines.slice(0, 18).findIndex(line => /\b\d{1,6}\s+[A-Za-z]{4,}/.test(line));
    const place = street >= 1 && lines.slice(street + 1, street + 4)
      .some(line => /\b[A-Z]{2}\s+\d{4,5}\b/.test(line));
    if (place) {
      const brandLine = lines[street - 1] || '';
      const titleWords = brandLine.match(/\b[A-Z][a-z]{3,24}\b/g) || [];
      const candidate = titleWords.filter(word => !/^(?:Thank|Total|Street|Circle|Village|Please|Store|Receipt|Customer|Order)$/i.test(word));
      if (candidate.length === 1) merchant = candidate[0]!;
    }
  }
  const totals = lines.filter(line => !/\bsub[\s-]*total\b/i.test(line)).flatMap(line => {
    const marker = /\b(?:grand\s+|order\s+)?total(?:\s+(?:paid|amount|purchase))?\b/i.exec(line);
    if (!marker) return [];
    const tail = line.slice(marker.index + marker[0].length, marker.index + marker[0].length + 28);
    // A warped letter can look like a digit beside TOTAL; require a single
    // explicit currency amount on that same printed line.
    const amounts = [...tail.matchAll(/[$€£]\s*\d[\d,]*\.\d{2}(?!\d)/g)];
    return amounts.length === 1 ? [amounts[0][0].replace(/\s/g, '')] : [];
  });
  const unique = [...new Set(totals)];
  // A crumpled receipt sometimes loses the currency signs but keeps two
  // separately printed final-amount lines. Only recover that number if the
  // distinct TOTAL and TOTAL DUE labels agree. One naked number is not proof.
  const duplicatePaid = lines.flatMap(line => {
    const match = /^(?:[a-z] {3,}|[:|;] +)?(total(?:\s+due)?)\s*:?\s*(\d[\d,]*\.\d{2})\s*[|:]?$/i.exec(line);
    return match ? [{ label: match[1].toLowerCase().replace(/\s+/g, ' '), amount: match[2].replace(/,/g, '') }] : [];
  });
  const distinctLabels = new Set(duplicatePaid.map(hit => hit.label));
  const duplicateNumbers = new Set(duplicatePaid.map(hit => hit.amount));
  const agreedPrintedTotal = distinctLabels.has('total') && distinctLabels.has('total due') &&
    duplicateNumbers.size === 1 ? duplicatePaid[0].amount : '';
  if (unique.length > 1 || duplicateNumbers.size > 1)
    notes.push('Different printed totals appeared in the damaged photo. Enter the final amount from the receipt.');
  return { merchant, orderDate: '', orderNo: '',
    total: unique.length === 1 ? unique[0] : unique.length ? '' : agreedPrintedTotal, notes };
}

export function receiptFileProblem(file: Pick<File, 'type' | 'size'>): string | null {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    return 'Choose a JPG, PNG or WebP receipt photo. For HEIC or PDF, export a JPG first, or enter the purchase manually.';
  if (file.size > 20 * 1024 * 1024)
    return 'This photo is larger than 20 MB. Choose a smaller copy or enter the purchase manually.';
  if (!file.size) return 'This photo is empty. Choose another photo.';
  return null;
}

/** A second OCR pass may fill missing words, never decide a conflict visible in the first. */
export function mergeReceiptSuggestions(primary: ReceiptSuggestions, recovered?: ReceiptSuggestions):
  ReceiptSuggestions & { recoveredCount: number } {
  const result = { ...primary, notes: [...primary.notes] };
  let recoveredCount = 0;
  const totalConflict = !!(primary.total && recovered?.total &&
      primary.total.replace(/[$€£,]/g, '') !== recovered.total.replace(/[$€£,]/g, ''));
  if (totalConflict) {
    result.total = '';
    result.notes.push('Different OCR readings of the paid total disagree. Check the amount on the original receipt.');
  }
  // Sometimes a folded brand's first word is missing from the first pass.
  // A later complete heading can extend an intact shorter name without
  // guessing between two different printed shops.
  if (primary.merchant && recovered?.merchant &&
      recovered.merchant.toLowerCase().endsWith(primary.merchant.toLowerCase()) &&
      recovered.merchant.length > primary.merchant.length + 3) {
    result.merchant = recovered.merchant;
  }
  const disputedDate = primary.notes.some(note => /several dates|two different dates/i.test(note));
  const disputedTotal = primary.notes.some(note => /different totals|OCR readings|card charge disagree/i.test(note));
  for (const name of ['merchant', 'orderDate', 'orderNo', 'total'] as const) {
    if (!result[name] && recovered?.[name] && !(name === 'orderDate' && disputedDate) &&
        !(name === 'total' && (disputedTotal || totalConflict))) {
      result[name] = recovered[name];
      recoveredCount++;
    }
  }
  result.notes = result.notes.filter(note => !(
    (result.merchant && /store name was not clear/i.test(note)) ||
    (result.orderDate && /purchase date was not clear/i.test(note))
  ));
  if (!result.orderDate && recovered?.notes.some(note => /two different dates|several dates/i.test(note))) {
    for (const note of recovered.notes.filter(note => /two different dates|several dates/i.test(note)))
      if (!result.notes.includes(note)) result.notes.push(note);
  }
  if (!result.total && recovered?.notes.some(note => /different totals/i.test(note))) {
    for (const note of recovered.notes.filter(note => /different totals/i.test(note)))
      if (!result.notes.includes(note)) result.notes.push(note);
  }
  return { ...result, recoveredCount };
}
