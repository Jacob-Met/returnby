import { expect, test } from 'vitest';
import { exportBackup, parseBackupDocument } from '../src/backup';
import { planCompletion } from '../src/completion';
import { captureTrip } from '../src/trip-library';
import { alignTripPlan, emptyTripPlan, planOrder } from '../src/trip-plan';
import type { Order } from '../src/store';

const stamp = new Date('2026-11-10T16:00:00Z');
const coat: Order = { id:'workspace-coat',merchant:'Harbour Clothing',orderNo:'HC-184',
  total:'£80',orderDate:'2026-11-01',windowStartDate:'2026-11-04',windowDays:30,
  windowSource:'user',createdAt:'2026-11-01T12:00:00Z',
  refundState:'awaiting',refundAmount:'£80',refundFollowUpDate:'2026-11-18',
  refundNote:'Check the partial-return receipt.',refundUpdatedAt:'2026-11-10T15:00:00Z' };
const trip = { ...emptyTripPlan('2026-11-12'), orders:[{ ...planOrder(coat),packed:true,
  receiptReady:true,instructionsChecked:true,notes:'Take original packaging.' }] };
const library = {version:1 as const,trips:[captureTrip('Thursday locker',trip,'locker-thu',stamp.toISOString())]};
const pending = [{id:'pending-lamp',updatedAt:stamp.toISOString(),fields:{
  merchant:'Juniper Home',orderDate:'2026-11-09',orderNo:'JH-229',total:'£45',
  windowStartDate:'',windowDays:'30'}}];

test.each(['returned','kept'] as const)('portable workspace preserves %s, refund, pending delivery and named trips together', kind => {
  const closed = planCompletion([coat],coat,kind,stamp).order;
  const file = exportBackup([closed],stamp,trip,pending,library);
  expect(JSON.parse(file).version).toBe(5);
  const restored = parseBackupDocument(file);
  expect(restored.orders).toEqual([closed]);
  expect(restored.pending).toEqual(pending);
  expect(restored.trip).toEqual(trip);
  expect(restored.tripLibrary).toEqual(library);
  const aligned = alignTripPlan(restored.tripLibrary!.trips[0].plan,{raw:null,orders:restored.orders});
  expect(aligned.unavailable).toHaveLength(1);
  expect(aligned.plan.orders[0]).toMatchObject({selected:false,packed:true,
    receiptReady:true,notes:'Take original packaging.'});
  expect(restored.orders[0].refundState).toBe('awaiting');
});

test('existing v3 pending and v4 named-trip backups remain readable with active orders', () => {
  const v3 = exportBackup([coat],stamp,undefined,pending);
  expect(JSON.parse(v3).version).toBe(3);
  expect(parseBackupDocument(v3).pending).toEqual(pending);
  const v4 = exportBackup([coat],stamp,trip,pending,library);
  expect(JSON.parse(v4).version).toBe(4);
  expect(parseBackupDocument(v4)).toMatchObject({orders:[coat],pending,tripLibrary:library});
});

test('pre-release outcome backup remains closed and unsupported future formats fail visibly', () => {
  const closed=planCompletion([coat],coat,'returned',stamp).order;
  const earlier=JSON.parse(exportBackup([closed],stamp));
  earlier.version=3;
  expect(parseBackupDocument(JSON.stringify(earlier)).orders).toEqual([closed]);
  earlier.version=6;
  expect(()=>parseBackupDocument(JSON.stringify(earlier))).toThrow('not supported');
});
