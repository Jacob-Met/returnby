/** Alert planning is local to the shopper's calendar, not UTC calendar days. */
export type CalendarAlertSettings = { daysBefore: 0 | 1 | 3 | 7 | null; time: string };
export type CalendarAlert = {
  at: string | null;
  reason: 'scheduled' | 'catch-up' | 'past-due' | 'off' | 'too-late';
};
export const DEFAULT_ALERT_SETTINGS: CalendarAlertSettings = { daysBefore: 3, time: '09:00' };

export const localCalendarDate = (date: Date) =>
  `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Keep a future alarm on or before the selected civil deadline.
 * A missed lead time gets a visibly reviewed catch-up, never a past alarm.
 */
export function planCalendarAlert(due: string, settings = DEFAULT_ALERT_SETTINGS, now = new Date()): CalendarAlert {
  if (!Number.isFinite(now.getTime())) throw new Error('The current time could not be read.');
  if (settings.daysBefore === null) return { at: null, reason: 'off' };
  if (![0, 1, 3, 7].includes(settings.daysBefore) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(settings.time)) {
    throw new Error('Choose an alert day and a valid time.');
  }
  const [year, month, day] = due.split('-').map(Number);
  const deadline = new Date(year, month - 1, day);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || localCalendarDate(deadline) !== due) {
    throw new Error('Correct the deadline before choosing an alert.');
  }
  if (due < localCalendarDate(now)) return { at: null, reason: 'past-due' };
  const [hour, minute] = settings.time.split(':').map(Number);
  const requested = new Date(year, month - 1, day - settings.daysBefore, hour, minute);
  if (requested.getTime() > now.getTime()) return { at: requested.toISOString(), reason: 'scheduled' };

  // Round up to a full minute so the preview and exported UTC trigger agree.
  const catchUp = new Date(Math.ceil((now.getTime() + 15 * 60_000) / 60_000) * 60_000);
  if (localCalendarDate(catchUp) > due) return { at: null, reason: 'too-late' };
  return { at: catchUp.toISOString(), reason: 'catch-up' };
}

export function describeCalendarAlert(alert: CalendarAlert): string {
  if (!alert.at) {
    if (alert.reason === 'past-due') return 'Deadline already passed — calendar entry only, no alert.';
    if (alert.reason === 'too-late') return 'Due today: too little time remains for a 15-minute alert. Calendar entry only; act now.';
    return 'Calendar entry only — no alert requested.';
  }
  const date = new Date(alert.at);
  const when = new Intl.DateTimeFormat(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(date);
  return `Alert ${when}.${alert.reason === 'catch-up' ? ' The chosen lead time has passed; this catch-up is about 15 minutes from review. Import before then.' : ''}`;
}
