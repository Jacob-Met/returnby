#!/usr/bin/env node
/** Explicit file-only CLI; it never restores, saves to browser storage or sends. */
import {
  closeSync, fstatSync, fsyncSync, linkSync, mkdtempSync,
  openSync, readSync, rmdirSync, unlinkSync, writeSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { inspectBackupEnquiry, prepareBackupEnquiry } from './backup_enquiry_model.mjs';

const HELP = 'ReturnBy backup enquiry (draft only)\n\n' +
  'node tools/backup_enquiry.mjs inspect --input BACKUP.json\n' +
  'node tools/backup_enquiry.mjs prepare --input BACKUP.json --expected-sha256 LOWERCASE_SHA256 --id EXACT_ID --details DETAILS.json --output NEW.txt\n' +
  'node tools/backup_enquiry.mjs --help\n\n' +
  'Read the complete backup first. Select one recorded-open ID and its exact raw SHA-256.\n' +
  'Review the saved text and actual recipient before manually sending. No message is sent.\n' +
  'Existing outputs are never replaced. After any receipt error inspect the destination before retrying.\n';
const REVIEW = 'Draft only. Review the saved text and recipient before sending.';
const REFUSAL = 'RETURNBY_BACKUP_ENQUIRY_REFUSAL';
function refuse(message, cause) {
  const error = new Error(message, cause === undefined ? undefined : { cause });
  error.code = REFUSAL;
  return error;
}
function argumentsFor(argv) {
  if (argv.length === 1 && argv[0] === '--help') return { command: 'help' };
  const command = argv[0];
  const allowed = command === 'inspect' ? ['--input'] :
    command === 'prepare' ? ['--input', '--expected-sha256', '--id', '--details', '--output'] : null;
  if (!allowed) throw refuse('Choose inspect, prepare or --help.');
  const values = Object.create(null);
  for (let i = 1; i < argv.length; i += 2) {
    const flag = argv[i], value = argv[i + 1];
    if (!allowed.includes(flag) || Object.hasOwn(values, flag) ||
        value === undefined || value === '' || value.startsWith('--')) {
      throw refuse('Use each required command flag exactly once with a literal value.');
    }
    values[flag] = value;
  }
  if (Object.keys(values).length !== allowed.length) throw refuse('All command flags are required.');
  return { command, values };
}
function readBounded(path, limit, label) {
  let fd;
  try {
    fd = openSync(path, 'r');
    if (!fstatSync(fd).isFile()) throw refuse(label + ' must be an opened regular file.');
    const buffer = Buffer.allocUnsafe(limit + 1);
    let used = 0;
    while (used < buffer.length) {
      const read = readSync(fd, buffer, used, buffer.length - used, null);
      if (read === 0) break;
      used += read;
    }
    if (used > limit) throw refuse(label + ' exceeds its byte limit.');
    return buffer.subarray(0, used);
  } catch (cause) {
    if (cause.code === REFUSAL) throw cause;
    throw refuse('Cannot read ' + label.toLowerCase() + ': ' + cause.message, cause);
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}
function jsonBytes(value) {
  const bytes = Buffer.from(JSON.stringify(value) + '\n', 'utf8');
  if (bytes.length > 8 * 1024 * 1024) throw refuse('The complete receipt exceeds the 8 MiB output limit.');
  return bytes;
}
function publishNew(argument, bytes) {
  const target = resolve(argument);
  let directory, temporary, fd, published = false, failure;
  try {
    directory = mkdtempSync(join(dirname(target), '.returnby-enquiry-'));
    temporary = join(directory, 'draft.tmp');
    fd = openSync(temporary, 'wx', 0o600);
    let used = 0;
    while (used < bytes.length) {
      const written = writeSync(fd, bytes, used, bytes.length - used);
      if (written === 0) throw new Error('The staging write made no progress.');
      used += written;
    }
    fsyncSync(fd);
    closeSync(fd); fd = undefined;
    // The complete staging file is closed before create-only publication.
    // linkSync refuses every existing entry, including dangling links.
    linkSync(temporary, target);
    published = true;
  } catch (cause) {
    failure = refuse('Cannot publish a new draft: ' + cause.message, cause);
  } finally {
    const cleanup = [];
    if (fd !== undefined) {
      try { closeSync(fd); } catch (error) { cleanup.push(error); }
    }
    if (temporary !== undefined) {
      try { unlinkSync(temporary); } catch (error) {
        if (error.code !== 'ENOENT') cleanup.push(error);
      }
    }
    if (directory !== undefined) {
      try { rmdirSync(directory); } catch (error) { cleanup.push(error); }
    }
    if (cleanup.length) {
      failure = new Error('Private staging cleanup failed; ' +
        (published ? 'the complete published draft remains. ' : 'inspect the destination. ') +
        cleanup.map(error => error.message).join('; '), { cause: failure });
    }
  }
  if (failure) throw failure;
}
async function stdoutBytes(bytes) {
  await new Promise((resolveWrite, rejectWrite) => {
    // Keep an error listener for the process lifetime so a late stream error
    // still produces a nonzero outcome rather than an unhandled exception.
    process.stdout.once('error', error => {
      process.exitCode = 1;
      rejectWrite(new Error('Stdout delivery failed: ' + error.message, { cause: error }));
    });
    process.stdout.write(bytes, error => error ?
      rejectWrite(new Error('Stdout delivery failed: ' + error.message, { cause: error })) : resolveWrite());
  });
}
async function main() {
  const args = argumentsFor(process.argv.slice(2));
  if (args.command === 'help') { await stdoutBytes(Buffer.from(HELP, 'utf8')); return; }
  const backup = readBounded(args.values['--input'], 5 * 1024 * 1024, 'Backup');
  if (args.command === 'inspect') {
    await stdoutBytes(jsonBytes(inspectBackupEnquiry(backup)));
    return;
  }
  const details = readBounded(args.values['--details'], 64 * 1024, 'Details');
  const draft = prepareBackupEnquiry(backup, {
    expectedSha256: args.values['--expected-sha256'], orderId: args.values['--id'],
  }, details);
  const bytes = Buffer.from(draft.text, 'utf8');
  const receipt = jsonBytes({
    schema: 'returnby.backup-enquiry-published.v1',
    source: draft.source, details: draft.details,
    orderId: draft.orderId, request: draft.request,
    output: { path: args.values['--output'], bytes: draft.outputBytes, sha256: draft.outputSha256 },
    notice: REVIEW,
  });
  publishNew(args.values['--output'], bytes);
  await stdoutBytes(receipt);
}
main().catch(error => {
  process.exitCode = error.code === REFUSAL ? 2 : 1;
  process.stderr.write('backup enquiry: ' + error.message + '\n');
});
