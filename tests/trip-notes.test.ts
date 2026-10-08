import { describe, expect, it } from 'vitest';
import { buildChecklistHtml, createChecklist, parseSavedOrders, renderChecklist } from '../src/trip-checklist';
import { MAX_TRIP_NOTE_CHARACTERS, normalizeTripNotes, withTripNotes } from '../src/trip-notes';

const raw = JSON.stringify([{
  id: 'fictional-1', merchant: 'Fictional Harbor Shop', orderNo: 'DEMO-71',
  total: '€19,95', orderDate: '2026-10-01', windowDays: 30,
  windowSource: 'user', createdAt: '2026-10-01T12:00:00Z',
}]);
const base = () => createChecklist(parseSavedOrders(raw), ['fictional-1'], '2026-10-10', '2026-10-08');

describe('optional typed trip notes', () => {
  it('adds notes without changing the accepted facts or original checklist', () => {
    const before = base(), after = withTripNotes(before, 'Bring the packaging.\nUse the side entrance.');
    expect(after).not.toBe(before);
    expect(after.orders).toBe(before.orders);
    expect(after.orders[0].order.total).toBe('€19,95');
    expect(before.tripNotes).toBeUndefined();
    expect(after.tripNotes).toBe('Bring the packaging.\nUse the side entrance.');
    expect(Object.isFrozen(after)).toBe(true);
  });

  it('renders notes separately from the literal saved facts in preview and download', () => {
    const model = withTripNotes(base(), 'Desk B — bring receipt 🧾');
    for (const html of [renderChecklist(model), buildChecklistHtml(model)]) {
      expect(html).toContain('YOUR TRIP NOTES');
      expect(html).toContain('Desk B — bring receipt 🧾');
      expect(html).toContain('€19,95');
      expect(html).toContain('User-adjusted window');
      expect(html).not.toContain('2026-10-01T12:00:00Z');
    }
  });

  it('keeps markup-looking ordinary text as reading content', () => {
    const html = buildChecklistHtml(withTripNotes(base(), '<desk> & "door" \'B\''));
    expect(html).toContain('&lt;desk&gt; &amp; &quot;door&quot; &#39;B&#39;');
    expect(html).not.toContain('<desk>');
    expect(html).not.toContain('<script');
  });

  it('empty notes preserve the original rendered sheet', () => {
    const model = base();
    expect(renderChecklist(withTripNotes(model, ''))).toBe(renderChecklist(model));
    expect(buildChecklistHtml(withTripNotes(model, ''))).toBe(buildChecklistHtml(model));
  });

  it('retains ordinary spaces, tabs and authored line breaks', () => {
    expect(normalizeTripNotes('  Desk A\tB\n\n  ')).toBe('  Desk A\tB\n\n  ');
    expect(normalizeTripNotes('North\r\nSouth\rEast')).toBe('North\nSouth\nEast');
  });

  it('accepts exactly the documented Unicode code-point bound', () => {
    const text = '🧾'.repeat(MAX_TRIP_NOTE_CHARACTERS);
    expect(withTripNotes(base(), text).tripNotes).toBe(text);
    expect(() => withTripNotes(base(), text + 'x')).toThrow('1,000 characters');
  });

  it('checks the normalized line-ending count', () => {
    expect(normalizeTripNotes('\r\n'.repeat(MAX_TRIP_NOTE_CHARACTERS))).toBe('\n'.repeat(MAX_TRIP_NOTE_CHARACTERS));
  });

  it('refuses unsupported controls or isolated surrogates without changing facts', () => {
    const model = base(), frozen = JSON.stringify(model);
    for (const note of ['A\u0000B', 'A\u0007B', 'A\u007fB', 'A\u0085B', 'A\ud800B', 'A\udfffB']) {
      expect(() => withTripNotes(model, note)).toThrow('ordinary text');
      expect(JSON.stringify(model)).toBe(frozen);
    }
  });

  it('refuses nonstring API values', () => {
    for (const value of [null, undefined, 0, false, [], {}]) {
      expect(() => normalizeTripNotes(value as unknown as string)).toThrow('ordinary text');
    }
  });
});
