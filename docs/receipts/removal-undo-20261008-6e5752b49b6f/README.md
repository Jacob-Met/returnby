# ReturnBy last-removal recovery — qualified contribution

The last successfully removed saved return can be restored through an explicit
**Undo removal** action. This protects reviewed order details after an accidental
Remove without requiring re-entry or a whole-tracker backup. **Keep removed**
discards the recovery. There is one pending removal and no short countdown.

Owner: `chatgpt-6e5752b49b6f / production_slice`, issue **#23**. The source was
claimed in the existing receiving thread, #8 comment **6059991421**. Final stack
adoption remains with the **#8/#10 integration owner**; this contribution is
stacked on **#20**, with no deployed-site change.

## Source identity and preservation

| Stage | Exact identity |
| --- | --- |
| Actual remote receiving base | `7829e56e57ef91dfe8edd5853fd68d6c7890fac0` |
| Receiving base tree | `b28e7b706fe67fd4b34111badd581c6bdd2ed4a7` |
| Local same-tree surrogate | `f6f030a040e14ba16cf6dc683921ba0d8e80369e` |
| Executed application source | `e6877263ae20b2eb8ecd27cc2014badb7d4206d3` |
| Application source tree | `1eadf301326a4a38cbfa6c4ea48925d06abfc430` |
| Browser-harness-only successor | `28eecc07a6552a9d16da7feebd352db06ab7fcc8` |
| Browser harness SHA-256 | `cfcf7af3eb62406e03491eaea7bd92b98581f10867c46b81155ff5f4e8c05cd5` |
| Undo model SHA-256 | `c5a885be25b70885e284d76635cb7e453ae1be2c04ce87ee38f22adfd69d9d75` |
| Undo controller SHA-256 | `5590981d5a7f4fb714abc09a86cd498606ae116f7956761d53b21cf6d47d3670` |

The local surrogate is explicitly a same-tree recovery, not the original remote
commit or ancestry. Publication uses the actual remote receiving commit as its
parent. `base-tree.json` is the fresh recursive GitHub inventory: all **191**
leaves were admitted before edits. `source-preservation.json` verifies all
**188** non-overlapping base leaves and modes remain exact. Existing-file edits
are confined to `src/main.ts`, `index.html` and README; the model, controller,
CSS, tests and optional browser receiver are new paths. The final README adds
browser-reproduction instructions after the executed application freeze; no
runtime source changed after that freeze.

Store/schema, backup/editor/parser/policy/deadline/calendar code and the existing
tests retain their original bytes. Lookup **#22**, the separately claimed CSV
export, main's **#17** daily refresh/focus and the deliberately deferred **#6**
parser remain distinct inputs for the existing integrator's later composition.
This receipt does not qualify combinations that were not executed here.

## Recovery semantics

The ordinary Remove guard from #16 still rereads storage and requires a unique
saved row matching the displayed record. The capture comes from that exact fresh
row, including original ID, creation time and any nested stored properties. It
is remembered only after persistence succeeds. Failed or stale Remove actions
leave a prior recovery intact.

Undo rereads current storage. If the ID is absent, it inserts the original row
into a copy of the current array, at its original storage index clamped to the
current length. Newer unrelated additions, edits and removals survive. If one
fully equal JSON record is already present, object-key order does not matter:
the tracker refreshes without any write. A changed same-ID record or duplicate
IDs refuse restoration and retain the capture. Private serialized capture data
is detached from later object mutations.

Read/write failures retain recovery for explicit retry. A failed read keeps the
existing **Retry loading saved returns** gate; using that control does not
discard the capture. The next successful Remove replaces it. A successful
confirmed Clear, Keep removed, or actual page reload ends it; cancelled or failed
Clear does not. New-order draft text and the current urgency filter stay in place.
Successful recovery focuses persistent status text, and dismissal returns focus
to the selected filter. The notice's shortened label never truncates stored data.

These are fresh-read checks over localStorage, not an atomic transaction across
simultaneous writers. The original single-order calendar identity is retained;
already imported calendar files do not change automatically.

## Executed qualification

### Native production code

On Node **24.19.0**, Vitest **5.0.3** passed **213/213 tests** across 14 files:
all **201** existing tests and **12** new tests. The new tests execute the native
TypeScript planner and actual application/controller/storage bindings, covering
field retention, current-list preservation, retry, identity conflicts, successful
versus failed/stale removals, replacement, clear and focus lifecycle. TypeScript
checking and the Vite **8.3.3** production build both exited 0.

`source-r1.json` records the executed command results and exact source hashes;
`build-r1.log` is the captured production build output. Existing installed
packages were borrowed read-only. Package links and generated caches belonged to
this contribution; no dependency installation or shared build was performed.

### Author's actual browser checks

The shared cloud temporary filesystem lacked enough space to launch a browser.
No cloud browser pass or attempt is claimed. The compact compiled runtime was
transferred to the existing Mac runtime, with all **11** source/build/harness
files hash-admitted before and after execution. The two old public demonstration
screenshots were omitted from transfer because the running page does not refer
to them; actual runtime requests and asset hashes are recorded in the receipt.

Actual runtime: **Darwin arm64, Node 26.3.0, Chromium 151.0.7922.34**. All six
groups passed on the frozen application:

1. Actual review/save, keyboard Remove/Undo, full original fields and independent
   draft preserved; safe literal markup; completion and dismissal focus.
2. Two removals retain only the latest successful one; recovery remains after a
   controlled one-hour clock advance.
3. Cancelled and refused Clear retain recovery; successful confirmed Clear ends it.
4. Read refusal requires explicit loading retry, then restores without losing the
   new-order draft.
5. Actual page reload ends the transient recovery.
6. A 390px notice fits without page/card/action overflow, has 44px actions and
   working keyboard navigation; long literal labels wrap and their full records
   are recovered unchanged.

All three screenshots were visually inspected. No page error, console error or
external request occurred. The borrowed browser, Node executable and Playwright
entry hashes stayed unchanged. Browser/server closed and the owned temporary
profile directory was empty afterward. Storage errors are synthetic exceptions
before native Storage operations; the clock check is a controlled advance, not a
one-hour wall-clock wait. The long-label layout gate concerns the new notice,
not the pre-existing tracker-card handling of unbroken text.

The original native files under `owner-browser/` were transferred byte-for-byte
against `owner-browser/native-evidence-manifest.json`. The browser receipt is
`owner-browser/receiving-undo/browser-r1/receiving.json`, SHA-256
`fcc9c3a8ab4ba3e828cc586c74396affde946f3f3d1974e518e2484e1b96b895`.
The input archive `native-browser-inputs.tar.gz` is exactly **29,355 bytes**,
SHA-256 `ffadf93db288f275a6a376a68dc5d6cf90bf7c72743d9cd3ccdd6939efebe94b`.
Its admission/runner scripts retain their original temporary paths as execution
evidence; use the repository browser command below for a new receiving run.

### Independent root receiving

The independent receiver read the full source and authored a separate native
reference and actual two-tab browser cases. It accepted the exact application
with **five native model groups** and **three actual Mac browser groups**. The
model cases include 16 current-state/placement combinations, three special or
ordinary IDs with reordered JSON keys, 12 consequential field conflicts,
duplicate IDs, detached capture and failed-write replanning.

The two-tab test refuses the first Undo write, uses the real Edit and new-order
Save controls in the other tab, and then proves Undo preserves those changes.
Two actual `.ics` downloads retain the same contents except their real generation
timestamp. Separate cases verify no-write completion for reordered equal data
and conflict refusal followed by successful retry. No source finding remains.

`independent-receiving.tar.gz` is the untouched **10,242-byte** peer archive,
SHA-256 `13e7700b2eb91822047808a6078a21278c7e93c722883c6731c7e2112c1dad7f`.
Its ten files are also readable under `independent/`, preserved byte-identically.
Authorship and original runtime/version limits remain in its README. The author
did not relabel this independent execution as their own.

## Reproduction and integration

From a checkout of this contribution, use the repository's normal commands:

```sh
npm ci
npm test
npm run build
node tools/check_removal_undo_browser.mjs
```

For an already installed browser, set `RETURNBY_PLAYWRIGHT` to its Playwright
entry and `RETURNBY_CHROME` to the Chromium executable. `RETURNBY_BUILD` defaults
to `dist`; `RETURNBY_UNDO_OUTPUT` selects a new evidence directory. The browser
receiver uses a fresh local origin/profile with fictional data. A detached,
hash-admitted runtime copy may supply `RETURNBY_SOURCE_HEAD`; a normal checkout
reads its own Git head. The independent packet documents its two separate
receiver commands.

The final integrator should receive this narrow delta alongside its other owned
stack inputs and run the resulting current-composition gates. This publication
does not move the receiving owner's branch, main, or a deployed site.
