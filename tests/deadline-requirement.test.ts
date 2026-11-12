import {test,expect} from 'vitest';
import {previewEdit,editDraft} from '../src/edit';
import {exportBackup,parseBackupDocument} from '../src/backup';
import {portablePending} from '../src/pending-delivery';
import {parseSavedOrders,createChecklist,renderChecklist,buildChecklistHtml} from '../src/trip-checklist';
import {planCalendarBatch,calendarRows} from '../src/calendar-batch';
import {orderSignature,alignTripPlan,planOrder} from '../src/trip-plan';
import {validDeadlineRequirement,deadlinePhrase} from '../src/deadline-requirement';
import type {Order} from '../src/store';

const initial:Order={id:'parcel-ship-12',merchant:'Harbor Outfitters',orderNo:'Q-13',orderDate:'2026-10-01',windowStartDate:'2026-10-03',windowDays:30,windowSource:'user',createdAt:'2026-10-03T09:00:00Z',returnEvidenceUrl:'https://harbor.example/label/Q-13'};
const stamp=new Date('2026-10-08T12:00:00Z');
const unfold=(value:string)=>value.replace(/\r\n[ \t]/g,'');
test.each([
 ['ship-by','Ship by','Ship by:','The carrier must accept'],
 ['drop-off-by','Drop off by','Drop off by:','Hand the item'],
 ['arrive-by','Merchant must receive by','Merchant receipt deadline:','Allow transit time'],
] as const)('%s meaning travels from edited purchase into calendar, backup and trip', (requirement, phrase, calendarTitle, guidance)=>{
 const changed=previewEdit(initial,{...editDraft(initial),deadlineRequirement:requirement}).order;
 expect(changed.deadlineRequirement).toBe(requirement);
 expect(deadlinePhrase(changed.deadlineRequirement)).toBe(phrase);
 expect(changed.returnEvidenceUrl).toBe(initial.returnEvidenceUrl);
 const backup=exportBackup([changed],stamp);
 expect(JSON.parse(backup).version).toBe(8);
 const restored=parseBackupDocument(backup).orders[0];
 expect(restored.deadlineRequirement).toBe(requirement);
 expect(restored.windowStartDate).toBe(initial.windowStartDate);
 const rows=calendarRows([restored],'2026-10-08');
 const plan=planCalendarBatch([restored],rows,[initial.id],stamp);
 expect(unfold(plan.content)).toContain('SUMMARY:'+calendarTitle+' Harbor Outfitters');
 expect(unfold(plan.content)).toContain(phrase+' 2026-11-02');
 if(requirement==='arrive-by')expect(unfold(plan.content)).toContain('Allow transit time');
 const snapshot=parseSavedOrders(JSON.stringify([restored]));
 const trip=createChecklist(snapshot,[initial.id],'2026-10-25','2026-10-08');
 for(const sheet of [renderChecklist(trip),buildChecklistHtml(trip)]){
  expect(sheet).toContain(phrase);
  expect(sheet).toContain(guidance);
  expect(sheet).toContain('href="https://harbor.example/label/Q-13"');
 }
});
test('the default remains return by and v7 backup documents remain readable',()=>{
 const backup=exportBackup([initial],stamp);
 expect(JSON.parse(backup).version).toBe(7);
 const restored=parseBackupDocument(backup).orders[0];
 expect(restored.deadlineRequirement).toBeUndefined();
 expect(deadlinePhrase(restored.deadlineRequirement)).toBe('Return by');
});
test('pending delivery keeps action choice without creating a deadline',()=>{
 const pending=portablePending([{id:'pending-12',updatedAt:'2026-10-08T12:00:00Z',fields:{merchant:'Harbor Outfitters',orderDate:'2026-10-01',windowDays:'30',deadlineRequirement:'arrive-by',returnEvidenceUrl:'https://harbor.example/label'}}]);
 const backup=exportBackup([],stamp,null,pending);
 expect(JSON.parse(backup).version).toBe(8);
 expect(parseBackupDocument(backup).orders).toEqual([]);
 expect(parseBackupDocument(backup).pending?.[0].fields.deadlineRequirement).toBe('arrive-by');
 const wrongVersion=JSON.parse(backup);wrongVersion.version=7;
 expect(()=>parseBackupDocument(JSON.stringify(wrongVersion))).toThrow(/version 8/);
});
test('invalid requirements cannot enter the editor, backup, trip or pending collection',()=>{
 for(const requirement of ['javascript:alert(1)','arrive_by','ship-by\nDROP','unknown']){
  expect(validDeadlineRequirement(requirement)).toBe(false);
  expect(()=>previewEdit(initial,{...editDraft(initial),deadlineRequirement:requirement})).toThrow(/Choose what the retailer/);
  const validBackup=JSON.parse(exportBackup([{...initial,deadlineRequirement:'ship-by'}],stamp));
  validBackup.orders[0].deadlineRequirement=requirement;
  expect(()=>parseBackupDocument(JSON.stringify(validBackup))).toThrow(/invalid deadline requirement/);
  expect(()=>parseSavedOrders(JSON.stringify([{...initial,deadlineRequirement:requirement}]))).toThrow(/unsupported return deadline/);
  expect(()=>portablePending([{id:'pending-1',updatedAt:null,fields:{merchant:'Harbor',deadlineRequirement:requirement}}])).toThrow(/Choose what/);
 }
});
test('changing action or return evidence invalidates stale packing instructions and calendar review',()=>{
 const withLabel={...initial,deadlineRequirement:'ship-by' as const};
 const current=calendarRows([withLabel],'2026-10-08');
 const changed={...withLabel,deadlineRequirement:'arrive-by' as const};
 expect(()=>planCalendarBatch([changed],current,[changed.id],stamp)).toThrow(/changed/);
 const trip={version:1 as const,tripDate:'2026-10-20',orders:[{...planOrder(withLabel),instructionsChecked:true}]};
 expect(orderSignature(withLabel)).not.toBe(orderSignature(changed));
 const aligned=alignTripPlan(trip,parseSavedOrders(JSON.stringify([changed])));
 expect(aligned.changed).toEqual(['Harbor Outfitters']);
 expect(aligned.plan.orders[0].instructionsChecked).toBe(false);
 const another={...withLabel,returnEvidenceUrl:'https://harbor.example/label/revised'};
 expect(alignTripPlan(trip,parseSavedOrders(JSON.stringify([another]))).plan.orders[0].instructionsChecked).toBe(false);
});
