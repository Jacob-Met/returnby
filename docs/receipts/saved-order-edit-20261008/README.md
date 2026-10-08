# Saved-order editing: source and receiving evidence

The editor replaces one reviewed saved return while preserving its original ID,
creation time and unrelated stored data. Validation, failed storage operations,
changed targets and removed targets leave the draft available. The companion
JSON receipt records the exact source hashes and the limits of this qualification.

## Source pins

The receiving source is ReturnBy PR #9 at
`fbd48a6e63d1b071de10e4e40d875184fa461141`, which retains the PR #5 persistence
and PR #7 policy-attribution changes. Local text snapshot
`caf559a900ecaf3502907d70955c880ec4f27aa8` has 35 exact Git-blob matches; two
unchanged pre-existing PNG captures were omitted locally and remain in the remote
base tree. The independently accepted application source is local commit
`f912dbe26874172556824ace922c685af28b0e3a`. Later additions are qualification
tools, documentation and this evidence; the application code stays identical.

## Evidence map

| Evidence | What it establishes |
| --- | --- |
| `native-tests.txt`, `build.txt` | 73 tests across six native files; TypeScript and Vite build pass. |
| `independent/` | The same six independently authored controls reject the original calendar-end boundary, then accept the correction. All eight received files were hash-verified. |
| `final-browser-run.txt`, `final-browser-results.json` | Actual Chromium execution of the final standalone editor, combined editor, unchanged backup harness and a dedicated edit/backup handoff. All four runs pass. |
| `browser-transfer-manifest.json` | SHA-256 identities of all 17 transferred build and harness files checked on the receiving host before execution. |
| `browser-runner.mjs.source` | The environment-specific loopback runner used for that receiving execution. It is preserved as evidence rather than an ordinary project command. |
| `composition-inputs.json`, `composition-native-tests.txt`, `composition-build.txt` | Exact backup PR #10 source inputs; 145 native tests and a successful build of the isolated composition. |
| `backup-composition-overlap.patch` | Additive changes in the four shared files when composing backup PR #10 with the editor. |
| `initial-build-failure.txt`, `browser-initial-download-failure.txt` | Retained rejected build/environment approaches, without treating their partial execution as acceptance. |

The browser run used fresh contexts, fictional orders and a loopback static
server on the existing ThinkPad Chromium installation. It validated cancel and
Escape, before/after deadlines, stable downloaded calendar identity, the separate
new-order draft, invalid inputs, storage read/write refusal followed by retry,
actual second-tab additions, changed/removed target refusal and phone layout.
The application issued no external requests and raised no browser errors.
The browser and server closed after execution.

## Backup receiving composition

This is distinct from the standalone source change. It combines the accepted
editor with portable-backup PR #10 at
`2ff4f9406ac05e72456a6fb425f5d6499520234f`; that PR's parent is
`43a11d9f66ca2d8cb7902f8ed1bcae2ac0962fbf`. The isolated combined commit is
`d4d991e19a0bb9bd527a15afceed483b7f9bacdc`. No backup-owner source or ref was
modified.

The overlap patch applies to the editor at `f912dbe`; recover the seven newly
added backup files from the exact PR #10 tree using the hashes in
`composition-inputs.json`. It retains PR #9's strict load behavior and write
guard, adds the backup reader and controls, and preserves both renderer edits.
The backup owner retains the broader integration with the separately owned
parser changes; this evidence does not claim that broader composition.

In the receiving browser, an imported historical 45-day fallback survives an
unrelated correction, download and import into a fresh context with exact fields.
An import preview staged before an edit requires renewed review before adding its
new order, and preserves the correction. Importing an older copy with the same ID
refuses the conflict instead of replacing the corrected record. The new-order
draft remains available throughout.

To repeat browser qualification, serve the relevant production build locally and
run `tools/check_edit_browser.mjs`. Use `tools/check_edit_backup_browser.mjs` only
with the composed backup controls. The project's README documents optional
Playwright, Chromium, URL, download-directory and capture-directory settings.

## Practical limits

The saved-target comparison is optimistic and does not provide a transaction
across simultaneous browser-tab writes. Existing downloaded calendar files do
not change automatically. Historical source labels are preserved data, not a
verification of current store terms. These results establish source, native and
isolated browser behavior; they do not assert a deployed-site update or measured
production use.
