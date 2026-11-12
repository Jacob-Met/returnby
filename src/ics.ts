// Keep the standalone ICS serializer dependency-free: it runs in a child runtime
// as source text under several civil timezones.
type DeadlineRequirement = 'ship-by' | 'drop-off-by' | 'arrive-by';
const deadlinePhrase = (value?: DeadlineRequirement) => value === 'ship-by' ? 'Ship by'
  : value === 'drop-off-by' ? 'Drop off by' : value === 'arrive-by' ? 'Merchant must receive by' : 'Return by';
const deadlineCalendarTitle = (value?: DeadlineRequirement) => value === 'ship-by' ? 'Ship by'
  : value === 'drop-off-by' ? 'Drop off by' : value === 'arrive-by' ? 'Merchant receipt deadline' : 'Return deadline';
// RFC 5545 §3.3.11: newlines belong inside TEXT as an escaped value, never
// as content-line delimiters. Replace unsupported controls visibly in the
// exported reminder; the saved order itself is unchanged.
const esc = (s: string) => s.replace(/\\/g, '\\\\')
  .replace(/\r\n|\r|\n/g, '\\n')
  .replace(/[,;]/g, (c) => '\\' + c)
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '\ufffd');

const encoder = new TextEncoder();

// RFC 5545 §3.1 counts UTF-8 octets, including the continuation space.
// Iterate code points so a fold cannot divide a multibyte character.
function fold(line: string): string {
  let output = '', bytes = 0;
  for (const character of line) {
    const size = encoder.encode(character).byteLength;
    if (bytes + size > 75) {
      output += '\r\n ';
      bytes = 1;
    }
    output += character;
    bytes += size;
  }
  return output;
}

const timestamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';

export type CalendarReminder = { id: string; merchant: string; orderNo?: string; due: string; calendarRevision?: number; confirmedStartDate?: string; fixedDeadline?: string; deadlineRequirement?: DeadlineRequirement; alertAt?: string | null; merchantArrivalDeadline?: string; merchantArrivalAlertAt?: string | null };

function eventLines(o: CalendarReminder, ts: string): string[] {
  const d = o.due.replace(/-/g, '');
  // DATE values have no timezone. A local Date can skip a civil day (ReturnBy PR #34).
  const end = new Date(Date.UTC(+o.due.slice(0, 4), +o.due.slice(5, 7) - 1, +o.due.slice(8, 10) + 1));
  const e = `${end.getUTCFullYear()}${String(end.getUTCMonth() + 1).padStart(2, '0')}${String(end.getUTCDate()).padStart(2, '0')}`;
  const title = esc(`${deadlineCalendarTitle(o.deadlineRequirement)}: ${o.merchant || 'order'}${o.orderNo ? ' #' + o.orderNo : ''}`);
  return [
    'BEGIN:VEVENT', `UID:${esc(o.id)}@returnby`, `DTSTAMP:${ts}`,
    ...(o.calendarRevision ? [`SEQUENCE:${o.calendarRevision}`] : []),
    `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${e}`, `SUMMARY:${title}`,
    ...(o.deadlineRequirement ? ['DESCRIPTION:' + esc(deadlinePhrase(o.deadlineRequirement)+' '+o.due+'. Shopper selected this requirement; retailer policy not verified.'+(o.deadlineRequirement==='arrive-by'?' Allow transit time.':'')+(o.fixedDeadline?' Fixed date confirmed by you.':o.confirmedStartDate?' Return clock starts '+o.confirmedStartDate+' (confirmed by you).':''))] : o.fixedDeadline ? [`DESCRIPTION:${esc('Fixed return-by date '+o.fixedDeadline+' (confirmed by you; retailer policy not verified).')}`] : o.confirmedStartDate ? [`DESCRIPTION:${esc('Return clock starts ' + o.confirmedStartDate + ' (user-confirmed; retailer policy not verified).')}`] : []),
    ...(o.alertAt === null ? [] : ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${title}`,
      o.alertAt ? `TRIGGER;VALUE=DATE-TIME:${timestamp(new Date(o.alertAt))}` : 'TRIGGER:-P3D', 'END:VALARM']),
    'END:VEVENT',
  ];
}

/** Serialize already reviewed reminders with one calendar envelope. */
export function buildIcsCalendar(reminders: readonly CalendarReminder[], stamp = new Date()): string {
  const ts = timestamp(stamp);
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ReturnBy//EN', 'CALSCALE:GREGORIAN',
    ...reminders.flatMap(reminder => [
      ...eventLines(reminder, ts),
      ...(reminder.merchantArrivalDeadline ? eventLines({
        ...reminder,
        id: reminder.id + ':merchant-arrival',
        due: reminder.merchantArrivalDeadline,
        fixedDeadline: reminder.merchantArrivalDeadline,
        deadlineRequirement: 'arrive-by',
        alertAt: reminder.merchantArrivalAlertAt,
        merchantArrivalDeadline: undefined,
      }, ts) : []),
    ]),
    'END:VCALENDAR', '',
  ].map(fold).join('\r\n');
}

// A cancellation has one UID per iTIP message. Calendar applications vary in
// whether importing a CANCEL file removes previously imported (not invited)
// events, so the UI also tells the shopper how to remove an old event manually.
export function buildCancelledIcs(o: CalendarReminder, stamp = new Date()): string {
  const ts = timestamp(stamp);
  const day = o.due.replace(/-/g, '');
  const end = new Date(Date.UTC(+o.due.slice(0, 4), +o.due.slice(5, 7) - 1, +o.due.slice(8, 10) + 1));
  const ending = `${end.getUTCFullYear()}${String(end.getUTCMonth() + 1).padStart(2, '0')}${String(end.getUTCDate()).padStart(2, '0')}`;
  const title = esc(`${deadlineCalendarTitle(o.deadlineRequirement)}: ${o.merchant || 'order'}${o.orderNo ? ' #' + o.orderNo : ''}`);
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ReturnBy//EN',
    'CALSCALE:GREGORIAN', 'METHOD:CANCEL',
    'BEGIN:VEVENT', `UID:${esc(o.id)}@returnby`, `DTSTAMP:${ts}`,
    `SEQUENCE:${Math.max(1, o.calendarRevision ?? 0)}`,
    `DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${ending}`,
    `SUMMARY:${title}`, 'STATUS:CANCELLED', 'END:VEVENT',
    'END:VCALENDAR', '',
  ].map(fold).join('\r\n');
}

export function buildIcs(o: CalendarReminder, stamp = new Date()): string {
  return buildIcsCalendar([o], stamp);
}

/** A distinct timed event for checking a refund, separate from a return deadline. */
export function buildRefundIcs(o: { id: string; merchant: string; orderNo?: string; amount?: string; at: string }, stamp = new Date()): string {
  const title = esc(`Check refund: ${o.merchant || 'purchase'}${o.orderNo ? ' #' + o.orderNo : ''}`);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ReturnBy//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${esc(o.id)}@refund.returnby`, `DTSTAMP:${timestamp(stamp)}`,
    `DTSTART:${timestamp(new Date(o.at))}`, `DTEND:${timestamp(new Date(new Date(o.at).getTime() + 15 * 60_000))}`,
    `SUMMARY:${title}`, `DESCRIPTION:${esc((o.amount ? 'Expected refund: ' + o.amount + '. ' : '') + 'Check your account or contact the store. This is your personal reminder; ReturnBy has not verified receipt of the refund. Remove this calendar entry if the refund arrives.')}`,
    'CLASS:PRIVATE', 'TRANSP:TRANSPARENT', 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, 'TRIGGER:PT0S', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', ''].map(fold).join('\r\n');
}
