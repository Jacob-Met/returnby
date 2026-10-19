import { describe, expect, it } from 'vitest';
import { buildIcs } from '../src/ics';

const stamp = new Date('2026-10-08T12:34:56.000Z');
const encoder = new TextEncoder();
const unfold = (value: string) => value.replace(/\r\n[ \t]/g, '');
const textValue = (value: string, name: string) => {
  const line = unfold(value).split('\r\n').find(line => line.startsWith(`${name}:`));
  expect(line).toBeDefined();
  return line!.slice(name.length + 1).replace(/\\([nN,;\\])/g, (_, character: string) =>
    character === 'n' || character === 'N' ? '\n' : character);
};

function expectPortableLines(value: string) {
  expect(value.endsWith('\r\n')).toBe(true);
  for (const line of value.split('\r\n')) {
    // The continuation's leading space counts toward the 75-octet budget.
    expect(encoder.encode(line).byteLength).toBeLessThanOrEqual(75);
    expect(line).not.toMatch(/[\u0000-\u0008\u000a-\u001f\u007f]/);
    // A folded line must not split a surrogate pair / UTF-8 character.
    expect(new TextDecoder('utf-8', { fatal: true }).decode(encoder.encode(line))).toBe(line);
  }
}

describe('calendar text serialization', () => {
  it('keeps a simple reminder byte-for-byte compatible', () => {
    const calendar = buildIcs({ id: 'order-1', merchant: 'Fixture Store', due: '2026-11-02' }, stamp);
    expect(calendar).toBe([
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ReturnBy//EN', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT', 'UID:order-1@returnby', 'DTSTAMP:20261008T123456Z',
      'DTSTART;VALUE=DATE:20261102', 'DTEND;VALUE=DATE:20261103',
      'SUMMARY:Return deadline: Fixture Store',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Return deadline: Fixture Store',
      'TRIGGER:-P3D', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR', '',
    ].join('\r\n'));
  });

  it('represents CRLF, CR and LF as text, never extra calendar properties', () => {
    const calendar = buildIcs({
      id: 'order-1', merchant: 'Store\r\nOutlet\rSUMMARY:other\nOnline',
      orderNo: 'AB\r\n12', due: '2026-11-02',
    }, stamp);
    expectPortableLines(calendar);
    const title = 'Return deadline: Store\nOutlet\nSUMMARY:other\nOnline #AB\n12';
    expect(textValue(calendar, 'SUMMARY')).toBe(title);
    expect(textValue(calendar, 'DESCRIPTION')).toBe(title);
    expect(unfold(calendar).split('\r\n').filter(line => line.startsWith('SUMMARY:'))).toHaveLength(1);
  });

  it('escapes punctuation and literal backslashes without changing their meaning', () => {
    const merchant = 'Fixture, Inc.; path\\north\\n';
    const calendar = buildIcs({ id: 'order-1', merchant, orderNo: 'A;B,C\\D', due: '2026-11-02' }, stamp);
    expectPortableLines(calendar);
    expect(textValue(calendar, 'SUMMARY')).toBe(`Return deadline: ${merchant} #A;B,C\\D`);
    expect(textValue(calendar, 'DESCRIPTION')).toBe(textValue(calendar, 'SUMMARY'));
  });

  it('folds long Unicode titles and long saved IDs without losing any text', () => {
    const merchant = 'Étoile 家具🛍️ e\u0301 '.repeat(200);
    const orderNo = '受注-🧾-12345'.repeat(200);
    const id = 'x'.repeat(128);
    const calendar = buildIcs({ id, merchant, orderNo, due: '2026-11-02' }, stamp);
    expectPortableLines(calendar);
    expect(calendar).toContain('\r\n ');
    expect(textValue(calendar, 'SUMMARY')).toBe(`Return deadline: ${merchant} #${orderNo}`);
    expect(textValue(calendar, 'DESCRIPTION')).toBe(textValue(calendar, 'SUMMARY'));
    expect(textValue(calendar, 'UID')).toBe(`${id}@returnby`);
    expect(unfold(calendar)).toContain('DTSTART;VALUE=DATE:20261102\r\nDTEND;VALUE=DATE:20261103\r\n');
    expect(unfold(calendar)).toContain('TRIGGER:-P3D\r\n');
  });

  it.each([48, 49, 50, 51, 52, 53, 54])('preserves a multibyte character near the fold boundary (%i ASCII chars)', length => {
    const merchant = 'a'.repeat(length) + '🛍家é,;\\'.repeat(12);
    const calendar = buildIcs({ id: 'order-1', merchant, due: '2026-11-02' }, stamp);
    expectPortableLines(calendar);
    expect(textValue(calendar, 'SUMMARY')).toBe(`Return deadline: ${merchant}`);
    expect(textValue(calendar, 'DESCRIPTION')).toBe(`Return deadline: ${merchant}`);
  });

  it('replaces unsupported control characters without erasing adjacent words', () => {
    const calendar = buildIcs({ id: 'order-1', merchant: 'Unit\u0000Four\u001bBranch\u007f\tShop', due: '2026-11-02' }, stamp);
    expectPortableLines(calendar);
    expect(textValue(calendar, 'SUMMARY')).toBe('Return deadline: Unit\ufffdFour\ufffdBranch\ufffd\tShop');
  });
});
