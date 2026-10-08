# Independent receiving: ReturnBy bulk calendar export

## Decision and source

Accept the corrected issue #18 implementation on inherited main
`3913697f70a31d73e8fe7d02b686b306830c24db` (tree
`ab4534a2e1afdace5d27a6079012c776c0e66f70`) for the reviewed contract.
The reviewer worked in isolated copies and did not edit the implementation
owner's source. `REVIEW_CONTRACT.md` was written before candidate inspection.
The final receipt binds all four production files, both review programs, the
exact patch and retained observations. The complete accepted source copy is
`candidate-r2/`; the initial failing source remains in `candidate/`.

## Consequential finding and correction

With Due soon showing only a deadline due today, focus the calendar button
and cross midnight. The first candidate correctly removed the row and disabled
the button, but native Chromium moved focus to BODY. This lost the keyboard
user's context. The original failed assertion and five earlier passing groups
remain in `evidence/browser-r1/browser-review.json`; this report is deliberately
not marked as an overall pass.

The owner made a two-file correction: remember whether the export button owns
focus before disabling it, then focus the currently selected filter only if
that button has become unavailable. The main caller supplies the selected
filter element. `evidence/focus-correction.patch` records that narrow change.
The corrected replay passed three focused groups: a nonempty midnight update
preserves export focus; an empty midnight update moves focus to Due soon; and
an inactive export becoming empty leaves the intake textarea's focus and
unsaved text alone. The exact observed final active element is `filter-due`,
a BUTTON, with the selected filter still pressed.

## Independent evidence

| Review | Observed result |
| --- | --- |
| Actual first-candidate production browser run | Five groups passed, nine downloaded calendars; the additional last-row focus assertion failed as described above. |
| Corrected production browser replay | Three focused groups passed, three downloaded calendars, no page errors. |
| Existing single-event API compatibility | Forty independently selected vectors produced byte-identical output against the exact baseline ICS module. |
| Source delta review | The correction changes only the focus parameter/callback and guarded focus transfer. ICS and stylesheet bytes are unchanged. |

The actual downloaded files were parsed independently of the product writer.
Checks cover one calendar envelope, exactly the displayed identities and due
dates for all three filters, unique stable UIDs, a shared valid UTC stamp,
next-day exclusive ends, one DISPLAY alarm per event at -P3D, strict UTF-8,
CRLF, at most 75 octets per physical line, and preserved escaped literal text.
Inputs include punctuation, newlines, long Japanese text and emoji, plus text
that resembles a calendar component. Save and Remove update the event count
and selected rows immediately. A same-count midnight exchange replaces today
with the newly near deadline; a pageshow refresh also updates the export.
Enter and Space trigger actual downloads. A 390-pixel viewport remains within
bounds and the retained screenshot was visually inspected. Export leaves
stored order bytes unchanged. Empty trackers expose one disabled action.

The forty single-event comparisons cover month/year/leap-date boundaries,
a US DST-transition calendar date, blank and control-bearing text, literal
escaping, long Unicode identifiers, and two explicit timestamps. They execute
in UTC and establish compatibility, not a new promise about arbitrary control
characters or every timezone. This result carries to the correction because
`src/ics.ts` is byte-identical.

## Reproduction

Build the pinned source with the project's Vite dependency, using `base: './'`
(the complete committed Vite configuration), then serve its generated output
locally. Run `review_browser.mjs` with paired arguments `--url`, `--out`,
`--playwright` (module path), and `--chromium` (binary path). Its default mode
runs the full contract; `--only focus` runs the three bounded focus groups.
The receipt identifies the exact program used for each retained run.
`review_single_compat.mjs` takes baseline ICS, candidate ICS, the project's
TypeScript module path, and a JSON output path as positional arguments.

One corrected replay could not begin because Chromium crashed during initial
navigation while the ordinary scratch and shared-memory filesystems were
full. It executed no test groups. That runtime attempt is preserved separately
under `evidence/browser-r2-focus/`. A retry used an owned temporary browser
profile on a separate exec-scoped tmpfs and wrote all durable evidence into
this review directory. The retry passed. No files were deleted to obtain it.

## Limits and receiving boundary

These are local Chromium observations using synthetic local storage, actual
production JavaScript and actual downloaded files. They do not claim a real
calendar-client import, a real mobile device, deployed behavior, or another
browser engine. Native unit/build results reported by the implementation
owner and parent are separate evidence, not recounted as reviewer executions.
The parent's independent #16 editor/storage composition is also separate;
this acceptance binds the standalone #18 four-file patch and its corrected
focus contract. No further blocker was found within that scope.
