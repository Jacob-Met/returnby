# ReturnBy

A local return desk for remembering purchase deadlines, preparing a return trip, and following an outstanding refund. Review the dates and store policy before saving. Your purchase records stay in your browser.

## Current release 0.7.2 — local receipt photos

**[Download packages and checksums](https://github.com/Jacob-Met/returnby/releases/tag/v0.7.2)** — read a printed receipt photo locally, review the suggested fields beside its source, and keep the current policy, trip and partial-refund workflow.

[Linux amd64](https://github.com/Jacob-Met/returnby/releases/download/v0.7.2/ReturnBy-v0.7.2-linux-amd64.tar.gz) · [macOS Intel](https://github.com/Jacob-Met/returnby/releases/download/v0.7.2/ReturnBy-v0.7.2-darwin-amd64.zip) · [macOS Apple Silicon](https://github.com/Jacob-Met/returnby/releases/download/v0.7.2/ReturnBy-v0.7.2-darwin-arm64.zip) · [Windows amd64](https://github.com/Jacob-Met/returnby/releases/download/v0.7.2/ReturnBy-v0.7.2-windows-amd64.zip) · [Python 3 browser ZIP](https://github.com/Jacob-Met/returnby/releases/download/v0.7.2/ReturnBy-v0.7.2-browser.zip)

Extract the matching native archive and run ReturnBy or its included launcher. The runtime, app and English OCR reader are bundled. Keep the same browser profile and http://127.0.0.1:8769 address to retain saved work. Linux amd64 was executed; macOS/Windows are cross-built and unsigned, with no platform execution claim.

[Watch the actual 21-second receipt workflow](https://github.com/Jacob-Met/returnby/releases/download/v0.7.2/ReturnBy-receipt-photo.mp4) — captioned and silent, using a clearly labelled fictional receipt in the bundled app. [Photo intake details and limits](docs/RECEIPT_PHOTOS.md).

![Actual desktop photo review](https://github.com/Jacob-Met/returnby/releases/download/v0.7.2/receipt-review-desktop.png)

The exact [9165d8f source](https://github.com/Jacob-Met/returnby/commit/9165d8fcea612875dea6c2a16474413b02f4e717) includes conditional receipt-policy review, dated refund credits and the compact refund editor, purchase History, named trips and calendar exports. Photos suggest purchase facts; they do not verify a store's policy. Check the source and choose the applicable return window before saving.

## Your next return

- **Return to saved work.** On a phone, existing purchases lead the desk. **Add purchase** opens intake; returning to the list keeps your current review. Saving takes you to the purchase you just added.
- **Add a purchase.** Read a JPG, PNG or WebP receipt photo, enter details manually, paste a confirmation, or review exported text/HTML email. Correct the proposed store, date and return window before saving. Dates such as 05/11/2026 require a choice when both day/month interpretations are valid.
- **Wait for delivery.** Keep reviewed delivery-based purchases pending until you can confirm their return-clock start. Expand the pending count to choose a purchase; confirming one leaves the others intact.
- **Find and act.** Search saved purchases, see upcoming deadlines, export calendar reminders, and prepare an editable return-trip checklist. Save named copies for different errands and reopen their dates, selections and packing notes. CSV export below the saved list includes every saved purchase, even when the list is filtered.
- **Check a refund.** Keep a simple expected amount and follow-up note, or choose **Track partial payments** to record dated credits, their references and the amount still owed. Correct or remove a credit before saving. A zero balance still requires you to mark the refund received after checking for yourself. Refund tracking does not close the purchase deadline.
- **Keep a copy.** Download a JSON backup for recovery or transfer. Review saved purchases, pending purchases and the working trip and named copies separately before restoring them.

Calendar files must be imported into your calendar. Check that app's notification settings. Imported entries are snapshots: ReturnBy cannot update or cancel them when a purchase changes. A follow-up date recorded in ReturnBy does not itself send a notification.

A confirmed fixed return-by date remains distinct from a day-window policy. Review the proposed deadline and clock basis before saving.

## What stays local

There is no inbox connection, upload or account synchronization. Saved purchases, refund notes, reviewed pending purchases and trip work use this browser's storage. Original email text is not retained in saved purchases or backups. Receipt images and raw OCR stay only on the open page; reload clears them while unfinished reviewed fields recover in the same tab. Saved purchases do not retain a receipt archive. Clearing browser data can remove saved work.

Backups are unencrypted and can contain purchase details, refund notes, reviewed pending fields and private packing notes. Keep them private. Current source writes backup version 6 when dated refund payments are present, version 5 for explicit finished-return outcomes, and older versions for simpler records. Versions 1–5 remain readable. Older releases refuse a version they cannot preserve; use a current build to restore payment history. Some unfinished input is local to its original browser or tab rather than part of the portable backup.

ReturnBy records your decisions. It does not arrange pickup, verify retailer eligibility, contact a merchant or confirm bank receipt.

## Actual release verification

Source 9165d8f passed 707 tests across 52 files, TypeScript and production build. The bundled Linux executable ran with PATH=/nonexistent. Actual Chrome and the included Tesseract worker exercised photo reading, reviewed saving, same-tab draft recovery, cancellation and replacement after an exact deadline. A separate actual browser course preserved split credits, correction/removal, explicit completion and a downloaded backup restored in a fresh browser. No external requests were observed in the photo course.

Earlier independent unfamiliar synthetic and untouched crumpled-photo courses led to concrete merchant/total/review-warning improvements. Forge separately reviewed recovery, raw-image/text exclusion, deadline replacement and conditional terms on desktop/phone. Forge also independently accepted the final cumulative source after a photo-to-purchase-to-partial-refund course and actual 390px editor inspection. The photo omitted an optional receipt number in that sample; the reviewer corrected it explicitly. A separate reviewer downloaded the published Linux archive and verified its exact 15,466,305 bytes, checksum, version and source metadata. Their launcher/browser run is still in progress; the executed bundled-Linux result above is a producer check.

Linux archive SHA256: `c8d005bd825d5da56be717429847142038295f3a6098ce7d6886609378d63c3a`. All platform checksums accompany the release. Remaining photo gaps are faint/perspective-distorted printing, more languages/formats, and an explicit receipt archive. Source zoom supports correction; it is not an OCR accuracy guarantee.

## Earlier source-pinned work

The [receipt-policy 0.6.1 release record](README-policy-release-2026-11-10.md) preserves its source and independent downloaded-use course.

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
