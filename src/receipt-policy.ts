import type { DeadlineRequirement } from './deadline-requirement';
/** Local text evidence, never a verified retailer policy. Raw passages stay in the open review only. */
export type ReceiptPolicyReview = { passages: string[]; days?: number; needsChoice: boolean; message: string; actionKinds: DeadlineRequirement[]; actionRequired: boolean; actionConflict: boolean };
export function receiptPolicy(text: string): ReceiptPolicyReview {
  const normalized = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ');
  const pieces = normalized.replace(/(\breturn(?:s|ed|ing|able)?\b[^\n.!?]{0,65})\n(?=\s*\d)/gi, '$1 ').split(/\n|(?<=[.!?])\s+/).map(s => s.replace(/\s+/g, ' ').trim());
  const passages: string[] = [];
  const amounts = new Set<number>();
  const actions = new Set<DeadlineRequirement>();
  let conditional = false;
  for (const piece of pieces) {
    const patterns = [
      /\breturn(?:s|ed|ing|able)?\b[^.!?]{0,65}?\b(\d{1,4})[ -]*(?:(business|working|calendar)[ -]*)?days?\b/gi,
      /\b(\d{1,4})[ -]*(?:(business|working|calendar)[ -]*)?days?[ -]+(?:return|returns)\b/gi,
    ];
    let relevant = false;
    const labelExpiry = /\breturn(?:s)?\s+(?:shipping\s+)?labels?\b|\b(?:label|authorization|authorisation|rma)\b[^.!?]{0,40}\b(?:valid|expires?|expiry)\b/i.test(piece);
    // A dated return action is different from a generic return-window duration.
    // Only attach action meaning to a return/parcel clause, never ordinary delivery
    // dates, refund receipt, or the validity of a shipping label.
    const actionContext = /\b(?:return(?:s|ed|ing|able)?|parcel|package|items?|goods|merchandise)\b/i.test(piece);
    const hasDeadline = /\b(?:by|before|within|no later than|deadline|until)\b/i.test(piece);
    if (actionContext && hasDeadline && !labelExpiry) {
      const ship = /\b(?:ship(?:ped|ping)?|postmark(?:ed)?|hand(?:ed)?\s+(?:over|to)\s+(?:the\s+)?carrier)\b/i.test(piece);
      const drop = /\b(?:drop[\s-]?off|bring|take)\b.{0,55}\b(?:store|counter|return(?:s)?|point|location|parcel|package)\b|\b(?:return(?:ed)?\s+(?:in|at)\s+store|in[\s-]store\s+return)\b/i.test(piece);
      const arrive = /\b(?:return(?:s|ed)?|parcel|package|items?|goods)\b.{0,70}\b(?:arrive(?:s|d)?|reach(?:es|ed)?|(?:be|is|are)\s+received)\b|\b(?:merchant|retailer|warehouse|store|we|us)\b.{0,45}\b(?:receive(?:d)?|arriv(?:e|al))\b.{0,45}\b(?:return(?:s|ed|ing)?|parcel|package|items?|goods)\b/i.test(piece);
      if (ship || drop || arrive) {
        relevant = true;
        if (ship) actions.add('ship-by');
        if (drop) actions.add('drop-off-by');
        if (arrive) actions.add('arrive-by');
      }
    }
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
  const actionKinds = [...actions];
  const actionConflict = actionKinds.length > 1;
  const needsChoice = distinct.length > 0 && (conditional || amounts.size !== 1 || actionConflict);
  const days = !needsChoice && amounts.size === 1 ? [...amounts][0] : undefined;
  return {
    passages: distinct.slice(0,6), ...(days !== undefined ? {days} : {}), needsChoice,
    actionKinds, actionRequired: actionKinds.length > 0, actionConflict,
    message: !distinct.length ? ''
      : actionKinds.length ? 'These are the handoff terms found in your receipt. Compare the wording; retailer instructions have not been verified.'
      : needsChoice ? 'This receipt has conditional return terms. Confirm which rule applies and its calendar-day window; label expiry and eligibility are separate.'
      : 'The receipt mentions ' + days + ' days. Check that this rule applies to this purchase; the receipt text is not retailer verification.',
  };
}
export function receiptWindow(text: string, fallback: number): string {
  const review = receiptPolicy(text);
  return review.needsChoice ? '' : String(review.days ?? fallback);
}
