import { describe, it, expect } from 'vitest';
import { buildIcs } from '../src/ics';
describe('absolute reviewed calendar alarm', () => {
  const order = { id: 'review;literal\nid', merchant: 'R&D, 日用品\r\nBEGIN:VALARM', orderNo: '#17;A', due: '2026-10-10' };
  const stamp = new Date('2026-10-08T12:34:56.000Z');
  it('changes only the alarm line, preserving identity, all-day dates and escaped fields', () => {
    const original = buildIcs(order, stamp);
    const chosen = buildIcs(order, stamp, new Date('2026-10-09T18:30:00.000Z'));
    expect(chosen).toBe(original.replace('TRIGGER:-P3D', 'TRIGGER;VALUE=DATE-TIME:20261009T183000Z'));
    expect(chosen).toContain('DTSTART;VALUE=DATE:20261010\r\nDTEND;VALUE=DATE:20261011');
    expect(chosen.match(/^BEGIN:VALARM$/gm)).toHaveLength(1);
    expect(chosen).not.toContain('RELATED');
  });
  it('retains default three-day bytes when the optional alarm is omitted', () => {
    expect(buildIcs(order, stamp, undefined)).toBe(buildIcs(order, stamp));
    expect(buildIcs(order, stamp)).toContain('\r\nTRIGGER:-P3D\r\n');
  });
  it.each([new Date(NaN), new Date('2026-10-09T18:30:00.001Z'), new Date('+010000-01-01T00:00:00Z'), new Date('0000-01-01T00:00:00Z')])('refuses unsupported absolute alarm %s', alarm => {
    expect(() => buildIcs(order, stamp, alarm)).toThrow();
  });
});
