import type { Order } from './store';

export type ReceiptPhoto = { id: string; createdAt: string; photo: Blob; rotation: number; savedAt: string };
const DATABASE = 'returnby-receipt-photos';
const STORE = 'receipts';
const DOCUMENTS = 'merchant-documents';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('This browser cannot save receipt photographs.')); return; }
    const request = indexedDB.open(DATABASE, 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' });
      if (!request.result.objectStoreNames.contains(DOCUMENTS)) request.result.createObjectStore(DOCUMENTS, { keyPath: 'id' });
    };
    request.onerror = () => reject(request.error || new Error('Receipt photo storage is unavailable.'));
    request.onblocked = () => reject(new Error('Receipt photo storage is busy in another tab.'));
    request.onsuccess = () => resolve(request.result);
  });
}

async function transaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore, done: (value: T) => void) => void, storeName = STORE): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    let value: T;
    let transaction: IDBTransaction;
    try { transaction = db.transaction(storeName, mode); } catch (error) { db.close(); reject(error); return; }
    transaction.oncomplete = () => { db.close(); resolve(value); };
    transaction.onerror = () => { db.close(); reject(transaction.error || new Error('Receipt photo storage failed.')); };
    transaction.onabort = () => { db.close(); reject(transaction.error || new Error('Receipt photo storage was interrupted.')); };
    try { run(transaction.objectStore(storeName), result => { value = result; }); }
    catch (error) { transaction.abort(); reject(error); }
  });
}

export function saveOriginalReceipt(order: Pick<Order, 'id' | 'createdAt'>, photo: Blob, rotation = 0): Promise<void> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) || !photo.size || photo.size > 20 * 1024 * 1024) {
    return Promise.reject(new Error('Choose a JPG, PNG or WebP photograph up to 20 MB.'));
  }
  return transaction<void>('readwrite', store => {
    store.put({ id: order.id, createdAt: order.createdAt, photo, rotation: rotation % 4, savedAt: new Date().toISOString() } satisfies ReceiptPhoto);
  });
}

export function readOriginalReceipt(order: Pick<Order, 'id' | 'createdAt'>): Promise<ReceiptPhoto | undefined> {
  return transaction<ReceiptPhoto | undefined>('readonly', (store, done) => {
    const request = store.get(order.id);
    request.onsuccess = () => {
      const row = request.result as ReceiptPhoto | undefined;
      done(row?.createdAt === order.createdAt && row.photo instanceof Blob ? row : undefined);
    };
  });
}

export function readOriginalReceipts(orders: ReadonlyArray<Pick<Order, 'id' | 'createdAt'>>): Promise<ReceiptPhoto[]> {
  if (!orders.length) return Promise.resolve([]);
  const allowed = new Set(orders.map(order => order.id + '\u0000' + order.createdAt));
  return transaction<ReceiptPhoto[]>('readonly', (store, done) => {
    const results: ReceiptPhoto[] = [];
    const cursor = store.openCursor();
    cursor.onsuccess = () => {
      const entry = cursor.result;
      if (!entry) { done(results); return; }
      const record = entry.value as ReceiptPhoto;
      if (allowed.has(record.id + '\u0000' + record.createdAt) && record.photo instanceof Blob)
        results.push(record);
      entry.continue();
    };
  });
}

export function removeOriginalReceipt(order: Pick<Order, 'id' | 'createdAt'>): Promise<void> {
  // Never remove a photo belonging to another order that happens to share an ID.
  return transaction<void>('readwrite', (store) => {
    const request = store.get(order.id);
    request.onsuccess = () => {
      const row = request.result as ReceiptPhoto | undefined;
      if (row?.createdAt === order.createdAt) store.delete(order.id);
    };
  });
}

export function pruneOriginalReceipts(orders: ReadonlyArray<Pick<Order, 'id' | 'createdAt'>>): Promise<void> {
  const keep = new Set(orders.map(order => order.id + '\u0000' + order.createdAt));
  return transaction<void>('readwrite', store => {
    const cursor = store.openCursor();
    cursor.onsuccess = () => {
      const entry = cursor.result;
      if (!entry) return;
      const record = entry.value as ReceiptPhoto;
      if (!keep.has(record.id + '\u0000' + record.createdAt)) entry.delete();
      entry.continue();
    };
  });
}

// Restore all selected photographs in one IndexedDB transaction. Existing
// originals for unchanged purchases stay untouched; a deliberately replaced
// purchase may take its chosen backup photograph.
export function saveOriginalReceiptsBatch(
  records: ReadonlyArray<{id: string; createdAt: string; photo: Blob; rotation: number; replace: boolean}>,
): Promise<number> {
  if (!records.length) return Promise.resolve(0);
  for (const row of records)
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(row.photo.type) ||
        !row.photo.size || row.photo.size > 20 * 1024 * 1024)
      return Promise.reject(new Error('A backed-up receipt photograph is not supported.'));
  return transaction<number>('readwrite', (store, done) => {
    let remaining = records.length;
    let written = 0;
    for (const row of records) {
      const get = store.get(row.id);
      get.onsuccess = () => {
        const current = get.result as ReceiptPhoto | undefined;
        if (row.replace || !current || current.createdAt !== row.createdAt) {
          store.put({id: row.id, createdAt: row.createdAt, photo: row.photo, rotation: row.rotation,
            savedAt: new Date().toISOString()} satisfies ReceiptPhoto);
          written++;
        }
        if (--remaining === 0) done(written);
      };
    }
  });
}

// The original receipt and the merchant-issued return authorization are different
// documents. Keep them in separate stores, keyed by the order's immutable identity.
export type MerchantDocument = {id: string; createdAt: string; file: Blob; name: string; savedAt: string};
export const MERCHANT_DOCUMENT_TYPES = ['image/png','image/jpeg','image/webp','application/pdf'] as const;
export const MAX_MERCHANT_DOCUMENT_BYTES = 16 * 1024 * 1024;

export async function supportedMerchantFile(file: Blob): Promise<boolean> {
  if (!MERCHANT_DOCUMENT_TYPES.includes(file.type as typeof MERCHANT_DOCUMENT_TYPES[number]) ||
      !file.size || file.size > MAX_MERCHANT_DOCUMENT_BYTES) return false;
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (file.type === 'image/png') return [137,80,78,71,13,10,26,10].every((b,i) => head[i] === b);
  if (file.type === 'image/jpeg') return head[0] === 255 && head[1] === 216 && head[2] === 255;
  if (file.type === 'image/webp') return String.fromCharCode(...head.slice(0,4)) === 'RIFF'
    && String.fromCharCode(...head.slice(8,12)) === 'WEBP';
  return String.fromCharCode(...head.slice(0,5)) === '%PDF-';
}

export async function saveMerchantDocument(order: Pick<Order,'id'|'createdAt'>, file: Blob, name: string): Promise<void> {
  if (!await supportedMerchantFile(file)) throw new Error('Choose an actual JPG, PNG, WebP or PDF document up to 16 MB.');
  const cleanName = name.replace(/[\\/\u0000-\u001f]/g, '').trim().slice(0, 120);
  if (!cleanName) throw new Error('The merchant document needs a filename.');
  return transaction<void>('readwrite', store => {
    store.put({id:order.id, createdAt:order.createdAt, file, name:cleanName, savedAt:new Date().toISOString()} satisfies MerchantDocument);
  }, DOCUMENTS);
}

export function readMerchantDocument(order: Pick<Order,'id'|'createdAt'>): Promise<MerchantDocument|undefined> {
  return transaction<MerchantDocument|undefined>('readonly', (store, done) => {
    const request=store.get(order.id);
    request.onsuccess=()=>{
      const row=request.result as MerchantDocument|undefined;
      done(row?.createdAt === order.createdAt && row.file instanceof Blob ? row : undefined);
    };
  }, DOCUMENTS);
}

export function readMerchantDocuments(orders: ReadonlyArray<Pick<Order,'id'|'createdAt'>>): Promise<MerchantDocument[]> {
  if (!orders.length) return Promise.resolve([]);
  const allowed=new Set(orders.map(order=>order.id+'\u0000'+order.createdAt));
  return transaction<MerchantDocument[]>('readonly',(store,done)=>{
    const docs:MerchantDocument[]=[];
    const request=store.openCursor();
    request.onsuccess=()=>{
      const cursor=request.result;
      if(!cursor){done(docs);return;}
      const row=cursor.value as MerchantDocument;
      if(allowed.has(row.id+'\u0000'+row.createdAt) && row.file instanceof Blob) docs.push(row);
      cursor.continue();
    };
  },DOCUMENTS);
}

export function removeMerchantDocument(order: Pick<Order,'id'|'createdAt'>): Promise<void> {
  return transaction<void>('readwrite',store=>{
    const request=store.get(order.id);
    request.onsuccess=()=>{
      const row=request.result as MerchantDocument|undefined;
      if(row?.createdAt===order.createdAt) store.delete(order.id);
    };
  },DOCUMENTS);
}

export function pruneMerchantDocuments(orders: ReadonlyArray<Pick<Order,'id'|'createdAt'>>): Promise<void> {
  const keep=new Set(orders.map(o=>o.id+'\u0000'+o.createdAt));
  return transaction<void>('readwrite',store=>{
    const request=store.openCursor();
    request.onsuccess=()=>{
      const cursor=request.result;
      if(!cursor)return;
      const row=cursor.value as MerchantDocument;
      if(!keep.has(row.id+'\u0000'+row.createdAt))cursor.delete();
      cursor.continue();
    };
  },DOCUMENTS);
}

export async function saveMerchantDocumentsBatch(records: ReadonlyArray<{id:string;createdAt:string;file:Blob;name:string;replace:boolean}>): Promise<number> {
  for(const row of records) if(!await supportedMerchantFile(row.file))
    throw new Error('A saved merchant document has an unsupported type or content.');
  if(!records.length)return 0;
  return transaction<number>('readwrite',(store,done)=>{
    let remaining=records.length,written=0;
    for(const row of records){
      const request=store.get(row.id);
      request.onsuccess=()=>{
        const current=request.result as MerchantDocument|undefined;
        if(row.replace || !current || current.createdAt !== row.createdAt){
          store.put({id:row.id, createdAt:row.createdAt,file:row.file,name:row.name,savedAt:new Date().toISOString()} satisfies MerchantDocument);
          written++;
        }
        if(--remaining===0)done(written);
      };
    }
  },DOCUMENTS);
}
