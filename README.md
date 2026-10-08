# ReturnBy

ReturnBy turns an order-confirmation email into a reviewable return deadline and a calendar reminder. The visitor supplies the email text; the browser runs the repository's real rule-based parser, merchant-policy lookup, date calculation, status logic and RFC 5545 export. It is a multi-order tracker, not a canned result: correct extracted fields, override a return window, save several deadlines, filter the list and export a three-day alarm for any order.

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

## Run and verify

```bash
npm ci
npm test
npm run build
npm run dev
```

The optional Raider browser acceptance and desktop/phone captures run through `py -3 tools/capture_returnby.py` (requires Playwright and Chromium/Chrome). The sample orders use fictional merchants; the parser's policy table is a convenience, not a guarantee from any retailer. Users should confirm a deadline with the store's current terms.

The saved-order browser acceptance runs with `node tools/check_edit_browser.mjs` against a local production preview. It requires Playwright and Chromium; `RETURNBY_PLAYWRIGHT` and `RETURNBY_CHROME` may point at existing installations, `RETURNBY_BASE_URL` selects the local preview, and `RETURNBY_DOWNLOAD_DIR` can select a shared writable download directory for a confined browser. `RETURNBY_BASELINE_URL` optionally checks a separately served original build, and `RETURNBY_CAPTURE_DIR` saves results and captures. `tools/check_edit_backup_browser.mjs` is an additional receiving check for a composition containing portable-backup PR #10; it exercises a restored order through editing, export and restoration, plus stale import previews. The exact qualification and composition pins are in `docs/receipts/saved-order-edit-20261008.json`.

## Implementation

- `src/parse.ts`: order-date, merchant, order-number and total extraction.
- `src/policy.ts` / `data/policies.json`: merchant lookup with an editable 30-day fallback.
- `src/deadline.ts`: date arithmetic and urgency states.
- `src/store.ts`: local-only persistence of approved fields.
- `src/edit.ts` / `src/edit-ui.ts`: reviewed corrections with stable order identity and conflict/storage refusal.
- `src/ics.ts`: calendar reminder generation.

The app is browser-only; no AI runs in the page. The Devpost Learn planning documents are not completed interview output and are not represented as such.
