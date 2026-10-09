import type { SavedSnapshot } from './trip-checklist';

export type EnquiryInput = Readonly<{
  items: string;
  reason: string;
  request: 'instructions' | 'exchange' | 'eligibility';
  signature: string;
}>;
export type EnquiryDraft = Readonly<{ orderId: string; subject: string; body: string }>;

const requests = {
  instructions: {
    subject: 'Return instructions enquiry',
    question: 'Could you confirm whether these items can be returned and how to arrange it?',
  },
  exchange: {
    subject: 'Exchange options enquiry',
    question: 'Could you confirm whether an exchange is possible and what options and steps are available?',
  },
  eligibility: {
    subject: 'Return eligibility enquiry',
    question: 'Could you confirm whether these items are eligible for a return?',
  },
} as const;

function field(value: unknown, name: string, limit: number, required = false): string {
  if (typeof value !== 'string' || value.length > limit || (required && !value.trim())) {
    throw new Error(name + ' must ' + (required ? 'contain text and ' : '') + 'be at most ' + limit.toLocaleString('en-US') + ' characters.');
  }
  return value;
}

/** Produce questions from saved facts and the user's wording; never save or send. */
export function buildEnquiry(snapshot: SavedSnapshot, orderId: string, input: EnquiryInput): EnquiryDraft {
  const order = snapshot.orders.find(candidate => candidate.id === orderId);
  if (!order) throw new Error('Choose a saved order before preparing the enquiry.');
  if (!Object.prototype.hasOwnProperty.call(requests, input.request)) throw new Error('Choose one of the three enquiry types.');
  const items = field(input.items, 'Item details', 2000, true);
  const reason = field(input.reason, 'Reason or context', 4000);
  const signature = field(input.signature, 'Sign-off', 200);
  const request = requests[input.request];
  const lines = [
    'Hello,', '', 'I would like to ask about the following order.', '',
    'Store: ' + (order.merchant || 'Not recorded'),
    'Order number: ' + (order.orderNo || 'Not recorded'),
    'Order date: ' + order.orderDate, '',
    'Items I am asking about:', items, '',
  ];
  if (reason) lines.push('Reason or context:', reason, '');
  lines.push(request.question,
    'Please include the relevant deadline, any charges, and any packaging or proof-of-purchase requirements.',
    '', signature ? 'Thank you,' : 'Thank you.');
  if (signature) lines.push(signature);
  return Object.freeze({ orderId, subject: request.subject, body: lines.join('\n') });
}

/** Export the actual reviewed fields, including edits, as ordinary UTF-8 text. */
export function formatEnquiry(subject: string, body: string): string {
  field(subject, 'Subject', 200, true);
  field(body, 'Message', 16000, true);
  if (/[\r\n]/.test(subject)) throw new Error('Keep the subject on one line.');
  return 'Subject: ' + subject + '\r\n\r\n' + body.replace(/\r\n|\r|\n/g, '\r\n') + '\r\n';
}
