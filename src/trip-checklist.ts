import type { Order } from './store';
import { dueDate, daysLeft, todayISO } from './deadline';
import { isCompleted, isCompletionTimestamp } from './completion';

export const SAVED_ORDERS_KEY = 'returnby.v1';
export const MAX_SAVED_BYTES = 2 * 1024 * 1024;
const MAX_ORDERS = 2000;

export class ChecklistError extends Error {
  constructor(message: string, readonly code: 'storage' | 'data' | 'selection' | 'date' | 'stale') {
    super(message);
    this.name = 'ChecklistError';
  }
}

export type SavedSnapshot = Readonly<{
  raw: string | null;
  orders: readonly Readonly<Order>[];
}>;
export type TripOrder = Readonly<{
  order: Readonly<Order>;
  due: string;
  tripTiming: string;
}>;
export type TripChecklist = Readonly<{
  tripDate: string;
  preparedOn: string;
  orders: readonly TripOrder[];
}>;
type Reader = Pick<Storage, 'getItem'>;

function readRaw(reader: Reader): string | null {
  try {
    return reader.getItem(SAVED_ORDERS_KEY);
  } catch {
    throw new ChecklistError('Saved orders could not be read. Allow this site to read browser storage, then choose Refresh saved orders. Your orders have not been changed.', 'storage');
  }
}

export function isSupportedDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && dueDate(value, 0) === value;
}

function badRow(index: number, detail: string): never {
  throw new ChecklistError('Saved order ' + (index + 1) + ' ' + detail + '. Return to the tracker to review it, then refresh here. This page has not changed the saved data.', 'data');
}

function textField(row: Record<string, unknown>, key: string, index: number, optional = false): string | undefined {
  const value = row[key];
  if (optional && value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > 4096) badRow(index, 'has an unreadable ' + key + ' field');
  return value;
}

/** Read-only admission for the existing Order records; never repairs or saves them. */
export function parseSavedOrders(raw: string | null): SavedSnapshot {
  if (raw === null) return Object.freeze({ raw, orders: Object.freeze([]) });
  if (new TextEncoder().encode(raw).byteLength > MAX_SAVED_BYTES) {
    throw new ChecklistError('The saved list is too large for this checklist (2 MiB maximum). Return to the tracker to review the list. Nothing has been changed.', 'data');
  }
  let value: unknown;
  try { value = JSON.parse(raw); } catch {
    throw new ChecklistError('The saved order data is not readable JSON. Return to the tracker to review it, then choose Refresh saved orders. Nothing has been changed.', 'data');
  }
  if (!Array.isArray(value) || value.length > MAX_ORDERS) {
    throw new ChecklistError('Saved orders must be a list of at most 2,000 records. Return to the tracker to review the data. Nothing has been changed.', 'data');
  }
  const ids = new Set<string>();
  const orders = value.map((item: unknown, index): Readonly<Order> => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) badRow(index, 'is not an order record');
    const row = item as Record<string, unknown>;
    const id = textField(row, 'id', index)!;
    if (!id || ids.has(id)) badRow(index, 'has a missing or repeated identifier');
    ids.add(id);
    const merchant = textField(row, 'merchant', index)!;
    const orderNo = textField(row, 'orderNo', index, true);
    const total = textField(row, 'total', index, true);
    const orderDate = textField(row, 'orderDate', index)!;
    if (!isSupportedDate(orderDate)) badRow(index, 'has an order date this tracker cannot calculate');
    const windowDays = row.windowDays;
    if (typeof windowDays !== 'number' || !Number.isSafeInteger(windowDays) || windowDays < 1
      || !isSupportedDate(dueDate(orderDate, windowDays))) {
      badRow(index, 'has a return window this tracker cannot calculate');
    }
    const windowSource = row.windowSource;
    if (windowSource !== 'policy' && windowSource !== 'default' && windowSource !== 'user') {
      badRow(index, 'has an unrecognized window source');
    }
    const createdAt = textField(row, 'createdAt', index)!;
    const completedAt = row.completedAt;
    if (completedAt !== undefined && !isCompletionTimestamp(completedAt)) {
      badRow(index, 'has an unsupported completion date');
    }
    return Object.freeze({ id, merchant, orderNo, total, orderDate, windowDays, windowSource, createdAt,
      ...(completedAt === undefined ? {} : { completedAt }) });
  });
  // Admit the complete saved collection before hiding completed returns.
  return Object.freeze({ raw, orders: Object.freeze(orders.filter(order => !isCompleted(order))) });
}

export function readSavedOrders(reader: Reader): SavedSnapshot {
  return parseSavedOrders(readRaw(reader));
}

export function assertSnapshotCurrent(snapshot: SavedSnapshot, reader: Reader): void {
  if (readRaw(reader) !== snapshot.raw) {
    throw new ChecklistError('Saved orders changed after this list was loaded. Choose Refresh saved orders, select your orders again and make a new preview before downloading.', 'stale');
  }
}

export const sourceLabel = (source: Order['windowSource']): string => ({
  policy: 'Saved policy window',
  default: 'Saved default window',
  user: 'User-adjusted window',
})[source];

export function tripTiming(due: string, tripDate: string): string {
  const left = daysLeft(due, tripDate);
  if (left < 0) return Math.abs(left) + (left === -1 ? ' day' : ' days') + ' after the calculated deadline';
  if (left === 0) return 'On the calculated deadline';
  return left + (left === 1 ? ' day' : ' days') + ' before the calculated deadline';
}

export function createChecklist(snapshot: SavedSnapshot, selectedIds: readonly string[], tripDate: string, preparedOn = todayISO()): TripChecklist {
  if (!isSupportedDate(tripDate) || !isSupportedDate(preparedOn)) {
    throw new ChecklistError('Choose a real planned trip date supported by this tracker (years 1000–9999).', 'date');
  }
  if (!selectedIds.length || new Set(selectedIds).size !== selectedIds.length) {
    throw new ChecklistError('Choose at least one saved order, with each order selected once.', 'selection');
  }
  const byId = new Map(snapshot.orders.map(order => [order.id, order]));
  const orders = selectedIds.map(id => {
    const order = byId.get(id);
    if (!order || isCompleted(order)) throw new ChecklistError('A selected order is no longer in this loaded list. Refresh saved orders and choose again.', 'selection');
    const due = dueDate(order.orderDate, order.windowDays);
    return Object.freeze({ order, due, tripTiming: tripTiming(due, tripDate) });
  }).sort((a, b) => a.due.localeCompare(b.due));
  return Object.freeze({ tripDate, preparedOn, orders: Object.freeze(orders) });
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

const saved = (value: string | undefined): string => value === undefined || value === ''
  ? '<span class="not-recorded">Not recorded</span>' : '<span class="saved-text">' + escapeHtml(value) + '</span>';

export function renderChecklist(checklist: TripChecklist): string {
  const count = checklist.orders.length;
  return '<article class="trip-sheet" aria-label="Return-trip checklist preview">'
    + '<header class="sheet-heading"><p class="sheet-eyebrow">RETURNBY / TAKE IT WITH YOU</p><h2>Return-trip checklist</h2>'
    + '<div class="sheet-meta"><p><span>PLANNED TRIP</span><strong>' + escapeHtml(checklist.tripDate) + '</strong></p>'
    + '<p><span>SELECTED ORDERS</span><strong>' + count + '</strong></p><p><span>PREPARED ON</span><strong>' + escapeHtml(checklist.preparedOn) + '</strong></p></div></header>'
    + '<p class="sheet-guidance">Check each store’s current return instructions before setting out. These dates use your saved windows; this sheet does not confirm that a return is eligible.</p>'
    + '<ol class="sheet-orders">' + checklist.orders.map(({ order, due, tripTiming: timing }, i) =>
      '<li class="sheet-order"><header><span class="sheet-number">' + String(i + 1).padStart(2, '0') + '</span><div><h3>' + saved(order.merchant) + '</h3><p class="sheet-order-ref">Order number: ' + saved(order.orderNo) + '</p></div></header>'
      + '<dl class="sheet-facts"><div><dt>Order date</dt><dd>' + escapeHtml(order.orderDate) + '</dd></div>'
      + '<div><dt>Saved order amount</dt><dd>' + saved(order.total) + '</dd></div>'
      + '<div><dt>Calculated deadline</dt><dd>' + escapeHtml(due) + '</dd></div>'
      + '<div><dt>Saved window</dt><dd>' + order.windowDays + ' days · ' + sourceLabel(order.windowSource) + '</dd></div></dl>'
      + '<p class="sheet-timing">' + escapeHtml(timing) + '</p>'
      + '<ul class="packing-checks"><li><span class="blank-check" aria-hidden="true"></span>Item, tags and packaging ready</li>'
      + '<li><span class="blank-check" aria-hidden="true"></span>Receipt or order confirmation ready</li>'
      + '<li><span class="blank-check" aria-hidden="true"></span>Store instructions and return arrangement checked</li></ul>'
      + '<div class="sheet-notes"><span>MY NOTES / DROP-OFF DETAILS</span><div></div><div></div></div></li>'
    ).join('') + '</ol>'
    + '<footer class="sheet-footer"><p>Amounts are copied literally from saved orders. They are not refund estimates and have not been added together.</p>'
    + '<p>Mark this sheet on paper. ReturnBy does not save trip plans, checklist marks or notes.</p></footer></article>';
}

export const CHECKLIST_SHEET_CSS = "\n.trip-sheet{background:#fffefa;border:1px solid #d7d7cc;border-radius:3px;padding:32px;color:#27362d;box-sizing:border-box;font-family:Arial,sans-serif}\n.trip-sheet *{box-sizing:border-box}\n.sheet-eyebrow{margin:0 0 15px;color:#516355;font-size:10px;font-weight:700;letter-spacing:.14em}\n.sheet-heading h2{font:normal 32px/1.12 Georgia,serif;margin:0 0 24px}\n.sheet-meta{display:grid;grid-template-columns:1.35fr 1fr 1.35fr;border-top:1px solid #7c8b7e;border-bottom:1px solid #d7d7cc;padding:14px 0;gap:16px}\n.sheet-meta p{margin:0}.sheet-meta span{display:block;font-size:9px;letter-spacing:.1em;font-weight:700;color:#626b61;margin-bottom:7px}.sheet-meta strong{font-size:17px;font-weight:600}\n.sheet-guidance{font-size:12px;line-height:1.65;color:#566154;margin:18px 0 22px}\n.sheet-orders{list-style:none;padding:0;margin:0}.sheet-order{padding:22px 0;border-top:1px solid #b7c1b4;break-inside:avoid}\n.sheet-order>header{display:flex;gap:13px;align-items:flex-start}.sheet-order>header>div{min-width:0}\n.sheet-number{display:flex;align-items:center;justify-content:center;flex:0 0 28px;height:28px;background:#e8eddf;font-size:10px;font-weight:700;border-radius:50%}\n.sheet-order h3{font:normal 24px/1.25 Georgia,serif;margin:0 0 5px;overflow-wrap:anywhere}\n.sheet-order-ref{font-size:11px;margin:0;color:#5a6258;overflow-wrap:anywhere}\n.saved-text{white-space:pre-wrap;overflow-wrap:anywhere}.not-recorded{font-style:italic;color:#60675e}\n.sheet-facts{display:grid;grid-template-columns:1fr 1fr;gap:12px 18px;margin:17px 0}\n.sheet-facts div{min-width:0}.sheet-facts dt{font-size:9px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:#6a7267;margin-bottom:5px}.sheet-facts dd{margin:0;font-size:12px;line-height:1.4;overflow-wrap:anywhere}\n.sheet-timing{margin:0 0 16px;font-size:11px;background:#eff1e7;border-left:2px solid #6a7b55;padding:8px 10px;line-height:1.5}\n.packing-checks{padding:0;margin:0;list-style:none;display:grid;gap:9px;font-size:12px;line-height:1.45}.packing-checks li{display:flex;align-items:flex-start;gap:8px}\n.blank-check{display:inline-block;width:13px;height:13px;border:1px solid #63705f;border-radius:2px;flex:0 0 13px;margin-top:2px}\n.sheet-notes{margin-top:18px;color:#798072;font-size:8px;font-weight:700;letter-spacing:.08em}.sheet-notes div{height:22px;border-bottom:1px solid #d8dccf}\n.sheet-footer{border-top:1px solid #aab5a4;padding-top:12px;font-size:10px;line-height:1.6;color:#626b5d}.sheet-footer p{margin:5px 0}\n@media(max-width:600px){.trip-sheet{padding:22px 18px}.sheet-heading h2{font-size:27px}.sheet-meta{gap:10px}.sheet-meta span{font-size:8px;letter-spacing:.04em}.sheet-meta strong{font-size:13px}.sheet-order h3{font-size:22px}.sheet-facts{gap:12px}.sheet-facts dd{font-size:11px}}\n@page{size:auto;margin:16mm}\n@media print{.trip-sheet{border:0;padding:0;background:white;box-shadow:none;max-width:none!important}.sheet-order{break-inside:avoid}.sheet-heading{break-after:avoid}.sheet-guidance{break-after:avoid}.sheet-footer{break-inside:avoid}.sheet-timing{background:transparent;border-left:1px solid #63705f}.sheet-meta strong{font-size:17px}.sheet-meta span{font-size:9px}.sheet-order h3{font-size:24px}.sheet-facts dd{font-size:12px}}\n";

export function buildChecklistHtml(checklist: TripChecklist): string {
  return '<!doctype html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<title>ReturnBy · Return trip ' + escapeHtml(checklist.tripDate) + '</title><style>'
    + CHECKLIST_SHEET_CSS + '\nbody{margin:0;background:#eeeae0;padding:30px 16px;color:#262d28;font-family:Arial,sans-serif}.trip-sheet{max-width:780px;margin:0 auto}.sheet-open-help{max-width:780px;margin:0 auto 18px;font-size:14px;line-height:1.6}@media print{body{padding:0;background:white}.sheet-open-help{display:none}}\n'
    + '</style></head><body><p class="sheet-open-help">Use your browser’s Print command to print this checklist. This file works offline and contains the selected saved order details.</p>'
    + renderChecklist(checklist) + '</body></html>\n';
}
