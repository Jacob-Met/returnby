import { describe, expect, it } from 'vitest';
import { findDates, parse } from '../src/parse';

describe('ISO timestamp receipt dates', () => {
  it.each([
    "2026-10-03T15:24:00Z",
    "2026-10-03t15:24:00z",
    "2026-10-03T15:24:00.123456Z",
    "2026-10-03T00:15:00+14:00",
    "2026-10-03T23:45:00-12:00",
    "2026-10-03T15:24:00+00:00",
    "2026-10-03T15:24:00",
    "2026-10-03T15:24",
    "2026-10-03T15:24Z",
    "2026-10-03T15:24-04:00",
    "2024-02-29T23:59:59.999Z",
    "2026-12-31T23:59:59Z"
])('keeps the written calendar date in %s', (timestamp) => {
    expect(findDates(timestamp)).toEqual([{ date: timestamp.slice(0, 10), index: 0 }]);
    const parsed = parse(`Order date: ${timestamp}`);
    expect(parsed.orderDate).toBe(timestamp.slice(0, 10));
    expect(parsed.found.orderDate).toBe(true);
  });

  it.each([
    "2026-10-03Today",
    "2026-10-03T",
    "2026-10-03T24:00:00Z",
    "2026-10-03T15:60:00Z",
    "2026-10-03T15:24:60Z",
    "2026-10-03T1:24:00Z",
    "2026-10-03T15:2:00Z",
    "2026-10-03T15:24:0Z",
    "2026-10-03T15:24:00.123oops",
    "2026-10-03T15:24:00+24:00",
    "2026-10-03T15:24:00+02:60",
    "2026-10-03T15:24:00+0200",
    "2026-10-03T15:24:00+02",
    "2026-10-03T15:24:00Zextra",
    "2026-10-03T15:24:00Z+01:00",
    "2026-10-03T15:24.123Z",
    "2026-10-03T15:24:00.1.2Z",
    "2026-02-29T15:24:00Z",
    "2026-04-31T15:24:00Z",
    "2026-13-03T15:24:00Z"
])('does not extract a date from malformed attached text %s', (text) => {
    expect(findDates(text)).toEqual([]);
    expect(parse(`Order date: ${text}`).found.orderDate).toBe(false);
  });

  it.each(['', '.', ',', ';', ')', ']', '\nNext line'])('accepts a timestamp followed by %j', (suffix) => {
    expect(findDates(`2026-10-03T15:24:00.123Z${suffix}`)).toEqual([{ date: '2026-10-03', index: 0 }]);
  });

  it('preserves original offsets, source ordering, and explicit order-date selection', () => {
    const text = 'İİİ\nOrder #AB1234\nDelivery: October 10, 2026\nOrder date: 2026-10-03T00:15:00+14:00\nSubtotal: $50.00\nTotal: $55.00';
    expect(findDates(text)).toEqual([
      { date: '2026-10-10', index: text.indexOf('October') },
      { date: '2026-10-03', index: text.indexOf('2026-10-03') },
    ]);
    expect(parse(text)).toMatchObject({ orderDate: '2026-10-03', orderNo: 'AB1234', total: '$55.00' });
  });

  it('retains reviewed parser fallbacks after refusing an invalid explicit timestamp', () => {
    expect(parse('Order date: 2026-10-03T25:00:00Z\nOrder placed October 4, 2026').orderDate).toBe('2026-10-04');
  });

  it.each(['October 3, 2026', 'Oct 3, 2026', '10/03/2026', '2026-10-03', '3 Oct 2026'])('preserves the supported plain date %s', (text) => {
    expect(findDates(text)).toEqual([{ date: '2026-10-03', index: 0 }]);
  });
});
