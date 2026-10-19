# Ordinary actions received with backup, editor and calendar

The exact qualified PR #16 Save/Remove correction is accepted on the separately
reviewed portable-recovery + editor + calendar composition. The resulting product
passes 201 native tests, the strict TypeScript/Vite build, five unchanged owner
browser controls and three new cross-feature Chromium receiving groups. No
production repair was needed. Independent source review accepted the composition.

## Exact receiving sources

| Input | Remote commit | Remote tree |
| --- | --- | --- |
| Retained #8/#10 integrator | `17e1a3286a5e8136d1d5dc09da37f33fd1baa100` | `7b353c0d59058ff624da8573bedbd41aa61150f0` |
| Calendar PR #19, stacked on editor PR #14 | `e64fd96ffda52ec571779edfeec609f7b01c3c9f` | `790f376db5971dffb040ca2d217bd6870b952667` |
| Ordinary actions PR #16, stacked on the same editor | `480a99bd6de57ff04089975b34b43856da56fdf9` | `e439842851966ad29f6fc2787c951967e23358b5` |

The receiving source before PR #16 is local commit
`49674969755b476aa05bc11d3d7d49892ae40779`, exact tree
`b5a3438748a4e81a8db96c3224d5c21e0629165b`. Its 195-test/build and four-group
actual browser packet remains unchanged at
`docs/receipts/calendar-backup-receiving-20261008-b55367d787c4/`.
Those historical browser results retain their original source bounds; they are
not represented as a new run against this extension.

The final application freeze for this extension is local commit
`50cf9e6efd8a7c92f664ddc09aaf7f9a47c41a8f`, tree
`0ea163db4637c50dd68be33d6015daa5dc94e522`. Its only changed production file is
`src/main.ts`, Git blob `9eaa6c1f66d93c8ab7b9c9614ce5940b5aa11b13`, SHA-256
`7d2d2b1ff1c783e50230b5c8bc149d9ec4dcf80bae25689e38d3527ad7899dd3`.
The receiving packet adds documentation and test source afterward without changing
that application freeze. Local snapshot commits must not be used as remote parents.

All 81 blobs of PR #16 were checked against its native remote tree before copying.
The exact owner helper, Save and Remove spans were applied to the combined
`main.ts`; the two README additions were composed without replacing the existing
backup/editor/calendar instructions. The owner's 15 new files, including the
original tests, browser harness and receipt packet, are unchanged. Every other
file under `src/` is byte-identical to the receiving baseline, including the
strict storage reader, subtotal parser, dynamic historical fallback labels,
backup import/export and editor/calendar implementation.

The latest native source/ownership check still showed the same integrator,
calendar, editor and PR #16 heads. Main had separately merged PR #17 daily
refresh at `3913697f70a31d73e8fe7d02b686b306830c24db`, tree
`ab4534a2e1afdace5d27a6079012c776c0e66f70`. That change is explicitly outside this
frozen receiving scope. The broader #8/#10 owner keeps their branch; this packet
supports a distinct receiving branch and does not overwrite their source or
claim the separate daily-refresh or parser-date work.

## Executed qualification

**201/201 native tests in 12 files and the TypeScript/Vite build pass.** This is
the full existing 195-test combined suite plus the owner's six actual-handler
tests. Logs and command/status receipts are in `execution/`.

The **exact unchanged five-case owner browser harness** was executed on both
compiled combined builds. All five controls reject the preceding composition,
reproducing lost remote changes or unreviewed removal. All five pass on this
extension. `execution/owner-browser-execution.json`, both console logs and both
result files preserve the actual failure/success evidence. The original owner's
earlier standalone qualification stays in its own unchanged receipt directory.

The new source-complete harness
`tools/check_actions_backup_calendar_receiving.mjs` passes **three actual
Chromium groups** on the frozen extension:

1. A stale tab holds a reviewed new-order draft while another tab edits a
   historical 45-day fallback, removes an unrelated return and restores a new
   backup record. Save preserves every current field and identity, keeps the
   deletion and appends the new order once. A real downloaded backup contains
   those exact records. At 390 px with Chromium touch emulation, the selected
   calendar contains only the two chosen current deadlines and stable UIDs;
   the restored unselected record remains saved. Calendar export writes nothing.
2. A selected identity is explicitly removed and restored with changed fields in
   the other tab. Calendar download refuses it before allocating a file. An
   obsolete Remove also makes zero writes, shows the refreshed card and retains
   the separate new-order draft. After review, a real calendar download has the
   same UID and the corrected December 9 deadline. A deliberate second removal
   then removes only that current target; a real backup retains the other record.
3. A latest-read refusal preserves both ordinary and staged-import drafts. Once
   storage is readable, the existing loading guard still prevents import from
   committing until explicit Retry loading. A later quota refusal keeps the
   ordinary draft; calendar export still reads only saved rows and makes zero
   writes. Another tab restores an additional order before retry. The ordinary
   retry retains all three current records and saves its draft once. The staged
   import requires a fresh review, adds its record once, and the real backup and
   calendar downloads contain all five current records.

The successful receiver recorded zero application page errors and zero external
requests. It hashes 16 application files and every built asset before execution
and confirms they remain unchanged afterward. The two new phone captures were
visually inspected: the calendar selection wraps within the viewport, and the
refused removal leaves the draft, explanation and corrected card visible in the
full-page capture. Touch means Chromium emulation, not a physical-device test.

The first new receiver attempt tried a backup download while that tab's backup
panel was collapsed. Its download wait timed out before acceptance; the original
test source and failure log are retained under `rejected/`. The corrected harness
opens the native backup panel first and joins the action/download promises so a
failure is recorded through cleanup. This changed only the receiver. The next
complete run passed all three groups against the unchanged product freeze.

## Independent review

`independent-review/` is copied byte-for-byte from the engine contributor's
separate source review. Its reviewer verified the exact owner spans, all other
source files and the existing fresh-read/guarded-commit bindings. No repair was
requested. This supplemental review is source-only; it claims no duplicated
native or browser execution. `REVIEW.md` SHA-256 is
`5588cfa294369d52629b0c158a234f43a969a635b5d8c49ece88bc0c97acab41`.

## Repeat and limits

From the composed source with its pinned dependencies available:

```sh
npm test
npm run build
RETURNBY_PLAYWRIGHT=/absolute/path/to/playwright/index.mjs \
RETURNBY_CHROME=/absolute/path/to/chromium \
node --test tools/check_stale_browser.mjs
RETURNBY_PLAYWRIGHT=/absolute/path/to/playwright/index.mjs \
RETURNBY_CHROME=/absolute/path/to/chromium \
RETURNBY_EVIDENCE=/absolute/path/to/receiving-output \
node tools/check_actions_backup_calendar_receiving.mjs
```

Both browser harnesses serve a local production build, use disposable contexts
and close their servers. `RETURNBY_BUILD` chooses the compiled build; the owner
harness uses `RETURNBY_STALE_OUTPUT` for its output. Existing qualified dependency
and browser installations were reused without downloads or duplicate caches.
The runtime identities are retained in `provenance.json`.

The storage reread is optimistic and is not an atomic transaction across tabs.
Complete-object comparison may conservatively ask for another removal review
when only property order differs. Backup and calendar retain their distinct
admission limits. No continuous cross-tab synchronization, calendar-provider
import, scheduled notification, physical-phone acceptance, deployment or observed
customer-use outcome is claimed. Raw `.ics` evidence intentionally retains CRLF.
