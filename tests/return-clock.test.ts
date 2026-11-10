import { describe, expect, it } from 'vitest';
import { dueDate, returnClockStart, returnDueDate } from '../src/deadline';
import type { Order } from '../src/store';
import { editDraft, previewEdit, planEdit } from '../src/edit';
import { exportBackup, parseBackup, planImport } from '../src/backup';
import { calendarRows, planCalendarBatch, planSingleCalendar } from '../src/calendar-batch';
import { parseSavedOrders, createChecklist, renderChecklist } from '../src/trip-checklist';
import { appendConfirmations, validateDraft } from '../src/batch-intake';
import { intakeDeadlineText } from '../src/intake-deadline';

const stamp = new Date('2026-10-25T12:00:00.000Z');
const purchased: Order = {
  id: 'deliver-1', merchant: 'Fictional Goods', orderNo: 'DEMO-10', total: '$49',
  orderDate: '2026-10-01', windowDays: 30, windowSource: 'user', createdAt: '2026-10-01T10:00:00Z',
};
const delivered: Order = { ...purchased, windowStartDate: '2026-10-11' };

describe('user-reviewed return clock origin across the released product', () => {
  it('keeps old saved records counting from order date without mutating their shape', () => {
    expect(returnClockStart(purchased)).toBe('2026-10-01');
    expect(returnDueDate(purchased)).toBe('2026-10-31');
    expect(purchased).not.toHaveProperty('windowStartDate');
    expect(parseBackup(exportBackup([purchased], stamp))).toEqual([purchased]);
  });

  it('moves the deadline only when the shopper confirms a new start date', () => {
    expect(returnClockStart(delivered)).toBe('2026-10-11');
    expect(returnDueDate(delivered)).toBe('2026-11-10');
    expect(dueDate(delivered.orderDate, delivered.windowDays)).toBe('2026-10-31');
    expect(intakeDeadlineText(delivered.orderDate, '30', delivered.windowStartDate)).toContain('2026-11-10');
    expect(intakeDeadlineText(delivered.orderDate, '30', delivered.windowStartDate)).toContain('confirmed by you');
    expect(intakeDeadlineText(delivered.orderDate, '30')).toBe('Calculated return-by date: 2026-10-31');
  });

  it('supports editing and clearing the override without losing purchase or policy information', () => {
    const original = JSON.stringify(purchased);
    const result = planEdit([purchased], purchased, { ...editDraft(purchased), windowStartDate: '2026-10-11' });
    expect(result.changed).toBe(true);
    expect(result.due).toBe('2026-11-10');
    expect(result.order.windowSource).toBe('user');
    expect(result.order.orderDate).toBe('2026-10-01');
    expect(JSON.stringify(purchased)).toBe(original);
    const revert = previewEdit(result.order, { ...editDraft(result.order), windowStartDate: '' });
    expect(revert.due).toBe('2026-10-31');
    expect(revert.order).not.toHaveProperty('windowStartDate');
    expect(() => previewEdit(purchased, { ...editDraft(purchased), windowStartDate: '2026-02-30' })).toThrow(/start date/);
    expect(() => previewEdit(purchased, { ...editDraft(purchased), windowStartDate: '9999-12-31' })).toThrow(/end within/);
  });

  it('preserves an explicitly confirmed date through version-one portable backups and detects conflicts', () => {
    const output = exportBackup([delivered], stamp);
    expect(output).toContain('"windowStartDate": "2026-10-11"');
    expect(parseBackup(output)).toEqual([delivered]);
    const conflict = planImport([purchased], [delivered]);
    expect(conflict.conflicts).toBe(1);
    expect(conflict.rows[0].changedFields).toContain('windowStartDate');
    const invalid = JSON.parse(output);
    invalid.orders[0].windowStartDate = '2026-02-30';
    expect(() => parseBackup(JSON.stringify(invalid))).toThrow(/return-clock start/);
  });

  it('exports the corrected all-day calendar date and refuses stale reviewed selections', () => {
    const reviewed = calendarRows([delivered], '2026-10-25');
    expect(reviewed[0].due).toBe('2026-11-10');
    const plan = planCalendarBatch([delivered], reviewed, [delivered.id], stamp);
    expect(plan.content).toContain('DTSTART;VALUE=DATE:20261110');
    expect(plan.content).toContain('DTEND;VALUE=DATE:20261111');
    expect(plan.content).toContain('Return clock starts 2026-10-11');
    expect(plan.content.replace(/\r\n[ \t]/g, '')).toContain('retailer policy not verified');
    expect(planSingleCalendar([delivered], delivered, stamp).content).toContain('20261110');
    expect(() => planCalendarBatch([{ ...delivered, windowStartDate: '2026-10-12' }], reviewed, [delivered.id], stamp)).toThrow(/changed/);
    expect(calendarRows([purchased], '2026-10-25')[0].due).toBe('2026-10-31');
  });

  it('keeps the printable trip plan aligned with the calendar and shows the confirmed clock origin', () => {
    const snapshot = parseSavedOrders(JSON.stringify([delivered, { ...purchased, id: 'legacy' }]));
    const trip = createChecklist(snapshot, ['deliver-1', 'legacy'], '2026-11-02', '2026-10-25');
    expect(trip.orders.map(row => row.due)).toEqual(['2026-10-31', '2026-11-10']);
    const html = renderChecklist(trip);
    expect(html).toContain('2026-11-10');
    expect(html).toContain('2026-10-11');
    expect(html).toContain('user-confirmed');
    expect(html).toContain('order date');
    expect(() => parseSavedOrders(JSON.stringify([{ ...delivered, windowStartDate: 'invalid' }]))).toThrow(/return-clock/);
  });

  it('allows optional start only after explicit batch review and rejects invalid dates', () => {
    const draft = appendConfirmations([], [{label:'receipt.txt', text:'Store: Fictional Goods\nOrder number: DEMO-10\nOrder date: October 1, 2026'}], () => 'draft-1')[0];
    expect(draft.fields).not.toHaveProperty('windowStartDate');
    draft.fields.windowStartDate = '2026-10-11';
    const approved = validateDraft(draft);
    expect(approved.windowStartDate).toBe('2026-10-11');
    expect(returnDueDate(approved)).toBe('2026-11-10');
    draft.fields.windowStartDate = '2026-02-30';
    expect(() => validateDraft(draft)).toThrow(/return-clock start/);
    draft.fields.windowStartDate = '';
    expect(validateDraft(draft)).not.toHaveProperty('windowStartDate');
  });
});
