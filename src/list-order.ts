export type ListOrder = 'deadline' | 'store';

type DeadlineRow = { readonly o: { readonly merchant: string }; readonly left: number };
const storeCollator = new Intl.Collator('en', { sensitivity: 'variant' });

function storeKey(merchant: string): string {
  return merchant.normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en-US');
}

/** Reorder the visible rows only; the caller retains the default deadline order. */
export function orderForDisplay<T extends DeadlineRow>(rows: readonly T[], order: ListOrder): T[] {
  if (order !== 'store') return [...rows];
  return rows.map(row => ({ row, key: storeKey(row.o.merchant) }))
    .sort((a, b) => {
      if (a.key === b.key) return a.row.left - b.row.left;
      if (!a.key) return 1;
      if (!b.key) return -1;
      // Distinct literal keys stay separate even when collation treats them alike.
      return storeCollator.compare(a.key, b.key) || (a.key < b.key ? -1 : 1);
    })
    .map(({ row }) => row);
}
