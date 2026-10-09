/** File-only enquiry preparation from unchanged ReturnBy models. */
import { createHash } from 'node:crypto';
import { registerHooks } from 'node:module';

const backupURL = new URL('../src/backup.ts', import.meta.url).href;
const deadlineURL = new URL('../src/deadline.ts', import.meta.url).href;
// Resolve only the exact existing backup reader's one runtime dependency.
// This hook belongs to this process; it does not install a shared loader.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === backupURL && specifier === './deadline') {
      return nextResolve(deadlineURL, context);
    }
    return nextResolve(specifier, context);
  },
});
const { parseBackup, BackupError } = await import(backupURL);
const { buildEnquiry, formatEnquiry } = await import(new URL('../src/enquiry.ts', import.meta.url));

const BACKUP_LIMIT = 5 * 1024 * 1024;
const DETAILS_LIMIT = 64 * 1024;
const TEXT_LIMIT = 64 * 1024;
const JSON_LIMIT = 8 * 1024 * 1024;
const requests = new Set(['instructions', 'exchange', 'eligibility']);
const detailsKeys = ['schema', 'version', 'request', 'items', 'reason', 'signature'];

function refusal(message, cause) {
  const error = new Error(message, cause === undefined ? undefined : { cause });
  error.code = 'RETURNBY_BACKUP_ENQUIRY_REFUSAL';
  return error;
}
function captured(value, limit, label) {
  if (!(value instanceof Uint8Array)) throw refusal(label + ' must be a Uint8Array.');
  if (value.byteLength > limit) throw refusal(label + ' exceeds its byte limit.');
  return Buffer.from(value);
}
function decode(bytes, label) {
  try {
    // ignoreBOM=true retains a leading BOM for the original JSON refusal.
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch (cause) {
    throw refusal(label + ' must contain valid UTF-8.', cause);
  }
}
function hash(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function sourceInfo(bytes) { return Object.freeze({ bytes: bytes.length, sha256: hash(bytes) }); }
function admittedBackup(value) {
  const bytes = captured(value, BACKUP_LIMIT, 'Backup');
  const text = decode(bytes, 'Backup');
  let rows;
  try { rows = parseBackup(text); }
  catch (cause) {
    if (!(cause instanceof BackupError)) throw cause;
    throw refusal(cause.message, cause);
  }
  // Version is read only after the unchanged complete-file reader succeeds.
  return { bytes, rows, version: JSON.parse(text).version };
}
function admittedDetails(value) {
  const bytes = captured(value, DETAILS_LIMIT, 'Details');
  let doc;
  try { doc = JSON.parse(decode(bytes, 'Details')); }
  catch (cause) {
    if (cause.code === 'RETURNBY_BACKUP_ENQUIRY_REFUSAL') throw cause;
    throw refusal('Details must be a JSON document.', cause);
  }
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc) ||
      Object.keys(doc).length !== detailsKeys.length ||
      !detailsKeys.every(key => Object.prototype.hasOwnProperty.call(doc, key)) ||
      doc.schema !== 'returnby.enquiry-details' || doc.version !== 1 ||
      !requests.has(doc.request) || typeof doc.items !== 'string' ||
      typeof doc.reason !== 'string' || typeof doc.signature !== 'string') {
    throw refusal('Details must contain exactly the supported schema, version, request, items, reason and signature.');
  }
  return { bytes, doc };
}

/** Synchronous, pure after ESM initialization; no storage, clock or publication. */
export function inspectBackupEnquiry(backupBytes) {
  const admitted = admittedBackup(backupBytes);
  const completed = admitted.rows.filter(row => row.completedAt !== undefined).length;
  const result = Object.freeze({
    schema: 'returnby.backup-enquiry-inspection.v1',
    source: sourceInfo(admitted.bytes),
    backupVersion: admitted.version,
    counts: Object.freeze({ total: admitted.rows.length, open: admitted.rows.length - completed, completed }),
    orders: Object.freeze(admitted.rows.map((row, index) => Object.freeze({
      position: index + 1,
      state: row.completedAt === undefined ? 'recorded-open' : 'recorded-completed',
      order: Object.freeze({ ...row }),
    }))),
  });
  if (Buffer.byteLength(JSON.stringify(result) + '\n', 'utf8') > JSON_LIMIT) {
    throw refusal('The complete inspection exceeds the 8 MiB output limit.');
  }
  return result;
}

/** Synchronous, pure after ESM initialization; creates one detached draft. */
export function prepareBackupEnquiry(backupBytes, selection, detailsBytes) {
  const admitted = admittedBackup(backupBytes);
  if (selection === null || typeof selection !== 'object' || Array.isArray(selection) ||
      Object.keys(selection).length !== 2 ||
      !Object.prototype.hasOwnProperty.call(selection, 'expectedSha256') ||
      !Object.prototype.hasOwnProperty.call(selection, 'orderId') ||
      typeof selection.expectedSha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(selection.expectedSha256) ||
      typeof selection.orderId !== 'string') {
    throw refusal('Select one exact ID and a lowercase 64-character SHA-256.');
  }
  const source = sourceInfo(admitted.bytes);
  if (source.sha256 !== selection.expectedSha256) throw refusal('The backup SHA-256 does not match.');
  const selected = admitted.rows.find(row => row.id === selection.orderId);
  if (!selected) throw refusal('The selected ID is not in the admitted backup.');
  if (selected.completedAt !== undefined) throw refusal('The selected order is recorded completed.');
  const details = admittedDetails(detailsBytes);
  let draft, text;
  try {
    draft = buildEnquiry(
      { orders: admitted.rows.filter(row => row.completedAt === undefined) },
      selection.orderId, details.doc,
    );
    text = formatEnquiry(draft.subject, draft.body);
  } catch (cause) {
    throw refusal(cause.message, cause);
  }
  const encoded = Buffer.from(text, 'utf8');
  if (encoded.length > TEXT_LIMIT) throw refusal('The complete draft exceeds the 64 KiB output limit.');
  return Object.freeze({
    source, details: sourceInfo(details.bytes),
    orderId: draft.orderId, request: details.doc.request,
    subject: draft.subject, body: draft.body, text,
    outputBytes: encoded.length, outputSha256: hash(encoded),
  });
}
