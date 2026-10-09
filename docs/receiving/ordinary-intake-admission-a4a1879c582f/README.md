# ReturnBy ordinary intake admission — qualified receiving handoff

## Outcome and exact scope

Ordinary Save now uses the existing editor admission contract before it looks up policy, reads fresh storage, creates identifiers, persists an order, or retires the draft. In the actual baseline browser, a native number value of 1000000000 saved an invalid deadline displayed as NaN-NaN-NaN, then the real Backup action refused that saved order. The candidate refused the identical draft, retained all field strings and pasted text, kept the tracker unchanged, and allowed correction and saving.

This is an independently accepted four-file patch for receiving commit 7829e56e57ef91dfe8edd5853fd68d6c7890fac0, canonical tree b28e7b706fe67fd4b34111badd581c6bdd2ed4a7. Its source-only tree is 584d04643c7ade03ded7d59db481731464c36d3f. Current main 1e662c387be5f66f8499fac7ec443f58d2198379 has a different feature composition. Adoption belongs to the existing ReturnBy #8/#10/#20 integrator.

The source is implemented and locally qualified. This archive does not claim integration or deployment.

## What changes

| Path | Purpose |
| --- | --- |
| src/order-admission.ts | Extracts the editor's existing draft/error/date/admission contract into a shared module. |
| src/edit.ts | Reexports the same public types and error constructor and delegates validation, preserving editor attribution and plan behavior. |
| src/main.ts | Validates ordinary intake through native number validity and the shared contract before mutable work; clears cross-field custom validity on intake edits. |
| tests/helpers/storage-fixture.mjs | Adds the form control access and validity methods used by production Save to the existing inert fixture; its assertions and editor dialog remain unchanged. |

The patch is 8,269 bytes, SHA-256 60c2ecaeb8ebb177006015316bf44d139b84b42ef43e47ae45aef283ba6226bd. Four file sections contain six actual hunks, with 101 inserted and 44 removed lines. Exact independent application preserves 188 unrelated old leaves and 33 old subtrees.

Literal merchant, order number and total text remain untrimmed, subject to the existing 4,096 JavaScript string-length limit. Real Gregorian dates use years 1000–9999. A valid deadline must also have a representable exclusive next-day ICS end. Intake retains native number meanings: blank saves 30, 1e2 saves 100, and 30.0 saves 30. Submitted merchant policy attribution is preserved; a blank 30-day Contoso draft correctly records a user window because that merchant's policy is 15 days.

## Qualification and retained failures

| Gate | Actual result |
| --- | --- |
| Root production patch receiving | git apply --check and actual application both exit 0. |
| Author native consumer | 6/6 groups. |
| Independent source review | 15 comparisons accepted. |
| Exact baseline and production candidate TypeScript/Vite builds | All four commands exit 0. |
| Baseline maintained suite | 201/201 in 12 files. |
| Original candidate maintained suite | 173 passed / 28 failed at the inert fixture's missing preview.elements.namedItem. Original logs retained. |
| Final fixture application and maintained suite | Patch check/application exit 0; 201/201 in 12 files. No assertion or production change to obtain this result. |
| Independent consumer | 8 baseline groups; 3 candidate groups / 10 vectors, with 14 exact candidate artifacts. |
| Independent native browser | One run, no retries, 16/16 phases accepted. |
| Independent four-file receiving | Exact in-memory patch application and complete canonical Git tree reconstruction accepted. |

Native execution used Node 24.19.0, TypeScript 5.9.3, Vite 8.3.3 and Vitest 5.0.3. The browser was desktop headless Chromium 153.0.8010.0, en-US, UTC. All nine served application responses matched the actual Vite build bytes. The receipt records empty external-request, application-error, console-error, capture-error and cleanup-error arrays.

The native browser exercised huge-window refusal, correction, terminal calendar-end refusal, date-only correction clearing a window error, native bad input blocked before submit, blank fallback, numeric aliases and submitted-store attribution. It captured two actual Backup downloads and one actual ICS download. The final actual backup was selected in a fresh context: preview wrote nothing; Import restored all five records with identical saved JSON, 1,163 UTF-8 bytes, SHA-256 6d15ad7d8c023c96b390b56f657d9e6e3e48c049126e07047061db55ec78ca87.

Native Save/submit and invalid observations were trusted browser events. Playwright date fill emits an untrusted input event, which is recorded honestly. There was no synthetic submit or constraint bypass. This does not claim manual human date entry, a physical device, another timezone, or import into an external calendar application.

The historical browser/build source inventory uses the original 3,025-byte test helper. The final maintained-suite packet uses the 4,007-byte helper. Production source and browser dist are identical across these two gates. Reproduction must select original helper bytes for the historical browser manifest rather than blindly prefer a newer candidate path.

## Reading and application map

Byte-identical copies of source and the accepted browser driver are stored once to fit the owned artifact allocation. EVIDENCE-ALIASES.json maps every omitted logical duplicate to exact retained bytes. After extraction, run python3 tools/expand-evidence-aliases.py with the extracted archive directory as its argument to restore all original evidence folder layouts. The helper first verifies every source hash, refuses mismatched existing files, then exclusively creates missing identical copies. Raw outputs, failures and accepted receipts remain direct archive members.

- APPLY.md gives exact beforeimage checks, receiving commands, later-composition cautions, and historical browser reproduction.
- RECEIVING.patch and SOURCE-MANIFEST.json are the unchanged author application packet.
- source/ contains the four exact final afterimages.
- base/, candidate/, build/ and gates/ retain actual source, dist, native build/test receipts and original failures.
- author/returnby/ retains original source proposals, both pre-execution browser driver revisions and the author consumer proof.
- independent-browser/browser-review/ contains the one actual browser receipt, exact downloads, execution/materialization records, independent decision and cleanup.
- independent-browser/application-review/ contains the independent patch and complete Git tree receiving record.
- independent-consumer/ retains native baseline and candidate outputs, original CRLF-normalized captures, raw-restored ICS bytes, and the explicitly recorded lost-custody attempt and retained replay.
- root/ contains root receiving checks and complete final source-only leaf/subtree identities.
- RESULT.json states qualification, source identities, negative evidence and scope.
- MANIFEST.json hashes every other archive member.
- authority/ and coordination/ retain exact receiving-tree and workflow/authority evidence used for safe handoff.

The original normalized ICS files were not silently rewritten. Separate raw-restored files match the original execution hashes and lengths. The browser driver count was corrected from four to three expected downloads before the first browser run. The original cached tree header echoed a commit; complete Git reconstruction established the canonical tree independently. These corrections are retained with their original evidence.

## Integration boundary

The editor, parsing, policy, store, Backup, ICS, schema and dependencies are unchanged except for extraction/delegation of the existing validation contract. Ordinary Save still uses fresh storage at its existing point. Later dirty-intake, completion, day-refresh, batch download and reminder changes require composition by their existing owners. No claim about those combinations is made here.

The workflow audit permits immutable unattached Git objects and a handoff comment. No branch/ref, push, PR, merge, Actions run, workflow mutation or deployment is part of this receiving result. See the linked coordination issue in RESULT.json for owner adoption.
