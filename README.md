# ReturnBy

A private purchase-to-return desk: review purchases, keep their return dates visible and prepare the next errand without connecting your inbox.

## Download and run

**[Download ReturnBy browser preview](https://github.com/Jacob-Met/returnby/releases/download/returnby-trip-2026-11-10/ReturnBy-2026-11-10-trip-54c12f5-browser.zip)** · [Release notes and exact source](./docs/releases/returnby-trip-2026-11-10.md) · [Watch the actual 35-second browser journey](https://github.com/Jacob-Met/returnby/releases/download/returnby-trip-2026-11-10/ReturnBy-trip-demo-54c12f5.mp4)

The November 10 trip release keeps the planned date, purchases, packing checks and drop-off notes when you leave and return. It includes manual purchases, confirmed return-window dates and removal undo. The public ZIP has been downloaded and run through its included Linux launcher, real Chrome journey and 390px layout.

Extract the ZIP, use Python 3 to run `serve_returnby.py`, then open **http://127.0.0.1:8769/**. Windows/macOS launchers are also included. Keep the same browser profile and port to retain existing orders. This is an experimental local app; the exact supported features and platform limits are in its release notes.

[Desktop screenshot](https://github.com/Jacob-Met/returnby/releases/download/returnby-trip-2026-11-10/trip-desktop.png) · [Phone screenshot](https://github.com/Jacob-Met/returnby/releases/download/returnby-trip-2026-11-10/trip-mobile.png) · [Earlier distributions](./docs/HISTORICAL_RELEASES.md)

The guide below follows current source development. Newer trip-transfer, refund and other integrations are not in the pinned trip ZIP until a later cumulative release replaces it.

## Import exported email confirmations locally

Open **Review several order confirmations together** and choose one or more UTF-8 `.txt` or standard `.eml` messages. For exported `.eml` files, ReturnBy extracts the readable `text/plain` MIME body, including common base64 or quoted-printable encodings. For HTML-only messages it extracts readable text with an inert parser, without rendering markup, loading images/links, or executing scripts. Authored plain text takes precedence. Attachments and explicitly hidden HTML are excluded. CSS layout is not reproduced, so review extracted text and every field; forwarded threads or promotional copy can require corrections. Unsupported MIME structures and charsets produce a visible error.

All files are processed in the current browser tab and the raw email is not saved. The existing batch review requires you to correct and approve extracted store, order number, date and window before saving any fields. Each file is limited to 100 KiB, each batch to 20 confirmations and 1 MiB total. If one selected file cannot be read, none of the selected files is added. This is **not** an inbox connection or a general-purpose email/attachment parser.

The pure MIME-reader tests are `tests/eml.test.ts`; the production Chrome file-picker course in `tools/verify_batch_intake.mjs` includes a real .eml save and an HTML-only all-or-nothing rejection.

## Privacy

The original pasted email is not sent or persisted. The user must review and save fields; reviewed order fields and trip plans you create are kept in this browser's local storage. There is no account, inbox connection, analytics, external API or model call. Clearing the list removes saved records from this device.

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

## Undo a removal

After **Remove** succeeds, choose **Undo removal** in the tracker to restore that
one return with its original reviewed details, saved ID and creation time. Your
new-order draft stays in place. The current date filter remains selected, so a
restored return may be outside the visible filter.

The most recent successful removal is kept in this page's memory, with no short
countdown. **Keep removed** discards that recovery; another successful removal,
a successful confirmed **Clear saved returns**, or reloading/closing the page
also ends it. A cancelled clear or a failed remove/save does not discard it.
Undo does not change calendar files you already imported.

Undo reads current saved returns and restores only the missing record, preserving
newer unrelated changes. If an exact copy is already saved, it refreshes the
tracker without writing a duplicate. A changed record with the same ID, or
duplicate IDs, blocks Undo instead of overwriting saved data. The recovery stays
available for retry or **Keep removed**. If browser storage fails, address the
storage problem; use **Retry loading saved returns** when offered, then choose
**Undo removal** again. Retrying a load does not discard the removed return.
As with other tracker actions, this reread does not make simultaneous writes
in separate tabs transactional.

After building, `node tools/check_removal_undo_browser.mjs` checks the real
controls with fictional returns and fresh browser profiles. Set
`RETURNBY_PLAYWRIGHT` and `RETURNBY_CHROME` for an installed Playwright module
and Chromium executable; `RETURNBY_BUILD` and `RETURNBY_UNDO_OUTPUT` select
the build and receipt folders. The browser checks include keyboard recovery,
draft retention, explicit storage retry, clear/reload lifetime and a 390px notice.

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

From the saved-order list, open **Prepare a return-trip checklist**. Select orders and a planned date, review the saved facts, then download a self-contained HTML sheet to open offline and print. Your planned date, selected orders, packing checks and drop-off notes are saved in this browser, separately from the tracker. Reopening restores the editable trip with current order facts; orders no longer available are left out while their notes remain recoverable. Downloaded sheets contain your checked items and notes; marks added on paper do not update the app. Each amount stays literal and every window retains its stored source. See [the checklist guide](docs/TRIP_CHECKLIST.md) for refresh behavior and date limitations.

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

## Find a saved return

Use **Find a saved return** above the tracker to search a store name or order number. Matching ignores case and surrounding spaces and works together with All, Due soon, and Expired. Clear search restores the current date filter. Search does not change saved records, the deadline overview, or calendar selection; the calendar dialog continues to follow the date filter and lets you review every selection.

## Carry a prepared trip to another browser

Download backup now includes the saved trip date, selected orders, packing checks and notes. Keep the file private. In the receiving browser, choose the backup, review and import its orders, then choose Restore trip. If that browser already has a different trip, confirm its replacement explicitly; importing orders alone never overwrites the trip. Old order-only backups still work and leave the saved trip untouched.

Changed order facts require checking store instructions again. Notes for unavailable orders remain recoverable but those orders are not selected. A failed trip save leaves the reviewed file open for retry. This is an explicit file transfer, not account synchronization.

## Spreadsheet export

Open **Export or restore saved returns**, then **Download all saved returns as CSV**.
The file contains every currently saved purchase, regardless of tracker filters, with
its saved amount, order number, return window, confirmed clock start and calculated
deadline. It reads storage again on each click. Original emails and trip notes are
excluded. Formula-like cells receive a leading apostrophe; the completion message
reports that protection. Import order-number columns as text to preserve leading
zeros. CSV is for spreadsheet review; use the JSON backup for exact restoration.
This adapts the existing CSV contribution in PR #25 to current confirmed clocks.
