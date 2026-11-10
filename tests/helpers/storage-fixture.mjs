// Inert browser/storage boundary. Application and store modules run unchanged.
export function storageFixture(html, initial = []) {
  const clone = value => JSON.parse(JSON.stringify(value));
  const elements = new Map();
  let value = JSON.stringify(initial), failures = 0, serial = 0, allowClear = true;
  const attempts = [];
  let tripValue = null, tripFailures = 0;
  // Browser event registration is real within this fixture, but time does not
  // advance implicitly. The separate day-refresh suite tests midnight timing.
  const listeners = new Map();
  const eventHost = {
    addEventListener(type, fn) {
      if (!listeners.has(this)) listeners.set(this, new Map());
      const events = listeners.get(this);
      if (!events.has(type)) events.set(type, new Set());
      events.get(type).add(fn);
    },
    removeEventListener(type, fn) { listeners.get(this)?.get(type)?.delete(fn); },
  };
  const document = Object.assign(Object.create(eventHost), {
    activeElement: null,
    visibilityState: 'visible',
    querySelector: selector => elements.get(selector.slice(1)),
  });
  let timerId = 0;
  const window = Object.assign(Object.create(eventHost), {
    setTimeout() { return ++timerId; },
    clearTimeout() {},
    location: { hash: '', pathname: '/', search: '' },
    history: { replaceState() {} },
    // Storage tests use the desktop viewport. Real phone navigation, focus and
    // resize behavior are exercised by check_phone_desk_browser.mjs in Chrome.
    matchMedia() { return Object.assign(Object.create(eventHost), { matches: false }); },
    requestAnimationFrame(fn) { return this.setTimeout(fn, 16); },
  });
  class Element {
    constructor(id, tag) {
      this.id = id; this.value = ''; this.innerHTML = ''; this.textContent = '';
      this.hidden = /\bhidden\b/.test(tag); this.dataset = {}; this.fields = {};
      this.listeners = new Map(); this.attributes = {};
      for (const match of tag.matchAll(/([\w-]+)="([^"]*)"/g)) this.attributes[match[1]] = match[2];
      this.classList = { toggle() {} };
    }
    addEventListener(type, fn) { this.listeners.set(type, fn); }
    setAttribute(key, value) { this.attributes[key] = value; }
    focus() { document.activeElement = this; }
    querySelector(selector) {
      if (this.id === 'preview') {
        if (selector === '#intake-deadline') return this.previewOutput ??= { textContent: '' };
        const match = /^\[name="?([^"\]]+)"?\]$/.exec(selector);
        if (match) {
          const name = match[1];
          const fromMarkup = [...this.innerHTML.matchAll(/<input\s+name="([^"]+)"[^>]*\svalue="([^"]*)"/g)]
            .find(([, field]) => field === name);
          if (!fromMarkup && !Object.hasOwn(this.fields, name)) return null;
          // Inert inputs mirror the current rendered form and edited fixture fields.
          // The browser-only validity flag is explicit, not silently absent.
          const value = this.fields[name] ?? fromMarkup?.[2] ?? '';
          return { name, value, validity: { valid: true }, focus() {} };
        }
      }
      return { focus() {} };
    }
  }
  for (const match of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)) {
    elements.set(match[1], new Element(match[1], match[0]));
  }
  const preview = elements.get('preview');
  preview.dataset = { source: 'default', days: '30' };
  const localStorage = {
    getItem(key) { if (key === 'returnby.trip-plan.v1') return tripValue; if (key !== 'returnby.v1') throw Error('Unexpected storage key'); return value; },
    setItem(key, next) {
      if (key === 'returnby.trip-plan.v1') { if(tripFailures>0){tripFailures--;throw Error('Synthetic trip storage refusal');} tripValue=next;return; }
      if (key !== 'returnby.v1') throw Error('Unexpected storage key');
      attempts.push(JSON.parse(next));
      if (failures > 0) { failures--; throw Error('Synthetic storage refusal before write'); }
      value = next;
    },
  };
  class FormData { constructor(form) { this.values = form.fields; } get(key) { return this.values[key] ?? null; } }
  function dispatch(id, type, dataset = {}) {
    return elements.get(id).listeners.get(type)({ preventDefault() {}, target: { dataset } });
  }
  return {
    globals: { document, window, localStorage, FormData, crypto: { randomUUID: () => `order-${++serial}` },
      confirm: () => allowClear, alert() { throw Error('Unexpected blocking alert'); } },
    setTrip(next) { tripValue=next===null?null:JSON.stringify(next); }, tripRaw:()=>tripValue, failTrip(n=1){tripFailures=n;},
    elements, attempts, persisted: () => clone(JSON.parse(value)),
    failNext(n = 1) { failures = n; }, confirm(next) { allowClear = next; },
    draft(orderNo = 'NEXT') {
      preview.hidden = false;
      preview.fields = { merchant: 'Fixture Store', orderDate: '2026-10-08', orderNo, total: '$12.00', windowDays: '30' };
      elements.get('paste').value = 'Unsaved email ' + orderNo;
    },
    submit: () => dispatch('preview', 'submit'), refresh: () => dispatch('filter-all', 'click'),
    remove: id => dispatch('list', 'click', { del: id }), clear: () => dispatch('clear', 'click'),
    count: () => Number(elements.get('tracked-count').textContent),
  };
}

export const storedOrder = id => ({ id, merchant: 'Saved Store', orderNo: id, total: '$8.00',
  orderDate: '2026-10-01', windowDays: 30, windowSource: 'default', createdAt: '2026-10-01T00:00:00Z' });
