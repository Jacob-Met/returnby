import {describe,it,expect} from 'vitest';
import {exportBackup,parseBackupDocument,BackupError} from '../src/backup';
import {validatePackedMerchantDocuments,type PackedMerchantDocument} from '../src/return-document-backup';
import {buildChecklistHtml,createChecklist,parseSavedOrders} from '../src/trip-checklist';
import type {Order} from '../src/store';

const order:Order={
  id:'test-merchant-01',merchant:'Seabird Outfitters',orderNo:'SB-401',
  orderDate:'2026-11-08',windowDays:30,windowSource:'user',createdAt:'2026-11-08T09:00:00.000Z'
};
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9pRbEAAAAASUVORK5CYII=';
const doc:PackedMerchantDocument={id:order.id,createdAt:order.createdAt,name:'merchant-QR.png',type:'image/png',data:png};

describe('merchant-issued return documents travel with a purchase',()=>{
  it('round-trips a real image signature through version 13 backup',()=>{
    const content=exportBackup([order],new Date('2026-11-12T12:00:00Z'),null,[],null,[],[doc]);
    const parsed=parseBackupDocument(content);
    expect(JSON.parse(content).version).toBe(13);
    expect(parsed.orders[0]).toMatchObject(order);
    expect(parsed.merchantDocuments).toEqual([doc]);
  });
  it('refuses forged MIME, malicious names and wrong purchase identities',()=>{
    expect(()=>validatePackedMerchantDocuments([{...doc,type:'application/pdf'}],[order])).toThrow(/binary content/);
    expect(()=>validatePackedMerchantDocuments([{...doc,name:'../stolen.png'}],[order])).toThrow(/format/);
    expect(()=>validatePackedMerchantDocuments([{...doc,id:'other'}],[order])).toThrow(/saved purchase/);
  });
  it('does not render a network dependency for saved QR images or printable merchant PDF',()=>{
    const checklist=createChecklist(parseSavedOrders(JSON.stringify([order])),[order.id],'2026-11-15');
    const qr='data:image/png;base64,'+png;
    const output=buildChecklistHtml({...checklist,merchantDocuments:{[order.id]:{data:qr,name:'merchant-QR.png',type:'image/png'}}});
    expect(output).toContain('id="merchant-documents"');
    expect(output).toContain(qr);
    expect(output).toContain('MERCHANT RETURN DOCUMENT SAVED OFFLINE');
    expect(output).not.toContain('<script');
    const pdf=buildChecklistHtml({...checklist,merchantDocuments:{[order.id]:{data:'data:application/pdf;base64,JVBERi0xLjQK',name:'merchant-label.pdf',type:'application/pdf'}}});
    expect(pdf).toContain('Save merchant PDF label from this offline file');
    expect(pdf).toContain('download="merchant-label.pdf"');
  });
  it('excludes malicious or mismatched merchant document URL schemes from the offline sheet',()=>{
    const checklist=createChecklist(parseSavedOrders(JSON.stringify([order])),[order.id],'2026-11-15');
    const html=buildChecklistHtml({...checklist,merchantDocuments:{[order.id]:{type:'application/pdf',name:'unsafe.pdf',data:'javascript:alert(1)'}}});
    expect(html).not.toContain('javascript:alert');
    expect(html).not.toContain('id="merchant-documents"');
  });
  it('continues opening old backup versions without merchant documents',()=>{
    const previous=exportBackup([order],new Date('2026-11-12T12:00:00Z'));
    expect(parseBackupDocument(previous).merchantDocuments).toBeUndefined();
  });
});
