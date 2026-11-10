# Plan and resume a return trip

Open **Prepare a return-trip checklist** below the tracker’s saved-order list. The planner reads reviewed orders from the same browser and origin.

1. Set your planned trip date and select the orders you are taking.
2. Under **Pack for this trip**, tick off items, receipts and checked store instructions. Add drop-off or packing notes beside each order.
3. Leave and reopen the planner when you need to: the date, selection, checks and notes are saved on this device.
4. Choose **Preview printable trip** to review current order facts and your preparation.
5. Choose **Download printable HTML**. Open the file offline in a browser, or print it. The file includes the checks and notes at download time.

**Clear selection** leaves your packing notes available when you select an order again. **Start a new trip** replaces the saved trip after confirmation and leaves the tracker’s orders unchanged.

## Current facts when you return

The trip date is separate from the calculated return deadline. Both are shown, including when your trip would fall after a saved deadline. ReturnBy uses the saved window; confirm the store’s current instructions.

Changing an order in the tracker retires any prepared sheet. **Refresh saved orders** keeps your selected current orders and packing notes, reads the latest facts, and clears an instructions check if the reviewed details changed. Orders no longer available are excluded from the trip; their notes remain visible under **Orders no longer available** until you remove them from the plan. Restoring such an order does not silently select it again.

Preview and download still read the saved order list again. If it changed since review, refresh and make another preview. The printable file is a snapshot; it does not update after you download it. Amounts are literal saved strings, not a refund estimate or a sum across currencies.

## Saving, privacy and recovery

The trip is saved separately from order records. The planner never writes the order store. Notes are optional and may contain private details; they appear in downloaded sheets. Backup files include the saved trip, packing checks and notes. Import reviewed orders first, then explicitly restore the trip; replacing an existing trip requires confirmation. This is local browser storage, not account synchronization.

A storage failure leaves the plan open in the tab and offers **Retry saving trip**. The UI reports a successful save only after the write succeeds, and warns before leaving with unsaved edits. If another planner tab saved a different trip, choose **Load saved trip** or **Keep this tab’s trip instead**. These are explicit overwrite choices, not an atomic multi-device transaction.

Unreadable saved trip data is left unchanged until you explicitly start a new trip. Tracker read errors retain the draft and require another read. No retailer, inbox or external service is contacted.

## Verification

Run npm test and npm run build. tests/trip-plan.test.ts covers recovery, changed and unavailable orders, conflicts, save failures and printable notes. The existing checklist arithmetic and output tests are retained.

tools/check_trip_recovery_browser.mjs exercises the production build through real manual purchase entry, trip creation, reload, offline download, a second-tab edit/removal, concurrent planners, save failure/retry and a 390px phone. Set RETURNBY_PLAYWRIGHT to an installed Playwright module and RETURNBY_CHROME to Chrome. Optional TRIP_BUILD, TRIP_PORT and TRIP_EVIDENCE choose the build, loopback port and evidence destination.

Producer: astra-cedar-7c2e on a Renpō fleet worker. Independent shopper judgment belongs to a separate task and is not implied by these producer checks.
