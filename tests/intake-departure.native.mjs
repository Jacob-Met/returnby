import assert from 'node:assert/strict';
import test from 'node:test';
import { bindIntakeDeparture } from '../src/intake-departure.ts';

// Literal cases were independently frozen before implementation in issue #78's
// receiving key (SHA256 93f85cfa3f9e19352319780e80c39aa5b1d78cc88db11e9efc5ac6c08b2afa95).
// These controlled objects exercise the real module, not a browser dialog.
const names = ['merchant', 'orderDate', 'orderNo', 'total', 'windowDays'];
const blank = () => ({ merchant: '', orderDate: '', orderNo: '', total: '', windowDays: '30' });
const forbidden = () => { throw new Error('Unexpected field or external side effect'); };

class ControlledEvents {
  listeners = new Map();
  additions = [];
  removals = [];
  addEventListener(type, callback) {
    this.additions.push([type, callback]);
    const list = this.listeners.get(type) ?? [];
    list.push(callback); // Deliberately no Set: duplicate registration is observable.
    this.listeners.set(type, list);
  }
  removeEventListener(type, callback) {
    this.removals.push([type, callback]);
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter(item => item !== callback));
  }
  emit(type, event = {}) {
    for (const callback of [...(this.listeners.get(type) ?? [])]) callback(event);
  }
  count(type) { return (this.listeners.get(type) ?? []).length; }
}

function fixture({ pasted = '', visible = false, fields = blank(), days = '30' } = {}) {
  const state = { pasted, visible, fields: { ...fields }, days };
  const paste = new ControlledEvents();
  Object.defineProperties(paste, {
    value: { get: () => state.pasted, set: forbidden },
    selectionStart: { value: 2 }, selectionEnd: { value: 4 },
    focus: { value: forbidden },
  });
  const preview = new ControlledEvents();
  let currentNodes;
  function nodesFor(values) {
    return Object.fromEntries(names.filter(name => values[name] !== null).map(name => [name,
      Object.freeze({ get value() { return values[name]; }, focus: forbidden }),
    ]));
  }
  currentNodes = nodesFor(state.fields);
  Object.defineProperties(preview, {
    hidden: { get: () => !state.visible, set: forbidden },
    dataset: { get: () => Object.freeze({ days: state.days }), set: forbidden },
    innerHTML: { get: () => '<unchanged form>', set: forbidden },
    children: { get: () => Object.values(currentNodes) },
    submit: { value: forbidden }, focus: { value: forbidden },
  });
  preview.querySelector = selector => {
    const match = /^\[name="(merchant|orderDate|orderNo|total|windowDays)"\]$/.exec(selector);
    assert.ok(match, `Unexpected query: ${selector}`);
    return currentNodes[match[1]] ?? null;
  };
  const host = new ControlledEvents();
  for (const name of ['localStorage', 'sessionStorage', 'navigator', 'fetch', 'setTimeout', 'setInterval', 'document', 'confirm']) {
    Object.defineProperty(host, name, { get: forbidden });
  }
  return { state, paste, preview, host,
    nodes: () => currentNodes,
    replaceFields(values) {
      state.fields = { ...values };
      currentNodes = nodesFor(state.fields);
    },
  };
}

function departureEvent() {
  let prevented = 0;
  const writes = [];
  const event = { preventDefault() { prevented++; } };
  Object.defineProperty(event, 'returnValue', { set(value) { writes.push(value); } });
  return { event, prevented: () => prevented, writes };
}

function assertArmed(f, expected) {
  assert.equal(f.host.count('beforeunload'), expected ? 1 : 0);
  const observation = departureEvent();
  f.host.emit('beforeunload', observation.event);
  assert.equal(observation.prevented(), expected ? 1 : 0);
  assert.deepEqual(observation.writes, expected ? [''] : []);
}

test('blank intake and a blank default manual review stay unarmed', () => {
  for (const options of [{}, { visible: true }, { visible: true, fields: { ...blank(), windowDays: null } }]) {
    const f = fixture(options);
    const refresh = bindIntakeDeparture(f.paste, f.preview, f.host);
    refresh(); f.preview.emit('input'); f.preview.emit('change');
    assertArmed(f, false);
    assert.equal(f.host.additions.length, 0);
  }
});

test('pasted whitespace, line breaks, Unicode and markup count literally and can be cleared', () => {
  for (const pasted of [' ', '\n', '雪 é', '<script>x</script>']) {
    const f = fixture({ pasted });
    bindIntakeDeparture(f.paste, f.preview, f.host);
    assertArmed(f, true);
    assert.equal(f.state.pasted, pasted);
    f.state.pasted = ''; f.paste.emit('change');
    assertArmed(f, false);
  }
});

test('each visible reviewed field guards its literal value independently', () => {
  for (const [name, value] of [['merchant', ' '], ['orderDate', 'invalid'], ['orderNo', '<雪>'], ['total', '0']]) {
    const f = fixture({ visible: true });
    bindIntakeDeparture(f.paste, f.preview, f.host);
    assertArmed(f, false);
    f.state.fields[name] = value; f.preview.emit('input');
    assertArmed(f, true);
    f.state.fields[name] = ''; f.preview.emit('change');
    assertArmed(f, false);
  }
});

test('hidden stale review fields do not guard an otherwise blank intake', () => {
  const f = fixture({ fields: { merchant: 'stale', orderDate: 'x', orderNo: 'x', total: '0', windowDays: '' } });
  const refresh = bindIntakeDeparture(f.paste, f.preview, f.host);
  assertArmed(f, false);
  f.state.pasted = ' '; f.paste.emit('input');
  assertArmed(f, true);
  f.state.pasted = ''; refresh();
  assertArmed(f, false);
  f.state.visible = true; refresh();
  assertArmed(f, true);
  f.state.visible = false; refresh();
  assertArmed(f, false);
});

test('the return-window comparison uses the current literal baseline and tolerates no control', () => {
  for (const value of ['', '0', '030', 'invalid']) {
    const f = fixture({ visible: true });
    const refresh = bindIntakeDeparture(f.paste, f.preview, f.host);
    f.state.fields.windowDays = value; f.preview.emit('input');
    assertArmed(f, true);
    f.state.fields.windowDays = '30'; f.preview.emit('change');
    assertArmed(f, false);
    f.state.days = '14'; f.state.fields.windowDays = '14'; refresh();
    assertArmed(f, false);
    f.state.days = '30'; refresh();
    assertArmed(f, true);
    f.replaceFields({ ...blank(), windowDays: null }); refresh();
    assertArmed(f, false);
  }
});

test('one dynamic listener follows repeated events, successful clear and retained failed-save contents', () => {
  const f = fixture();
  const refresh = bindIntakeDeparture(f.paste, f.preview, f.host);
  assertArmed(f, false);
  for (const target of [f.paste, f.preview]) {
    assert.equal(target.count('input'), 1); assert.equal(target.count('change'), 1);
  }
  f.state.pasted = 'x'; f.paste.emit('input');
  const listener = f.host.listeners.get('beforeunload')[0];
  for (let i = 0; i < 5; i++) { refresh(); f.paste.emit('input'); f.preview.emit('change'); }
  assertArmed(f, true);
  assert.equal(f.host.additions.length, 1);
  f.state.pasted = ''; f.paste.emit('change');
  assertArmed(f, false);
  f.state.visible = true; f.state.fields.merchant = 'x'; refresh();
  assertArmed(f, true);
  // Model the existing successful clearing step, without invoking storage.
  f.state.visible = false; f.state.pasted = ''; refresh();
  assertArmed(f, false);
  f.state.visible = true; refresh();
  // A failed save never reaches that clearing step; values remain guarded.
  assertArmed(f, true);
  assert.ok(f.host.additions.every(([type, callback]) => type === 'beforeunload' && callback === listener));
  assert.equal(f.host.additions.length, 3);
  assert.equal(f.host.removals.length, 2);
});

test('replaced controls are read fresh and a retained callback rechecks contents synchronously', () => {
  const f = fixture({ visible: true, fields: { ...blank(), merchant: 'x' } });
  const refresh = bindIntakeDeparture(f.paste, f.preview, f.host);
  const oldValues = f.state.fields;
  const oldNodes = f.nodes();
  assertArmed(f, true);
  f.replaceFields(blank()); refresh();
  assertArmed(f, false);
  oldValues.merchant = 'detached old value'; refresh();
  assertArmed(f, false);
  assert.notEqual(f.nodes().merchant, oldNodes.merchant);
  f.state.pasted = 'x'; f.paste.emit('input');
  const retained = f.host.listeners.get('beforeunload')[0];
  f.state.pasted = ''; // No event or refresh: attached callback must still recheck.
  const clean = departureEvent(); retained(clean.event);
  assert.equal(clean.prevented(), 0); assert.deepEqual(clean.writes, []);
  f.state.fields.total = '0';
  const dirty = departureEvent(); retained(dirty.event);
  assert.equal(dirty.prevented(), 1); assert.deepEqual(dirty.writes, ['']);
});

test('binding, refresh and departure preserve all field objects, values, focus and selection', () => {
  const f = fixture({ pasted: 'Private literal\n雪', visible: true, fields: { merchant: '<x>', orderDate: '2026-10-17', orderNo: 'A&1', total: '0', windowDays: '14' } });
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: f.host });
  try {
    const nodes = f.nodes(); const values = JSON.stringify(f.state);
    const children = f.preview.children;
    const refresh = bindIntakeDeparture(f.paste, f.preview); // Actual default window path.
    refresh(); f.paste.emit('change'); f.preview.emit('input'); assertArmed(f, true);
    assert.equal(JSON.stringify(f.state), values);
    assert.equal(f.nodes(), nodes); assert.deepEqual(f.preview.children, children);
    assert.equal(f.preview.innerHTML, '<unchanged form>');
    assert.equal(f.paste.selectionStart, 2); assert.equal(f.paste.selectionEnd, 4);
    assert.deepEqual([...f.host.listeners.keys()], ['beforeunload']);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else delete globalThis.window;
  }
});
