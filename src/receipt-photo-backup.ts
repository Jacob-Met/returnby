import type { Order } from './store';
import { readOriginalReceipts, saveOriginalReceiptsBatch } from './receipt-photo-archive';

export const MAX_PHOTO_BACKUP_BYTES = 96 * 1024 * 1024;
const MAX_PHOTO_BYTES = 20 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type PackedReceiptPhoto = {
  id: string;
  createdAt: string;
  type: typeof TYPES[number];
  rotation: number;
  data: string;
};

function binaryToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += 8192)
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
  return btoa(chunks.join(''));
}

function bytesFromBase64(encoded: string): Uint8Array {
  if (!encoded || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))
    throw new Error('A backed-up receipt photo is not valid base64.');
  const estimatedBytes = encoded.length / 4 * 3 - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0);
  if (!estimatedBytes || estimatedBytes > MAX_PHOTO_BYTES)
    throw new Error('A backed-up receipt photo exceeds the 20 MiB image limit.');
  const raw = atob(encoded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  if (btoa(raw) !== encoded) throw new Error('A backed-up receipt photo is not canonical base64.');
  return bytes;
}

function hasSignature(type: PackedReceiptPhoto['type'], bytes: Uint8Array): boolean {
  if (type === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === 'image/png') return bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((byte, i) => bytes[i] === byte);
  return bytes.length >= 12 && String.fromCharCode(...bytes.subarray(0,4)) === 'RIFF' &&
    String.fromCharCode(...bytes.subarray(8,12)) === 'WEBP';
}

export function unpackReceiptPhoto(photo: PackedReceiptPhoto): Blob {
  const bytes = bytesFromBase64(photo.data);
  if (!hasSignature(photo.type, bytes))
    throw new Error('A backed-up receipt photo does not match its image type.');
  return new Blob([new Uint8Array(bytes)], {type: photo.type});
}

export function validatePackedReceiptPhotos(raw: unknown, orders: ReadonlyArray<Pick<Order, 'id' | 'createdAt'>>): PackedReceiptPhoto[] {
  if (!Array.isArray(raw) || raw.length > orders.length)
    throw new Error('Backup receipt photos must match saved purchases.');
  const byId = new Map(orders.map(order => [order.id, order.createdAt]));
  const seen = new Set<string>();
  return raw.map((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('Receipt photo ' + (index + 1) + ' is not readable.');
    const row = value as Record<string, unknown>;
    if (Object.keys(row).some(key => !['id','createdAt','type','rotation','data'].includes(key)) ||
        typeof row.id !== 'string' || seen.has(row.id) ||
        typeof row.createdAt !== 'string' || byId.get(row.id) !== row.createdAt ||
        !TYPES.includes(row.type as PackedReceiptPhoto['type']) ||
        !Number.isInteger(row.rotation) || (row.rotation as number) < 0 || (row.rotation as number) > 3 ||
        typeof row.data !== 'string')
      throw new Error('Receipt photo ' + (index + 1) + ' does not match its saved purchase or supported image format.');
    const photo = row as PackedReceiptPhoto;
    unpackReceiptPhoto(photo);
    seen.add(photo.id);
    return {id: photo.id, createdAt: photo.createdAt, type: photo.type, rotation: photo.rotation, data: photo.data};
  });
}

export async function collectReceiptPhotos(orders: ReadonlyArray<Pick<Order, 'id' | 'createdAt'>>): Promise<PackedReceiptPhoto[]> {
  // An environment without IndexedDB cannot have saved local receipt photos.
  // If IndexedDB exists but cannot be opened, let the error stop the download.
  if (typeof indexedDB === 'undefined') return [];
  const photos: PackedReceiptPhoto[] = [];
  let bytes = 5 * 1024 * 1024; // Leave room for normalized purchases, trips and envelope.
  for (const record of await readOriginalReceipts(orders)) {
    const data = binaryToBase64(await record.photo.arrayBuffer());
    bytes += data.length + 512;
    if (bytes > MAX_PHOTO_BACKUP_BYTES)
      throw new Error('Receipt photos exceed the 96 MiB backup limit. Save some originals separately before making this backup.');
    photos.push({
      id: record.id,
      createdAt: record.createdAt,
      type: record.photo.type as PackedReceiptPhoto['type'],
      rotation: record.rotation,
      data,
    });
  }
  return photos;
}

export async function restoreReceiptPhotos(
  records: ReadonlyArray<PackedReceiptPhoto>,
  approved: ReadonlyArray<{id: string; createdAt: string; replace: boolean}>,
): Promise<number> {
  const allowed = new Map(approved.map(order => [order.id, order]));
  const restores = records.filter(row => allowed.get(row.id)?.createdAt === row.createdAt).map(row => {
    const order = allowed.get(row.id)!;
    return {id: row.id, createdAt: row.createdAt, photo: unpackReceiptPhoto(row), rotation: row.rotation, replace: order.replace};
  });
  return saveOriginalReceiptsBatch(restores);
}
