import { describe, it } from 'vitest';
import * as checklist from '../src/trip-checklist';
import * as completion from '../src/completion';
import receiver from '../tools/check_checklist_completion.cjs';

// The same frozen cases run on compiled native modules before/after adoption.
describe('completed-return checklist consumer', () => {
  for (const [name, run] of receiver.cases(checklist, completion)) it(name, run);
});
