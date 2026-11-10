# ReturnBy — a private return desk

ReturnBy is for people who need to remember return deadlines across stores, including purchases on paper receipts, without connecting their inbox. Success is a reviewed purchase that can be found next week, acted on before its deadline, and carried into a calendar or a printable trip list.

## Alternatives and product standard

Reviewed public product pages on 2026-11-10:
- [ReturnQueen](https://returnqueen.com/) presents automatic purchase sync, home pickup and tracking through refund. That is a much more complete logistics service. ReturnBy must make its narrower local planning job effortless and must not imply it performs a return or verifies a refund.
- [Whering's item intake](https://whering.co.uk/faq/add-clothes-without-taking-photos?language=en-GB) explicitly offers different ways to add a possession, including images from online purchases or its database. This adjacent personal-inventory reference reinforces the need for a deliberate receipt/manual entrance instead of forcing every purchase through email parsing.

These are inspected public product descriptions, not accounts exercised by this producer. Independent UI judgment is tracked separately.

## Ranked gaps

1. Complete a return or keep decision and distinguish closed history from active deadlines (existing lifecycle contributor; coordinate before changing).
2. Confirm the actual start of a return window, including delivery-based windows (existing contributor; current manual entry clearly counts from purchase).
3. Make missing or ambiguous receipt evidence understandable; no shipping date should masquerade as purchase date (existing parser contributor).
4. Reduce installation friction and consolidate the many historical download links into one current versioned release.
5. Item-level partial returns and refund follow-up are not represented by the current whole-order model.

## Current build and improvement

The README links downloadable source-pinned builds. Manual receipt intake adds a direct blank form for store, purchase date and checked return window, with optional receipt number and total. It shows the computed deadline before saving; incomplete entries and storage failures keep the draft. Existing email drafts stay separate. Saved purchases use the normal tracker, edit, calendar, backup and trip capabilities. No OCR, purchase synchronization, automatic retailer verification or logistics is claimed.

The app stays local. Unfinished manual purchase fields recover after reload in the same tab until Save or Discard; raw email remains only in the open page; reviewed orders and editable trip plans remain in this browser origin. Order backups and calendar files are explicit downloads; order backups include the saved trip for separately reviewed restoration. Downloaded trip sheets include the selected orders, packing checks and notes.

## Trip planning, 2026-11-10

The existing trip page now keeps an editable plan across visits: planned date, selection, packing checks and drop-off notes. Current tracker facts are read again, changed instructions need rechecking, and orders no longer available are excluded with their notes recoverable. A failed save is visible and retryable; two planner tabs must choose which draft to keep. The sheet remains an offline printable snapshot. Producer astra-cedar-7c2e; independent shopper judgment is tracked in returnby-whole-workflow-judge-tern7c2e and must establish the quality verdict. This does not add pickup, retailer instructions, account sync, refund tracking or trip-plan transfer between devices.
