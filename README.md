# ReturnBy

## Current GitHub Release — spreadsheet handoff from the return desk

**[Download ReturnBy browser ZIP](https://github.com/Jacob-Met/returnby/releases/download/returnby-desk-export-2026-11-10/ReturnBy-v0.2.2-browser.zip)** · [release notes, exact source and screenshots](https://github.com/Jacob-Met/returnby/releases/tag/returnby-desk-export-2026-11-10)

The spreadsheet export action is now directly above the saved-return list; pending-delivery review drafts are explicitly excluded. This build also lets you enter a retailer-confirmed return-by date in manual purchase entry or Edit details without calculating the day count yourself. It also exports all saved purchases, confirmed clocks and shopper-recorded refund follow-up to CSV. It includes preserved email reviews, calendar alert choices and portable prepared trips from the merged product.

Extract the ZIP, install Python 3 if needed, and run the included launcher for your platform; open http://127.0.0.1:8769. Keep the same browser profile and port for your saved tracker. Linux/Chrome was exercised after downloading this actual release; Windows/macOS launchers are included but not separately tested.

Source: [6e6dca8](https://github.com/Jacob-Met/returnby/commit/6e6dca875a89b7bc80355325b7be34a956502a71). ZIP SHA-256: `a991c60d3c13a31f2e012df4ad15d42265ac3778f232f5f0d1639b5ea6285dcb`. The date helper saves a day window; future edits to the clock start require reapplying a known date. CSV is a review snapshot; JSON remains the restore format. Independent Sage accepted the original CSV handoff at85b41db9; this release addresses the judge’s discoverability finding. Independent review of the known-date helper and revised placement is tracked separately.

## Independently verified recovery build — earlier source pin

[Download ReturnBy](https://github.com/Jacob-Met/returnby/releases/download/returnby-manual-recovery-2026-11-10/ReturnBy-manual-recovery-e837e1b-browser.zip) · [launch steps, exact source and limitations](https://github.com/Jacob-Met/returnby/releases/tag/returnby-manual-recovery-2026-11-10).

Unfinished manual receipt details survive reload in the same tab. Resume, review, then deliberately Save or Discard. Current saved purchases are preserved, including purchases added in another tab. Raw email remains unstored. Source e837e1bd630f685e33b8bcda9fc073071fdbc4b2; 554 tests and build passed; separate independent actual Chrome desktop/390px judgment accepted this workflow. Linux/Chrome exercised; Python 3 launchers for Windows/macOS packaged. SHA-256: 8685ef161367505b6f774cf7daaf8a878d19aa3b2229a04c32b984a0184d3703.


## Earlier source-pinned download — preserved email review

[Download ReturnBy browser ZIP](./downloads/returnby-intake-613f15f/ReturnBy-613f15f-browser.zip) · [source, launch instructions, checksum and limits](./downloads/returnby-intake-613f15f/README.md) · [desktop](./downloads/returnby-intake-613f15f/review-1440.png) · [phone](./downloads/returnby-intake-613f15f/review-390.png).

Merged source613f15f adds unsaved email-review departure protection and includes current manual purchases, portable prepared trips, refund follow-up and CSV export. Extract and run the included Python3 launcher. Actual packaged Linux/Chrome entrypoint exercised at desktop and phone sizes. Browser departure warnings let you cancel leaving and retain your review; this does not provide crash recovery. Independent audience judgment is tracked separately.


## Earlier downloadable build — confirmed return-window start

**[Download source-pinned ReturnBy ZIP](https://raw.githubusercontent.com/Jacob-Met/returnby/main/downloads/ReturnBy-2026-11-10-clock-92baeb9-browser.zip)** · [launch instructions, checksum and tested limitations](./downloads/ReturnBy-2026-11-10-clock-92baeb9.md) · [actual desktop screenshot](./downloads/returnby-confirmed-clock-2026-11-10/clock-tracker-desktop.png) · [actual phone screenshot](./downloads/returnby-confirmed-clock-2026-11-10/clock-tracker-mobile.png).

Adds a **user-confirmed return-window start date** when a retailer counts from delivery rather than purchase. The same reviewed date now flows through saved orders, corrected deadlines, calendar reminders, backups, monthly planning, batch intake and trip sheets; older orders retain their order-date behavior. Includes manual-purchase entry, HTML/.eml receipts and saved-order search. Built from the merged [source commit 92baeb9](https://github.com/Jacob-Met/returnby/commit/92baeb99324ce60538bdefb3c36768fe419dfe43); independently exercised from its extracted ZIP in Chrome. **SHA-256:** f9c7a2b294a462e9263b52236740bc2cae40ce98e511ecf62227ccb5e5d89cb9.

Extract the archive, run the local Python 3 launcher for your platform, and open http://127.0.0.1:8769/. All order data stays in your browser. Confirm retailer policy yourself. This is a downloadable local browser application, **not a hosted service or formal GitHub Release**.

## Previous downloadable build — paper-receipt purchases

[Download ReturnBy](https://github.com/Jacob-Met/returnby/releases/download/returnby-manual-2026-11-10/ReturnBy-2026-11-10-manual-1a76717-browser.zip) · [source, launch steps, checksum and limitations](./downloads/ReturnBy-2026-11-10-manual-1a76717.md)

Adds direct manual purchase entry alongside email import, saved deadlines and reminder exports. Extract, run the Python3 launcher, then open http://127.0.0.1:8769/. Linux/Chrome exercised; Windows/macOS launchers packaged.

## Earlier downloadable browser preview — desk-first return tracker (November 10, 2026)

**[Download ReturnBy v0.2.0 ZIP](https://raw.githubusercontent.com/Jacob-Met/returnby/4516bfe3ec68d12fda4578ce078262c361457637/downloads/returnby-desk-first-2026-11-10/ReturnBy-v0.2.0-browser.zip)** · [Actual desktop screenshot](https://raw.githubusercontent.com/Jacob-Met/returnby/4516bfe3ec68d12fda4578ce078262c361457637/downloads/returnby-desk-first-2026-11-10/desk-first-desktop.png) · [Actual phone screenshot](https://raw.githubusercontent.com/Jacob-Met/returnby/4516bfe3ec68d12fda4578ce078262c361457637/downloads/returnby-desk-first-2026-11-10/desk-first-phone.png) · [Package notes](https://github.com/Jacob-Met/returnby/blob/4516bfe3ec68d12fda4578ce078262c361457637/downloads/returnby-desk-first-2026-11-10/RELEASE_NOTES.md).

This build puts working order intake and saved deadlines in the first desktop viewport instead of an oversized marketing opening. It retains search, cross-tab review, HTML/.eml receipt import, calendar reminders, backups and trip planning. **Source:** [b5ab27f](https://github.com/Jacob-Met/returnby/commit/b5ab27fdd9c77100ec0a6d3894d497efb8d0e7c1), merged via [PR #98](https://github.com/Jacob-Met/returnby/pull/98). **ZIP SHA-256:** 30dbe3457457aa1c6f51560f6ea8a16b5ad2336981a6687a8ba8efff0f629daf (317,056 bytes).

Extract the ZIP, install Python 3, launch Start ReturnBy.cmd (Windows), Start ReturnBy.command (macOS) or ./Start ReturnBy.sh (Linux), and open http://127.0.0.1:8769. The ZIP was downloaded back from GitHub, checksum-verified, extracted and exercised in actual Chrome with fictional reviewed/saved orders at desktop and phone sizes. Source builds passed 480 unit tests plus five Chrome stale-tab tests. Linux/Chrome was exercised; Windows and macOS launchers are included but not separately tested. Confirm retailer return windows yourself. This is a versioned downloadable preview branch, **not a formal GitHub Release** or hosted service.


## Previous downloadable build — cross-tab-safe ReturnBy (2026-11-10)

**[Download the standalone ZIP](https://raw.githubusercontent.com/Jacob-Met/returnby/main/downloads/ReturnBy-2026-11-10-af06bb7-browser.zip)** — [source pin, checksum, launch steps and testing](./downloads/ReturnBy-2026-11-10-af06bb7-browser.md).

This pinned build includes the merged cross-tab review notice alongside HTML receipt import and saved-order search. Extract and run the appropriate local launcher (Python 3 required), then visit http://127.0.0.1:8769/. It is a versioned repository download, not a new GitHub Release. Existing downloaded releases remain linked below.

## Earlier GitHub release — HTML receipt import and saved-return search

[Watch the silent HTML-receipt walkthrough (MP4)](https://github.com/Jacob-Met/returnby/releases/download/returnby-html-receipt-2026-11-10/ReturnBy-HTML-receipt-walkthrough.mp4) · [Recording scope and reproduction](./docs/html-receipt-walkthrough/README.md)

The actual released app now has a captioned, fictional-sample walkthrough: HTML-only email → review and correct the return window → explicit Save → find the order → download a calendar reminder and backup. This clip demonstrates this pinned release, not the newer builds above.

[Download the browser ZIP](https://github.com/Jacob-Met/returnby/releases/download/returnby-html-receipt-2026-11-10/ReturnBy-v0.2.0-browser.zip) · [release notes and exact source ZIP](https://github.com/Jacob-Met/returnby/releases/tag/returnby-html-receipt-2026-11-10)

This release adds readable HTML-only exported email receipts to the existing review/save workflow and includes store/order-number search. Authored plain text takes precedence; HTML is parsed as data without loading images, links, stylesheets or scripts. Review every field: CSS layout and image-only receipts are not interpreted.

Extract the ZIP, install Python 3, and run Start ReturnBy.sh (Linux), Start ReturnBy.command (macOS), or Start ReturnBy.cmd (Windows), then open http://127.0.0.1:8769/. Source: 43d56fe5379fa3d658a6093f3303d1ed5ad721b6, merged PR #95. SHA-256: 1feaf0cd6d4698323c00b7bf17d385a1dc1052b987ea6fbdc28d52a7620e4699.

Producer checks passed the original 472 tests plus five HTML cases, the production build and actual Chrome desktop/mobile file selection through review, save and calendar download. The public ZIP was downloaded, hash-verified, extracted and run through the same browser journey. Independent astra-ibis-4d8a exercised different table receipts, nested alternatives and attachments at 1366/375px, including explicit review before persistence, real backup and two-event calendar downloads, no external requests or script execution, and mobile visual inspection. Linux/Chrome were exercised; Windows/macOS launchers are packaged only. This is a downloadable local application, not a hosted service.

## Earlier formally released build — saved-order search and corrected email import (2026-11-10)

**[Download the current ReturnBy ZIP](https://github.com/Jacob-Met/returnby/releases/download/returnby-search-2026-11-10/ReturnBy-v0.2.0-browser.zip)** — [release notes, source and assets](https://github.com/Jacob-Met/returnby/releases/tag/returnby-search-2026-11-10).

The current browser release is built from commit [7535b9c](https://github.com/Jacob-Met/returnby/commit/7535b9c15c1cd1abab850248561b3c3afa671401) and includes the corrected merchant/receipt parsing merged in [PR #89](https://github.com/Jacob-Met/returnby/pull/89), plus saved-return search. The actual GitHub ZIP was independently downloaded, run and checked with an unfamiliar synthetic exported email, including selection, save, reopened tracker and 390-pixel mobile layout. **ZIP SHA-256:** 440af93913849e6ebb998e76856c131fdb2d3ac97c125c289eedc4989557e54d.

Extract the ZIP. With Python 3 installed, run Start ReturnBy.cmd on Windows, Start ReturnBy.command on macOS or ./Start ReturnBy.sh on Linux, then visit http://127.0.0.1:8769/. The ZIP is a local browser application, not a hosted service. No inbox connection or receipt upload is involved: the original email remains in the current page, and only reviewed fields are saved to this browser's local storage. Return windows are estimates you must check against retailer policy. Windows and macOS launchers are packaged but have not been independently exercised by this reviewer.

Export the original order email as a plain-text .eml to import it. The local importer deliberately ignores attachments, including forwarded messages embedded as attached emails; paste the original confirmation text instead if necessary.

## Earlier release — original .eml import before receipt fixes (2026-11-10)

**[Historical ReturnBy v0.2.0 .eml ZIP](https://github.com/Jacob-Met/returnby/releases/download/returnby-eml-2026-11-10/ReturnBy-v0.2.0-browser.zip)** — [source at dd21f4f](https://github.com/Jacob-Met/returnby/releases/tag/returnby-eml-2026-11-10). This prior package has SHA-256 957648cce351f8cd17f94e8a78a18bd690cc218b431b7bcc62f2749949cb2d18 and predates PR #89's corrected store-name and order-number recognition. Use the current release above rather than this historical ZIP for everyday tracking.

## Download the multi-confirmation browser preview — 2026-11-10

**[Download the new multi-confirmation ReturnBy ZIP](https://raw.githubusercontent.com/Jacob-Met/returnby/c908f9c8176554afa1aba8c672ad07042156d637/downloads/returnby-browser-2026-11-10-batch-intake.zip)** — [package checksum and launch notes](https://github.com/Jacob-Met/returnby/tree/c908f9c8176554afa1aba8c672ad07042156d637/downloads). SHA-256: `23a77516a3c75ffc0a22b1951be6f92613e1e1e76e575ecda161a7263df3d86c`.

This build adds review and local saving of up to 20 pasted or UTF-8 text-file order confirmations together, while retaining individual editing, backups, calendar exports, the trip checklist and deadline planning. Extract the ZIP, run `START-WINDOWS.cmd` or `./start-mac-linux.sh` (Node.js 20+), and visit `http://127.0.0.1:8787/`. The compiled package needs no npm install. It was checked after a clean extraction and then downloaded back from GitHub byte-for-byte; the six actual Chrome receiving groups passed on desktop and phone. Source: [merged PR #85](https://github.com/Jacob-Met/returnby/pull/85). This is a versioned distribution, not a formal GitHub Release.

## Previous single-confirmation browser preview — 2026-11-10

**[Download the verified ReturnBy browser ZIP](https://raw.githubusercontent.com/Jacob-Met/returnby/a637cd465c26e2d6a4729a7e07e162f70e9f2b83/downloads/returnby-browser-2026-11-10.zip)** — [distribution record and launch details](https://github.com/Jacob-Met/returnby/tree/a637cd465c26e2d6a4729a7e07e162f70e9f2b83/downloads).

Unzip the package, install Node.js 20+ if necessary, run `START-WINDOWS.cmd` on Windows or `./start-mac-linux.sh` on macOS/Linux (or `node serve.mjs`), and open `http://127.0.0.1:8787/`. This is a loopback-only local app with compiled assets, no npm install or account required; saved returns stay in that browser profile. It includes the [single-reminder stale-deadline fix](https://github.com/Jacob-Met/returnby/pull/83), a file checksum manifest and a real Chrome screenshot with fictional orders. Its public ZIP was downloaded back and matched the tested archive byte-for-byte (SHA-256: `505ff5b7d6d6ca7a0163ede641f6da7fb56c3e4cde6c0915231ad0d915ef1de4`). The merged source is [abd33f98](https://github.com/Jacob-Met/returnby/commit/abd33f98a571e03e9c36d2ea0a27a392c823e275). Verified on Linux with Node 22 and Chrome 156; Windows/macOS launchers and other browsers were not independently exercised.

**Previous version:** [ReturnBy v0.2.0 browser ZIP](https://raw.githubusercontent.com/Jacob-Met/returnby/9cd8d0d5f2fd8ba32a0525db65e292cae92ccdcf/downloads/v0.2.0/ReturnBy-v0.2.0-browser.zip), built from [b1c32488](https://github.com/Jacob-Met/returnby/commit/b1c32488f1d198a5461abf61bf98467ff99bba55). That historical package has **Python 3** launchers and uses port **8769**; it predates the new calendar freshness fix. Both downloads are on versioned GitHub distribution branches because the connected GitHub integration cannot create formal Releases.

ReturnBy turns an order-confirmation email into a reviewable return deadline and a calendar reminder. The visitor supplies the email text; the browser runs the repository's real rule-based parser, merchant-policy lookup, date calculation, status logic and RFC 5545 export. It is a multi-order tracker, not a canned result: correct extracted fields, override a return window, save several deadlines, filter the list and review a useful upcoming calendar alert for any order.

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
the existing per-order calendar UID. Choose an alert lead time and local hour, or no alert. Exact alert times are reviewed before download; elapsed lead times use a visible fifteen-minute catch-up and past deadlines receive no alarm. The file includes the
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
4 MiB calendar limit; oversized selections must be reduced. Single-order reminders open the same alert review and use the same calendar serialization. See [upcoming alert behavior and independent judgment](docs/calendar-alerts/README.md).

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

Choose **Download all saved returns as CSV** directly above your saved-return list.
The file contains every currently saved purchase, regardless of tracker filters, with
its saved amount, order number, return window, confirmed clock start and calculated
deadline. It reads storage again on each click. Original emails and trip notes are
excluded. Formula-like cells receive a leading apostrophe; the completion message
reports that protection. Import order-number columns as text to preserve leading
zeros. CSV is for spreadsheet review; use the JSON backup for exact restoration.
This adapts the existing CSV contribution in PR #25 to current confirmed clocks.

## Enter a known return-by date

In manual purchase entry or Edit details, open **Know the exact return-by date?**, enter the date you checked with the retailer, and select **Use this return-by date**. ReturnBy calculates the day window from the purchase date or your confirmed clock start. While that helper is applied in the open form, changing the clock start recalculates days to keep the chosen date. Editing days directly returns to a day window. Review the proposed deadline before saving.

The saved record remains a day window, so future edits to its clock start can change the deadline; use the helper again to retain a retailer-confirmed date. The date must be after the clock start. This does not verify return eligibility or hardcode holiday policies. The motivating example was Apple's dated US holiday return policy, inspected on November 10, 2026 at https://www.apple.com/shop/help/returns_refund; eligibility and exclusions remain the shopper's responsibility.
