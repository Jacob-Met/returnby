# ReturnBy reminders from a saved backup

Open **calendar.html** in your existing browser. This separate offline companion reads an explicitly chosen ReturnBy backup and creates a calendar download. It does not restore the backup into the tracker, change an order, contact a retailer, or import into your calendar.

## Choose, inspect, preview, download

1. Choose one ReturnBy version 1 or 2 JSON backup. The complete file must pass the unchanged native admission before any order appears. Files are limited to 5 MiB and this calendar workflow supports at most 2,000 total saved orders, including completed records.
2. Inspect the source filename, raw byte count and SHA-256, export time and captured review time. All saved orders remain in source order across pages of 50. Completed orders and calendar-blocked orders stay visible and cannot be selected. A blank store/order field remains blank; the calendar's existing title fallback still applies.
3. Check the orders you intend to include. No order is selected automatically. Select all eligible is an explicit convenience; it can include expired saved deadlines. The page does not decide whether an item is currently returnable.
4. Choose Preview selected reminders. Every resulting reminder appears in native deadline/ID order. Verify its saved ID, store, order number and all-day deadline. One captured review timestamp supplies DTSTAMP for this file. The original three-day-before display alarm is retained.
5. Choose Download reviewed calendar. Your browser selects its download destination. This requests an ICS file only; check the saved file before separately importing it. A successful click is not proof of a calendar import or future notification.

Changing a checkbox, clearing the selection, choosing a new nonempty file or clearing the view retires the preview. Even changing a selection and changing it back requires a fresh preview. A refused new file clears the old source view rather than leaving an old calendar ready to download. Cancelling the native file chooser preserves the current view. Clear view also retires pending reads/digests, so an older success or error cannot restore a cleared file. Reloading or closing clears temporary state; there is no browser storage.

## Exact source and limits

The original seven-file received source is ReturnBy joined commit **e92e254524d7544cb9b9a615c643fb57507d17e9**, distinct from canonical main **1e662c387be5f66f8499fac7ec443f58d2198379**. Original backup, calendar-batch, ICS, deadline, completion and Store sources plus package metadata are retained byte-for-byte under original/. The standalone build includes the five original runtime modules it uses. Store is a retained type dependency, not an invoked storage path.

The accepted #45 CLI model is retained unchanged under original/tools as a native comparison reference. This browser companion does not replace that CLI, its exclusive filesystem publication, source owner or test results. New browser file choice and download have their own receiving record. No tracker source, original package, dependency, workflow or existing guide is modified.

The original backup schema and complete validation are authoritative. Invalid UTF-8/JSON, unsupported fields, duplicate IDs, invalid later records and unsupported versions are refused. Completed records cannot be turned into reminders here. A saved deadline at 9999-12-31 is calendar-blocked because its exclusive next-day end is outside the original date range. Native output is bounded to 4 MiB; choose fewer reminders if the bound is exceeded.

Native local-date arithmetic and calendar ordering, escaping, UTF-8 folding, IDs, all-day dates and alarms are unchanged. The page reports the browser timezone. This is not a cross-timezone invariance guarantee, especially for unusual historical civil-time transitions. A saved window records policy/default/user provenance; it is not a fresh retailer-policy check.

Bytes are copied before asynchronous hashing. The document, selected-ID review and output are bound inside the new module; returned download bytes are a fresh copy. The SHA-256 identifies the exact selected bytes, not who authored them or whether their facts are correct. File edits on disk after capture do not alter the captured review; choose the file again to inspect new bytes.

## Build and receiving

The standalone HTML uses no external runtime dependency. Rebuild from the retained source using Node 24 and an already installed esbuild module:

    node browser/build.mjs ABSOLUTE_PATH_TO_EXISTING_ESBUILD/lib/main.js

The builder installs nothing. It bundles unchanged native TypeScript source, escapes script endings and hashes the exact inline script for its Content Security Policy. The build receipt records esbuild version and every actual input hash. Native module checks run with:

    node --test browser/calendar.test.mjs

Qualification phases and any receiving corrections are recorded separately in the evidence packet. Existing #45 author/peer campaigns are not rerun or relabeled as browser results. This new recipient is not a canonical-main merge, installed tracker adoption, provider operation or Actions result.
