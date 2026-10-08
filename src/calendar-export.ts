import './calendar-export.css';
import { buildCalendarIcs, type CalendarOrder } from './ics';

// Mount once, outside the replaced list, so renders preserve keyboard focus.
// The caller supplies exactly the rows it displays, including an empty set.
export function mountCalendarExport(list: HTMLElement, emptyFocusTarget: () => HTMLElement): (rows: readonly CalendarOrder[]) => void {
  const control = document.createElement('div');
  control.className = 'calendar-export';
  const button = document.createElement('button');
  button.id = 'export-calendar';
  button.type = 'button';
  button.className = 'button calendar-export-button';
  button.setAttribute('aria-describedby', 'calendar-export-help');
  const help = document.createElement('p');
  help.id = 'calendar-export-help';
  help.setAttribute('aria-live', 'polite');
  control.append(button, help);
  list.before(control);

  let shown: CalendarOrder[] = [];
  button.addEventListener('click', () => {
    if (!shown.length) return;
    const blob = new Blob([buildCalendarIcs(shown)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `returnby-${shown.length}-${shown.length === 1 ? 'deadline' : 'deadlines'}.ics`;
    document.body.append(link);
    link.click();
    link.remove();
    // Let the browser start the download before releasing its object URL.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  const update = (rows: readonly CalendarOrder[]) => {
    const hadFocus = document.activeElement === button;
    shown = rows.map(({ id, merchant, orderNo, due }) => ({ id, merchant, orderNo, due }));
    const count = shown.length;
    button.disabled = count === 0;
    button.textContent = `Download ${count} shown ${count === 1 ? 'deadline' : 'deadlines'} (.ics)`;
    help.textContent = count
      ? `${count} calendar ${count === 1 ? 'event' : 'events'}, matching the list below. Import the file into your calendar for reminders 3 days before each deadline.`
      : '0 calendar events. Save a deadline or change the filter to enable calendar download.';
    if (!count && hadFocus) emptyFocusTarget().focus({ preventScroll: true });
  };
  update([]);
  return update;
}
