# Prepare one enquiry from an exported backup

This file-only consumer reads a complete ReturnBy backup and prepares one question-only draft. It composes the existing backup reader and enquiry formatter without restoring the tracker, changing its saved orders or contacting anyone. The existing browser enquiry UI remains unchanged.

Use Node 24.19 or a compatible Node release with native TypeScript stripping. No package installation, browser, Vite, TypeScript compiler or provider is required for these commands. The consumer registers one process-local resolution rule for the existing backup reader's literal './deadline' dependency; it does not install a shared loader or replace the reader.

## Inspect before choosing

From the repository directory:

~~~sh
node tools/backup_enquiry.mjs inspect --input exported-backup.json
~~~

The output is one compact UTF-8 JSON object followed by a literal LF. It includes the captured raw backup length and SHA-256, the admitted backup version, counts and every admitted order in source order. A recorded-open marker means the record lacks completedAt. A recorded-completed marker is a saved marker, not proof that an item was physically returned.

Both supported backup versions use the unchanged complete-file validation, including malformed or duplicated later rows and completed records. Optional order number and total values retain the existing empty-value behavior. An invalid record anywhere refuses the entire file before selecting an order. Raw backup bytes are limited to 5 MiB, with the existing 10,000-order and normalized-size limits also retained.

## Supply literal enquiry details

Save an explicit details JSON document containing exactly these six keys:

~~~json
{"schema":"returnby.enquiry-details","version":1,"request":"instructions","items":"Shoes, size 40","reason":"Unworn and unused","signature":"Alex"}
~~~

Request must be instructions, exchange or eligibility. Items must contain nonblank text and fit the existing 2,000 UTF-16-unit limit. Reason and signature may be empty and retain their 4,000 and 200-unit limits. No recipient, email address, refund amount or policy conclusion is added.

The whole details document is limited to 64 KiB. Both input files require strict UTF-8. A leading BOM remains visible to the original JSON admission and is refused. Ordinary JSON last-duplicate-key semantics are retained. Valid Unicode and literal punctuation are preserved; unpaired UTF-16 code units use the standard UTF-8 replacement behavior of the existing text-export route.

## Prepare a new draft

Copy the exact lowercase raw SHA-256 from inspection. Choose one exact recorded-open ID:

~~~sh
node tools/backup_enquiry.mjs prepare --input exported-backup.json --expected-sha256 LOWERCASE_SHA256 --id EXACT_ID --details enquiry-details.json --output new-enquiry.txt
~~~

There are no default command, ID, request or output values. Repeated, unknown, missing or excess flags refuse. IDs and paths are literal, without trimming or case folding. Prefix a filename beginning with -- with ./.

Preparation re-reads and admits the complete backup, checks its captured raw SHA-256, then selects exactly the requested open record. A changed hash, unknown ID or completed record refuses. Existing pure models supply saved store/reference/date facts and one of the three original questions. No current-deadline, refund or eligibility conclusion is inferred.

The saved text is exactly the existing formatter's UTF-8 output, without a BOM, with CRLF framing and final CRLF. The complete 64 KiB output bound and complete 8 MiB receipt bound are checked before staging. These are backstops; stricter inherited field/schema limits can make their maximum boundary unreachable.

A complete private staging file in the target directory is written, synced and closed before a create-only hard link publishes the destination. Existing files, directories and links refuse without replacement, including input or details aliases. Two competing publishers can create at most one target. Filesystems that do not support hard links refuse rather than fall back to replacement or partial publication. Cleanup touches only the tool's own staging file and directory.

On success stdout contains exactly:

~~~json
{"schema":"returnby.backup-enquiry-published.v1","source":{"bytes":123,"sha256":"LOWERCASE64HEX"},"details":{"bytes":123,"sha256":"LOWERCASE64HEX"},"orderId":"EXACT_ID","request":"instructions","output":{"path":"new-enquiry.txt","bytes":123,"sha256":"LOWERCASE64HEX"},"notice":"Draft only. Review the saved text and recipient before sending."}
~~~

The actual lengths and hashes replace the illustrative values. Property order is fixed as displayed; serialization is compact UTF-8 plus one literal LF. The receipt is fully prepared before publication. A stdout error after publication gives a nonzero exit and leaves the complete draft in place. Inspect the destination before any manual retry; do not infer success from a missing receipt or blindly rerun. A private cleanup failure also gives a nonzero result and must be inspected.

Review the saved text and actual recipient before manually sending. This tool never sends or discovers a recipient.

## Pure API and tests

tools/backup_enquiry_model.mjs exports inspectBackupEnquiry(backupBytes) and prepareBackupEnquiry(backupBytes, {expectedSha256, orderId}, detailsBytes). They synchronously return detached frozen ordinary objects or throw after normal asynchronous ESM initialization. Neither function returns a Promise or performs filesystem, storage, clock, network, stdout or process operations after initialization. outputBytes is a number; no mutable output buffer is returned.

The API accepts Uint8Array input, including Node Buffer. Hashes bind captured bytes, not reserialized JSON. Regular CLI input files are read through retained descriptors with bounded reads. Symlinks are accepted only when the opened target is regular. There is no claim of atomic source observation, path-retarget protection, power-loss durability or broad reparse-point defense.

Run the native built-in test suite in an absent owned fixture directory:

~~~sh
RETURNBY_AUTHOR_FIXTURES=/absolute/owned/new-directory node --test --test-concurrency=1 tests/backup-enquiry.native.mjs
~~~

This standalone Node suite uses the `.native.mjs` filename because the repository's `npm test` command uses Vitest. It is invoked explicitly by the command above. Adopting this consumer requires both this native suite and the existing project test/build gates; a native result does not qualify Vitest, TypeScript, Vite or hosted CI. The existing test discovery, test files and workflow gates are unchanged.

On PowerShell set the process-local environment variable before running Node. Tests use synthetic backups, actual normal imports, real CLI children and one explicit two-contender race. They include a real closed stdout case after publication. They do not exercise browser storage, browser UI, Vite build, strict TypeScript, real shoppers or delivery.

Exit 0 means help or successful completion. Exit 2 means argument, input, selection, formatting or publication refusal. Unexpected or stdout-delivery failures use exit 1. Reported errors begin with backup enquiry:. A complete target may remain after a receipt or cleanup error.

This additive consumer belongs to the composed source offer, not an installed or main-adoption claim. Original backup/enquiry/lifecycle owners retain their scopes; these tests do not requalify their complete suites.
