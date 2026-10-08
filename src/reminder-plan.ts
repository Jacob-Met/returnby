export interface ReminderPlan {
  due: string;
  local: string;
  utc: string;
  zone: string;
  offset: string;
  afterDeadline: boolean;
}
const pad = (value: number) => String(value).padStart(2, '0');
export const localMinute = (date: Date): string =>
  `${String(date.getFullYear()).padStart(4, '0')}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

export function nextReminderHour(now = new Date()): string {
  if (!Number.isFinite(now.getTime())) throw new Error('The current clock is unavailable.');
  const next = new Date(now); next.setHours(next.getHours() + 1, 0, 0, 0);
  return localMinute(next);
}

export function planReminder(local: string, due: string, now = new Date()): ReminderPlan {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || due.startsWith('0000') ||
      !Number.isFinite(Date.parse(due + 'T00:00:00Z')) ||
      new Date(due + 'T00:00:00Z').toISOString().slice(0, 10) !== due) {
    throw new Error('The stored deadline is not a valid calendar date.');
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local) || local.startsWith('0000')) {
    throw new Error('Choose a complete local date and time.');
  }
  const time = new Date(local + ':00');
  // Round-trip the entered wall clock: Date otherwise silently moves invalid dates
  // and times inside a daylight-saving gap to a different local clock reading.
  if (!Number.isFinite(time.getTime()) || localMinute(time) !== local) {
    throw new Error('That local date or time does not exist. Choose another time.');
  }
  const utc = time.toISOString();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/.test(utc)) {
    throw new Error('Choose a reminder within the supported calendar years.');
  }
  if (!Number.isFinite(now.getTime()) || time.getTime() <= now.getTime()) {
    throw new Error('Choose a reminder time later than the current time.');
  }
  const minutes = -time.getTimezoneOffset(), magnitude = Math.abs(minutes);
  const offset = `UTC${minutes < 0 ? '−' : '+'}${pad(Math.floor(magnitude / 60))}:${pad(magnitude % 60)}`;
  return {
    due, local, utc, zone: Intl.DateTimeFormat().resolvedOptions().timeZone, offset,
    afterDeadline: local.slice(0, 10) > due,
  };
}

export function confirmReminder(reviewed: ReminderPlan, local: string, due: string, now = new Date()): ReminderPlan {
  const current = planReminder(local, due, now);
  if (current.local !== reviewed.local || current.due !== reviewed.due ||
      current.utc !== reviewed.utc || current.zone !== reviewed.zone || current.offset !== reviewed.offset) {
    throw new Error('The reminder changed after review. Review its time again.');
  }
  return current;
}
