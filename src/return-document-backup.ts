import type {Order} from './store';
import {
  readMerchantDocuments, saveMerchantDocumentsBatch, supportedMerchantFile,
  type MerchantDocument,
} from './receipt-photo-archive';

export type PackedMerchantDocument = {
  id: string;
  createdAt: string;
  type: 'image/jpeg'|'image/png'|'image/webp'|'application/pdf';
  name: string;
  data: string;
};
function encode(bytes: Uint8Array): string {
  const parts: string[]=[];
  for(let i=0;i<bytes.length;i+=8192) parts.push(String.fromCharCode(...bytes.subarray(i,i+8192)));
  return btoa(parts.join(''));
}
function decode(data: string): Uint8Array {
  if(!data || data.length>24*1024*1024 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data))
    throw new Error('Merchant document has unreadable or excessive base64 content.');
  const raw=atob(data);
  if(btoa(raw)!==data)
    throw new Error('Merchant document binary content is not canonical.');
  return Uint8Array.from(raw,char=>char.charCodeAt(0));
}
const TYPES=['image/jpeg','image/png','image/webp','application/pdf'];

export function validatePackedMerchantDocuments(raw: unknown, orders: ReadonlyArray<Pick<Order,'id'|'createdAt'>>): PackedMerchantDocument[] {
  if(!Array.isArray(raw) || raw.length>orders.length) throw new Error('Merchant documents must match saved purchases.');
  const byId=new Map(orders.map(order=>[order.id,order.createdAt]));
  const seen=new Set<string>();
  const files:PackedMerchantDocument[]=[];
  for(const row of raw){
    if(!row || typeof row!=='object' || Array.isArray(row))throw new Error('Merchant document is not readable.');
    const item=row as Record<string,unknown>;
    if(Object.keys(item).some(key=>!['id','createdAt','type','name','data'].includes(key)) ||
      typeof item.id!=='string' || seen.has(item.id) || byId.get(item.id)!==item.createdAt ||
      typeof item.createdAt!=='string' || !TYPES.includes(item.type as string) ||
      typeof item.name!=='string' || !item.name.trim() || item.name.length>120 ||
      /[\\/\u0000-\u001f]/.test(item.name) || typeof item.data!=='string')
      throw new Error('Merchant document does not match a saved purchase or allowed format.');
    const bytes=decode(item.data);
    const blob=new Blob([new Uint8Array(bytes)],{type:item.type as string});
    const head=new Uint8Array(bytes.slice(0,16));
    const signature=item.type==='image/png' ? [137,80,78,71,13,10,26,10].every((b,i)=>head[i]===b)
      : item.type==='image/jpeg' ? head[0]===255&&head[1]===216&&head[2]===255
      : item.type==='image/webp' ? String.fromCharCode(...head.slice(0,4))==='RIFF'&&String.fromCharCode(...head.slice(8,12))==='WEBP'
      : String.fromCharCode(...head.slice(0,5))==='%PDF-';
    if(!signature || blob.size>16*1024*1024)throw new Error('Merchant document type does not match its binary content.');
    seen.add(item.id);
    files.push(item as PackedMerchantDocument);
  }
  return files;
}
export async function collectMerchantDocuments(orders: ReadonlyArray<Pick<Order,'id'|'createdAt'>>): Promise<PackedMerchantDocument[]> {
  if(typeof indexedDB==='undefined')return [];
  const files:PackedMerchantDocument[]=[];
  for(const row of await readMerchantDocuments(orders)){
    if(!await supportedMerchantFile(row.file))throw new Error('A saved merchant return document is damaged. Reattach the original before backing up.');
    files.push({id:row.id,createdAt:row.createdAt,type:row.file.type as PackedMerchantDocument['type'],name:row.name,data:encode(new Uint8Array(await row.file.arrayBuffer()))});
  }
  return files;
}
export async function restoreMerchantDocuments(files: ReadonlyArray<PackedMerchantDocument>, approved: ReadonlyArray<{id:string;createdAt:string;replace:boolean}>): Promise<number> {
  const allowed=new Map(approved.map(row=>[row.id,row]));
  const toRestore:{id:string;createdAt:string;file:Blob;name:string;replace:boolean}[]=[];
  for(const row of files){
    const match=allowed.get(row.id);
    if(!match || match.createdAt!==row.createdAt)continue;
    const bytes=decode(row.data);
    toRestore.push({id:row.id,createdAt:row.createdAt,file:new Blob([new Uint8Array(bytes)],{type:row.type}),name:row.name,replace:match.replace});
  }
  return saveMerchantDocumentsBatch(toRestore);
}
