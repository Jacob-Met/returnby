# ReturnBy

A local return desk for remembering purchase deadlines, preparing a return trip, and following an outstanding refund. Review the dates and store policy before saving. Your purchase records stay in your browser.

## Current release 0.9.1 — purchase date and original receipt at the counter

**[Download ReturnBy 0.9.1 for your computer](https://github.com/Jacob-Met/returnby/releases/tag/v0.9.1)** — a purchase date is never silently inferred from a shipping, delivery or return-by date. If the date is unclear, the review asks you to enter it before tracking a deadline. A photographed paper receipt stays with its saved purchase in this browser. Open it again from the tracker or packing list to show at the counter, zoom in, rotate, save the original image, or replace it. Return-document links and precise shipment/drop-off deadline actions continue from purchase through the trip.

A general return-by date remains the default for older purchases. ReturnBy never guesses whether a date means shipment or merchant receipt. Choose the requirement from the retailer's instructions. A merchant-receipt deadline needs transit time before the displayed date, not a last-day postmark.

[Linux amd64](https://github.com/Jacob-Met/returnby/releases/download/v0.9.1/ReturnBy-v0.9.1-linux-amd64.tar.gz) · [macOS Intel](https://github.com/Jacob-Met/returnby/releases/download/v0.9.1/ReturnBy-v0.9.1-darwin-amd64.zip) · [macOS Apple Silicon](https://github.com/Jacob-Met/returnby/releases/download/v0.9.1/ReturnBy-v0.9.1-darwin-arm64.zip) · [Windows amd64](https://github.com/Jacob-Met/returnby/releases/download/v0.9.1/ReturnBy-v0.9.1-windows-amd64.zip) · [Python 3 browser ZIP](https://github.com/Jacob-Met/returnby/releases/download/v0.9.1/ReturnBy-v0.9.1-browser.zip)

Extract the native archive and run ReturnBy or the included launcher. The runtime, app and English OCR reader are bundled. Keep the same browser profile and http://127.0.0.1:8769 address to retain purchases and trips. The Linux build is exercised; macOS and Windows packages are crosscompiled and unsigned.

[Watch the earlier receipt-photo walkthrough](https://github.com/Jacob-Met/returnby/releases/download/v0.7.2/ReturnBy-receipt-photo.mp4) — a captioned, silent walkthrough with a fictional receipt. The current version still reads receipt photos locally. [Photo intake details](docs/RECEIPT_PHOTOS.md).

The release includes local photo review, dated partial-refund credits, purchase History, named return trips and calendar exports. It now carries the return document link and precise deadline action from the saved purchase into the editable and printable packing plan, downloaded backups, CSV and calendar reminders.

![Saved original paper receipt on a phone](https://github.com/Jacob-Met/returnby/releases/download/v0.9.0/ReturnBy-receipt-proof-phone.png)

## Your next return

- **Return to saved work.** On a phone, existing purchases lead the desk. **Add purchase** opens intake; returning to the list keeps your current review. Saving takes you to the purchase you just added.
- **Add a purchase.** Read a JPG, PNG or WebP receipt photo, enter details manually, paste a confirmation, or review exported text/HTML email. Correct the proposed store, date and return window before saving. Dates such as 05/11/2026 require a choice when both day/month interpretations are valid.
- **Wait for delivery.** Keep reviewed delivery-based purchases pending until you can confirm their return-clock start. The return document link and retailer action requirement survive this wait. Confirming one purchase leaves the others intact.
- **Find and act.** Search saved purchases, tap **Paper receipt** to show or add your original receipt photo, see whether to ship, drop off or allow time for merchant receipt, open the saved label or QR link, export calendar reminders, and prepare an editable trip checklist. Save named trips for errands; reopening checks current order facts. CSV export includes every saved purchase.
- **Check a refund.** Keep a simple expected amount and follow-up note, or choose **Track partial payments** to record dated credits, their references and the amount still owed. Correct or remove a credit before saving. A zero balance still requires you to mark the refund received after checking for yourself. Refund tracking does not close the purchase deadline.
- **Keep a copy.** Download a JSON backup for recovery or transfer. Review saved purchases, pending purchases and the working trip and named copies separately before restoring them.

Calendar files must be imported into your calendar. Check that app's notification settings. Imported entries are snapshots: ReturnBy cannot update or cancel them when a purchase changes. A follow-up date recorded in ReturnBy does not itself send a notification.

A confirmed fixed return-by date remains distinct from a day-window policy. Review the proposed deadline and clock basis before saving.

## What stays local

There is no inbox connection, upload or account synchronization. Saved purchases, refund notes, reviewed pending purchases and trip work use this browser's storage. Original email text is not retained in saved purchases or backups. The original paper-receipt image is saved locally in your browser for a reviewed purchase and can be reopened from a saved return or its trip. You can also add or replace a photo from an existing return. Raw recognized text is cleared on reload. **JSON backups and printed checklists do not contain receipt images**, so use **Save original photo** before switching devices or clearing browser storage. A saved HTTPS return-document link opens the merchant-hosted source; it may require a sign-in or expire. Clearing browser data can remove saved work.

Backups are unencrypted and may contain purchase details, return links, action deadlines, refund records and private trip notes. Keep them private. The current app writes backup version 8 when a shipment, drop-off or merchant-receipt requirement is saved; version 7 for return links; and earlier formats when applicable. Versions 1–7 remain readable. Older releases cannot safely read version 8; upgrade before restoring or transferring such backups.

ReturnBy records your decisions. It does not arrange pickup, verify retailer eligibility, contact a merchant or confirm bank receipt.

## Current build and limits

The source passed 730 automated tests across 55 files, TypeScript compilation and a production Vite build. The locally stored receipt photograph was used at phone and desktop sizes through save, reload, original-byte download, trip access and removal. The built app was used in Chrome at 390px and 1440px through a purchase, pending delivery, a changed deadline action, editing, a downloaded version-8 backup, printable return trip and manual merchant-receipt deadline. The Linux package is exercised separately before publishing; macOS and Windows archives are crosscompiled and unsigned.

ReturnBy keeps the shopper's decisions and dates, not verified merchant policies or bank transfers. It does not arrange a shipment or pickup. Its merchant-hosted link is not a locally archived QR image. Paper receipt photos remain on the device where they were saved; bring a separate copy when required.

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
