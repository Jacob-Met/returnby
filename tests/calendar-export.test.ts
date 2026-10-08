import { describe, expect, it } from 'vitest';
import { buildCalendarIcs, type CalendarOrder } from '../src/ics';

const stamp = new Date('2026-10-08T12:34:56.000Z');
const unfold = (value: string) => value.replace(/\r\n[ \t]/g, '');
const lines = (value: string) => unfold(value).split('\r\n');
const values = (value: string, property: string) => lines(value)
  .filter(line => line.startsWith(`${property}:`)).map(line => line.slice(property.length + 1));

describe('one calendar for the displayed deadlines', () => {
  it('contains two distinct all-day events and alarms in one calendar envelope', () => {
    expect(buildCalendarIcs([
      { id: 'leap', merchant: 'Fixture A', orderNo: 'A-1', due: '2028-02-29' },
      { id: 'year', merchant: '', due: '2028-12-31' },
    ], stamp)).toBe([
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ReturnBy//EN', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT', 'UID:leap@returnby', 'DTSTAMP:20261008T123456Z',
      'DTSTART;VALUE=DATE:20280229', 'DTEND;VALUE=DATE:20280301',
      'SUMMARY:Return deadline: Fixture A #A-1',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Return deadline: Fixture A #A-1',
      'TRIGGER:-P3D', 'END:VALARM', 'END:VEVENT',
      'BEGIN:VEVENT', 'UID:year@returnby', 'DTSTAMP:20261008T123456Z',
      'DTSTART;VALUE=DATE:20281231', 'DTEND;VALUE=DATE:20290101',
      'SUMMARY:Return deadline: order',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Return deadline: order',
      'TRIGGER:-P3D', 'END:VALARM', 'END:VEVENT',
      'END:VCALENDAR', '',
    ].join('\r\n'));
  });

  it('uses exactly the supplied rows in supplied order, with stable identities across exports', () => {
    const rows: readonly CalendarOrder[] = [
      { id: 'first', merchant: 'Fixture A', due: '2026-10-08' },
      { id: 'second', merchant: 'Fixture B', due: '2026-10-09' },
      { id: 'third', merchant: 'Fixture C', due: '2026-10-10' },
    ];
    const before = JSON.stringify(rows);
    expect(values(buildCalendarIcs(rows, stamp), 'UID')).toEqual([
      'first@returnby', 'second@returnby', 'third@returnby',
    ]);
    const changed = buildCalendarIcs([rows[2], rows[0]], new Date('2026-10-09T01:02:03Z'));
    expect(values(changed, 'UID')).toEqual(['third@returnby', 'first@returnby']);
    expect(values(changed, 'DTSTAMP')).toEqual(['20261009T010203Z', '20261009T010203Z']);
    expect(values(changed, 'DTSTART;VALUE=DATE')).toEqual(['20261010', '20261008']);
    expect(JSON.stringify(rows)).toBe(before);
  });

  it('keeps long Unicode and delimiter-like text inside its own event', () => {
    const merchant = 'Étoile 家具🛍️ '.repeat(24) + '\r\nEND:VEVENT\r\nBEGIN:VEVENT,;\\branch';
    const calendar = buildCalendarIcs([
      { id: 'unicode', merchant, orderNo: 'AB\r12\n34', due: '2026-10-09' },
      { id: 'ordinary', merchant: 'Next fixture', due: '2026-10-10' },
    ], stamp);
    const physical = calendar.split('\r\n');
    for (const line of physical) {
      expect(new TextEncoder().encode(line).byteLength).toBeLessThanOrEqual(75);
      expect(line).not.toMatch(/[\u0000-\u0008\u000a-\u001f\u007f]/);
      expect(new TextDecoder('utf-8', { fatal: true }).decode(new TextEncoder().encode(line))).toBe(line);
    }
    expect(lines(calendar).filter(line => line === 'BEGIN:VEVENT')).toHaveLength(2);
    expect(lines(calendar).filter(line => line === 'END:VEVENT')).toHaveLength(2);
    expect(values(calendar, 'TRIGGER')).toEqual(['-P3D', '-P3D']);
    const decode = (value: string) => value.replace(/\\([n,;\\])/g, (_, c: string) => c === 'n' ? '\n' : c);
    expect(values(calendar, 'SUMMARY').map(decode)).toEqual([
      `Return deadline: ${merchant.replace(/\r\n|\r|\n/g, '\n')} #AB\n12\n34`,
      'Return deadline: Next fixture',
    ]);
  });

  it('has no leftover events when the supplied visible set is empty', () => {
    expect(buildCalendarIcs([], stamp)).toBe([
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ReturnBy//EN', 'CALSCALE:GREGORIAN',
      'END:VCALENDAR', '',
    ].join('\r\n'));
  });
});
