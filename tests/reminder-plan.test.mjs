import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../src/reminder-plan.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
function receive(zone, inputs, expression = 'm.planReminder(...input)') {
  const script = 'const m=await import(' + JSON.stringify(moduleUrl) + ');const out=' + JSON.stringify(inputs)
    + '.map(input=>{try{return {value:' + expression + '}}catch(e){return {error:e.message}}});console.log(JSON.stringify(out));';
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    encoding: 'utf8', env: { ...process.env, TZ: zone }, stdio: ['ignore', 'pipe', 'pipe'],
  }));
}
describe('reviewed local reminder time', () => {
  it.each([
    ['UTC', '2026-10-10T00:15', '2026-10-10T00:15:00.000Z', 'UTC+00:00'],
    ['Asia/Kathmandu', '2026-10-10T00:15', '2026-10-09T18:30:00.000Z', 'UTC+05:45'],
    ['America/Los_Angeles', '2026-10-10T23:45', '2026-10-11T06:45:00.000Z', 'UTC−07:00'],
    ['America/New_York', '2026-11-01T01:30', '2026-11-01T05:30:00.000Z', 'UTC−04:00'],
    ['Australia/Lord_Howe', '2026-04-05T01:45', '2026-04-04T14:45:00.000Z', 'UTC+11:00'],
  ])('binds exact local/UTC/offset in %s', (zone, local, utc, offset) => {
    const [result] = receive(zone, [[local, '2026-12-01', '2026-01-01T00:00:00Z']], 'm.planReminder(input[0], input[1], new Date(input[2]))');
    expect(result.value).toMatchObject({ local, utc, offset, afterDeadline: false });
  });
  it.each([
    ['America/New_York', '2026-03-08T02:30'],
    ['Australia/Lord_Howe', '2026-10-04T02:15'],
    ['Pacific/Apia', '2011-12-30T12:00'],
    ['UTC', '2026-02-30T12:00'],
    ['UTC', '2026-10-10T24:00'],
  ])('refuses nonexistent local time in %s: %s', (zone, local) => {
    const [result] = receive(zone, [[local, '2026-12-01']], "m.planReminder(input[0], input[1], new Date('2010-01-01T00:00:00Z'))");
    expect(result.error).toMatch(/does not exist/);
  });
  it('refuses blank, incomplete, elapsed and invalid-deadline choices', () => {
    const choices = [
      ['', '2026-10-10'], ['2026-10-09', '2026-10-10'], ['2026-10-09T10:01', '2026-02-30'],
      ['2026-10-09T10:00', '2026-10-10'], ['2026-10-09T09:59', '2026-10-10'],
    ];
    const values = receive('UTC', choices, "m.planReminder(input[0], input[1], new Date('2026-10-09T10:00:00Z'))");
    expect(values.every(value => typeof value.error === 'string')).toBe(true);
  });
  it('compares deadline and alarm by displayed local date', () => {
    const [same, later] = receive('Asia/Kathmandu', [['2026-10-10T23:55', '2026-10-10'], ['2026-10-11T00:05', '2026-10-10']],
      "m.planReminder(input[0], input[1], new Date('2026-10-09T00:00:00Z'))");
    expect(same.value.afterDeadline).toBe(false); expect(later.value.afterDeadline).toBe(true);
    expect(later.value.utc).toBe('2026-10-10T18:20:00.000Z');
  });
  it('requires the exact reviewed local time, deadline, zone, offset and instant', () => {
    const expressions = [
      "m.confirmReminder(p, '2026-10-10T09:01', p.due, n)",
      "m.confirmReminder(p, p.local, '2026-10-12', n)",
      "m.confirmReminder({...p, utc:'2026-10-10T09:01:00.000Z'}, p.local, p.due, n)",
      "m.confirmReminder({...p, zone:'Changed/Zone'}, p.local, p.due, n)",
      "m.confirmReminder({...p, offset:'UTC+01:00'}, p.local, p.due, n)",
      "m.confirmReminder(p, p.local, p.due, new Date(p.utc))",
    ];
    for (const expression of expressions) {
      const [result] = receive('UTC', [null], "(()=>{const n=new Date('2026-10-09T00:00:00Z'),p=m.planReminder('2026-10-10T09:00','2026-10-11',n);return " + expression + ";})()");
      expect(result.error).toBeTruthy();
    }
  });
  it('confirms unchanged review and suggests a real future hour across midnight', () => {
    const [result] = receive('UTC', [null], "(()=>{const n=new Date('2026-10-09T23:59:59Z'),local=m.nextReminderHour(n),p=m.planReminder(local,'2026-10-10',n);return m.confirmReminder(p,local,p.due,n);})()");
    expect(result.value.utc).toBe('2026-10-10T00:00:00.000Z');
  });
});
