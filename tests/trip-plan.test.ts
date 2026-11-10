import { describe, expect, it } from 'vitest';
import { alignTripPlan, emptyTripPlan, planOrder, readTripPlan, saveTripPlan, TRIP_PLAN_KEY } from '../src/trip-plan';
import { buildChecklistHtml, createChecklist, parseSavedOrders } from '../src/trip-checklist';
import type { Order } from '../src/store';

const coat: Order = { id:'coat-2', merchant:'Elm Outfitters', orderNo:'E-340', total:'$98.50', orderDate:'2026-11-02', windowDays:30, windowSource:'user', createdAt:'2026-11-02T12:00:00Z' };
const book: Order = { ...coat, id:'book-7', merchant:'Oak Books', orderNo:'B-12', total:'£24.00' };
const snapshot = (orders: Order[]) => parseSavedOrders(JSON.stringify(orders));
const savedPlan = () => ({ ...emptyTripPlan('2026-11-14'), orders:[
  { ...planOrder(coat), packed:true, receiptReady:true, instructionsChecked:true, notes:'Locker 12\nBring QR code — coat only.' },
  { ...planOrder(book), notes:'Customer desk' },
] });

describe('a shopper can resume their return trip', () => {
  it('round trips date, selection, per-order packing checks and multiline notes without writing the tracker', () => {
    const writes: string[] = [];
    let raw: string | null = null;
    const storage = { getItem:(key:string) => { expect(key).toBe(TRIP_PLAN_KEY); return raw; },
      setItem:(key:string,value:string) => { writes.push(key); raw=value; } };
    const plan = savedPlan();
    saveTripPlan(storage,plan,null);
    expect(readTripPlan(storage).plan).toEqual(plan);
    expect(writes).toEqual([TRIP_PLAN_KEY]);
  });
  it('keeps the shopper date, but uses edited order facts and asks for instructions to be checked again', () => {
    const before = savedPlan();
    const changed = alignTripPlan(before,snapshot([{...coat, windowDays:14},book]));
    expect(changed.plan.tripDate).toBe('2026-11-14');
    expect(changed.plan.orders[0]).toMatchObject({selected:true, packed:true, receiptReady:true, instructionsChecked:false, notes:before.orders[0].notes});
    expect(changed.changed).toEqual(['Elm Outfitters']);
    const source = snapshot([{...coat,windowDays:14},book]);
    const printable = buildChecklistHtml({...createChecklist(source,[coat.id],'2026-11-14'),packing:{[coat.id]:changed.plan.orders[0]}});
    expect(printable).toContain('2026-11-16');
    expect(printable).not.toContain('2026-12-02');
    expect(printable).toContain('Locker 12');
  });
  it('retains notes for removed/finished orders, excludes them from selection and does not reselect an order when it returns', () => {
    const aligned = alignTripPlan(savedPlan(),snapshot([book]));
    expect(aligned.unavailable.map(row=>row.id)).toEqual([coat.id]);
    expect(aligned.plan.orders[0].notes).toContain('Locker 12');
    expect(aligned.plan.orders.filter(row=>row.selected).map(row=>row.id)).toEqual([book.id]);
    const reopened = alignTripPlan(aligned.plan,snapshot([coat,book]));
    expect(reopened.plan.orders[0].selected).toBe(false);
  });
  it('leaves original plan data alone while deriving current facts', () => {
    const original=savedPlan(), raw=JSON.stringify(original);
    alignTripPlan(original,snapshot([{...coat,merchant:'Elm Returns Desk'}]));
    expect(JSON.stringify(original)).toBe(raw);
  });
  it('refuses to overwrite a second planner tab until the user explicitly chooses which trip to keep', () => {
    const plan=savedPlan(), raw=JSON.stringify(plan);
    const writes:string[]=[];
    const storage={getItem:()=>raw,setItem:(_key:string,value:string)=>writes.push(value)};
    expect(()=>saveTripPlan(storage,emptyTripPlan('2026-11-20'),null)).toThrow('another tab');
    expect(writes).toEqual([]);
    saveTripPlan(storage,emptyTripPlan('2026-11-20'),raw);
    expect(JSON.parse(writes[0]).tripDate).toBe('2026-11-20');
  });
  it('reports storage failures and leaves unreadable saved data untouched', () => {
    expect(()=>readTripPlan({getItem:()=>'{'})).toThrow('left unchanged');
    expect(()=>saveTripPlan({getItem:()=>null,setItem:()=>{throw new Error('full');}},savedPlan(),null)).toThrow('could not be saved');
    expect(()=>readTripPlan({getItem:()=>{throw new Error('blocked');}})).toThrow('could not be read');
  });
  it('downloads selected checks and escaped notes in a script-free printable sheet', () => {
    const plan=savedPlan();
    plan.orders[0].notes='Service desk <after 5> & receipt\n<script>alert(1)</script>';
    const rendered=buildChecklistHtml({...createChecklist(snapshot([coat,book]),[coat.id],'2026-11-14'),packing:{[coat.id]:plan.orders[0]}});
    expect(rendered).toContain('Service desk &lt;after 5&gt; &amp; receipt');
    expect(rendered).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(rendered.match(/class="blank-check checked"/g)).toHaveLength(3);
    expect(rendered).not.toContain('<script');
    expect(rendered).not.toContain('Oak Books');
  });
});
