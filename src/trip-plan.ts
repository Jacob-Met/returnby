import { isCompleted } from './completion';
import { todayISO } from './deadline';
import { isSupportedDate, type SavedSnapshot, type TripPacking } from './trip-checklist';
import type { Order } from './store';

export const TRIP_PLAN_KEY = 'returnby.trip-plan.v1';
export type PlannedOrder = TripPacking & {
  id: string;
  selected: boolean;
  merchant: string;
  orderNo: string;
  signature: string;
};
export type TripPlan = {
  version: 1;
  tripDate: string;
  orders: PlannedOrder[];
};
type StorageReader = Pick<Storage, 'getItem'>;
type StorageWriter = Pick<Storage, 'getItem' | 'setItem'>;

export class TripPlanError extends Error {
  constructor(message: string, readonly code: 'read' | 'write' | 'conflict') {
    super(message);
    this.name = 'TripPlanError';
  }
}
export const emptyTripPlan = (tripDate = todayISO()): TripPlan => ({ version: 1, tripDate, orders: [] });
export function orderSignature(order: Readonly<Order>): string {
  return JSON.stringify([order.merchant, order.orderNo || '', order.orderDate, order.windowStartDate || '', order.windowDays, order.windowSource, order.createdAt, ...(order.items ? [order.items] : [])]);
}
function savedItemSignature(signature: string): string {
  try { return JSON.stringify(JSON.parse(signature)[7] ?? null); } catch { return ''; }
}
export function planOrder(order: Readonly<Order>): PlannedOrder {
  return {
    id: order.id, selected: true, merchant: order.merchant, orderNo: order.orderNo || '',
    signature: orderSignature(order), packed: false, receiptReady: false,
    instructionsChecked: false, notes: '',
  };
}
export function readTripPlan(reader: StorageReader): { plan: TripPlan | null; raw: string | null } {
  let raw: string | null;
  try { raw = reader.getItem(TRIP_PLAN_KEY); }
  catch { throw new TripPlanError('Your saved trip could not be read. You can keep planning in this tab; try loading the saved trip again before closing.', 'read'); }
  if (raw === null) return { plan: null, raw };
  try {
    const value = JSON.parse(raw);
    if (!value || value.version !== 1 || typeof value.tripDate !== 'string'
      || (value.tripDate !== '' && !isSupportedDate(value.tripDate)) || !Array.isArray(value.orders)) throw new Error();
    const ids = new Set<string>();
    const orders: PlannedOrder[] = value.orders.map((entry: unknown) => {
      if (!entry || typeof entry !== 'object') throw new Error();
      const row = entry as Record<string, unknown>;
      for (const key of ['id', 'merchant', 'orderNo', 'signature', 'notes']) {
        if (typeof row[key] !== 'string') throw new Error();
      }
      for (const key of ['selected', 'packed', 'receiptReady', 'instructionsChecked']) {
        if (typeof row[key] !== 'boolean') throw new Error();
      }
      if (!row.id || ids.has(row.id as string)) throw new Error();
      ids.add(row.id as string);
      return {
        id: row.id as string, merchant: row.merchant as string, orderNo: row.orderNo as string,
        signature: row.signature as string, notes: row.notes as string,
        selected: row.selected as boolean, packed: row.packed as boolean,
        receiptReady: row.receiptReady as boolean, instructionsChecked: row.instructionsChecked as boolean,
      };
    });
    return { raw, plan: { version: 1, tripDate: value.tripDate, orders } };
  } catch {
    throw new TripPlanError('Your saved trip could not be opened. It has been left unchanged. Load it again, or choose Start a new trip to replace it.', 'read');
  }
}
/** Keep packing work, but always take order facts from the current tracker. */
export function alignTripPlan(plan: TripPlan, snapshot: SavedSnapshot): {
  plan: TripPlan; changed: string[]; unavailable: PlannedOrder[];
} {
  const current = new Map(snapshot.orders.filter(order => !isCompleted(order)).map(order => [order.id, order]));
  const changed: string[] = [];
  const unavailable: PlannedOrder[] = [];
  const orders = plan.orders.map(entry => {
    const order = current.get(entry.id);
    if (!order) {
      const retained = { ...entry, selected: false };
      unavailable.push(retained);
      return retained;
    }
    const signature = orderSignature(order);
    if (signature !== entry.signature) {
      changed.push(order.merchant || entry.merchant || 'Unnamed store');
      return { ...entry, merchant: order.merchant, orderNo: order.orderNo || '', signature, packed: savedItemSignature(signature) === savedItemSignature(entry.signature) ? entry.packed : false, instructionsChecked: false };
    }
    return { ...entry };
  });
  return { plan: { ...plan, orders }, changed, unavailable };
}
/** Detect another planner tab before replacing its work. Never writes saved orders. */
export function saveTripPlan(writer: StorageWriter, plan: TripPlan, expectedRaw: string | null): string {
  let current: string | null;
  try { current = writer.getItem(TRIP_PLAN_KEY); }
  catch { throw new TripPlanError('This trip is only open in this tab. Browser storage is unavailable; retry saving before closing.', 'write'); }
  if (current !== expectedRaw) throw new TripPlanError('This trip changed in another tab. Load the saved trip, or keep this tab’s trip instead.', 'conflict');
  const raw = JSON.stringify(plan);
  try { writer.setItem(TRIP_PLAN_KEY, raw); }
  catch { throw new TripPlanError('This trip is only open in this tab. It could not be saved on this device; retry saving before closing.', 'write'); }
  return raw;
}
