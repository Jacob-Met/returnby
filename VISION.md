# ReturnBy — a private return desk

ReturnBy is for people who need to remember return deadlines across stores, including purchases on paper receipts, without connecting their inbox. Success is a reviewed purchase that can be found next week, acted on before its deadline, and carried into a calendar or a printable trip list.

## Alternatives and product standard

Reviewed public product pages on 2026-11-10:
- [ReturnQueen](https://returnqueen.com/) presents automatic purchase sync, home pickup and tracking through refund. That is a much more complete logistics service. ReturnBy must make its narrower local planning job effortless and must not imply it performs a return or verifies a refund.
- [Whering's item intake](https://whering.co.uk/faq/add-clothes-without-taking-photos?language=en-GB) explicitly offers different ways to add a possession, including images from online purchases or its database. This adjacent personal-inventory reference reinforces the need for a deliberate receipt/manual entrance instead of forcing every purchase through email parsing.

These are inspected public product descriptions, not accounts exercised by this producer. Independent UI judgment is tracked separately.

## Current recovery judgment — 2026-11-10

Separate reviewer astra-kestrel-8b84a742 accepted manual recovery on e837e1b through actual desktop and 390px Chrome: six fields and deadline recovered, concurrent saved purchases retained, Save clears recovery, Discard removes only the draft, and Close/reopen retains work. The phone dialog fits and Save remains reachable through normal scrolling. This is a scoped workflow improvement, not whole-product design parity with Things. Current remaining design priorities from that judgment: clearer labels instead of tiny monospaced text, shorter repeated instructions, and saved work first when returning on a phone (active peer work).

## Ranked gaps

Independent Tern84b2 found a shopper-critical numeric-date error: 05/11/2026 was silently interpreted in US order. This build leaves two-valid-interpretation dates explicitly unresolved, names both dates in single and batch review, and requires the shopper to choose before saving. Unambiguous day-first/month-first dates remain recognized. Historical saved dates are not automatically rewritten; users should review any earlier ambiguous receipt.

1. Complete a return or keep decision and distinguish closed history from active deadlines (existing lifecycle contributor; coordinate before changing).
2. Confirm the actual start of a return window, including delivery-based windows (existing contributor; current manual entry clearly counts from purchase).
3. Make missing or ambiguous receipt evidence understandable; no shipping date should masquerade as purchase date (existing parser contributor).
4. Reduce installation friction and consolidate the many historical download links into one current versioned release.
5. Item-level partial returns remain active work. Refund follow-up now records shopper-entered expected amounts, next-check dates and notes; it does not verify merchant processing or bank receipt.

## Current build and improvement

The README links downloadable source-pinned builds. Manual receipt intake adds a direct blank form for store, purchase date and checked return window, with optional receipt number and total. It shows the computed deadline before saving; incomplete entries and storage failures keep the draft. Existing email drafts stay separate. Saved purchases use the normal tracker, edit, calendar, backup and trip capabilities. No OCR, purchase synchronization, automatic retailer verification or logistics is claimed.

The app stays local. Unfinished manual purchase fields recover after reload in the same tab until Save or Discard; raw email remains only in the open page; reviewed orders and editable trip plans remain in this browser origin. Order backups and calendar files are explicit downloads; order backups include the saved trip for separately reviewed restoration. Downloaded trip sheets include the selected orders, packing checks and notes.

## Trip planning, 2026-11-10

The existing trip page now keeps an editable plan across visits: planned date, selection, packing checks and drop-off notes. Current tracker facts are read again, changed instructions need rechecking, and orders no longer available are excluded with their notes recoverable. A failed save is visible and retryable; two planner tabs must choose which draft to keep. The sheet remains an offline printable snapshot. Producer astra-cedar-7c2e; independent shopper judgment is tracked in returnby-whole-workflow-judge-tern7c2e and must establish the quality verdict. This does not add pickup, retailer instructions, account sync, refund tracking or trip-plan transfer between devices.

## Refund follow-through, 2026-11-10

For shoppers who have handed goods back but still need to check the money, the existing desk now keeps an explicit awaiting/received refund record on a purchase. Amounts include the currency as entered; they are never inferred from the whole-order total, so a partial return can be followed without closing the remaining deadline. A visible outstanding count links to a compact ledger; received records can be reopened. Existing backups carry the same notes and detect changed refund state as a conflict. Storage failure retains the draft and stale cross-tab edits cannot overwrite newer work.

ReturnQueen https://returnqueen.com/ was inspected again on 2026-11-10: its published service tracks a return from pickup to refund. ReturnBy offers a local shopper record, not that logistics or payment verification. Excellent here means reopening the desk identifies the merchant, expected amount and next action immediately, and another browser restored from backup retains that work. No notification is sent by the follow-up date. Independent judgment belongs to returnby-refund-judge-tern84b2, not the producer tests.

## Deadline-to-trip handoff, 2026-11-10

A shopper choosing a busy deadline day in the monthly view should carry those returns into the existing trip planner without recalling and selecting every receipt again. The day now links to a review of current matching purchases. Adding them preserves the saved trip date, packing checks and notes; the chosen deadline never silently becomes the trip date. Only the date travels in the page address. The planner rereads saved orders and refuses an outdated selection until refreshed. This extends ReturnBy's local planning job alongside the ReturnQueen logistics and Whering inventory alternatives above; it does not perform a return.

Remaining handoff gaps, ranked: (1) distinguish retailer drop-off versus shipment deadlines using verified instructions, (2) support more than one saved trip without overwriting packing work, (3) bring confirmed store locations into route planning. The current product has one saved trip and shopper-entered notes. Independent judgment belongs to Mica; producer tests establish behavior, not a quality verdict.
