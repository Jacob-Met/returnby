import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { stripTypeScriptTypes } from 'node:module';
import { resolve } from 'node:path';

const [sourceArgument, reportArgument] = process.argv.slice(2);
if (!sourceArgument || !reportArgument) throw new Error('Supply the exact TypeScript model and output receipt paths.');
const sourcePath = resolve(sourceArgument);
const reportPath = resolve(reportArgument);
const source = await readFile(sourcePath, 'utf8');
const sha = value => createHash('sha256').update(value).digest('hex');
const sourceHash = sha(source);
const javascript = stripTypeScriptTypes(source, { mode: 'strip' });
const { captureRemoval, planUndoRemoval } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);
const clone = value => JSON.parse(JSON.stringify(value));
const results = [];
function check(name, run) {
  try { const detail = run(); results.push({ name, passed: true, detail }); }
  catch (error) { results.push({ name, passed: false, error: error.stack }); }
}
function order(id) {
  return { id, merchant: `Original <${id}> “shop”`, orderNo: `reference-${id}`, total: '12.50',
    orderDate: '2026-10-01', windowDays: 30, windowSource: 'user', createdAt: '2026-10-01T00:00:00.000Z',
    extension: { original: ['keep', { value: 7 }], note: '界 🧭' } };
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function reverseKeys(value) {
  if (Array.isArray(value)) return value.map(reverseKeys);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).reverse().map(key => [key, reverseKeys(value[key])]));
}

check('captured review is detached from mutable source and repeat restoration results', () => {
  const removed = order('ORIGINAL');
  const original = clone(removed);
  const removal = captureRemoval(removed, 4);
  assert.ok(Object.isFrozen(removal));
  removed.merchant = 'A later mutation';
  removed.extension.original[1].value = 999;
  const first = planUndoRemoval([], removal);
  assert.equal(first.kind, 'restore');
  assert.deepEqual(first.orders, [original]);
  assert.deepEqual(first.order, original);
  try { first.order.extension.original[1].value = -1; }
  catch (error) { assert.ok(error instanceof TypeError, 'an immutable returned view is also valid'); }
  const second = planUndoRemoval([], removal);
  assert.deepEqual(second.orders, [original]);
  assert.deepEqual(JSON.parse(removal.record), original);
  return { detached_source_and_result: true, exact_id_and_creation_time: true };
});

check('restoration preserves every newer unrelated row and the current relative order', () => {
  let cases = 0;
  for (const originalIndex of [0, 1, 3, 7]) {
    for (const currentLength of [0, 1, 2, 5]) {
      const removed = order('REMOVED');
      const removal = captureRemoval(removed, originalIndex);
      const current = Array.from({ length: currentLength }, (_, i) => ({ ...order(`FRESH-${i}`), windowDays: 40 + i }));
      const original = clone(current);
      const expected = clone(current);
      expected.splice(Math.min(originalIndex, expected.length), 0, clone(removed));
      freeze(current);
      const plan = planUndoRemoval(current, removal);
      assert.equal(plan.kind, 'restore');
      assert.deepEqual(plan.orders, expected);
      assert.deepEqual(current, original);
      assert.deepEqual(plan.orders.filter(item => item.id !== removed.id), original);
      cases++;
    }
  }
  return { cases, unrelated_edits_preserved: true };
});

check('equal existing identities are a no-write result independent of JSON object key order', () => {
  for (const id of ['ordinary', '__proto__', 'constructor']) {
    const removed = order(id);
    const removal = captureRemoval(removed, 0);
    const existing = reverseKeys(removed);
    const current = freeze([order('NEWER'), existing]);
    const plan = planUndoRemoval(current, removal);
    assert.equal(plan.kind, 'present');
    assert.deepEqual(plan.order, existing);
    assert.deepEqual(current, [order('NEWER'), existing]);
  }
  return { cases: 3 };
});

check('every consequential saved-field difference and duplicate identity refuses restoration', () => {
  const mutations = [
    value => { value.merchant += ' revised'; },
    value => { value.orderNo = 'changed'; },
    value => { delete value.orderNo; },
    value => { value.total = '0'; },
    value => { value.orderDate = '2026-10-02'; },
    value => { value.windowDays = 45; },
    value => { value.windowSource = 'policy'; },
    value => { value.createdAt = '2026-10-01T00:00:01.000Z'; },
    value => { value.extension.original[1].value++; },
    value => { value.extension.original.reverse(); },
    value => { value.extension.newField = true; },
    value => { delete value.extension.note; },
  ];
  const removed = order('SAME-ID');
  const removal = captureRemoval(removed, 1);
  for (const mutate of mutations) {
    const changed = clone(removed); mutate(changed);
    const current = freeze([order('UNRELATED'), changed]);
    const before = clone(current);
    assert.equal(planUndoRemoval(current, removal).kind, 'conflict');
    assert.deepEqual(current, before);
  }
  for (const duplicate of [clone(removed), { ...removed, merchant: 'Different' }]) {
    const current = freeze([removed, order('OTHER'), duplicate]);
    const before = clone(current);
    assert.equal(planUndoRemoval(current, removal).kind, 'conflict');
    assert.deepEqual(current, before);
  }
  return { differing_fields: mutations.length, duplicate_cases: 2 };
});

check('a failed first persistence can retry against a different saved world without overwriting it', () => {
  const removed = order('LAST-REMOVAL');
  const removal = captureRemoval(removed, 2);
  const firstCurrent = [order('A')];
  const first = planUndoRemoval(firstCurrent, removal);
  assert.equal(first.kind, 'restore');
  // The first proposed write is refused. The receiving storage then changes.
  const later = [{ ...order('A'), windowDays: 66 }, order('B'), order('C')];
  const laterBefore = clone(later);
  const retry = planUndoRemoval(later, removal);
  assert.equal(retry.kind, 'restore');
  assert.deepEqual(retry.orders, [later[0], later[1], removed, later[2]]);
  assert.deepEqual(later, laterBefore);
  assert.deepEqual(firstCurrent, [order('A')]);
  assert.equal(retry.orders.filter(item => item.id === removed.id).length, 1);
  return { fresh_state_at_retry: true, captured_record_unchanged: JSON.stringify(JSON.parse(removal.record)) === JSON.stringify(removed) };
});

assert.equal(sha(await readFile(sourcePath)), sourceHash, 'the candidate model remained byte-identical');
const report = { receiver: 'estate-6e5752b49b6f/root', source_path: sourcePath, source_sha256: sourceHash,
  node: process.version, execution: 'Exact TypeScript model through native Node type erasure; no implementation substitution or source edits.',
  scope: 'Independent model semantics and repeated-plan behavior. Actual persistence and DOM wiring are received separately.',
  cases: results, passed: results.every(result => result.passed) };
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
if (!report.passed) process.exitCode = 1;
