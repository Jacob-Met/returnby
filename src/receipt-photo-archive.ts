import type { Order } from './store';

export type ReceiptPhoto = { id: string; createdAt: string; photo: Blob; rotation: number; savedAt: string };
const DATABASE = 'returnby-receipt-photos';
const STORE = 'receipts';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('This browser cannot save receipt photographs.')); return; }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onerror = () => reject(request.error || new Error('Receipt photo storage is unavailable.'));
    request.onblocked = () => reject(new Error('Receipt photo storage is busy in another tab.'));
    request.onsuccess = () => resolve(request.result);
  });
}

async function transaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore, done: (value: T) => void) => void): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    let value: T;
    let transaction: IDBTransaction;
    try { transaction = db.transaction(STORE, mode); } catch (error) { db.close(); reject(error); return; }
    transaction.oncomplete = () => { db.close(); resolve(value); };
    transaction.onerror = () => { db.close(); reject(transaction.error || new Error('Receipt photo storage failed.')); };
    transaction.onabort = () => { db.close(); reject(transaction.error || new Error('Receipt photo storage was interrupted.')); };
    try { run(transaction.objectStore(STORE), result => { value = result; }); }
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
