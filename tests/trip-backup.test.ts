import { describe, it, expect } from 'vitest';
import { exportBackup, parseBackupDocument, parseBackup } from '../src/backup';
import { planOrder, type TripPlan } from '../src/trip-plan';
import { parsePortableTrip, prepareTripRestore } from '../src/trip-backup';
import type { Order } from '../src/store';

const order:Order={id:'north-1',merchant:'North Outfitters',orderNo:'NO-184',total:'€81.70',orderDate:'2026-12-28',windowStartDate:'2027-01-02',windowDays:30,windowSource:'user',createdAt:'2026-12-29T10:00:00.000Z'};
const trip=():TripPlan=>({version:1,tripDate:'2027-01-15',orders:[{...planOrder(order),packed:true,receiptReady:true,instructionsChecked:true,notes:'Locker 7\nBring QR <code> & sleeve.'}]});
describe('portable prepared trips',()=>{
 it('round-trips year-boundary trip work with confirmed-clock orders, without unrelated input',()=>{
  const text=exportBackup([{...order,rawEmail:'private original email'}],new Date('2027-01-03T12:00:00Z'),trip());
  expect(JSON.parse(text).version).toBe(2);
  expect(text).not.toContain('private original email');
  const parsed=parseBackupDocument(text);
  expect(parsed.orders).toEqual([order]);expect(parsed.trip).toEqual(trip());
  expect(prepareTripRestore(parsed.trip,parsed.orders).plan).toEqual(trip());
 });
 it('keeps existing order-only backups compatible and never invents a trip',()=>{
  const text=exportBackup([order],new Date('2027-01-03T12:00:00Z'));
  expect(JSON.parse(text).version).toBe(1);expect(parseBackup(text)).toEqual([order]);
  expect(parseBackupDocument(text).trip).toBe(null);
 });
 it('refuses malformed packing checks, extra hidden content and duplicate identities before review',()=>{
  const value=trip();(value.orders[0] as unknown as Record<string,unknown>).packed='yes';
  expect(()=>parsePortableTrip(value)).toThrow();
  expect(()=>parsePortableTrip({...trip(),rawEmail:'hidden'})).toThrow();
  const duplicate=trip();duplicate.orders.push({...duplicate.orders[0]});
  expect(()=>parsePortableTrip(duplicate)).toThrow();
 });
 it('preserves notes but withdraws stale instruction approval against changed order facts',()=>{
  const incoming=trip();const restored=prepareTripRestore(incoming,[{...order,windowDays:14}]);
  expect(restored.changed).toEqual(['North Outfitters']);
  expect(restored.plan.orders[0].notes).toBe(incoming.orders[0].notes);
  expect(restored.plan.orders[0].instructionsChecked).toBe(false);
  expect(restored.plan.orders[0].packed).toBe(true);
  expect(incoming.orders[0].instructionsChecked).toBe(true);
 });
 it('retains unavailable-order notes without selecting a nonexistent return',()=>{
  const restored=prepareTripRestore(trip(),[]);
  expect(restored.selected).toBe(0);expect(restored.unavailable).toHaveLength(1);
  expect(restored.plan.orders[0].notes).toContain('Locker 7');
  expect(restored.plan.orders[0].selected).toBe(false);
 });
 it('preserves an unfinished trip date and rejects unsupported trip versions',()=>{
  expect(parsePortableTrip({...trip(),tripDate:''}).tripDate).toBe('');
  expect(()=>parsePortableTrip({...trip(),version:7})).toThrow();
  const doc=JSON.parse(exportBackup([order]));doc.version=2;doc.trip={version:7};
  expect(()=>parseBackupDocument(JSON.stringify(doc))).toThrow();
 });
 it('restores closed history and packing notes without selecting a finished return',()=>{
  const closed:Order={...order,completionKind:'returned',completedAt:'2027-01-04T10:00:00.000Z'};
  const file=exportBackup([closed],new Date('2027-01-05T10:00:00Z'),trip());
  expect(JSON.parse(file).version).toBe(3);
  const restored=parseBackupDocument(file);
  expect(restored.orders).toEqual([closed]);
  const prepared=prepareTripRestore(restored.trip,restored.orders);
  expect(prepared.selected).toBe(0);
  expect(prepared.unavailable.map(entry=>entry.id)).toEqual(['north-1']);
  expect(prepared.plan.orders[0].notes).toBe(trip().orders[0].notes);
  expect(prepared.plan.orders[0].packed).toBe(true);
 });
 it('accepts already-published confirmed-clock v1 files and pre-outcome v2 history',()=>{
  const published={schema:'returnby.backup',version:1,exportedAt:'2027-01-03T12:00:00Z',orders:[order]};
  expect(parseBackupDocument(JSON.stringify(published)).orders[0].windowStartDate).toBe('2027-01-02');
  const legacy={...published,version:2,orders:[{...order,completedAt:'2027-01-04T10:00:00Z'}]};
  expect(parseBackupDocument(JSON.stringify(legacy)).orders[0].completedAt).toBe('2027-01-04T10:00:00Z');
  expect(parseBackupDocument(JSON.stringify(legacy)).trip).toBe(null);
 });

});
