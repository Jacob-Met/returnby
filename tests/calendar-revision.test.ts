import { describe, expect, test } from 'vitest';
import { editDraft, planEdit } from '../src/edit';
import { planCompletion } from '../src/completion';
import { planCalendarCancellation, planSingleCalendar, recordCalendarDownloads, olderCalendarDates, acknowledgeCalendarCleanup } from '../src/calendar-batch';
import { exportBackup, parseBackup, planImport } from '../src/backup';
import type { Order } from '../src/store';

const time = new Date('2026-10-08T12:34:56.000Z');
const initial: Order = {
  id: 'winter-coat', merchant: 'Harbor Outfitters', orderNo: 'COAT-12', total: '',
  orderDate: '2026-10-01', windowDays: 10, windowSource: 'user',
  deadlineRequirement: 'ship-by', merchantArrivalDeadline: '2026-10-18',
  createdAt: '2026-10-02T09:00:00Z',
};
const event = (ics: string) => ics.replace(/\r\n[ \t]/g, '');
const uid = 'UID:winter-coat@returnby';
const arrivalUid = 'UID:winter-coat:merchant-arrival@returnby';

describe('return calendar identity through correction and cancellation', () => {
  test('corrects an imported deadline, then cancels an obsolete second cutoff', () => {
    const first = planSingleCalendar([initial], initial, time);
    expect(event(first.content)).toContain(uid);
    expect(event(first.content)).toContain(arrivalUid);
    expect(first.content).not.toContain('SEQUENCE:');

    const corrected = planEdit([initial], initial, { ...editDraft(initial), windowDays: '12' });
    expect(corrected.order.calendarRevision).toBe(1);
    const update = planSingleCalendar(corrected.next, corrected.order, time);
    expect(event(update.content)).toContain('SEQUENCE:1');
    expect(event(update.content)).toContain('DTSTART;VALUE=DATE:20261013');
    expect(event(update.content)).toContain(arrivalUid);

    const withoutArrival = planEdit(corrected.next, corrected.order, {
      ...editDraft(corrected.order), merchantArrivalDeadline: '',
    });
    expect(withoutArrival.order.calendarRevision).toBe(2);
    expect(withoutArrival.order.calendarPreviousArrivalDate).toBe('2026-10-18');
    const next = planSingleCalendar(withoutArrival.next, withoutArrival.order, time);
    expect(event(next.content)).toContain(uid);
    expect(event(next.content)).not.toContain(arrivalUid);
    const cancel = planCalendarCancellation(withoutArrival.next, withoutArrival.order, 'merchant-arrival', time);
    expect(event(cancel.content)).toContain('METHOD:CANCEL\r\n');
    expect(event(cancel.content)).toContain('SEQUENCE:2\r\n');
    expect(event(cancel.content)).toContain(arrivalUid);
    expect(event(cancel.content)).toContain('DTSTART;VALUE=DATE:20261018');
    expect(event(cancel.content)).toContain('STATUS:CANCELLED');
    expect(event(cancel.content).match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(cancel.content).not.toContain('BEGIN:VALARM');

    const backup = exportBackup(withoutArrival.next, time);
    expect(JSON.parse(backup).version).toBe(11);
    const restored = planImport([], parseBackup(backup)).next;
    expect(restored).toEqual(withoutArrival.next);
    expect(planCalendarCancellation(restored, restored[0], 'merchant-arrival', time)).toEqual(cancel);
    expect(planSingleCalendar(restored, restored[0], time).content).toBe(next.content);
  });

  test('finished, reopened and edited returns keep a rising sequence for one stable UID', () => {
    const finished = planCompletion([initial], initial, 'returned', time);
    expect(finished.order.calendarRevision).toBe(1);
    expect(() => planSingleCalendar(finished.next, finished.order, time)).toThrow();
    const primary = planCalendarCancellation(finished.next, finished.order, 'return', time);
    const second = planCalendarCancellation(finished.next, finished.order, 'merchant-arrival', time);
    expect(event(primary.content)).toContain(uid);
    expect(primary.content).not.toContain(arrivalUid);
    expect(event(primary.content)).toContain('SEQUENCE:1\r\n');
    expect(event(second.content)).toContain(arrivalUid);
    expect(event(second.content)).toContain('STATUS:CANCELLED');
    expect(primary.content).not.toContain('BEGIN:VALARM');

    const reloaded = parseBackup(exportBackup(finished.next, time));
    const reopened = planCompletion(reloaded, reloaded[0], 'reopen', time);
    expect(reopened.order.calendarRevision).toBe(2);
    expect(planSingleCalendar(reopened.next, reopened.order, time).content).toContain('SEQUENCE:2');
    expect(() => planCalendarCancellation(reopened.next, reopened.order, 'return', time)).toThrow(/active/);

    const later = planEdit(reopened.next, reopened.order, { ...editDraft(reopened.order), orderNo: 'COAT-13' });
    expect(later.order.calendarRevision).toBe(3);
    const fresh = planSingleCalendar(later.next, later.order, time).content;
    expect(event(fresh)).toContain(uid);
    expect(event(fresh)).toContain('SEQUENCE:3');
    expect(event(fresh)).toContain('COAT-13');
  });

  test('changes unrelated to calendar do not spuriously replace imported events', () => {
    const same = planEdit([initial], initial, editDraft(initial));
    expect(same.changed).toBe(false);
    const total = planEdit([initial], initial, { ...editDraft(initial), total: '$88' });
    expect(total.changed).toBe(true);
    expect(total.order.calendarRevision).toBeUndefined();
    const plan = planSingleCalendar(total.next, total.order, time);
    expect(event(plan.content)).not.toContain('SEQUENCE:');
  });

  test('calendar update metadata is strict, versioned, and cannot be silently lost in a restore', () => {
    const changed = planEdit([initial], initial, { ...editDraft(initial), windowDays: '12' }).order;
    const current = parseBackup(exportBackup([changed], time));
    expect(planImport(current, [initial]).rows[0].changedFields).toContain('calendarRevision');
    expect(planImport([initial], current).rows[0].changedFields).toContain('calendarRevision');
    const file = JSON.parse(exportBackup(current, time));
    file.version = 10;
    expect(() => parseBackup(JSON.stringify(file))).toThrow(/unsupported/);
    for (const calendarRevision of [0, -1, 1.5, Number.MAX_SAFE_INTEGER, '2']) {
      expect(() => exportBackup([{ ...initial, calendarRevision }], time)).toThrow();
    }
    expect(() => exportBackup([{ ...initial, calendarRevision: 1, calendarPreviousArrivalDate: '2026-02-30' }], time)).toThrow();
  });
});


describe('old imported calendar entries remain actionable after revisions', () => {
  test('tracks downloaded primary and secondary dates, including old dates after several edits', () => {
    let current = recordCalendarDownloads([initial], [{id:initial.id, merchant:initial.merchant, due:'2026-10-11', merchantArrivalDeadline:'2026-10-18'}]);
    expect(current[0].calendarExportedDueDates).toEqual(['2026-10-11']);
    expect(current[0].calendarExportedArrivalDates).toEqual(['2026-10-18']);
    let edited = planEdit(current, current[0], {...editDraft(current[0]),windowDays:'12'});
    current = recordCalendarDownloads(edited.next, [{id:initial.id,merchant:initial.merchant,due:'2026-10-13',merchantArrivalDeadline:'2026-10-18'}]);
    edited = planEdit(current, current[0], {...editDraft(current[0]),windowDays:'13',merchantArrivalDeadline:''});
    current = recordCalendarDownloads(edited.next, [{id:initial.id,merchant:initial.merchant,due:'2026-10-14'}]);
    expect(olderCalendarDates(current[0])).toEqual({
      primary:['2026-10-11','2026-10-13'],arrival:['2026-10-18'],
    });
    const backup = exportBackup(current,time);
    expect(JSON.parse(backup).version).toBe(12);
    const restored = parseBackup(backup);
    expect(restored).toEqual(current);
    expect(olderCalendarDates(restored[0])).toEqual(olderCalendarDates(current[0]));
    expect(planImport([initial],restored).rows[0].changedFields).toContain('calendarExportedDueDates');
    const cancel = planCalendarCancellation(restored,restored[0],'merchant-arrival',time);
    expect(cancel.due).toBe('2026-10-18');
    expect(event(cancel.content)).toContain('DTSTART;VALUE=DATE:20261018');
    const cleared = acknowledgeCalendarCleanup(restored,restored[0]);
    expect(cleared[0].calendarExportedDueDates).toEqual(['2026-10-14']);
    expect(cleared[0].calendarExportedArrivalDates).toBeUndefined();
    expect(cleared[0].calendarPreviousArrivalDate).toBeUndefined();
    expect(olderCalendarDates(cleared[0])).toEqual({primary:[],arrival:[]});
    expect(() => acknowledgeCalendarCleanup(cleared,restored[0])).toThrow(/changed/);
  });
  test('cleans one obsolete date at a time and keeps every other old event and current reminder', () => {
    let current = recordCalendarDownloads([initial], [
      {id:initial.id,merchant:initial.merchant,due:'2026-10-11',merchantArrivalDeadline:'2026-10-18'},
    ]);
    let updated = planEdit(current,current[0],{...editDraft(current[0]),windowDays:'12'});
    current = recordCalendarDownloads(updated.next, [
      {id:initial.id,merchant:initial.merchant,due:'2026-10-13',merchantArrivalDeadline:'2026-10-18'},
    ]);
    updated = planEdit(current,current[0],{...editDraft(current[0]),windowDays:'13',merchantArrivalDeadline:''});
    current = recordCalendarDownloads(updated.next, [
      {id:initial.id,merchant:initial.merchant,due:'2026-10-14'},
    ]);
    const original = structuredClone(current);
    const first = acknowledgeCalendarCleanup(current,current[0],{primary:['2026-10-11'],arrival:[]});
    expect(olderCalendarDates(first[0])).toEqual({primary:['2026-10-13'],arrival:['2026-10-18']});
    expect(first[0].calendarExportedDueDates).toEqual(['2026-10-13','2026-10-14']);
    expect(first[0].calendarPreviousArrivalDate).toBe('2026-10-18');
    expect(current).toEqual(original);
    expect(() => acknowledgeCalendarCleanup(current,current[0],{primary:['2026-10-14'],arrival:[]})).toThrow(/changed/);
    expect(() => acknowledgeCalendarCleanup(current,current[0],{primary:['2026-10-11','2026-10-11'],arrival:[]})).toThrow(/changed/);
    expect(() => acknowledgeCalendarCleanup(first,current[0],{primary:['2026-10-13'],arrival:[]})).toThrow(/changed/);
    const restored = parseBackup(exportBackup(first,time));
    expect(olderCalendarDates(restored[0])).toEqual({primary:['2026-10-13'],arrival:['2026-10-18']});
    const second = acknowledgeCalendarCleanup(restored,restored[0],{primary:[],arrival:['2026-10-18']});
    expect(olderCalendarDates(second[0])).toEqual({primary:['2026-10-13'],arrival:[]});
    expect(second[0].calendarPreviousArrivalDate).toBeUndefined();
    const third = acknowledgeCalendarCleanup(second,second[0],{primary:['2026-10-13'],arrival:[]});
    expect(olderCalendarDates(third[0])).toEqual({primary:[],arrival:[]});
    expect(third[0].calendarExportedDueDates).toEqual(['2026-10-14']);
    expect(planSingleCalendar(third,third[0],time).content).toContain('DTSTART;VALUE=DATE:20261014');
  });
  test('legacy saved removal continues to warn about its old calendar date', () => {
    const old = { ...initial, calendarRevision:1, calendarPreviousArrivalDate:'2026-10-18', merchantArrivalDeadline:undefined };
    expect(olderCalendarDates(old)).toEqual({primary:[],arrival:['2026-10-18']});
    const cleared = acknowledgeCalendarCleanup([old],old)[0];
    expect(olderCalendarDates(cleared)).toEqual({primary:[],arrival:[]});
    expect(cleared.calendarPreviousArrivalDate).toBeUndefined();
  });
  test('completed returns identify their last downloaded event date for cancellation', () => {
    const old = recordCalendarDownloads([initial],[{id:initial.id,merchant:initial.merchant,due:'2026-10-11',merchantArrivalDeadline:'2026-10-18'}]);
    const edited = planEdit(old,old[0],{...editDraft(old[0]),windowDays:'13'});
    const completed = planCompletion(edited.next,edited.order,'kept',time);
    expect(olderCalendarDates(completed.order)).toEqual({primary:['2026-10-11'],arrival:['2026-10-18']});
    const cancellation=planCalendarCancellation(completed.next,completed.order,'return',time);
    expect(cancellation.due).toBe('2026-10-11');
    expect(event(cancellation.content)).toContain('DTSTART;VALUE=DATE:20261011');
    expect(olderCalendarDates(acknowledgeCalendarCleanup(completed.next,completed.order)[0]))
      .toEqual({primary:[],arrival:[]});
  });
  test('calendar downloads do not record stale, duplicate or impossible dates', () => {
    expect(() => recordCalendarDownloads([initial],[{id:initial.id,merchant:initial.merchant,due:'2026-10-13'}]))
      .toThrow(/changed/);
    expect(() => recordCalendarDownloads([initial,initial],[{id:initial.id,merchant:initial.merchant,due:'2026-10-11',merchantArrivalDeadline:'2026-10-18'}]))
      .toThrow(/changed/);
    expect(() => recordCalendarDownloads([initial],[{id:'unknown',merchant:initial.merchant,due:'2026-10-11'}]))
      .toThrow(/removed/);
  });
  test('rejects malformed date histories and refuses downgrading their backup version', () => {
    const withHistory = recordCalendarDownloads([initial],[{id:initial.id,merchant:initial.merchant,due:'2026-10-11',merchantArrivalDeadline:'2026-10-18'}]);
    const backup=JSON.parse(exportBackup(withHistory,time));
    backup.version=11;
    expect(() => parseBackup(JSON.stringify(backup))).toThrow(/unsupported/);
    for(const dates of [['2026-02-30'], ['2026-10-11','2026-10-11'], [], ['bogus'], Array(129).fill('2026-10-11')]){
      expect(() => exportBackup([{...initial,calendarExportedDueDates:dates}],time)).toThrow();
    }
  });
});
