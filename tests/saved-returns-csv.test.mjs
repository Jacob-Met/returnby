import { test } from 'vitest';
import { savedCsvCases } from './helpers/saved-csv-cases.mjs';
for (const [name, run] of savedCsvCases) test(name, run);
