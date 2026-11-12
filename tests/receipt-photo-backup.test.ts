import {expect, test} from 'vitest';
import {exportBackup, parseBackupDocument, BackupError} from '../src/backup';
import {unpackReceiptPhoto, validatePackedReceiptPhotos, type PackedReceiptPhoto} from '../src/receipt-photo-backup';
import type {Order} from '../src/store';

const order: Order = {
  id:'photo-A', createdAt:'2026-11-12T12:00:00.000Z',
  merchant:'Sample Store', orderNo:'ABC-5', total:'$31.25',
  orderDate:'2026-11-10', windowDays:30, windowSource:'user',
};
const data='iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEUlEQVR4nGP4X8/wH4QZYAwAWqQJ9XavesYAAAAASUVORK5CYII=';
const photo: PackedReceiptPhoto = {id:order.id,createdAt:order.createdAt,type:'image/png',rotation:3,data};
const now=new Date('2026-11-12T20:00:00.000Z');

test('original photo survives a v9 backup with exact bytes and orientation',async()=>{
 const content=exportBackup([order],now,null,[],null,[photo]);
 expect(JSON.parse(content).version).toBe(9);
 const parsed=parseBackupDocument(content);
 expect(parsed.orders).toEqual([order]);
 expect(parsed.photos).toEqual([photo]);
 const bytes=await unpackReceiptPhoto(parsed.photos![0]).arrayBuffer();
 expect(new Uint8Array(bytes)).toEqual(Uint8Array.from(atob(data),c=>c.charCodeAt(0)));
});
test('older order backups remain unchanged',()=>{
 const content=exportBackup([order],now);
 expect(JSON.parse(content).version).toBe(1);
 expect(parseBackupDocument(content).photos).toBeUndefined();
});
test.each([
 {...photo,id:'other'}, {...photo,createdAt:'2026-11-11T20:00:00Z'},
 {...photo,type:'image/svg+xml'}, {...photo,rotation:4},
 {...photo,data:'bad!'}, {...photo,data:btoa('NOT AN IMAGE')},
])('rejects an invalid or mismatched receipt entry',bad=>{
 expect(()=>exportBackup([order],now,null,[],null,[bad as PackedReceiptPhoto])).toThrow();
});
test('no repeated photo and no image attached to an unknown order',()=>{
 expect(()=>validatePackedReceiptPhotos([photo,photo],[order])).toThrow();
 expect(()=>validatePackedReceiptPhotos([photo],[])).toThrow();
 const base=JSON.parse(exportBackup([order],now));
 expect(()=>parseBackupDocument(JSON.stringify({...base,photos:[photo]}))).toThrow(BackupError);
});
