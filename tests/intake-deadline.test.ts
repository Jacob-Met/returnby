import { describe, expect, it } from 'vitest';
import { dueDate } from '../src/deadline';
import { bindIntakeDeadline, intakeDeadlineText } from '../src/intake-deadline';

const datePrompt = 'Enter a valid order date to preview the return-by date.';
const windowPrompt = 'Enter a positive whole number of days to preview the return-by date.';
const rangePrompt = 'This return-by date cannot be previewed. Check the date and return window.';

describe('new-order deadline preview', () => {
  it.each([
    ['2026-10-03', '30', '2026-11-02'],
    ['2024-02-28', '1', '2024-02-29'],
    ['2026-01-31', '1', '2026-02-01'],
    ['2026-12-31', '1', '2027-01-01'],
    ['2026-10-03', '30.0', '2026-11-02'],
    ['2026-10-03', '1e2', '2027-01-11'],
  ])('previews %s plus %s days before saving', (date, days, expected) => {
    expect(intakeDeadlineText(date, days)).toBe('Calculated return-by date: ' + expected);
    expect(expected).toBe(dueDate(date, Number(days)));
  });

  it('keeps the existing date helper semantics for early years', () => {
    expect(intakeDeadlineText('0099-01-01', '1')).toBe(
      'Calculated return-by date: ' + dueDate('0099-01-01', 1),
    );
  });

  it.each(['', 'not a date', '2026-10-3', '2026-02-30', '2023-02-29', '2026-13-01', '0000-01-01'])(
    'does not invent a date for %j', date => {
      expect(intakeDeadlineText(date, '30')).toBe(datePrompt);
    },
  );

  it.each(['', ' ', '0', '-1', '1.5', 'no days', 'Infinity', '9007199254740992'])(
    'does not invent a window for %j', days => {
      expect(intakeDeadlineText('2026-10-03', days)).toBe(windowPrompt);
    },
  );

  it.each([['9999-12-31', '1'], ['2026-10-03', '1000000000000000']])(
    'shows a prompt when %s plus %s has no supported preview', (date, days) => {
      expect(intakeDeadlineText(date, days)).toBe(rangePrompt);
    },
  );
});

// The actual browser course separately qualifies native inputs and rendering.
// This inert form exercises the exact module's bindings without a DOM package.
function formFixture() {
  let message: string | null = '';
  let writes = 0;
  let present = true;
  const date = { name: 'orderDate', value: '2026-10-03', validity: { valid: true } };
  const days = { name: 'windowDays', value: '30', validity: { valid: true } };
  const output = {
    get textContent() { return message; },
    set textContent(value: string | null) { message = value; writes++; },
  };
  const listeners: Record<string, Array<(event: Event) => void>> = {};
  const form = {
    querySelector(selector: string) {
      if (!present) return null;
      if (selector === '#intake-deadline') return output;
      if (selector === '[name="orderDate"]') return date;
      if (selector === '[name="windowDays"]') return days;
      return null;
    },
    addEventListener(type: string, callback: (event: Event) => void) {
      (listeners[type] ??= []).push(callback);
    },
  } as unknown as HTMLFormElement;
  return {
    form, date, days, output, listeners,
    writes: () => writes,
    replaceFields(visible: boolean) { present = visible; message = ''; },
    send(type: string, name: string) {
      for (const callback of listeners[type] ?? []) callback({ target: { name } } as unknown as Event);
    },
  };
}

describe('review form binding', () => {
  it('updates after date and window edits without changing either field', () => {
    const f = formFixture();
    const refresh = bindIntakeDeadline(f.form);
    refresh();
    expect(f.output.textContent).toBe('Calculated return-by date: 2026-11-02');
    f.date.value = '2026-10-10';
    f.send('input', 'orderDate');
    expect(f.output.textContent).toBe('Calculated return-by date: 2026-11-09');
    f.days.value = '14';
    f.send('change', 'windowDays');
    expect(f.output.textContent).toBe('Calculated return-by date: 2026-10-24');
    expect([f.date.value, f.days.value]).toEqual(['2026-10-10', '14']);
  });

  it('ignores unrelated edits and avoids repeated live-region writes', () => {
    const f = formFixture();
    bindIntakeDeadline(f.form)();
    for (const name of ['merchant', 'orderNo', 'total']) f.send('input', name);
    f.send('input', 'orderDate');
    f.send('change', 'orderDate');
    expect(f.writes()).toBe(1);
    expect(f.output.textContent).toBe('Calculated return-by date: 2026-11-02');
  });

  it('respects native input validity and allows a corrected preview', () => {
    const f = formFixture();
    const refresh = bindIntakeDeadline(f.form);
    f.days.validity.valid = false;
    refresh();
    expect(f.output.textContent).toBe(windowPrompt);
    f.days.validity.valid = true;
    f.date.validity.valid = false;
    f.send('input', 'orderDate');
    expect(f.output.textContent).toBe(datePrompt);
    f.date.validity.valid = true;
    f.send('change', 'orderDate');
    expect(f.output.textContent).toBe('Calculated return-by date: 2026-11-02');
  });

  it('refreshes replacement reviews while keeping one listener per event', () => {
    const f = formFixture();
    f.replaceFields(false);
    const refresh = bindIntakeDeadline(f.form);
    expect(() => refresh()).not.toThrow();
    f.replaceFields(true);
    f.date.value = '2024-02-28';
    f.days.value = '1';
    refresh();
    expect(f.output.textContent).toBe('Calculated return-by date: 2024-02-29');
    f.replaceFields(true);
    f.date.value = '2026-12-31';
    refresh();
    expect(f.output.textContent).toBe('Calculated return-by date: 2027-01-01');
    expect(Object.fromEntries(Object.entries(f.listeners).map(([name, values]) => [name, values.length])))
      .toEqual({ input: 1, change: 1 });
  });
});
