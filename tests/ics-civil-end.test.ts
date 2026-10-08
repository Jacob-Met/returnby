import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

// Compile the actual serializer for fresh processes: changing TZ inside a test
// worker thread need not update that worker's host Date implementation.
const source = readFileSync(new URL('../src/ics.ts', import.meta.url), 'utf8');
const compiled = transpileModule(source, {
  compilerOptions: { target: ScriptTarget.ES2022, module: ModuleKind.CommonJS },
}).outputText;
const cases = [
  ['2011-12-29', '20111230'], // Apia skipped December 30 as a local instant.
  ['1993-08-20', '19930821'], // Kwajalein skipped August 21.
  ['1994-12-30', '19941231'], // Kiritimati skipped December 31.
  ['2011-12-30', '20111231'],
  ['2026-03-08', '20260309'], ['2026-11-01', '20261102'],
  ['2026-10-04', '20261005'], ['2026-04-05', '20260406'],
  ['2026-11-02', '20261103'], ['2024-02-28', '20240229'],
  ['2024-02-29', '20240301'], ['2025-02-28', '20250301'],
  ['1900-02-28', '19000301'], ['2000-02-28', '20000229'],
  ['2000-02-29', '20000301'], ['2100-02-28', '21000301'],
  ['2026-12-31', '20270101'], ['1000-01-01', '10000102'],
  ['9998-12-31', '99990101'], ['9999-12-30', '99991231'],
] as const;
const zones = ['UTC', 'Pacific/Apia', 'Pacific/Kwajalein', 'Pacific/Kiritimati',
  'America/Los_Angeles', 'America/New_York', 'Australia/Lord_Howe', 'Asia/Kathmandu'];
const child = `${compiled}
const input = JSON.parse(require('node:fs').readFileSync(0, 'utf8'));
const stamp = new Date('2026-10-08T12:34:56.000Z');
process.stdout.write(JSON.stringify(input.map(due => exports.buildIcs({
  id: 'frozen-id', merchant: 'Fixture Shop', orderNo: '12345', due
}, stamp))));`;

function calendars(zone: string): string[] {
  return JSON.parse(execFileSync(process.execPath, ['-e', child], {
    input: JSON.stringify(cases.map(([due]) => due)), encoding: 'utf8',
    env: { ...process.env, TZ: zone }, timeout: 10_000, maxBuffer: 1024 * 1024,
  }));
}

function expectedCalendar(due: string, end: string): string {
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ReturnBy//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', 'UID:frozen-id@returnby', 'DTSTAMP:20261008T123456Z',
    `DTSTART;VALUE=DATE:${due.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${end}`,
    'SUMMARY:Return deadline: Fixture Shop #12345',
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Return deadline: Fixture Shop #12345',
    'TRIGGER:-P3D', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}

describe('floating all-day calendar end dates', () => {
  it.each(zones)('keeps the same civil next day and complete event bytes in %s', zone => {
    const actual = calendars(zone);
    expect(actual).toHaveLength(cases.length);
    cases.forEach(([due, end], index) => {
      expect(actual[index], `${zone}: ${due}`).toBe(expectedCalendar(due, end));
    });
  });
});
