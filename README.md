# ReturnBy

A local return desk for remembering purchase deadlines, preparing a return trip, and following an outstanding refund. Review the dates and store policy before saving. Your purchase records stay in your browser.

## Download and open

**[Download ReturnBy 0.4.0](https://github.com/Jacob-Met/returnby/releases/download/returnby-desk-2026-11-10/ReturnBy-v0.4.0-browser.zip)**

[Release notes and checksums](https://github.com/Jacob-Met/returnby/releases/tag/returnby-desk-2026-11-10) · [22-second desktop walkthrough](https://github.com/Jacob-Met/returnby/releases/download/returnby-desk-2026-11-10/ReturnBy-refund-walkthrough.mp4) · [Exact application source](https://github.com/Jacob-Met/returnby/commit/f38843003426b0b6d49ab733f11c39a8d576421e)

1. Extract the ZIP. You need Python 3 and a current browser.
2. Run `python3 serve_returnby.py` from the extracted folder on Linux/macOS, or `py -3 serve_returnby.py` on Windows. The included `Start ReturnBy.sh`, `Start ReturnBy.command` and `Start ReturnBy.cmd` provide the same launch path.
3. Open **http://127.0.0.1:8769**. Keep the same browser profile and address when you return.

The launcher serves only your own computer. Open the local address rather than the HTML file directly. If the port is occupied, stop the other local ReturnBy copy first. A different port uses separate browser storage; transfer saved work with a backup when changing it.

Linux and Chrome were exercised from the downloaded package. macOS and Windows launcher files are included but were not separately executed for this release. No Node/npm or account is needed to use it.

## Your next return

- **Return to saved work.** On a phone, existing purchases lead the desk. **Add purchase** opens intake; returning to the list keeps your current review. Saving takes you to the purchase you just added.
- **Add a purchase.** Enter a paper receipt manually, paste a confirmation, or review exported text/HTML email. Correct the proposed store, date and return window before saving. Dates such as 05/11/2026 require a choice when both day/month interpretations are valid.
- **Wait for delivery.** Keep reviewed delivery-based purchases pending until you can confirm their return-clock start. Expand the pending count to choose a purchase; confirming one leaves the others intact.
- **Find and act.** Search saved purchases, see upcoming deadlines, export calendar reminders, and prepare an editable return-trip checklist. CSV export below the saved list includes every saved purchase, even when the list is filtered.
- **Check a refund.** Record the amount and currency you expect, a date to check again, and notes. Mark received after checking for yourself. A partial refund record does not close the remaining purchase deadline.
- **Keep a copy.** Download a JSON backup for recovery or transfer. Review saved purchases, pending purchases and the optional prepared trip separately before restoring them.

Calendar files must be imported into your calendar. Check that app's notification settings. Imported entries are snapshots: ReturnBy cannot update or cancel them when a purchase changes. A follow-up date recorded in ReturnBy does not itself send a notification.

The known-return-by-date helper in this release calculates a day window from the confirmed clock. Reopening and changing that clock can change the saved deadline; review the proposed date before saving. Later development adds durable fixed-date intent and is not silently included in this source-pinned ZIP.

## What stays local

There is no inbox connection, upload or account synchronization. Saved purchases, refund notes, reviewed pending purchases and trip work use this browser's storage. Original email text is not retained in saved purchases or backups. Clearing browser data can remove saved work.

Backups are unencrypted and can contain purchase details, refund notes, reviewed pending fields and private packing notes. Keep them private. This release writes version 3 backups; older builds may refuse them. Some unfinished input is local to its original browser or tab rather than part of the portable backup.

ReturnBy records your decisions. It does not arrange pickup, verify retailer eligibility, contact a merchant or confirm bank receipt.

## What changed in this build

The phone desk now puts saved purchases before intake, retains a review while switching views, and focuses the correct purchase after saving. Several pending deliveries fit behind a count and review control. Numeric-date ambiguity requires an explicit choice, and partial refund follow-through stays with the purchase.

Producer astra-kestrel-7c9e implemented phone navigation; astra-wren-52d1 implemented refunds/date handling, composed the current pending collection, packaged and published the build. The exact source passed 602 tests and the production build on estate compute.

Independent astra-tern-84b2 downloaded the exact ZIP, verified its hash, ran its included Linux launcher, and used fresh Chrome desktop/390px phone sessions. The saved deadline remained in the first phone viewport with two pending purchases; choosing and confirming Arket retained Nordstrom. Ambiguous-date correction, manual/email save focus, draft return and refund persistence passed. The formal-release download was separately checked for byte parity with those exercised bytes. These are scoped workflow and UI improvements, not a claim of whole-product parity with established return services.

The linked walkthrough shows actual interactions on the extracted package with a fictional purchase and partial refund. It is a 21.6-second silent desktop video; the revised captions were independently judged for readability.

SHA-256: `67854ac3e1c440de812b23fe482ca1bba07a4d8853873baf64dac469ae6a17dc`

## Other source-pinned work

[Batch-to-pending browser package](downloads/returnby-batch-pending-0c12cba/README.md) has its own source, download and independent two-purchase course. It is a different source pin, not an extra feature silently added to the release above. Later mainline work and its remaining delivery gaps are described in [the product brief](VISION.md).

[Earlier releases and development notes](README-history-2026-11-10.md) remain available with their original sources and verification limits.

## Build from source

```sh
npm ci
npm test
npm run build
npm run preview
```

The maintained browser packager is `python3 tools/package_release.py /existing/output/directory`. Commit source first so the package identifies an exact revision. Browser checks in `tools/` use a separately installed Playwright/Chrome; estate checks run through Renpō rather than GitHub Actions.
