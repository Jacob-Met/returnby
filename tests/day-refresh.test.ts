import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startDayRefresh } from '../src/day-refresh';

let windowEvents: EventTarget;
let documentEvents: EventTarget & { visibilityState: string };
let stop: (() => void) | undefined;

beforeEach(() => {
  vi.stubEnv('TZ', 'UTC');
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 8, 23, 59, 50));
  windowEvents = new EventTarget();
  documentEvents = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  vi.stubGlobal('window', Object.assign(windowEvents, {
    setTimeout: (callback: () => void, delay: number) => setTimeout(callback, delay),
    clearTimeout: (timer: ReturnType<typeof setTimeout>) => clearTimeout(timer),
  }));
  vi.stubGlobal('document', documentEvents);
});

afterEach(() => {
  stop?.();
  stop = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('daily tracker refresh', () => {
  it('refreshes at local midnight and continues on the following day', () => {
    const refresh = vi.fn();
    stop = startDayRefresh(refresh);

    vi.advanceTimersByTime(9_999);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(24 * 60 * 60 * 1_000);
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(1);
  });

  it.each(['focus', 'pageshow'])('catches up after a suspended tab resumes through %s', event => {
    const refresh = vi.fn();
    stop = startDayRefresh(refresh);
    vi.setSystemTime(new Date(2026, 9, 17, 10));
    windowEvents.dispatchEvent(new Event(event));

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);
    windowEvents.dispatchEvent(new Event(event));
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(14 * 60 * 60 * 1_000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('catches up on visibility restoration without rerendering on duplicate events', () => {
    const refresh = vi.fn();
    stop = startDayRefresh(refresh);
    vi.setSystemTime(new Date(2026, 9, 9, 8));
    documentEvents.visibilityState = 'hidden';
    documentEvents.dispatchEvent(new Event('visibilitychange'));
    expect(refresh).not.toHaveBeenCalled();
    documentEvents.visibilityState = 'visible';
    documentEvents.dispatchEvent(new Event('visibilitychange'));
    windowEvents.dispatchEvent(new Event('focus'));
    windowEvents.dispatchEvent(new Event('pageshow'));

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('rearms the midnight timer after a clock correction within the same date', () => {
    const refresh = vi.fn();
    stop = startDayRefresh(refresh);
    vi.setSystemTime(new Date(2026, 9, 8, 22));
    windowEvents.dispatchEvent(new Event('focus'));
    vi.advanceTimersByTime(10_000);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2 * 60 * 60 * 1_000 - 10_000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('also refreshes if the local date moves backward', () => {
    const refresh = vi.fn();
    stop = startDayRefresh(refresh);
    vi.setSystemTime(new Date(2026, 9, 7, 12));
    windowEvents.dispatchEvent(new Event('focus'));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it.each([
    { month: 2, date: 8, hours: 23 },
    { month: 10, date: 1, hours: 25 },
  ])('uses the next local midnight on a $hours-hour DST day', ({ month, date, hours }) => {
    vi.stubEnv('TZ', 'America/Los_Angeles');
    vi.setSystemTime(new Date(2026, month, date));
    const refresh = vi.fn();
    stop = startDayRefresh(refresh);

    vi.advanceTimersByTime(hours * 60 * 60 * 1_000 - 1);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(new Date().getHours()).toBe(0);
    expect(new Date().getDate()).toBe(date + 1);
  });

  it('removes the timer and every event listener when stopped', () => {
    const refresh = vi.fn();
    stop = startDayRefresh(refresh);
    stop();
    stop();
    vi.setSystemTime(new Date(2026, 9, 17, 10));
    windowEvents.dispatchEvent(new Event('focus'));
    windowEvents.dispatchEvent(new Event('pageshow'));
    documentEvents.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(24 * 60 * 60 * 1_000);

    expect(refresh).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('allows the refresh callback to stop future refreshes', () => {
    const refresh = vi.fn(() => stop?.());
    stop = startDayRefresh(refresh);
    vi.advanceTimersByTime(24 * 60 * 60 * 1_000);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
