import { todayISO } from './deadline';

/** Keep date-derived tracker state current across midnight and suspended tabs. */
export function startDayRefresh(refresh: () => void): () => void {
  let day = todayISO();
  let timer: number | undefined;
  let active = true;

  function schedule() {
    window.clearTimeout(timer);
    if (!active) return;
    const now = new Date();
    const midnight = new Date(now);
    // Calendar arithmetic keeps this correct on 23-hour and 25-hour DST days.
    midnight.setHours(24, 0, 0, 0);
    timer = window.setTimeout(check, Math.max(1, midnight.getTime() - now.getTime()));
  }

  function check() {
    if (!active) return;
    try {
      const current = todayISO();
      if (current !== day) {
        day = current;
        refresh();
      }
    } finally {
      schedule();
    }
  }

  function visible() {
    if (document.visibilityState === 'visible') check();
  }

  window.addEventListener('focus', check);
  window.addEventListener('pageshow', check);
  document.addEventListener('visibilitychange', visible);
  schedule();

  return () => {
    active = false;
    window.clearTimeout(timer);
    window.removeEventListener('focus', check);
    window.removeEventListener('pageshow', check);
    document.removeEventListener('visibilitychange', visible);
  };
}
