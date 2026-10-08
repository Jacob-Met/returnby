import type { Order } from './store';

export type CompletionAction = 'complete' | 'reopen';
export class CompletionError extends Error {}

/** A missing marker is the legacy open state. Present markers fail closed. */
export const isCompleted = (order: Pick<Order, 'completedAt'>): boolean => order.completedAt !== undefined;

export function isCompletionTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 35 ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
      Number(value.slice(0, 4)) < 1000 || Number(value.slice(11, 13)) > 23 || !Number.isFinite(Date.parse(value))) return false;
  const day = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === value.slice(0, 10);
}

function reviewedOrder(current: readonly Order[], displayed: Order | undefined): Order {
  const matches = displayed ? current.filter(order => order.id === displayed.id) : [];
  if (!displayed || matches.length !== 1 || JSON.stringify(matches[0]) !== JSON.stringify(displayed)) {
    throw new CompletionError('This saved return changed or could not be selected. Review the refreshed tracker before trying again.');
  }
  const saved = matches[0];
  if (isCompleted(saved) && !isCompletionTimestamp(saved.completedAt)) {
    throw new CompletionError('This return has an unsupported completion date. Its saved details were kept.');
  }
  return saved;
}

/** Plan against the freshly read list; the caller still owns its existing write path. */
export function planCompletion(
  current: readonly Order[], displayed: Order | undefined, action: CompletionAction, now = new Date(),
): { next: Order[]; order: Order; changed: boolean } {
  const saved = reviewedOrder(current, displayed);
  if (action !== 'complete' && action !== 'reopen') throw new CompletionError('Choose Complete or Reopen.');
  const completed = action === 'complete';
  if (isCompleted(saved) === completed) return { next: [...current], order: saved, changed: false };
  const nextOrder = { ...saved };
  if (completed) {
    if (!Number.isFinite(now.getTime()) || !isCompletionTimestamp(now.toISOString())) {
      throw new CompletionError('The completion date could not be read. Your saved return was kept.');
    }
    nextOrder.completedAt = now.toISOString();
  } else {
    delete nextOrder.completedAt;
  }
  return { next: current.map(order => order === saved ? nextOrder : order), order: nextOrder, changed: true };
}

/** Single-reminder actions must not use an obsolete card after completion. */
export function reviewedOpenReturn(current: readonly Order[], displayed: Order | undefined): Order {
  const saved = reviewedOrder(current, displayed);
  if (isCompleted(saved)) throw new CompletionError('This return is completed. Reopen it before creating a new reminder.');
  return saved;
}
