# ReturnBy

A local return desk for remembering purchase deadlines, preparing a return trip, and following an outstanding refund. Review the dates and store policy before saving. Your purchase records stay in your browser.

## Receipt-review release 0.6.1

**[Download packages and checksums](https://github.com/Jacob-Met/returnby/releases/tag/returnby-policy-review-2026-11-10-f95eb64)** — review explicit receipt terms, keep uncertain delivery-based purchases pending, and confirm the applicable return window before a deadline is saved.

[Linux amd64](https://github.com/Jacob-Met/returnby/releases/download/returnby-policy-review-2026-11-10-f95eb64/ReturnBy-v0.6.1-linux-amd64.tar.gz) · [macOS Intel](https://github.com/Jacob-Met/returnby/releases/download/returnby-policy-review-2026-11-10-f95eb64/ReturnBy-v0.6.1-darwin-amd64.zip) · [macOS Apple Silicon](https://github.com/Jacob-Met/returnby/releases/download/returnby-policy-review-2026-11-10-f95eb64/ReturnBy-v0.6.1-darwin-arm64.zip) · [Windows amd64](https://github.com/Jacob-Met/returnby/releases/download/returnby-policy-review-2026-11-10-f95eb64/ReturnBy-v0.6.1-windows-amd64.zip) · [Python3 browser ZIP](https://github.com/Jacob-Met/returnby/releases/download/returnby-policy-review-2026-11-10-f95eb64/ReturnBy-v0.6.1-browser.zip)

Extract the matching native archive and run ReturnBy (or its included platform launcher). The runtime and app are bundled. Keep the same browser profile and http://127.0.0.1:8769 address to retain saved work. macOS/Windows binaries are crosscompiled and unsigned, with no platform execution claim.

The exact [f95eb649 source](https://github.com/Jacob-Met/returnby/commit/f95eb649c2438f71f8a38d96dbb795057d6862d0) is cumulative with the saved-first phone desk, reviewed pending collection, named trips, fixed-date intent and purchase history. Ordinary “returned within 21 days after delivery” wording requires a confirmed delivery clock. Conflicting standard and sale-item windows remain visible and blank for explicit review, including after pending reload and resume. Purchase-field recognition is labelled separately from policy review. English receipt extraction is bounded assistance: check the merchant terms and choose the policy that applies to your purchase.

## Your next return

- **Return to saved work.** On a phone, existing purchases lead the desk. **Add purchase** opens intake; returning to the list keeps your current review. Saving takes you to the purchase you just added.
- **Add a purchase.** Enter a paper receipt manually, paste a confirmation, or review exported text/HTML email. Correct the proposed store, date and return window before saving. Dates such as 05/11/2026 require a choice when both day/month interpretations are valid.
- **Wait for delivery.** Keep reviewed delivery-based purchases pending until you can confirm their return-clock start. Expand the pending count to choose a purchase; confirming one leaves the others intact.
- **Find and act.** Search saved purchases, see upcoming deadlines, export calendar reminders, and prepare an editable return-trip checklist. Save named copies for different errands and reopen their dates, selections and packing notes. CSV export below the saved list includes every saved purchase, even when the list is filtered.
- **Check a refund.** Keep a simple expected amount and follow-up note, or choose **Track partial payments** to record dated credits, their references and the amount still owed. Correct or remove a credit before saving. A zero balance still requires you to mark the refund received after checking for yourself. Refund tracking does not close the purchase deadline.
- **Keep a copy.** Download a JSON backup for recovery or transfer. Review saved purchases, pending purchases and the working trip and named copies separately before restoring them.

Calendar files must be imported into your calendar. Check that app's notification settings. Imported entries are snapshots: ReturnBy cannot update or cancel them when a purchase changes. A follow-up date recorded in ReturnBy does not itself send a notification.

A confirmed fixed return-by date remains distinct from a day-window policy. Review the proposed deadline and clock basis before saving.

## What stays local

There is no inbox connection, upload or account synchronization. Saved purchases, refund notes, reviewed pending purchases and trip work use this browser's storage. Original email text is not retained in saved purchases or backups. Clearing browser data can remove saved work.

Backups are unencrypted and can contain purchase details, refund notes, reviewed pending fields and private packing notes. Keep them private. Current source writes backup version 6 when dated refund payments are present, version 5 for explicit finished-return outcomes, and older versions for simpler records. Versions 1–5 remain readable. Older releases refuse a version they cannot preserve; use a current build to restore payment history. Some unfinished input is local to its original browser or tab rather than part of the portable backup.

ReturnBy records your decisions. It does not arrange pickup, verify retailer eligibility, contact a merchant or confirm bank receipt.

## Actual release verification

Source f95eb649 passed the production build; the policy change passed 691 automated tests on fleet workers and an actual Chrome pending/reload/resume course. A separate reviewer accepted unfamiliar returned/unworn wording, conflicting standard/sale terms, blank-window persistence, explicit date validation, privacy and 390px phone pixels. Independent reviewer astra-nami downloaded the published Linux archive, matched its checksum and source version, and ran the bundled launcher with PATH=/nonexistent. In a fresh 390px Chrome context, two pending purchases survived reload; the conditional window stayed blank, a date-only save was rejected, and an explicit 7-day choice with November 12 delivery saved November 19 while preserving the November 5 order date and the other pending purchase. No original receipt text was stored. [Independent receiving evidence and limits](docs/receipt-policy-release/independent/JUDGMENT.md).

Linux SHA256: `3a64e83f5293a2f1077d3cd9353668d48277e6105c7261090d688d78e726d98b`. Browser ZIP SHA256: `bdbba701f9f2f6407091c1aeb59d1d5fe166255e374f1b317b15c1620496ad85`. The release includes checksums for every platform.

## Earlier source-pinned work

The [named-trip 0.5.0 release record](README-named-trips-2026-11-10.md) preserves its exact source, independent downloaded-use judgment and actual walkthrough.

The [independently used phone-desk0.4.0 release](docs/named-trip-release/earlier-phone-desk-README.md) retains its source, walkthrough and exact Tern judgment. The [batch-to-pending package](downloads/returnby-batch-pending-0c12cba/README.md) and [historical releases](README-history-2026-11-10.md) remain available. They are separate source pins, not additional unverified capabilities silently added to this build.

## Build from source

```sh
npm ci
npm test
npm run build
npm run preview
```

The maintained browser packager is `python3 tools/package_release.py /existing/output/directory`. Commit source first so the package identifies an exact revision. Browser checks in `tools/` use a separately installed Playwright/Chrome; estate checks run through Renpō rather than GitHub Actions.
