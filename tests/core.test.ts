import { describe, it, expect } from 'vitest';
import { parse, findDates } from '../src/parse';
import { dueDate, daysLeft, status } from '../src/deadline';
import { buildIcs } from '../src/ics';
import { lookup, knownMerchants } from '../src/policy';
import { samples } from '../src/samples';

describe('parse', () => {
  it('reads date formats', () => {
    for (const s of ['October 3, 2026', 'Oct 3, 2026', '10/03/2026', '2026-10-03', '3 Oct 2026'])
      expect(findDates(s)[0].date).toBe('2026-10-03');
  });
  it('parses sample 1', () => {
    const p = parse(samples[0], knownMerchants);
    expect(p).toMatchObject({ merchant: 'Northwind Outfitters', orderDate: '2026-10-03', orderNo: 'NW-48213', total: '$64.00' });
  });
  it('prefers date near "order"', () => {
    expect(parse('Ships Sep 1, 2026. Order placed on Aug 20, 2026.').orderDate).toBe('2026-08-20');
  });
  it('leaves unknowns blank', () => {
    const p = parse(samples[2], knownMerchants);
    expect(p.found).toEqual({ merchant: false, orderDate: false, orderNo: false, total: false });
  });
});

describe('deadline + policy', () => {
  it('computes', () => {
    expect(dueDate('2026-10-03', 30)).toBe('2026-11-02');
    expect(daysLeft('2026-11-02', '2026-10-04')).toBe(29);
    expect([status(10), status(5), status(2), status(-1)]).toEqual(['ok', 'soon', 'urgent', 'expired']);
    expect(lookup('Contoso Electronics')).toEqual({ days: 15, source: 'policy' });
    expect(lookup('Somewhere')).toEqual({ days: 30, source: 'default' });
  });
});

describe('ics', () => {
  it('builds RFC5545 all-day event with 3-day alarm', () => {
    const s = buildIcs({ id: 'x', merchant: 'Northwind, Inc', due: '2026-11-02' }, new Date('2026-10-04T00:00:00Z'));
    expect(s).toContain('DTSTART;VALUE=DATE:20261102\r\n');
    expect(s).toContain('DTEND;VALUE=DATE:20261103');
    expect(s).toContain('TRIGGER:-P3D');
    expect(s).toContain('Northwind\\, Inc');
  });
});
