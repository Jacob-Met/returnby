import { createSavedReturnsCsv, SAVED_CSV_COLUMNS, type SavedReturnsCsv } from '../ae0a1ea0b247-returnby-csv/src/saved-returns-csv';
import type { Order } from '../ae0a1ea0b247-returnby-csv/src/store';

declare const currentStore: unknown;
declare const savedOrders: Order[];
const unknownResult: SavedReturnsCsv = createSavedReturnsCsv(currentStore, new Date());
const typedResult: SavedReturnsCsv = createSavedReturnsCsv(savedOrders);
const count: number = unknownResult.count;
const exactBytes: number = typedResult.bytes;
const protectedCells: number = typedResult.protectedCells;
const content: string = unknownResult.content;
const filename: string = unknownResult.filename;
const firstColumn: 'Saved return ID' = SAVED_CSV_COLUMNS[0];
// The consumer must not be allowed to silently weaken the published result.
// @ts-expect-error Counts are numeric, not preformatted text.
const invalidCount: string = unknownResult.count;
// @ts-expect-error The declared column tuple is immutable.
SAVED_CSV_COLUMNS.push('Unexpected column');
void [count, exactBytes, protectedCells, content, filename, firstColumn, invalidCount];
