import { describe, expect, it } from 'vitest';
import { calendarRows, initialCalendarSelection, planCalendarBatch } from '../src/calendar-batch';
import { buildIcs, buildIcsCalendar } from '../src/ics';
import type { Order } from '../src/store';

const stamp = new Date('2026-10-08T12:34:56.000Z');
const today = '2026-10-08';
const order = (id: string, days = 30, extra: Partial<Order> = {}): Order => ({
  id, merchant: `Fictional ${id}`, orderNo: `ORDER-${id}`, total: '$12.00',
  orderDate: '2026-10-01', windowDays: days, windowSource: 'user', createdAt: '2026-10-01T01:02:03Z', ...extra,
});
const unfold = (ics: string) => ics.replace(/\r\n[ \t]/g, '');
const entries = (ics: string) => [...unfold(ics).matchAll(/BEGIN:VEVENT\r\n([\s\S]*?)END:VEVENT\r\n/g)].map(match => match[1]);

describe('reviewed multi-return calendar', () => {
  it('exports only selected orders, sorted by deadline and identity, inside one calendar', () => {
    const saved = [order('later'), order('b', 10), order('a', 10), order('omit', 1)];
    const before = structuredClone(saved);
    const plan = planCalendarBatch(saved, calendarRows(saved, today), ['later', 'b', 'a'], stamp);
    expect(plan.count).toBe(3);
    expect(plan.reminders.map(row => row.id)).toEqual(['a', 'b', 'later']);
    expect(plan.filename).toBe('returnby-reminders-2026-10-08.ics');
    const parsed = entries(plan.content);
    expect(parsed).toHaveLength(3);
    expect(plan.content.match(/BEGIN:VCALENDAR/g)).toHaveLength(1);
    expect(plan.content.match(/END:VCALENDAR/g)).toHaveLength(1);
    expect(parsed[0]).toContain('UID:a@returnby\r\n');
    expect(parsed[0]).toContain('DTSTART;VALUE=DATE:20261011\r\nDTEND;VALUE=DATE:20261012\r\n');
    expect(parsed[2]).toContain('DTSTART;VALUE=DATE:20261031\r\nDTEND;VALUE=DATE:20261101\r\n');
    for (const event of parsed) {
      expect(event.match(/DTSTAMP:20261008T123456Z/g)).toHaveLength(1);
      expect(event.match(/BEGIN:VALARM/g)).toHaveLength(1);
      expect(event).toContain('TRIGGER:-P3D\r\n');
    }
    expect(plan.content).not.toContain('$12.00');
    expect(plan.content).not.toContain('omit@returnby');
    expect(saved).toEqual(before);
  });

  it('retains exactly the existing event bytes and UID for each individual export', () => {
    const reminders = [
      { id: 'alpha', merchant: 'Store, Inc.; north\\south', orderNo: 'AB\r\nCD', due: '2028-02-29' },
      { id: '家-'.repeat(50), merchant: 'Étoile 家具🛍️ '.repeat(80), due: '2026-12-31' },
    ];
    const calendar = buildIcsCalendar(reminders, stamp);
    expect(entries(calendar)).toEqual(reminders.map(row => entries(buildIcs(row, stamp))[0]));
    expect(entries(calendar)[0]).toContain('DTEND;VALUE=DATE:20280301');
    expect(entries(calendar)[1]).toContain('DTEND;VALUE=DATE:20270101');
    for (const line of calendar.split('\r\n')) {
      expect(new TextEncoder().encode(line).byteLength).toBeLessThanOrEqual(75);
      expect(new TextDecoder('utf-8', { fatal: true }).decode(new TextEncoder().encode(line))).toBe(line);
    }
  });

  it('preserves all events when text resembles calendar boundaries', () => {
    const saved = [order('a', 3, { merchant: 'Shop\r\nEND:VEVENT\r\nBEGIN:VEVENT\rSUMMARY:Injected' }), order('b')];
    const plan = planCalendarBatch(saved, calendarRows(saved, today), ['a', 'b'], stamp);
    expect(entries(plan.content)).toHaveLength(2);
    expect(unfold(plan.content).split('\r\n').filter(line => line.startsWith('SUMMARY:'))).toHaveLength(2);
    expect(plan.content).toContain('Shop\\nEND:VEVENT\\nBEGIN:VEVENT\\nSUMMARY:Injected');
  });

  it('initially selects the tracker filter while retaining every valid choice', () => {
    const rows = calendarRows([order('expired', 6), order('today', 7), order('seven', 14), order('future', 15)], today);
    expect(initialCalendarSelection(rows, 'all')).toEqual(['expired', 'today', 'seven', 'future']);
    expect(initialCalendarSelection(rows, 'due')).toEqual(['today', 'seven']);
    expect(initialCalendarSelection(rows, 'expired')).toEqual(['expired']);
    expect(rows).toHaveLength(4);
  });

  it.each([
    { orderDate: '2026-02-30' }, { orderDate: '0099-10-01' }, { orderDate: '2026-1-1' },
    { windowDays: 0 }, { windowDays: -1 }, { windowDays: 1.5 }, { windowDays: Infinity },
    { orderDate: '9999-12-30', windowDays: 1 }, { orderDate: '9999-12-30', windowDays: 2 },
    { id: '' }, { id: 'bad\nidentity' }, { id: 'bad\u0000identity' }, { id: 'bad\ud800identity' },
    { merchant: 'x'.repeat(4097) }, { orderNo: 'x'.repeat(4097) },
  ])('keeps invalid saved data visible and unselected: %j', extra => {
    const saved = [order('bad', 30, extra), order('good')];
    const rows = calendarRows(saved, today);
    expect(rows.filter(row => row.problem)).toHaveLength(1);
    expect(initialCalendarSelection(rows, 'all')).toEqual(['good']);
    expect(planCalendarBatch(saved, rows, ['good'], stamp).count).toBe(1);
    expect(() => planCalendarBatch(saved, rows, [saved[0].id], stamp)).toThrow(/not ready/);
  });

  it('refuses every ambiguous duplicate identity while leaving other returns usable', () => {
    const saved = [order('same'), order('same', 15), order('unique')];
    const rows = calendarRows(saved, today);
    expect(rows.filter(row => row.problem)).toHaveLength(2);
    expect(initialCalendarSelection(rows, 'all')).toEqual(['unique']);
    expect(() => planCalendarBatch(saved, rows, ['same'], stamp)).toThrow(/not ready/);
    expect(() => planCalendarBatch(saved, rows, ['unique', 'unique'], stamp)).toThrow(/twice/);
  });

  it.each([
    (saved: Order[]) => [],
    (saved: Order[]) => [order('different')],
    (saved: Order[]) => [{ ...saved[0], merchant: 'Changed merchant' }],
    (saved: Order[]) => [{ ...saved[0], orderNo: 'Changed number' }],
    (saved: Order[]) => [{ ...saved[0], windowDays: 45 }],
    (saved: Order[]) => [{ ...saved[0], orderDate: '2026-10-02' }],
    (saved: Order[]) => [saved[0], saved[0]],
    (saved: Order[]) => [{ ...saved[0], orderDate: 'bad' }],
  ])('refuses changed or removed selected records before preparing any output', change => {
    const saved = [order('selected')];
    const rows = calendarRows(saved, today);
    expect(() => planCalendarBatch(change(saved), rows, ['selected'], stamp)).toThrow(/changed or was removed/);
  });

  it('can export reviewed choices when unrelated data changes and never changes storage inputs', () => {
    const saved = [order('selected'), order('unselected')];
    const rows = calendarRows(saved, today);
    const current = [{ ...saved[0], total: '$100.00' }, order('new'), { ...saved[1], windowDays: 90 }];
    current.forEach(Object.freeze); Object.freeze(current);
    const plan = planCalendarBatch(current, rows, ['selected'], stamp);
    expect(plan.count).toBe(1);
    expect(entries(plan.content)[0]).toContain('DTSTART;VALUE=DATE:20261031');
    expect(plan.content).not.toContain('$100.00');
  });

  it('freezes the preview and detects later mutation of the provided source record', () => {
    const saved = [order('selected')];
    const rows = calendarRows(saved, today);
    saved[0].windowDays = 50;
    expect(rows[0].order.windowDays).toBe(30);
    expect(() => planCalendarBatch(saved, rows, ['selected'], stamp)).toThrow(/changed/);
  });

  it('refuses empty, unknown, oversized and invalid-timestamp requests', () => {
    const saved = [order('a')], rows = calendarRows(saved, today);
    expect(() => planCalendarBatch(saved, rows, [], stamp)).toThrow(/Select at least/);
    expect(() => planCalendarBatch(saved, rows, ['unknown'], stamp)).toThrow(/not ready/);
    expect(() => calendarRows(Array.from({ length: 2001 }, (_, i) => order(String(i))), today)).toThrow(/2,000/);
    expect(() => planCalendarBatch(saved, rows, ['a'], new Date(NaN))).toThrow(/timestamp/);
  });

  it('refuses an oversized Unicode selection while a smaller chosen set remains portable', () => {
    const saved = Array.from({ length: 180 }, (_, i) => order(String(i), 30, { merchant: '家'.repeat(4096) }));
    const rows = calendarRows(saved, today);
    expect(() => planCalendarBatch(saved, rows, saved.map(item => item.id), stamp)).toThrow(/larger than 4 MiB/);
    const reduced = planCalendarBatch(saved, rows, ['0', '1'], stamp);
    expect(entries(reduced.content)).toHaveLength(2);
    expect(new TextEncoder().encode(reduced.content).byteLength).toBeLessThan(4 * 1024 * 1024);
  });
});
