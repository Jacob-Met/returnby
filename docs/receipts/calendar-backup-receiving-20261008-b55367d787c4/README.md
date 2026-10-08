# Calendar, editor and portable-recovery receiving qualification

## Result and ownership

The exact existing parser/storage/backup integration accepts the separately reviewed
editor and calendar source with four existing-file changes. The composed application
passes 195 unchanged native tests, the strict TypeScript/Vite production build, and
four actual Chromium cross-feature groups plus an original-build control. Supplemental
independent source review accepts the composition without requesting a product repair.

This is receiving support for `parallel-8b336fefde84`, the existing ReturnBy #8/#10
integration owner. The editor remains the #11/#14 owner's contribution. No existing
owner branch, workspace or source was changed, and this contributor performed no
remote write, merge or deployment.

## Exact source

| Boundary | Exact identity |
| --- | --- |
| Remote receiving branch | `integrate/portable-recovery-20261008-8b336fefde84` |
| Remote receiving commit | `17e1a3286a5e8136d1d5dc09da37f33fd1baa100` |
| Remote receiving tree | `7b353c0d59058ff624da8573bedbd41aa61150f0` |
| Exact local receiving snapshot | `404780afa8de09f19a586f307fdd5678f5696e4b` |
| Editor remote source | `0e6e29d4a14bfdce0579085b4d79c5b4f54aeb13` |
| Original calendar implementation freeze | `1973a2230a8292fd487a87f9fdde02dba068649d` |
| Accepted editor/calendar packet | `049eae0059186add28243a6bcd06434f761bcb43` |
| Composed application freeze | `d457628a3def47f71bab58f9285fe64173ea1624` |
| Composed application tree | `debb013d11b8a9fddc620522192c3c8939c84c76` |

All 46 remote receiving blobs, including the original captures, were independently
hash-matched to read-only existing sources before materialization. The reconstructed
Git tree exactly matches the remote tree. The complete remote tree, donor custody and
native ownership reads are under `inputs/`.

The composition preserves 42 of those baseline blobs unchanged. `src/ics.ts` receives
the exact previously accepted calendar serializer. `src/main.ts` adds editor/calendar
imports, the edit action and controller bindings; it keeps the backup binding, guarded
persistence and dynamic saved fallback duration. `index.html` gains the exact independent
toolbar/dialog markup. README combines the existing backup instructions with the
accepted editor/calendar workflows. These are the only four changed existing files.

All 67 feature/source-receipt additions are byte-identical to the accepted source.
Parser, store, deadline, backup model/controller/styles and their tests remain exact
receiving-baseline bytes. No business rule, storage schema, import conflict policy,
calendar model or editor module was repaired or rewritten for composition. The exact
four-file diff is `inputs/integration-seams.patch`.

## Executed verification

The baseline's 122 native tests and production build passed before composition. The
combined source's 195 native tests across 11 test files and production build then
passed. Every inherited test was retained unchanged; the additional 73 cases come
from the accepted editor/calendar sources. Both full native/build outputs are retained.

`tools/check_calendar_backup_receiving.mjs` runs the real combined production build in
Chromium 153.0.8010.0 through Playwright 1.62.1, using fresh contexts, fictional orders,
native controls, actual downloaded files and loopback-only requests. The receiver
checks all 15 consequential source files and all six build outputs again after execution.
No application page error or external request was observed.

1. **Parser through restored calendar.** The native parser extracts `$55.00` from a
   confirmation containing both a `$50.00` Subtotal and a `$55.00` Total. Saving retains
   the known store's 15-day policy. A separately restored historical 45-day fallback
   survives native date/total editing without changing its ID, creation time, source or
   duration. The app downloads a real backup, which a fresh 390 px mobile/touch-emulated
   context previews, cancels and then imports exactly. Its two selected calendar events
   match the individual reminder event bytes, including UIDs and alarms. Calendar export
   makes zero storage writes and excludes totals and the unsaved email. Touch is browser
   emulation; no physical phone was used.
2. **Changed selected identity after real restoration.** A second tab first refuses an
   altered backup with a conflicting saved ID. That tab then explicitly removes the
   original record and imports the changed record plus an unrelated addition. The open
   calendar review in the first tab refuses download before allocating any file. Reload
   retains only the selected ID, leaves the new addition unselected and previews the new
   `2026-12-09` deadline. The actual one-event download retains the original UID and uses
   the reviewed start/end dates; storage stays unchanged by the calendar actions.
3. **Staged import and failed commitment.** A calendar download leaves a pending backup
   import valid for its original confirmation. A subsequent native edit forces a new
   backup preview and another Import click. An old backup conflicts with that correction.
   A deliberately injected storage-write refusal keeps a different import preview;
   calendar export still uses only persisted records and does not add any write attempt.
   Recovery imports the pending record exactly once, retaining every corrected and
   unrelated order.
4. **Different admission boundaries remain visible.** The existing backup accepts a
   saved return whose deadline is `9999-12-31`. The calendar preserves that record,
   explains its unsupported next-day event end and disables its checkbox. Another
   valid imported return still downloads normally. The narrower calendar rule does not
   cause deletion or silent import reinterpretation.

The original production-build control verifies that the receiving baseline has backup
controls and lacks the new editor/calendar controls. `browser/` retains the raw receipt,
two visually inspected captures, the actual backup and four actual `.ics` downloads.
Calendar download phases showed zero storage writes. Native edits, removals and confirmed
imports performed their expected writes; this packet does not claim the whole workflow
is read-only.

## Independent review

The unchanged three-file packet under `independent-review/` independently checks all
67 additions, 42 preserved baseline files, four seam hashes and static DOM ID uniqueness.
It examines fresh reads, guarded commitment and distinct admission limits. It performs
no new native/browser run and does not recast the composer's execution as independent
execution. The original seven-group model/browser review remains attached to the
byte-identical calendar modules with its original provenance.

## Current receiving changes and practical limits

The final native read at 2026-10-08 09:05:56 UTC still finds the exact integrator and
editor heads above. It also finds the separately owned ordinary-action repair in
[PR #16](https://github.com/Jacob-Met/returnby/pull/16), head
`480a99bd6de57ff04089975b34b43856da56fdf9`, tree
`e439842851966ad29f6fc2787c951967e23358b5`, announced in
[#8 comment 6056277078](https://github.com/Jacob-Met/returnby/issues/8#issuecomment-6056277078).
That owner changes ordinary Save/Remove freshness on the exact editor parent. This
frozen qualification does not include that later contribution or qualify its composition.
Preserve its owner and apply its delta relative to its own exact parent during broader
receiving; this main file additionally carries the backup binding, historical fallback
display and editor/calendar wiring.

Backup supports up to 10,000 records; the calendar review supports up to 2,000 saved
records and a 4 MiB file. Backup admission therefore does not guarantee batch-calendar
eligibility for every stored tracker. The date-boundary case above directly exercises
another retained difference. All freshness checks are optimistic reads, without an
atomic transaction across browser tabs. No calendar-provider import, scheduled alarm
delivery, deployment or production-use benefit is claimed.

## Replay and execution notes

With the repository's declared native dependencies installed, run from its root:

```sh
npm test
npm run build
RETURNBY_PLAYWRIGHT=/absolute/path/to/playwright/index.mjs \
RETURNBY_CHROME=/absolute/path/to/chromium \
RETURNBY_EVIDENCE=/absolute/path/to/new-evidence \
node tools/check_calendar_backup_receiving.mjs
```

`RETURNBY_BASELINE_BUILD` optionally points at the exact original receiving `dist` and
enables the baseline control. The successful run's full environment, exact harness
hash, source pins and copied artifact hashes are in `provenance.json`. Preserve the
raw `.ics` line endings when transferring or applying the evidence patch.

The first attempt to save the receiver failed while the shared disk reported zero
available space, before any browser execution. It left an empty new file and changed
no application source. The contributor verified all file bytes and modes in four
copied dependency packages against an existing donor before replacing only its own
duplicate copies with read-only links. That removed 82,743,656 logical copied bytes;
no equivalent physical-space claim is made. The successful browser run used a
task-owned memory-backed temporary directory, which was empty and removed after its
contexts, browser and local server closed. There was no failed browser run or source
repair in this composition qualification.
