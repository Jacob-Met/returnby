# ReturnBy

ReturnBy turns an order-confirmation email into a reviewable return deadline and a calendar reminder. The visitor supplies the email text; the browser runs the repository's real rule-based parser, merchant-policy lookup, date calculation, status logic and RFC 5545 export. It is a multi-order tracker, not a canned result: correct extracted fields, override a return window, save several deadlines, filter the list and export three-day alarms for one order or all shown deadlines.

## Calendar downloads

Choose **All**, **Due soon**, or **Expired**, then use **Download shown deadlines (.ics)** above the list. The button shows how many deadlines the file includes and is disabled when the list is empty. Open or import the downloaded file in your calendar app; it contains one all-day event per displayed deadline and a reminder three days before each deadline. **Add calendar reminder** on a saved order still downloads just that order.

Exports use the current displayed dates and stable order identifiers. They do not change saved orders. The file is a snapshot: later edits or removals in ReturnBy do not automatically update an imported calendar. How a calendar app handles importing the same event again depends on that app.

## Privacy

The original pasted email is not sent or persisted. The user must review and save fields; only merchant, order number, total, order date, return-window days and timestamps are kept in this browser's local storage. There is no account, inbox connection, analytics, external API or model call. Clearing the list removes saved records from this device.

## Run and verify

```bash
npm ci
npm test
npm run build
npm run dev
```

The optional Raider browser acceptance and desktop/phone captures run through `py -3 tools/capture_returnby.py` (requires Playwright and Chromium/Chrome). The sample orders use fictional merchants; the parser's policy table is a convenience, not a guarantee from any retailer. Users should confirm a deadline with the store's current terms.

For the bulk calendar browser checks, build first, then run `node --test tools/check_calendar_browser.mjs` with Playwright and Chromium available. `RETURNBY_PLAYWRIGHT` can select an installed Playwright module, `RETURNBY_CHROME` a browser executable, and `RETURNBY_CALENDAR_OUTPUT` the download/receipt directory. The checks exercise actual `.ics` downloads, filtered Save/Remove/Clear, midnight refresh, keyboard focus and a 360 px screen. See [the bulk calendar qualification receipt](docs/receipts/2026-10-08-bulk-calendar-afe225d6c6be/README.md).

## Implementation

- `src/parse.ts`: order-date, merchant, order-number and total extraction.
- `src/policy.ts` / `data/policies.json`: merchant lookup with an editable 30-day fallback.
- `src/deadline.ts`: date arithmetic and urgency states.
- `src/store.ts`: local-only persistence of approved fields.
- `src/ics.ts`: calendar reminder generation.
- `src/calendar-export.ts` / `src/calendar-export.css`: one calendar download for the currently displayed deadlines.

The app is browser-only; no AI runs in the page. The Devpost Learn planning documents are not completed interview output and are not represented as such.
