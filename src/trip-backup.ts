import { alignTripPlan, type TripPlan } from './trip-plan';
import { isSupportedDate } from './trip-checklist';
import type { Order } from './store';

export class TripBackupError extends Error {}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TripBackupError('The backup trip is not a readable plan.');
  return value as Record<string, unknown>;
}
function shape(row: Record<string, unknown>, keys: string[]) {
  if (Object.keys(row).some(key => !keys.includes(key))) throw new TripBackupError('The backup trip contains unsupported details.');
}
export function parsePortableTrip(input: unknown): TripPlan {
  const value = record(input);
  shape(value, ['version', 'tripDate', 'orders']);
  if (value.version !== 1 || (value.tripDate !== '' && !isSupportedDate(value.tripDate)) ||
      typeof value.tripDate !== 'string' || !Array.isArray(value.orders) || value.orders.length > 2000) {
    throw new TripBackupError('The backup trip has an unsupported date or order list.');
  }
  const ids = new Set<string>();
  const orders = value.orders.map(item => {
    const row = record(item);
    shape(row, ['id', 'selected', 'merchant', 'orderNo', 'signature', 'packed', 'receiptReady', 'instructionsChecked', 'notes']);
    const field = (key: string, max = 4096): string => {
      if (typeof row[key] !== 'string' || (row[key] as string).length > max) throw new TripBackupError('A backup trip detail is missing or too long.');
      return row[key] as string;
    };
    const flag = (key: string): boolean => {
      if (typeof row[key] !== 'boolean') throw new TripBackupError('A backup trip packing check is not valid.');
      return row[key] as boolean;
    };
    const id = field('id',128);
    if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(id) || ids.has(id)) throw new TripBackupError('The backup trip has a missing or repeated order ID.');
    ids.add(id);
    return { id, merchant:field('merchant'), orderNo:field('orderNo'), signature:field('signature',32768),
      notes:field('notes',8192), selected:flag('selected'), packed:flag('packed'),
      receiptReady:flag('receiptReady'), instructionsChecked:flag('instructionsChecked') };
  });
  return { version:1, tripDate:value.tripDate, orders };
}
export function prepareTripRestore(input: unknown, currentOrders: readonly Order[]) {
  const plan = parsePortableTrip(input);
  const aligned = alignTripPlan(plan, {raw:null, orders:currentOrders});
  return { ...aligned, selected:aligned.plan.orders.filter(order=>order.selected).length };
}
