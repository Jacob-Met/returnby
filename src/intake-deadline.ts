import { dueDate } from './deadline';

const DATE_PROMPT = 'Enter a valid order date to preview the return-by date.';
const WINDOW_PROMPT = 'Enter a positive whole number of days to preview the return-by date.';
const RANGE_PROMPT = 'This return-by date cannot be previewed. Check the date and return window.';

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Preview only: the existing Save handler and date calculation keep their own semantics. */
export function intakeDeadlineText(orderDate: string, windowDays: string): string {
  if (!isCalendarDate(orderDate)) return DATE_PROMPT;
  const days = Number(windowDays);
  if (!windowDays.trim() || !Number.isSafeInteger(days) || days < 1) return WINDOW_PROMPT;
  const due = dueDate(orderDate, days);
  if (!isCalendarDate(due)) return RANGE_PROMPT;
  return 'Calculated return-by date: ' + due;
}

/** Bind once to the stable form; refresh after its fields are replaced by a new review. */
export function bindIntakeDeadline(form: HTMLFormElement): () => void {
  const refresh = () => {
    const output = form.querySelector<HTMLOutputElement>('#intake-deadline');
    const date = form.querySelector<HTMLInputElement>('[name="orderDate"]');
    const days = form.querySelector<HTMLInputElement>('[name="windowDays"]');
    if (!output || !date || !days) return;
    const message = intakeDeadlineText(date.validity.valid ? date.value : '', days.validity.valid ? days.value : '');
    if (output.textContent !== message) output.textContent = message;
  };
  const changed = (event: Event) => {
    const name = (event.target as HTMLInputElement | null)?.name;
    if (name === 'orderDate' || name === 'windowDays') refresh();
  };
  form.addEventListener('input', changed);
  form.addEventListener('change', changed);
  return refresh;
}
