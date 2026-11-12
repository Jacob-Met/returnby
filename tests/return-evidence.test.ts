import {test,expect} from 'vitest';
import {parseSavedOrders,createChecklist,renderChecklist,buildChecklistHtml} from '../src/trip-checklist';
import {exportBackup,parseBackupDocument} from '../src/backup';
import {validReturnEvidenceUrl} from '../src/return-evidence';
import type {Order} from '../src/store';

const order:Order={
 id:'parcel-1',merchant:'North Trail',orderNo:'42',total:'$39',
 orderDate:'2026-11-01',windowStartDate:'2026-11-03',
 windowDays:30,windowSource:'user',createdAt:'2026-11-03T12:00:00Z',
 returnEvidenceUrl:'https://returns.example/receipt?order=42&view=qr',
};
test('whole saved return retains its real merchant link through backup and trip',()=>{
 const backup=exportBackup([order],new Date('2026-11-11T12:00:00Z'));
 expect(JSON.parse(backup).version).toBe(7);
 const restored=parseBackupDocument(backup).orders[0];
 expect(restored.returnEvidenceUrl).toBe(order.returnEvidenceUrl);
 const snapshot=parseSavedOrders(JSON.stringify([restored]));
 const trip=createChecklist(snapshot,['parcel-1'],'2026-11-14');
 for(const html of [renderChecklist(trip),buildChecklistHtml(trip)]){
  expect(html).toContain('Open return label, QR or receipt');
  expect(html).toContain('href="https://returns.example/receipt?order=42&amp;view=qr"');
  expect(html).toContain('rel="noopener noreferrer"');
 }
});
test('reject unsafe links rather than constructing clickable checkout or script URLs',()=>{
 for(const link of ['javascript:alert(1)','http://returns.example/a','https://user:pass@returns.example/a','https://returns.example\\evil.test/a','https://returns.example/'+ 'x'.repeat(2048)]){
  expect(validReturnEvidenceUrl(link)).toBe(false);
  expect(()=>parseSavedOrders(JSON.stringify([{...order,returnEvidenceUrl:link}]))).toThrow(/invalid HTTPS/);
  expect(()=>parseBackupDocument(JSON.stringify({...JSON.parse(exportBackup([order])),orders:[{...order,returnEvidenceUrl:link}]}))).toThrow(/invalid HTTPS/);
 }
});
