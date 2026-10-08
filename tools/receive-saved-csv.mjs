import './register-source-ts.mjs';
import { test } from 'node:test';
const { savedCsvCases } = await import('../tests/helpers/saved-csv-cases.mjs');
for (const [name, run] of savedCsvCases) test(name, run);
