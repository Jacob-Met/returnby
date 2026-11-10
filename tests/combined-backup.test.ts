import { expect, test } from 'vitest';
import { exportBackup, parseBackupDocument } from '../src/backup';
import { portablePending } from '../src/pending-delivery';
import { captureTrip } from '../src/trip-library';
import { emptyTripPlan, planOrder } from '../src/trip-plan';
import type { Order } from '../src/store';

const stamp = '2026-11-10T12:00:00.000Z';
const active: Order = {
 id: 'combined-coat', merchant: 'Juniper Outfitters', orderNo: '00042', total: '£96.00',
 orderDate: '2026-11-01', windowStartDate: '2026-11-04', windowDays: 30, windowSource: 'user', createdAt: stamp,
 items: [{id:'coat-blue',name:'Blue coat',quantity:3,returned:1,kept:1}],
 refundState:'awaiting',refundAmount:'£32.00',refundFollowUpDate:'2026-11-18',refundNote:'First coat handed back; receipt retained.',refundUpdatedAt:stamp,
};
const finished: Order = {...active,id:'combined-finished',items:[{id:'mugs',name:'Stoneware mug',quantity:2,returned:1,kept:1}],completedAt:stamp,completionKind:'mixed'};
const pending = portablePending([{id:'pending-boots',updatedAt:stamp,fields:{merchant:'North Trail',orderNo:'NT-091',orderDate:'2026-11-09',windowStartDate:'',windowDays:'30',total:'£75.00'}}]);
const trip = {...emptyTripPlan('2026-11-14'),orders:[{...planOrder(active),packed:true,notes:'One coat remains; take the printed receipt.'}]};
const library = {version:1 as const,trips:[captureTrip('Saturday lockers',trip,'saturday',stamp),captureTrip('Following week',{...trip,tripDate:'2026-11-21'},'following',stamp)]};

test('one portable backup retains partial and mixed outcomes, refund, pending purchases and separate named trips',()=>{
 const file=exportBackup([active,finished],new Date(stamp),trip,pending,library);
 expect(JSON.parse(file).version).toBe(5);
 const restored=parseBackupDocument(file);
 expect(restored.orders).toEqual([active,finished]);
 expect(restored.trip).toEqual(trip);
 expect(restored.pending).toEqual(pending);
 expect(restored.tripLibrary).toEqual(library);
});

test('published pending v3 and named-trip v4 backups remain readable without item decisions',()=>{
 const {items,refundState,refundAmount,refundFollowUpDate,refundNote,refundUpdatedAt,...plain}=active;
 const pendingFile=exportBackup([plain],new Date(stamp),null,pending);
 expect(JSON.parse(pendingFile).version).toBe(3);
 expect(parseBackupDocument(pendingFile).pending).toEqual(pending);
 const libraryFile=exportBackup([plain],new Date(stamp),trip,[],library);
 expect(JSON.parse(libraryFile).version).toBe(4);
 expect(parseBackupDocument(libraryFile).tripLibrary).toEqual(library);
});

test('earlier outcome v3 and item v4 candidates remain readable when their optional pending/trip fields are absent',()=>{
 const outcome = {...active,items:undefined,completionKind:'returned' as const,completedAt:stamp};
 const v3=JSON.parse(exportBackup([outcome],new Date(stamp)));v3.version=3;
 expect(parseBackupDocument(JSON.stringify(v3)).orders[0].completionKind).toBe('returned');
 const v4=JSON.parse(exportBackup([active,finished],new Date(stamp)));v4.version=4;
 expect(parseBackupDocument(JSON.stringify(v4)).orders).toEqual([active,finished]);
});
