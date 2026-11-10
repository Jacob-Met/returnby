import { findDates } from './parse';
/** Detect explicit delivery-based return language; never confirm dates on the shopper's behalf. */
export function deliveryReview(text: string): { required: boolean; date?: string } {
  const normalized = text.replace(/\s+/g, ' ');
  const deliveryBasis = /\b(?:days?\s+(?:of|after|from)\s+(?:(?:the|your)\s+)?(?:delivery(?:\s+date)?|receipt|date\s+(?:your\s+order\s+was\s+)?delivered)|(?:starts?|begins?)\s+(?:on|at)\s+delivery)\b/i;
  const required = /\breturn(?:s|ed|ing|able)?\b/i.test(normalized) && deliveryBasis.test(normalized);
  if (!required) return { required: false };
  const dates = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    if (!/^\s*(?:delivered(?:\s+on)?|delivery\s+date)\s*:/i.test(line)) continue;
    const hits = findDates(line);
    if (hits.length === 1) dates.add(hits[0].date);
  }
  return { required, ...(dates.size === 1 ? { date: [...dates][0] } : {}) };
}
