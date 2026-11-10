import { describe, expect, it } from 'vitest';
import { DEFAULT_ALERT_SETTINGS, planCalendarAlert, localCalendarDate } from '../src/calendar-alert';
import { calendarRows, planCalendarBatch, CalendarAlertExpiredError } from '../src/calendar-batch';
import type { Order } from '../src/store';

const now = new Date(2026, 10, 10, 10, 45, 20);
const order = (id: string, windowDays: number): Order => ({
  id, merchant: 'Linden Shoes', orderDate: '2026-10-12', windowDays,
  windowSource: 'user', createdAt: '2026-10-12T12:00:00Z',
});
const unfold = (ics: string) => ics.replace(/\r\n[ \t]/g, '');

describe('usable calendar alert times', () => {
  it('gives the independently observed tomorrow-deadline case a future catch-up, not Nov 8', () => {
    const alert = planCalendarAlert('2026-11-11', DEFAULT_ALERT_SETTINGS, now);
    expect(alert.reason).toBe('catch-up');
    expect(alert.at).toBe(new Date(2026, 10, 10, 11, 1).toISOString());
    const saved = [order('urgent', 30)];
    const plan = planCalendarBatch(saved, calendarRows(saved, '2026-11-10'), ['urgent'], now);
    const content = unfold(plan.content);
    expect(content).toContain('DTSTART;VALUE=DATE:20261111');
    expect(content).toContain('UID:urgent@returnby');
    expect(content).toContain('TRIGGER;VALUE=DATE-TIME:');
    expect(content).not.toContain('TRIGGER:-P3D');
    expect(new Date(plan.reminders[0].alertAt!).getTime()).toBeGreaterThan(now.getTime());
  });

  it('respects the chosen local wall time and lead days for a later deadline', () => {
    const alert = planCalendarAlert('2026-11-20', { daysBefore: 1, time: '17:30' }, now);
    expect(alert).toEqual({ at: new Date(2026, 10, 19, 17, 30).toISOString(), reason: 'scheduled' });
  });

  it('keeps overdue entries and deliberate no-alert choices without a VALARM', () => {
    for (const [days, settings] of [[28, DEFAULT_ALERT_SETTINGS], [30, { daysBefore: null, time: '' }]] as const) {
      const saved = [order('entry', days)];
      const plan = planCalendarBatch(saved, calendarRows(saved, '2026-11-10'), ['entry'], now, settings);
      expect(plan.content).toContain('BEGIN:VEVENT');
      expect(plan.content).not.toContain('BEGIN:VALARM');
      expect(plan.reminders[0].alertAt).toBeNull();
    }
  });

  it('allows a same-day future choice but never moves an alert beyond its deadline day', () => {
    expect(planCalendarAlert('2026-11-10', { daysBefore: 0, time: '18:00' }, now).at)
      .toBe(new Date(2026, 10, 10, 18).toISOString());
    expect(planCalendarAlert('2026-11-10', DEFAULT_ALERT_SETTINGS, new Date(2026, 10, 10, 23, 55)))
      .toEqual({ at: null, reason: 'too-late' });
  });

  it('uses the local calendar day at a UTC boundary', () => {
    const evening = new Date(2026, 10, 10, 23, 40);
    expect(localCalendarDate(evening)).toBe('2026-11-10');
    const plan = planCalendarAlert('2026-11-10', DEFAULT_ALERT_SETTINGS, evening);
    expect(plan.reason).toBe('catch-up');
    expect(localCalendarDate(new Date(plan.at!))).toBe('2026-11-10');
  });

  it('requires another review when a previewed catch-up has already passed', () => {
    const saved = [order('urgent', 30)];
    expect(() => planCalendarBatch(saved, calendarRows(saved, '2026-11-10'), ['urgent'],
      new Date(now.getTime() + 20 * 60_000), DEFAULT_ALERT_SETTINGS, now))
      .toThrow(CalendarAlertExpiredError);
  });

  it('keeps mixed batch alarm times explicit while preserving the real deadline entries', () => {
    const saved = [order('past', 28), order('today', 29), order('tomorrow', 30), order('later', 40)];
    const plan = planCalendarBatch(saved, calendarRows(saved, '2026-11-10'), saved.map(row => row.id), now);
    expect(plan.count).toBe(4);
    expect(plan.content.match(/BEGIN:VEVENT/g)).toHaveLength(4);
    expect(plan.content.match(/BEGIN:VALARM/g)).toHaveLength(3);
    for (const row of plan.reminders) {
      if (row.alertAt) expect(new Date(row.alertAt).getTime()).toBeGreaterThan(now.getTime());
    }
  });
});
