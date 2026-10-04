const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => '\\' + c).replace(/\n/g, '\\n');

export function buildIcs(o: { id: string; merchant: string; orderNo?: string; due: string }, stamp = new Date()): string {
  const d = o.due.replace(/-/g, '');
  const end = new Date(+o.due.slice(0, 4), +o.due.slice(5, 7) - 1, +o.due.slice(8, 10) + 1);
  const e = `${end.getFullYear()}${String(end.getMonth() + 1).padStart(2, '0')}${String(end.getDate()).padStart(2, '0')}`;
  const ts = stamp.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const title = esc(`Return deadline: ${o.merchant || 'order'}${o.orderNo ? ' #' + o.orderNo : ''}`);
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ReturnBy//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${o.id}@returnby`, `DTSTAMP:${ts}`,
    `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${e}`, `SUMMARY:${title}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, 'TRIGGER:-P3D', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}
