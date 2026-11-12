import { returnDueDate } from './deadline';

/** A second date is actionable only if the first date is the carrier cutoff. */
export function validMerchantArrivalDeadline(value: unknown, requirement: DeadlineRequirement | undefined, due: string): boolean {
  if (value === undefined || value === '') return true;
  if (requirement !== 'ship-by' || typeof value !== 'string'
    || !/^\d{4}-\d{2}-\d{2}$/.test(value) || +value.slice(0,4) < 1000
    || value < due || value >= '9999-12-31') return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}
export const hasValidMerchantArrivalDeadline = (order: {
  merchantArrivalDeadline?: unknown; deadlineRequirement?: DeadlineRequirement;
  orderDate: string; windowStartDate?: string; windowDays: number;
}): boolean => validMerchantArrivalDeadline(order.merchantArrivalDeadline, order.deadlineRequirement, returnDueDate(order));

/** The shopper's understanding of a retailer's action deadline; not retailer verification. */
export type DeadlineRequirement = 'ship-by' | 'drop-off-by' | 'arrive-by';
export function validDeadlineRequirement(value: unknown): value is DeadlineRequirement {
  return value === 'ship-by' || value === 'drop-off-by' || value === 'arrive-by';
}
export function deadlinePhrase(value?: DeadlineRequirement): string {
  if (value === 'ship-by') return 'Ship by';
  if (value === 'drop-off-by') return 'Drop off by';
  if (value === 'arrive-by') return 'Merchant must receive by';
  return 'Return by';
}
export function deadlineCalendarTitle(value?: DeadlineRequirement): string {
  if (value === 'ship-by') return 'Ship by';
  if (value === 'drop-off-by') return 'Drop off by';
  if (value === 'arrive-by') return 'Merchant receipt deadline';
  return 'Return deadline';
}
export function deadlineCaution(value?: DeadlineRequirement): string {
  if (value === 'ship-by') return 'The carrier must accept the parcel by this date. Check the retailer rules.';
  if (value === 'drop-off-by') return 'Hand the item to the stated store or drop-off point by this date. Check the retailer rules.';
  if (value === 'arrive-by') return 'The merchant must receive the return by this date. Allow transit time before shipping.';
  return 'Confirm the retailer’s exact return instructions before going.';
}
export function deadlineOptions(selected = ''): string {
  return [
    ['', 'Return by (general deadline)'],
    ['ship-by', 'Ship by (carrier handoff)'],
    ['drop-off-by', 'Drop off by (store or drop-off point)'],
    ['arrive-by', 'Merchant must receive by (allow shipping time)'],
  ].map(([value,label])=>'<option value="'+value+'"'+(value===selected?' selected':'')+'>'+label+'</option>').join('');
}
