# ReturnBy

## Download the multi-confirmation browser preview — 2026-11-10

**[Download the new multi-confirmation ReturnBy ZIP](https://raw.githubusercontent.com/Jacob-Met/returnby/c908f9c8176554afa1aba8c672ad07042156d637/downloads/returnby-browser-2026-11-10-batch-intake.zip)** — [package checksum and launch notes](https://github.com/Jacob-Met/returnby/tree/c908f9c8176554afa1aba8c672ad07042156d637/downloads). SHA-256: `23a77516a3c75ffc0a22b1951be6f92613e1e1e76e575ecda161a7263df3d86c`.

This build adds review and local saving of up to 20 pasted or UTF-8 text-file order confirmations together, while retaining individual editing, backups, calendar exports, the trip checklist and deadline planning. Extract the ZIP, run `START-WINDOWS.cmd` or `./start-mac-linux.sh` (Node.js 20+), and visit `http://127.0.0.1:8787/`. The compiled package needs no npm install. It was checked after a clean extraction and then downloaded back from GitHub byte-for-byte; the six actual Chrome receiving groups passed on desktop and phone. Source: [merged PR #85](https://github.com/Jacob-Met/returnby/pull/85). This is a versioned distribution, not a formal GitHub Release.

## Previous single-confirmation browser preview — 2026-11-10

**[Download the verified ReturnBy browser ZIP](https://raw.githubusercontent.com/Jacob-Met/returnby/a637cd465c26e2d6a4729a7e07e162f70e9f2b83/downloads/returnby-browser-2026-11-10.zip)** — [distribution record and launch details](https://github.com/Jacob-Met/returnby/tree/a637cd465c26e2d6a4729a7e07e162f70e9f2b83/downloads).

Unzip the package, install Node.js 20+ if necessary, run `START-WINDOWS.cmd` on Windows or `./start-mac-linux.sh` on macOS/Linux (or `node serve.mjs`), and open `http://127.0.0.1:8787/`. This is a loopback-only local app with compiled assets, no npm install or account required; saved returns stay in that browser profile. It includes the [single-reminder stale-deadline fix](https://github.com/Jacob-Met/returnby/pull/83), a file checksum manifest and a real Chrome screenshot with fictional orders. Its public ZIP was downloaded back and matched the tested archive byte-for-byte (SHA-256: `505ff5b7d6d6ca7a0163ede641f6da7fb56c3e4cde6c0915231ad0d915ef1de4`). The merged source is [abd33f98](https://github.com/Jacob-Met/returnby/commit/abd33f98a571e03e9c36d2ea0a27a392c823e275). Verified on Linux with Node 22 and Chrome 156; Windows/macOS launchers and other browsers were not independently exercised.

**Previous version:** [ReturnBy v0.2.0 browser ZIP](https://raw.githubusercontent.com/Jacob-Met/returnby/9cd8d0d5f2fd8ba32a0525db65e292cae92ccdcf/downloads/v0.2.0/ReturnBy-v0.2.0-browser.zip), built from [b1c32488](https://github.com/Jacob-Met/returnby/commit/b1c32488f1d198a5461abf61bf98467ff99bba55). That historical package has **Python 3** launchers and uses port **8769**; it predates the new calendar freshness fix. Both downloads are on versioned GitHub distribution branches because the connected GitHub integration cannot create formal Releases.

ReturnBy turns an order-confirmation email into a reviewable return deadline and a calendar reminder. The visitor supplies the email text; the browser runs the repository's real rule-based parser, merchant-policy lookup, date calculation, status logic and RFC 5545 export. It is a multi-order tracker, not a canned result: correct extracted fields, override a return window, save several deadlines, filter the list and export a three-day alarm for any order.

## Import exported email confirmations locally

Open **Review several order confirmations together** and choose one or more UTF-8 `.txt` or standard `.eml` messages. For exported `.eml` files, ReturnBy extracts the readable `text/plain` MIME body, including common base64 or quoted-printable encodings. It does not render HTML or inspect attachments, and it refuses HTML-only messages rather than extracting potentially misleading details. Unsupported MIME structures and charsets produce a visible error.

All files are processed in the current browser tab and the raw email is not saved. The existing batch review requires you to correct and approve extracted store, order number, date and window before saving any fields. Each file is limited to 100 KiB, each batch to 20 confirmations and 1 MiB total. If one selected file cannot be read, none of the selected files is added. This is **not** an inbox connection or a general-purpose email/attachment parser.

The pure MIME-reader tests are `tests/eml.test.ts`; the production Chrome file-picker course in `tools/verify_batch_intake.mjs` includes a real .eml save and an HTML-only all-or-nothing rejection.

## Privacy

The original pasted email is not sent or persisted. The user must review and save fields; only merchant, order number, total, order date, return-window days and timestamps are kept in this browser's local storage. There is no account, inbox connection, analytics, external API or model call. Clearing the list removes saved records from this device.

## Export several calendar reminders

Choose **Export several reminders** above the tracker to review saved returns in a single
calendar download. The initial checkboxes follow the current **All**, **Due soon** or
**Expired** filter. Every saved return remains visible in the dialog so you can select
individual orders, select all available records, or clear the selection. The preview
shows the exact selected count and deadline range, including a visible past-due count.
Cancel and Escape leave the saved tracker and new-order draft intact.

**Download selected reminders** creates one local `.ics` file containing one all-day
event per selected order, sorted by deadline and then saved identity. Each event retains
the existing per-order calendar UID and three-day display alarm. The file includes the
merchant, order number and deadline; it excludes the order total and original email.
Open the downloaded file in your calendar application to import it. The receiving calendar
decides how to handle an already imported UID; this is a file export, not a subscription.
Download again after correcting a saved deadline.

The exporter reads saved returns again immediately before producing the file. If a selected
merchant, number, order date, window or identity changed, or the return was removed or
became ambiguous, download stops and asks for **Reload saved returns** and another review.
Unrelated changes stay intact. A storage-read failure keeps the selection for retry.
Export never writes to browser storage. The reread is a freshness check, not an atomic
transaction across browser tabs.

Invalid dates/windows and duplicate or unsupported calendar identities remain visible with
an explanation and cannot be selected. Other valid returns can still be exported. The dialog
supports up to 2,000 saved records, with 4,096-character limits on exported fields and a
4 MiB calendar limit; oversized selections must be reduced. Existing single-order reminders
continue to use the same calendar serialization.

The native tests cover exact event identity/text, fixed dates, Unicode folding, selection,
stale-record refusal and output admission. A separate optional real-browser receiver is
`tools/check_calendar_batch_browser.mjs`. It starts its own loopback server for a production
build and uses fresh profiles with fictional orders; configure `RETURNBY_PLAYWRIGHT` and
`RETURNBY_CHROME` for an installed Playwright module and Chromium executable. Set
`RETURNBY_BUILD` (default `dist`) and `RETURNBY_EVIDENCE` for the built source and evidence
directory; `RETURNBY_BASELINE_BUILD` optionally adds the unchanged pre-feature comparison.

## Correct a saved return

Choose **Edit details** on a saved order. The separate editor keeps the original saved deadline visible beside the proposed deadline while you correct the store, date, return window, order number or total. **Save changes** replaces that one reviewed order; **Cancel** or Escape leaves it untouched. The original ID and creation time remain, so its calendar UID stays the same. Download a new calendar reminder after saving if needed; files already imported into a calendar do not change automatically.

The editor accepts real dates from years 1000–9999 and positive whole-day windows with a deadline before 9999-12-31, leaving room for the calendar reminder's next-day end date. Text fields are limited to 4,096 characters. Changing the merchant or window recalculates the source label using the existing local policy table. Corrections to other fields preserve the saved source label and duration, including historical fallback values. These labels do not verify a retailer's current terms.

An unsuccessful read or save keeps both the old saved data and your edit draft. If this order changed or was removed while the editor was open, saving is refused and the tracker refreshes; cancel and reopen the editor to review its latest saved version. New or changed unrelated orders are preserved by reading the saved tracker immediately before committing. This check does not create a transaction across simultaneous writes in different tabs. Your separate new-order draft and pasted text stay in place throughout editing.

## Move or back up your tracker

Open **Back up or restore saved returns** below the tracker and choose **Download backup**. Keep the downloaded JSON file private: it contains the saved order details, original saved IDs, creation times and return-window source labels. The exporter copies only the approved Order fields; it does not read the paste box or export unrelated stored properties. A backup is an ordinary unencrypted file. Clearing browser storage does not delete files you downloaded.

In the receiving browser, choose that file to see a preview before any orders are saved. New IDs are added, matching copies are skipped, and an ID with different saved fields blocks the whole import. **Cancel import** leaves the tracker unchanged. Return windows and `windowSource` labels are preserved, so importing does not reinterpret an older order using today's local policy table. These labels are historical file data, not verified current retailer policy. Existing drafts in the paste/review form stay available.

The importer checks the entire versioned document before showing a plan. Unsupported versions, unknown fields, duplicate IDs within one file, invalid dates/windows, and malformed records are refused without writes. Files may be at most 5 MiB and contain at most 10,000 orders; the resulting tracker also stays within that count and must remain exportable within the 5 MiB byte limit. A near-limit export uses compact JSON when indentation would exceed the limit. Normalization or combining two individually valid files may exceed the limit; such an import is refused before any write. Text fields may be up to 4,096 characters and IDs up to 128 characters. Dates must use a four-digit year from 1000 through 9999, and the return window must end within that range. Creation/export timestamps require an explicit timezone. Optional empty order numbers and totals are normalized to empty strings.

The preview is recalculated against readable browser storage before committing. If saved orders changed since review, the updated plan requires another Import click. Storage failures preserve the preview for retry. This does not add continuous cross-tab synchronization or a transaction spanning simultaneous writes from different tabs; avoid editing the tracker in another tab during import. The existing tracker controls and single-order calendar export keep their behavior.

## Using more than one tab

Saving a new reviewed order reads the latest saved tracker first, preserving
orders that another tab added, corrected or removed. Removing a return also
reads the latest tracker and checks that the selected saved return still matches
the card you saw. If it changed or disappeared, nothing is removed; the refreshed
tracker lets you review the current state before trying again. Your separate
new-order draft stays in place.

If the latest saved tracker cannot be read, use **Retry loading saved returns**
before saving or removing. A failed write keeps the draft, and the next attempt
reads the saved tracker again. These checks protect already observed changes;
they do not make simultaneous writes in different tabs transactional. **Clear
saved returns** retains its existing confirmation and reset behavior.

## Run and verify

```bash
npm ci
npm test
npm run build
npm run dev
```

The optional browser receiver runs through `py -3 tools/capture_returnby.py` (requires Playwright and Chromium/Chrome). It can receive an existing build or URL and keeps its screenshots, downloaded calendar and result in a new evidence directory. See [browser acceptance](docs/BROWSER_ACCEPTANCE.md) for `--dist`, `--url`, browser selection and output instructions. The sample orders use fictional merchants; the parser's policy table is a convenience, not a guarantee from any retailer. Users should confirm a deadline with the store's current terms.

The optional backup browser acceptance runs with `node tools/check_backup_browser.mjs` against `npm run preview -- --host 127.0.0.1 --port 4173`. It requires Playwright and Chromium; `RETURNBY_PLAYWRIGHT` can point to an installed module, `RETURNBY_CHROME` to an existing Chromium executable, and `RETURNBY_CAPTURE_DIR` to a capture directory. It uses fresh temporary browser profiles and fictional orders.

`node --test tools/check_stale_browser.mjs` runs five real two-tab controls
against the production build in `dist/`. It accepts the same optional
`RETURNBY_PLAYWRIGHT` and `RETURNBY_CHROME` paths as the editor harness;
`RETURNBY_BUILD` and `RETURNBY_STALE_OUTPUT` select the build and receipt folders.

The optional Raider browser acceptance and desktop/phone captures run through `py -3 tools/capture_returnby.py` (requires Playwright and Chromium/Chrome). The sample orders use fictional merchants; the parser's policy table is a convenience, not a guarantee from any retailer. Users should confirm a deadline with the store's current terms.

The saved-order browser acceptance runs with `node tools/check_edit_browser.mjs` against a local production preview. It requires Playwright and Chromium; `RETURNBY_PLAYWRIGHT` and `RETURNBY_CHROME` may point at existing installations, `RETURNBY_BASE_URL` selects the local preview, and `RETURNBY_DOWNLOAD_DIR` can select a shared writable download directory for a confined browser. `RETURNBY_BASELINE_URL` optionally checks a separately served original build, and `RETURNBY_CAPTURE_DIR` saves results and captures. `tools/check_edit_backup_browser.mjs` is an additional receiving check for a composition containing portable-backup PR #10; it exercises a restored order through editing, export and restoration, plus stale import previews. The original branch retains its historical qualification artifacts; this mainline source includes runnable native and browser acceptance tools.

## Implementation

- `src/parse.ts`: order-date, merchant, order-number and total extraction.
- `src/policy.ts` / `data/policies.json`: merchant lookup with an editable 30-day fallback.
- `src/deadline.ts`: date arithmetic and urgency states.
- `src/store.ts`: local-only persistence of approved fields.
- `src/backup.ts` / `src/backup-ui.ts`: versioned backup validation, duplicate/conflict planning and reviewed import/download controls.
- `src/edit.ts` / `src/edit-ui.ts`: reviewed corrections with stable order identity and conflict/storage refusal.
- `src/calendar-batch.ts` / `src/calendar-batch-ui.ts`: selected multi-return calendar review and fresh storage checks.
- `src/ics.ts`: calendar reminder generation.

The app is browser-only; no AI runs in the page. The Devpost Learn planning documents are not completed interview output and are not represented as such.

## Return-trip checklist

From the saved-order list, open **Prepare a return-trip checklist**. Select orders and a planned date, review the saved facts, then download a self-contained HTML sheet to open offline and print. The page keeps the existing tracker unchanged; selections, paper check marks and notes are not saved. Each amount stays literal and every window retains its stored source. See [the checklist guide](docs/TRIP_CHECKLIST.md) for refresh behavior and date limitations.

## Reading long saved-order labels

Saved store names and order references wrap within their tracker cards, including
long unbroken identifiers on phone screens. The full text stays available; saved
fields, deadline calculations, filters and calendar contents are unchanged.

## Plan a month of saved deadlines

Open **Plan around saved return deadlines** to see a Monday-first month view.
Each day shows the number of saved returns due that day. Select a date to read
its exact saved identities, stores, order numbers, totals, order dates, return
windows, historical window-source labels and creation times. Empty optional
fields say **Not recorded**. Larger days use 20-record pages, with every saved
record reachable. The view includes the whole tracker, independent of its
current filter.

Use **Previous month**, **Next month**, the month input or **Today** to navigate.
The day buttons support arrow keys and Home/End within the displayed month.
Month navigation, reopening the panel and **Refresh saved deadlines** read a
new complete snapshot. The snapshot label gives its load time, local timezone
and the civil date used for urgency. After saving, editing, importing or
removing a return in this or another tab, refresh before relying on the view.
A day selection or record-page change reads the already accepted snapshot.

This view is read-only: it does not save, import, remove, export or modify a
draft, and it adds no automatic cross-tab synchronization. It admits the
complete saved collection through the existing portable-backup contract before
showing any counts. Unreadable storage or any invalid saved record refuses the
whole view until a successful refresh; the requested month/day remain available
for retry. The supported range and limits are the backup's January 1000 through
December 9999, 10,000 records and 5 MiB. A deadline on 9999-12-31 can be viewed
even though the separate calendar exporter needs a following end date.
Displayed amounts and historical source labels are saved text, not current
retailer-policy verification.

The focused model tests run with the existing `npm test`. The independent
`deadline-overview-browser` fleet receiving command checks the actual app and runs
`node tools/check_deadline_overview_browser.mjs --browser /path/to/installed/chrome --output /new/owned/output`
with Node 22, the installed system Chrome and standard CJK fonts. It uses a new
browser profile and fictional native Review/Save, backup import, other-tab
Edit/Save and calendar-download controls. It freezes month/leap/year/range
oracles, literal field rendering, paged records, explicit refresh and whole-read
refusal, while observing exact saved bytes, write attempts and unrelated drafts.
The bounded receipt contains actual records, one unchanged calendar download,
screenshots and source/build hashes. Generated captures and direct visual
receiving are reported separately. Production remains dependency-free; automated GitHub Actions are not required. The separate HTML module entry keeps the existing tracker entry
and its native receiving fixtures unchanged.

This monthly overview originated in the reviewed PR #20 integration branch. The mainline integration preserves it alongside the trip checklist and newer deadline preview.

## Review several confirmations

From the intake panel, open **Review several order confirmations together**. Add pasted confirmations or local UTF-8 text files, correct each extracted order and select the orders you reviewed. The final preview precedes any save. Raw confirmation text and unsaved drafts stay in memory; the saved tracker is re-read to refuse changed or ambiguous orders. See [the batch intake guide](docs/BATCH_INTAKE.md) for limits and retry behavior.
