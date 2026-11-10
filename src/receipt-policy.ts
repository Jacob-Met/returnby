/** Local text evidence, never a verified retailer policy. Raw passages stay in the open review only. */
export type ReceiptPolicyReview = { passages: string[]; days?: number; needsChoice: boolean; message: string };
export function receiptPolicy(text: string): ReceiptPolicyReview {
  const normalized = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ');
  const pieces = normalized.replace(/(\breturn(?:s|ed|ing|able)?\b[^\n.!?]{0,65})\n(?=\s*\d)/gi, '$1 ').split(/\n|(?<=[.!?])\s+/).map(s => s.replace(/\s+/g, ' ').trim());
  const passages: string[] = [];
  const amounts = new Set<number>();
  let conditional = false;
  for (const piece of pieces) {
    const patterns = [
      /\breturn(?:s|ed|ing|able)?\b[^.!?]{0,65}?\b(\d{1,4})[ -]*(?:(business|working|calendar)[ -]*)?days?\b/gi,
      /\b(\d{1,4})[ -]*(?:(business|working|calendar)[ -]*)?days?[ -]+(?:return|returns)\b/gi,
    ];
    let relevant = false;
    const labelExpiry = /\breturn(?:s)?\s+(?:shipping\s+)?labels?\b|\b(?:label|authorization|authorisation|rma)\b[^.!?]{0,40}\b(?:valid|expires?|expiry)\b/i.test(piece);
    for (const pattern of patterns) {
      for (const hit of piece.matchAll(pattern)) {
        relevant = true;
        if (labelExpiry) conditional = true;
        if (/business|working/i.test(hit[2] || '')) conditional = true;
        const n = Number(hit[1]);
        if (n > 0 && n <= 366) amounts.add(n); else conditional = true;
      }
    }
    if (/\b(?:final sale|non[- ]returnable|no returns|returns? (?:are )?not (?:accepted|allowed)|(?:cannot|can not|may not|must not) be returned|not (?:eligible|accepted) for returns?)\b/i.test(piece)) {
      relevant = true; conditional = true;
    }
    if (/\breturn(?:s|ed|ing|able)?\b[^.!?]{0,65}\b\d+[ -]*(?:weeks?|months?|years?)\b/i.test(piece)) { relevant = true; conditional = true; }
    if (!relevant) continue;
    if (/\b(?:except|unless|if|only|unopened|opened|unused|unworn|selected|select items|sale items?|members?|holiday|business|working|exchange only|refund only|final sale)\b/i.test(piece)) conditional = true;
    for (const hit of piece.matchAll(/\b(\d{1,4})[ -]*(?:(?:business|working|calendar)[ -]*)?days?\b/gi)) amounts.add(Number(hit[1]));
    passages.push(piece.length <= 500 ? piece : piece.slice(0,497) + '…');
  }
  const distinct = [...new Set(passages)];
  const needsChoice = distinct.length > 0 && (conditional || amounts.size !== 1);
  const days = !needsChoice && amounts.size === 1 ? [...amounts][0] : undefined;
  return {
    passages: distinct.slice(0,6), ...(days !== undefined ? {days} : {}), needsChoice,
    message: !distinct.length ? '' : needsChoice
      ? 'This receipt has different or conditional return terms. Confirm which rule applies, then enter its calendar-day window. Label expiry, conditions and non-calendar-day terms need your confirmation.'
      : 'The receipt mentions ' + days + ' days. Check that this rule applies to this purchase; the receipt text is not retailer verification.',
  };
}
export function receiptWindow(text: string, fallback: number): string {
  const review = receiptPolicy(text);
  return review.needsChoice ? '' : String(review.days ?? fallback);
}
