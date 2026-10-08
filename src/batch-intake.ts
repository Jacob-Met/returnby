import { parse } from './parse';
import { knownMerchants, lookup } from './policy';
import { dueDate } from './deadline';
import { save, type Order } from './store';
import { isSupportedDate, parseSavedOrders, SAVED_ORDERS_KEY } from './trip-checklist';

export const MAX_BATCH_ORDERS = 20;
export const MAX_CONFIRMATION_BYTES = 100 * 1024;
export const MAX_BATCH_BYTES = 1024 * 1024;
const bytes = (text: string) => new TextEncoder().encode(text).byteLength;

export type DraftFields = {
  merchant: string;
  orderNo: string;
  total: string;
  orderDate: string;
  windowDays: string;
};
export type BatchDraft = {
  id: string;
  label: string;
  text: string;
  fields: DraftFields;
  found: ReturnType<typeof parse>['found'];
  reviewed: boolean;
};
export type Confirmation = { label: string; text: string };
export type DuplicateNotice = Readonly<{ draftId: string; label: string; match: string }>;
export type BatchReview = Readonly<{
  snapshotRaw: string | null;
  existingCount: number;
  draftIds: readonly string[];
  orders: readonly Readonly<Order>[];
  duplicates: readonly DuplicateNotice[];
  nextRaw: string;
}>;
type Reader = Pick<Storage, 'getItem'>;

export class BatchIntakeError extends Error {
  constructor(message: string, readonly field?: keyof DraftFields, readonly draftId?: string) {
    super(message);
    this.name = 'BatchIntakeError';
  }
}

export function appendConfirmations(
  current: readonly BatchDraft[], incoming: readonly Confirmation[],
  makeId: () => string = () => crypto.randomUUID(),
): BatchDraft[] {
  if (!incoming.length) throw new BatchIntakeError('Choose at least one plain-text confirmation.');
  if (current.length + incoming.length > MAX_BATCH_ORDERS) {
    throw new BatchIntakeError('Keep at most 20 confirmations in one batch. Existing drafts are still here.');
  }
  let totalBytes = current.reduce((sum, draft) => sum + bytes(draft.text), 0);
  const ids = new Set(current.map(draft => draft.id));
  const additions = incoming.map(input => {
    if (typeof input.label !== 'string' || input.label.length > 256
      || typeof input.text !== 'string' || !input.text.trim() || input.text.includes('\0')) {
      throw new BatchIntakeError('Each confirmation must be nonempty plain text, with a name of at most 256 characters.');
    }
    const size = bytes(input.text);
    if (size > MAX_CONFIRMATION_BYTES) {
      throw new BatchIntakeError(input.label + ' is larger than the 100 KiB limit. Existing drafts are still here.');
    }
    totalBytes += size;
    if (totalBytes > MAX_BATCH_BYTES) {
      throw new BatchIntakeError('The batch exceeds 1 MiB of confirmation text. Existing drafts are still here.');
    }
    const id = makeId();
    if (typeof id !== 'string' || !id || ids.has(id)) {
      throw new BatchIntakeError('A distinct draft identifier could not be created. Try adding the confirmations again.');
    }
    ids.add(id);
    const parsed = parse(input.text, knownMerchants);
    const policy = lookup(parsed.merchant);
    return {
      id, label: input.label, text: input.text, found: parsed.found, reviewed: false,
      fields: {
        merchant: parsed.merchant, orderNo: parsed.orderNo, total: parsed.total,
        orderDate: parsed.orderDate, windowDays: String(policy.days),
      },
    };
  });
  return [...current, ...additions];
}

/** Validate the fields a person reviewed; extraction is never approval. */
export function validateDraft(draft: BatchDraft): Omit<Order, 'id' | 'createdAt'> {
  const fields = draft.fields;
  for (const name of ['merchant', 'orderNo', 'total', 'orderDate', 'windowDays'] as const) {
    if (typeof fields[name] !== 'string' || fields[name].length > 4096) {
      throw new BatchIntakeError('Use text of at most 4,096 characters for each field.', name, draft.id);
    }
  }
  if (!isSupportedDate(fields.orderDate)) {
    throw new BatchIntakeError('Choose a real order date supported by this tracker (years 1000–9999).', 'orderDate', draft.id);
  }
  const windowDays = Number(fields.windowDays);
  let supportedWindow = false;
  if (fields.windowDays.trim() && Number.isSafeInteger(windowDays) && windowDays > 0) {
    try {
      const due = dueDate(fields.orderDate, windowDays);
      supportedWindow = isSupportedDate(due) && isSupportedDate(dueDate(due, 1));
    } catch { /* An out-of-range native date is an unreviewable window. */ }
  }
  if (!supportedWindow) {
    throw new BatchIntakeError('Choose a positive whole-day window with a deadline the tracker can calculate and export.', 'windowDays', draft.id);
  }
  const policy = lookup(fields.merchant);
  return {
    merchant: fields.merchant, orderNo: fields.orderNo, total: fields.total,
    orderDate: fields.orderDate, windowDays,
    windowSource: windowDays === policy.days ? policy.source : 'user',
  };
}

function readRaw(reader: Reader): string | null {
  try { return reader.getItem(SAVED_ORDERS_KEY); } catch {
    throw new BatchIntakeError('Saved orders could not be read. Keep your drafts and try Review selection again after browser storage is available.');
  }
}

function identity(order: Pick<Order, 'merchant' | 'orderNo'>): string | null {
  const merchant = order.merchant.trim().toLowerCase();
  const number = (order.orderNo ?? '').trim().toLowerCase();
  return merchant && number ? JSON.stringify([merchant, number]) : null;
}

const preparedReviews = new WeakSet<BatchReview>();

export function prepareBatch(
  drafts: readonly BatchDraft[], reader: Reader,
  options: { makeId?: () => string; now?: () => Date } = {},
): BatchReview {
  const selected = drafts.filter(draft => draft.reviewed);
  if (!selected.length || selected.length > MAX_BATCH_ORDERS
    || new Set(selected.map(draft => draft.id)).size !== selected.length) {
    throw new BatchIntakeError('Review and select between 1 and 20 distinct confirmations first.');
  }
  const approved = selected.map(validateDraft);
  const snapshotRaw = readRaw(reader);
  let snapshot;
  try { snapshot = parseSavedOrders(snapshotRaw); } catch (error) {
    throw new BatchIntakeError('The complete saved list could not be admitted. '
      + (error instanceof Error ? error.message : String(error)));
  }
  const createdAt = (options.now?.() ?? new Date()).toISOString();
  const makeId = options.makeId ?? (() => crypto.randomUUID());
  const ids = new Set(snapshot.orders.map(order => order.id));
  const orders = approved.map(fields => {
    const id = makeId();
    if (typeof id !== 'string' || !id || ids.has(id)) {
      throw new BatchIntakeError('A distinct saved-order identifier could not be created. Review the selection again.');
    }
    ids.add(id);
    return Object.freeze({ ...fields, id, createdAt });
  });
  const seen = new Map<string, string[]>();
  for (const order of snapshot.orders) {
    const key = identity(order);
    if (key) seen.set(key, [...(seen.get(key) ?? []), 'saved order ' + (order.orderNo || order.id)]);
  }
  const duplicates: DuplicateNotice[] = [];
  for (let i = 0; i < orders.length; i++) {
    const key = identity(orders[i]);
    if (!key) continue;
    const matches = seen.get(key) ?? [];
    if (matches.length) duplicates.push(Object.freeze({
      draftId: selected[i].id, label: selected[i].label, match: matches.join(', '),
    }));
    seen.set(key, [...matches, 'confirmation ' + selected[i].label]);
  }
  // Keep full existing JSON objects, not the strict reader's core-field projection.
  // The existing writer persists JSON values; it does not preserve whitespace or key spelling.
  const existing: Order[] = snapshotRaw === null ? [] : JSON.parse(snapshotRaw);
  const nextRaw = JSON.stringify([...existing, ...orders]);
  try { parseSavedOrders(nextRaw); } catch (error) {
    throw new BatchIntakeError('The complete appended list cannot be saved by this page. '
      + (error instanceof Error ? error.message : String(error)));
  }
  const review = Object.freeze({
    snapshotRaw, existingCount: snapshot.orders.length,
    draftIds: Object.freeze(selected.map(draft => draft.id)),
    orders: Object.freeze(orders), duplicates: Object.freeze(duplicates), nextRaw,
  });
  preparedReviews.add(review);
  return review;
}

/** One existing native write after an exact optimistic reread; this is not a lock. */
export function commitBatch(
  review: BatchReview, reader: Reader, duplicatesAcknowledged = false,
  writer: (orders: Order[]) => void = save,
): readonly string[] {
  if (!preparedReviews.has(review)) throw new BatchIntakeError('Make a fresh selection preview before saving.');
  if (review.duplicates.length && !duplicatesAcknowledged) {
    throw new BatchIntakeError('Review the possible matching store and order numbers, then acknowledge them before saving.');
  }
  if (readRaw(reader) !== review.snapshotRaw) {
    throw new BatchIntakeError('Saved orders changed after this preview. Nothing was added. Choose Review selection again to inspect the current list.');
  }
  try { writer(JSON.parse(review.nextRaw)); } catch {
    throw new BatchIntakeError('The batch could not be saved. Your drafts and preview remain here. Retry Save after browser storage is available.');
  }
  preparedReviews.delete(review);
  return review.draftIds;
}
