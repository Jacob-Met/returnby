import { describe, expect, it } from 'vitest';
import { parseSavedOrders } from '../src/trip-checklist';
import { buildEnquiry, formatEnquiry, type EnquiryInput } from '../src/enquiry';

const order = {
  id: 'saved-A', merchant: 'Fictional <Shop> & Co', orderNo: '00042\npart-β',
  total: 'USD 001.20', orderDate: '2026-10-03', windowDays: 30,
  windowSource: 'user', createdAt: '2026-10-03T12:00:00Z',
  extra: { untouched: ['α', 3], completedAt: '2026-10-07T12:00:00Z' },
};
const raw = JSON.stringify([order, { ...order, id: 'saved-B', merchant: '', orderNo: undefined }]);
const snapshot = parseSavedOrders(raw);
const input: EnquiryInput = { items: 'Blue shirt\nSize M', reason: 'The fit is different from expected.', request: 'instructions', signature: 'Alex' };
const expectedBody = [
  'Hello,', '', 'I would like to ask about the following order.', '',
  'Store: Fictional <Shop> & Co', 'Order number: 00042\npart-β', 'Order date: 2026-10-03', '',
  'Items I am asking about:', 'Blue shirt\nSize M', '',
  'Reason or context:', 'The fit is different from expected.', '',
  'Could you confirm whether these items can be returned and how to arrange it?',
  'Please include the relevant deadline, any charges, and any packaging or proof-of-purchase requirements.', '',
  'Thank you,', 'Alex',
].join('\n');

describe('local enquiry message', () => {
  it('uses literal reviewed facts and authored words, with a question rather than an eligibility claim', () => {
    expect(buildEnquiry(snapshot, 'saved-A', input)).toEqual({
      orderId: 'saved-A', subject: 'Return instructions enquiry', body: expectedBody,
    });
  });
  it('retains the complete saved raw record without serializing or mutating it', () => {
    const before = JSON.stringify(snapshot);
    const draft = buildEnquiry(snapshot, 'saved-A', input);
    expect(Object.isFrozen(draft)).toBe(true);
    expect(JSON.stringify(snapshot)).toBe(before);
    expect(snapshot.raw).toBe(raw);
    expect(draft.body).not.toContain(order.total);
    expect(draft.body).not.toContain(order.extra.completedAt);
    expect(draft.body).not.toContain('2026-11-02');
  });
  it('labels missing saved facts and omits absent optional author sections', () => {
    const draft = buildEnquiry(snapshot, 'saved-B', { items: 'One item', reason: '', request: 'instructions', signature: '' });
    expect(draft.body).toContain('Store: Not recorded\nOrder number: Not recorded\nOrder date: 2026-10-03');
    expect(draft.body).not.toContain('Reason or context:');
    expect(draft.body.endsWith('Thank you.')).toBe(true);
  });
  it.each([
    ['exchange', 'Exchange options enquiry', 'Could you confirm whether an exchange is possible and what options and steps are available?'],
    ['eligibility', 'Return eligibility enquiry', 'Could you confirm whether these items are eligible for a return?'],
  ] as const)('uses the explicit %s question', (request, subject, question) => {
    const draft = buildEnquiry(snapshot, 'saved-A', { ...input, request });
    expect(draft.subject).toBe(subject);
    expect(draft.body).toContain(question);
    expect(draft.body).toContain(input.items);
  });
  it.each(['', 'unknown'])('refuses an unselected or unknown ID %s', id => {
    expect(() => buildEnquiry(snapshot, id, input)).toThrow();
  });
  it('refuses unknown request kinds and non-string author fields', () => {
    expect(() => buildEnquiry(snapshot, 'saved-A', { ...input, request: 'refund' as never })).toThrow();
    expect(() => buildEnquiry(snapshot, 'saved-A', { ...input, reason: 4 as never })).toThrow();
  });
  it('requires actual item details and enforces all three exact field limits', () => {
    expect(() => buildEnquiry(snapshot, 'saved-A', { ...input, items: ' \n\t' })).toThrow();
    for (const [field, max] of [['items', 2000], ['reason', 4000], ['signature', 200]] as const) {
      expect(() => buildEnquiry(snapshot, 'saved-A', { ...input, [field]: 'x'.repeat(max) })).not.toThrow();
      expect(() => buildEnquiry(snapshot, 'saved-A', { ...input, [field]: 'x'.repeat(max + 1) })).toThrow();
    }
  });
  it('preserves nonblank whitespace and markup-like author text as literal text', () => {
    const items = '  <script>not code</script>\n€ café 😀  ';
    const draft = buildEnquiry(snapshot, 'saved-A', { ...input, items });
    expect(draft.body).toContain('Items I am asking about:\n' + items + '\n');
  });
});

describe('reviewed plain-text output', () => {
  it('formats the literal edited message with CRLF and no BOM', () => {
    const text = formatEnquiry('My own subject', 'α\r\nβ\nγ\rδ');
    expect(text).toBe('Subject: My own subject\r\n\r\nα\r\nβ\r\nγ\r\nδ\r\n');
    expect(new TextEncoder().encode(text)[0]).toBe(83);
  });
  it('uses all final edited text rather than regenerating from source facts', () => {
    expect(formatEnquiry('Revised subject', 'An entirely edited message.'))
      .toBe('Subject: Revised subject\r\n\r\nAn entirely edited message.\r\n');
  });
  it('accepts exact reviewed limits and refuses excessive or empty text', () => {
    expect(() => formatEnquiry('s'.repeat(200), 'b'.repeat(16000))).not.toThrow();
    for (const [subject, body] of [['s'.repeat(201), 'b'], ['s', 'b'.repeat(16001)], ['  ', 'b'], ['s', ' \n']]) {
      expect(() => formatEnquiry(subject, body)).toThrow();
    }
  });
  it.each(['one\ntwo', 'one\rtwo', 'one\r\ntwo'])('refuses a multiline subject', subject => {
    expect(() => formatEnquiry(subject, 'Body')).toThrow();
  });
});
