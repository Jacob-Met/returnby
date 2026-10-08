# ReturnBy

ReturnBy turns an order-confirmation email into a reviewable return deadline and a calendar reminder. The visitor supplies the email text; the browser runs the repository's real rule-based parser, merchant-policy lookup, date calculation, status logic and RFC 5545 export. It is a multi-order tracker, not a canned result: correct extracted fields, override a return window, save several deadlines, filter the list and export a three-day alarm for any order.

## Privacy

The original pasted email is not sent or persisted. The user must review and save fields; only merchant, order number, total, order date, return-window days and timestamps are kept in this browser's local storage. There is no account, inbox connection, analytics, external API or model call. Clearing the list removes saved records from this device.

## Move or back up your tracker

Open **Back up or restore saved returns** below the tracker and choose **Download backup**. Keep the downloaded JSON file private: it contains the saved order details, original saved IDs, creation times and return-window source labels. The exporter copies only the approved Order fields; it does not read the paste box or export unrelated stored properties. A backup is an ordinary unencrypted file. Clearing browser storage does not delete files you downloaded.

In the receiving browser, choose that file to see a preview before any orders are saved. New IDs are added, matching copies are skipped, and an ID with different saved fields blocks the whole import. **Cancel import** leaves the tracker unchanged. Return windows and `windowSource` labels are preserved, so importing does not reinterpret an older order using today's local policy table. These labels are historical file data, not verified current retailer policy. Existing drafts in the paste/review form stay available.

The importer checks the entire versioned document before showing a plan. Unsupported versions, unknown fields, duplicate IDs within one file, invalid dates/windows, and malformed records are refused without writes. Files may be at most 5 MiB and contain at most 10,000 orders; the resulting tracker also stays within that count and must remain exportable within the 5 MiB byte limit. A near-limit export uses compact JSON when indentation would exceed the limit. Normalization or combining two individually valid files may exceed the limit; such an import is refused before any write. Text fields may be up to 4,096 characters and IDs up to 128 characters. Dates must use a four-digit year from 1000 through 9999, and the return window must end within that range. Creation/export timestamps require an explicit timezone. Optional empty order numbers and totals are normalized to empty strings.

The preview is recalculated against readable browser storage before committing. If saved orders changed since review, the updated plan requires another Import click. Storage failures preserve the preview for retry. This does not add continuous cross-tab synchronization or a transaction spanning simultaneous writes from different tabs; avoid editing the tracker in another tab during import. The existing tracker controls and single-order calendar export keep their behavior.

## Run and verify

```bash
npm ci
npm test
npm run build
npm run dev
```

The optional backup browser acceptance runs with `node tools/check_backup_browser.mjs` against `npm run preview -- --host 127.0.0.1 --port 4173`. It requires Playwright and Chromium; `RETURNBY_PLAYWRIGHT` can point to an installed module, `RETURNBY_CHROME` to an existing Chromium executable, and `RETURNBY_CAPTURE_DIR` to a capture directory. It uses fresh temporary browser profiles and fictional orders.

The optional Raider browser acceptance and desktop/phone captures run through `py -3 tools/capture_returnby.py` (requires Playwright and Chromium/Chrome). The sample orders use fictional merchants; the parser's policy table is a convenience, not a guarantee from any retailer. Users should confirm a deadline with the store's current terms.

## Implementation

- `src/parse.ts`: order-date, merchant, order-number and total extraction.
- `src/policy.ts` / `data/policies.json`: merchant lookup with an editable 30-day fallback.
- `src/deadline.ts`: date arithmetic and urgency states.
- `src/store.ts`: local-only persistence of approved fields.
- `src/backup.ts` / `src/backup-ui.ts`: versioned backup validation, duplicate/conflict planning and reviewed import/download controls.
- `src/ics.ts`: calendar reminder generation.

The app is browser-only; no AI runs in the page. The Devpost Learn planning documents are not completed interview output and are not represented as such.
