# Return-trip checklist

Open **Return-trip checklist** below the tracker’s saved-order list. The checklist reads the same browser origin’s reviewed orders. It does not read the pasted confirmation box or change the tracker.

1. Choose **Refresh saved orders** if you saved or changed orders in another tab.
2. Select the orders you plan to take. Set the planned trip date.
3. Choose **Preview trip** and review the order details, stored return-window source and calculated deadlines.
4. Choose **Download printable HTML**. Open that file in a browser and use its Print command. The file has its own styles and works offline.

The paper sheet includes blank item/packaging, receipt and return-arrangement checks, plus space for handwritten notes. It does not record completion. Trip choices and notes are not persisted, and reloading the page starts a new selection.

## What the dates and amounts mean

Deadline calculation uses the unchanged tracker functions and each order’s saved order date and window length. Each record retains **Saved policy window**, **Saved default window** or **User-adjusted window**. The planned trip date is compared with that calculated deadline, including dates after the deadline. Confirm current return instructions with the store.

Amounts remain literal saved strings. There is no combined total, currency conversion or refund estimate. Missing optional details are marked **Not recorded**.

## Refresh and read errors

The page keeps the exact saved-list bytes it loaded. Before previewing or downloading it checks the current saved list again. A change, removal or read-access failure prevents download until you explicitly refresh, reselect and preview. Cross-tab storage changes also mark the page stale. Refresh clears the current selection and preview.

Malformed JSON, invalid record fields, duplicate identifiers, unsupported dates/windows and lists over 2 MiB or 2,000 records cause a read failure. No records are silently dropped, repaired or saved. Review the source orders in the tracker and refresh here; the checklist does not offer a destructive reset.

The exported HTML contains only selected order facts and the planned/prepared dates. It contains no scripts, remote assets, full saved-list payload, order-creation timestamps or storage data. Anyone you share that file with can read its selected order details.

## Verification

Existing tests remain unchanged. Run **npm test** and **npm run build**; Vite builds both the original tracker and the checklist entry.

The focused suite is **tests/trip-checklist.test.ts**. The native browser receiver uses authored fictional orders, separate browser state, real download events and an offline reopening/print check. Its receipt records exact runtime and downloaded bytes; no live merchant calls or personal order data are needed.
