import { describe, expect, it } from 'vitest';
import { manualPurchase } from '../src/manual-purchase';
import { editDraft, previewEdit } from '../src/edit';
import { exportBackup, parseBackup, parseBackupDocument } from '../src/backup';
import { calendarRows, planSingleCalendar } from '../src/calendar-batch';
import { buildDeadlineOverview } from '../src/deadline-overview';
import { parseSavedOrders, createChecklist, renderChecklist } from '../src/trip-checklist';
import { ordersForDeadline } from '../src/trip-deadline-handoff';
import { createSavedReturnsCsv } from '../src/saved-returns-csv';
import { orderSignature } from '../src/trip-plan';
import { appendConfirmations, validateDraft } from '../src/batch-intake';

const purchase = () => manualPurchase({
  merchant: 'Harbor Outfitters',
  orderNo: 'HARBOR-17',
  total: '$88.20',
  orderDate: '2026-11-01',
  windowStartDate: '',
  windowDays: '14',
  fixedDeadline: '',
  deadlineRequirement: 'ship-by',
  merchantArrivalDeadline: '2026-11-20',
}, 'harbor-17', '2026-11-02T00:00:00Z').order;

describe('a merchant requires carrier acceptance AND arrival', () => {
  it('keeps two independently dated requirements on the same saved purchase', () => {
    const saved = purchase();
    expect(saved.deadlineRequirement).toBe('ship-by');
    expect(saved.merchantArrivalDeadline).toBe('2026-11-20');
    expect(previewEdit(saved, editDraft(saved)).due).toBe('2026-11-15');
    const file = exportBackup([saved], new Date('2026-11-09T12:00:00Z'));
    expect(JSON.parse(file).version).toBe(10);
    expect(parseBackup(file)).toEqual([saved]);
    expect(parseBackupDocument(file).orders).toEqual([saved]);
    expect(() => parseBackup(file.replace('"version": 10', '"version": 8'))).toThrow();
  });

  it('refuses backwards arrivals, impossible dates, and loss of the carrier requirement', () => {
    const saved = purchase();
    const before = JSON.stringify(saved);
    expect(() => previewEdit(saved, { ...editDraft(saved), merchantArrivalDeadline: '2026-11-14' })).toThrow(/after the carrier/);
    expect(() => previewEdit(saved, { ...editDraft(saved), merchantArrivalDeadline: '2026-11-31' })).toThrow(/real date/);
    expect(() => previewEdit(saved, { ...editDraft(saved), deadlineRequirement: 'arrive-by' })).toThrow(/Choose Ship by/);
    expect(() => previewEdit(saved, { ...editDraft(saved), deadlineRequirement: '' })).toThrow(/Choose Ship by/);
    expect(JSON.stringify(saved)).toBe(before);
    const cleared = previewEdit(saved, { ...editDraft(saved), merchantArrivalDeadline: '', deadlineRequirement: 'arrive-by' });
    expect(cleared.order.merchantArrivalDeadline).toBeUndefined();
    expect(cleared.order.deadlineRequirement).toBe('arrive-by');
  });

  it('exports two real calendar entries with distinct dates and unique IDs', () => {
    const saved = purchase();
    const stamp = new Date('2026-11-09T12:00:00Z');
    const plan = planSingleCalendar([saved], saved, stamp);
    const unfolded = plan.content.replace(/\r\n[ \t]/g, '');
    expect(plan.count).toBe(2);
    expect((unfolded.match(/BEGIN:VEVENT/g) || []).length).toBe(2);
    expect(unfolded).toContain('UID:harbor-17@returnby');
    expect(unfolded).toContain('UID:harbor-17:merchant-arrival@returnby');
    expect(unfolded).toContain('SUMMARY:Ship by: Harbor Outfitters #HARBOR-17');
    expect(unfolded).toContain('SUMMARY:Merchant receipt deadline: Harbor Outfitters #HARBOR-17');
    expect(unfolded).toContain('DTSTART;VALUE=DATE:20261115');
    expect(unfolded).toContain('DTSTART;VALUE=DATE:20261120');
    expect((unfolded.match(/BEGIN:VALARM/g) || []).length).toBe(2);
    expect(calendarRows([{...saved,merchantArrivalDeadline:'2026-11-14'}], '2026-11-09')[0].problem).toMatch(/second/);
    expect(() => planSingleCalendar([{...saved,merchantArrivalDeadline:'2026-11-21'}], saved, stamp)).toThrow(/changed/);
  });

  it('puts each date on its own calendar day and keeps the purchase in both trip handoffs', () => {
    const saved = purchase();
    const calendar = buildDeadlineOverview([saved], '2026-11', '2026-11-09');
    expect(calendar.total).toBe(2);
    expect(calendar.monthTotal).toBe(2);
    const carrier = calendar.days[14].records[0];
    const warehouse = calendar.days[19].records[0];
    expect([carrier.kind, carrier.due]).toEqual(['return','2026-11-15']);
    expect([warehouse.kind, warehouse.due]).toEqual(['arrival','2026-11-20']);
    expect(ordersForDeadline([saved],'2026-11-15')).toHaveLength(1);
    expect(ordersForDeadline([saved],'2026-11-20')).toHaveLength(1);
    const print = renderChecklist(createChecklist(parseSavedOrders(JSON.stringify([saved])),[saved.id],'2026-11-13'));
    expect(print).toContain('Ship by');
    expect(print).toContain('2026-11-15');
    expect(print).toContain('Merchant must receive by');
    expect(print).toContain('2026-11-20');
  });

  it('keeps both dates in spreadsheet export and makes a changed arrival date refresh a saved trip', () => {
    const saved = purchase();
    const csv = createSavedReturnsCsv([saved],new Date('2026-11-09T12:00:00Z')).content;
    expect(csv).toContain('Additional merchant receipt deadline');
    expect(csv).toContain('2026-11-20');
    const revised = {...saved,merchantArrivalDeadline:'2026-11-21'};
    expect(orderSignature(revised)).not.toBe(orderSignature(saved));
  });

  it('carries both deadlines through a separately reviewed batch confirmation', () => {
    const [draft] = appendConfirmations([], [{label:'Harbor receipt',text:'Order number HARBOR-17\nOrder date: November 1, 2026\nTotal: $88.20'}]);
    draft.fields = {...draft.fields, merchant:'Harbor Outfitters', orderDate:'2026-11-01',
      windowDays:'14', deadlineRequirement:'ship-by', merchantArrivalDeadline:'2026-11-20'};
    const reviewed = validateDraft(draft);
    expect(reviewed).toMatchObject({deadlineRequirement:'ship-by', merchantArrivalDeadline:'2026-11-20'});
    draft.fields.merchantArrivalDeadline = '2026-11-14';
    expect(() => validateDraft(draft)).toThrow(/arrival date/);
    draft.fields.deadlineRequirement = 'arrive-by';
    expect(() => validateDraft(draft)).toThrow();
  });

  it('preserves the second deadline before delivery and protects its backup version', () => {
    const pending = [{id:'awaiting-delivery',updatedAt:'2026-11-02T00:00:00Z',fields:{
      merchant:'Harbor Outfitters', orderDate:'2026-11-01', windowDays:'14',
      deadlineRequirement:'ship-by', merchantArrivalDeadline:'2026-11-20',
    }}];
    const file = exportBackup([],new Date('2026-11-09T12:00:00Z'),null,pending);
    expect(JSON.parse(file).version).toBe(10);
    expect(parseBackupDocument(file).pending?.[0]).toMatchObject(pending[0]);
    const downgraded = JSON.parse(file);
    downgraded.version = 8;
    expect(() => parseBackupDocument(JSON.stringify(downgraded))).toThrow(/version 10/);
  });

  it('keeps the original receipt photograph when a dual-deadline purchase crosses devices', () => {
    const saved = purchase();
    const photo = {id:saved.id,createdAt:saved.createdAt,type:'image/png' as const,rotation:2,
      data:'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEUlEQVR4nGP4X8/wH4QZYAwAWqQJ9XavesYAAAAASUVORK5CYII='};
    const file = exportBackup([saved],new Date('2026-11-09T12:00:00Z'),null,[],null,[photo]);
    expect(JSON.parse(file).version).toBe(10);
    expect(parseBackupDocument(file).orders).toEqual([saved]);
    expect(parseBackupDocument(file).photos).toEqual([photo]);
  });

  it('keeps single-date purchases and older backups unchanged', () => {
    const saved = purchase();
    const legacy = {...saved,merchantArrivalDeadline:undefined};
    const file=exportBackup([legacy],new Date('2026-11-09T12:00:00Z'));
    expect(JSON.parse(file).version).toBe(8);
    expect(parseBackup(file)[0].merchantArrivalDeadline).toBeUndefined();
    expect(planSingleCalendar([legacy],legacy,new Date('2026-11-09T12:00:00Z')).count).toBe(1);
  });
});
