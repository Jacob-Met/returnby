import { storageFixture } from './storage-fixture.mjs';

// Authored storage bytes with read/write refusal before those bytes change.
export function loadingFixture(html, raw = null, readFailures = 0) {
  const app = storageFixture(html, []);
  let bytes = raw, readsLeft = readFailures, writesLeft = 0, reads = 0;
  const writes = [];
  app.globals.localStorage = {
    getItem(key) {
      if (key !== 'returnby.v1') throw Error('Unexpected storage key');
      reads++;
      if (readsLeft > 0) { readsLeft--; throw Error('Authored storage read refusal'); }
      return bytes;
    },
    setItem(key, value) {
      if (key !== 'returnby.v1') throw Error('Unexpected storage key');
      writes.push(value);
      if (writesLeft > 0) { writesLeft--; throw Error('Authored storage write refusal'); }
      bytes = value;
    },
  };
  return {
    ...app, writes, raw: () => bytes, readCount: () => reads,
    persisted: () => JSON.parse(bytes || '[]'),
    failRead(n = 1) { readsLeft = n; }, failWrite(n = 1) { writesLeft = n; },
    setRaw(next) { bytes = next; },
    retry() {
      const handler = app.elements.get('storage-retry')?.listeners.get('click');
      if (!handler) return false;
      handler({ preventDefault() {} }); return true;
    },
  };
}
