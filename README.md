# ReturnBy

ReturnBy is a private return desk for purchases across stores, including paper receipts. Add an order manually or import its confirmation, review the retailer's terms, save the deadline, and keep a useful record of what happened. Raw receipt text stays in the current browser tab; only reviewed fields are saved locally.

## Latest published download — paper-receipt purchases

[Download ReturnBy](https://raw.githubusercontent.com/Jacob-Met/returnby/main/downloads/ReturnBy-2026-11-10-manual-1a76717-browser.zip) · [source, launch steps, checksum and limitations](./downloads/ReturnBy-2026-11-10-manual-1a76717.md)

Adds direct manual purchase entry alongside email import, saved deadlines and reminder exports. Extract, run the Python3 launcher, then open http://127.0.0.1:8769/. Linux/Chrome exercised; Windows/macOS launchers packaged.

## Published desk-first preview — November 10, 2026

**[Download ReturnBy v0.2.0 ZIP](https://raw.githubusercontent.com/Jacob-Met/returnby/4516bfe3ec68d12fda4578ce078262c361457637/downloads/returnby-desk-first-2026-11-10/ReturnBy-v0.2.0-browser.zip)** · [Actual desktop screenshot](https://raw.githubusercontent.com/Jacob-Met/returnby/4516bfe3ec68d12fda4578ce078262c361457637/downloads/returnby-desk-first-2026-11-10/desk-first-desktop.png) · [Actual phone screenshot](https://raw.githubusercontent.com/Jacob-Met/returnby/4516bfe3ec68d12fda4578ce078262c361457637/downloads/returnby-desk-first-2026-11-10/desk-first-phone.png) · [Package notes](https://github.com/Jacob-Met/returnby/blob/4516bfe3ec68d12fda4578ce078262c361457637/downloads/returnby-desk-first-2026-11-10/RELEASE_NOTES.md).

This build puts working order intake and saved deadlines in the first desktop viewport instead of an oversized marketing opening. It retains search, cross-tab review, HTML/.eml receipt import, calendar reminders, backups and trip planning. **Source:** [b5ab27f](https://github.com/Jacob-Met/returnby/commit/b5ab27fdd9c77100ec0a6d3894d497efb8d0e7c1), merged via [PR #98](https://github.com/Jacob-Met/returnby/pull/98). **ZIP SHA-256:** 30dbe3457457aa1c6f51560f6ea8a16b5ad2336981a6687a8ba8efff0f629daf (317,056 bytes).

Extract the ZIP, install Python 3, launch Start ReturnBy.cmd (Windows), Start ReturnBy.command (macOS) or ./Start ReturnBy.sh (Linux), and open http://127.0.0.1:8769. The ZIP was downloaded back from GitHub, checksum-verified, extracted and exercised in actual Chrome with fictional reviewed/saved orders at desktop and phone sizes. Source builds passed 480 unit tests plus five Chrome stale-tab tests. Linux/Chrome was exercised; Windows and macOS launchers are included but not separately tested. Confirm retailer return windows yourself. This is a versioned downloadable preview branch, **not a formal GitHub Release** or hosted service.


## Source changes awaiting a combined download

The integrated source includes the desk-first layout, manual purchase entry and an optional **Return clock starts** date confirmed by the user, such as a delivery date. Leaving that date blank counts from the order date. These fields do not verify a retailer's policy or delivery records.

The 0.3.0 source also adds Returned/Kept History and reopening. Its combined downloadable package is being prepared; the published packages above must not be assumed to contain these new lifecycle features. Independent desktop/phone judgment accepted the lifecycle and History corrections at dba47a3. The later combined layout and confirmed-clock integration is undergoing its own final checks.

See [the product standard and maintained ranked gap list](VISION.md). [Historical releases, checksums and launch notes](docs/RELEASE_HISTORY.md) remain available.

## Finish a return and keep its history

Choose **Finish return** on an active order, then **Returned it** or **Kept it**. The review shows the selected order before saving. **Cancel** and Escape preserve both the order and an unsaved new-order draft.

**History** lists finished orders newest first, with the recorded outcome, date and original deadline. These records do not count as active, due soon or overdue and are excluded from new calendar downloads, trip checklists and the month overview. Search works in both Active and History. **Edit details** retains the recorded outcome; **Reopen return** restores the original identity and deadline.

Returned means the user recorded handing back or sending the order. It is not a claim that a merchant received it or that a refund was paid. Remove any previously imported reminder in the calendar application itself.

Backups containing Returned/Kept outcomes use version 3. This app still imports older active-only and legacy-completion backups; older app releases refuse the newer backup rather than silently dropping its completion state. Keep using version 0.3.0 or later after adopting History; old releases sharing the same local browser address do not understand its markers.

The closure planner re-reads storage immediately before saving and refuses a changed order. A storage error preserves the review for retry. These checks do not create a transaction between simultaneous browser writes.

## Import exported email confirmations locally

Open **Review several order confirmations together** and choose one or more UTF-8 `.txt` or standard `.eml` messages. For exported `.eml` files, ReturnBy extracts the readable `text/plain` MIME body, including common base64 or quoted-printable encodings. For HTML-only messages it extracts readable text with an inert parser, without rendering markup, loading images/links, or executing scripts. Authored plain text takes precedence. Attachments and explicitly hidden HTML are excluded. CSS layout is not reproduced, so review extracted text and every field; forwarded threads or promotional copy can require corrections. Unsupported MIME structures and charsets produce a visible error.

All files are processed in the current browser tab and the raw email is not saved. The existing batch review requires you to correct and approve extracted store, order number, date and window before saving any fields. Each file is limited to 100 KiB, each batch to 20 confirmations and 1 MiB total. If one selected file cannot be read, none of the selected files is added. This is **not** an inbox connection or a general-purpose email/attachment parser.

The pure MIME-reader tests are `tests/eml.test.ts`; the production Chrome file-picker course in `tools/verify_batch_intake.mjs` includes real .eml and HTML receipt selection, review, saving and calendar export.

## Privacy

The original pasted email is not sent or persisted. The user must review and save fields; only merchant, order number, total, order date, confirmed return-clock start when supplied, return-window days, recorded completion outcome and timestamps are kept in this browser's local storage. There is no account, inbox connection, analytics, external API or model call. Clearing the list removes saved records from this device.

## Export several calendar reminders

Choose **Export several reminders** above the tracker to review saved returns in a single
calendar download. The initial checkboxes follow the current **Active**, **Due soon** or
**Expired** filter. Every active saved return remains visible in the dialog so you can select
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
- `src/completion.ts`: reviewed Returned/Kept/reopen transitions shared with backup and planning projections.

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
record reachable. The view includes active saved returns, independent of the tracker filter, and excludes finished History records.

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
