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

export function buildIcs(o: { id: string; merchant: string; orderNo?: string; due: string }, stamp = new Date()): string {
  const d = o.due.replace(/-/g, '');
  // DATE values have no timezone. A local Date can skip a civil day.
  const end = new Date(Date.UTC(+o.due.slice(0, 4), +o.due.slice(5, 7) - 1, +o.due.slice(8, 10) + 1));
  const e = `${end.getUTCFullYear()}${String(end.getUTCMonth() + 1).padStart(2, '0')}${String(end.getUTCDate()).padStart(2, '0')}`;
  const ts = stamp.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const title = esc(`Return deadline: ${o.merchant || 'order'}${o.orderNo ? ' #' + o.orderNo : ''}`);
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ReturnBy//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${esc(o.id)}@returnby`, `DTSTAMP:${ts}`,
    `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${e}`, `SUMMARY:${title}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, 'TRIGGER:-P3D', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].map(fold).join('\r\n');
}
