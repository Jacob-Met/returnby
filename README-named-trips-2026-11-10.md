# ReturnBy

A local return desk for remembering purchase deadlines, preparing a return trip, and following an outstanding refund. Review the dates and store policy before saving. Your purchase records stay in your browser.

## Named-trip release 0.5.0

**[Download packages, checksums and the actual walkthrough](https://github.com/Jacob-Met/returnby/releases/tag/returnby-named-trips-2026-11-10-dc8bdc7)** — save separate errands, reopen their dates and packing notes, and carry named copies through a reviewed backup.

[Linux amd64](https://github.com/Jacob-Met/returnby/releases/download/returnby-named-trips-2026-11-10-dc8bdc7/ReturnBy-v0.5.0-linux-amd64.tar.gz) · [macOS Intel](https://github.com/Jacob-Met/returnby/releases/download/returnby-named-trips-2026-11-10-dc8bdc7/ReturnBy-v0.5.0-darwin-amd64.zip) · [macOS Apple Silicon](https://github.com/Jacob-Met/returnby/releases/download/returnby-named-trips-2026-11-10-dc8bdc7/ReturnBy-v0.5.0-darwin-arm64.zip) · [Windows amd64](https://github.com/Jacob-Met/returnby/releases/download/returnby-named-trips-2026-11-10-dc8bdc7/ReturnBy-v0.5.0-windows-amd64.zip) · [Python3 browser ZIP](https://github.com/Jacob-Met/returnby/releases/download/returnby-named-trips-2026-11-10-dc8bdc7/ReturnBy-v0.5.0-browser.zip)

Extract the matching native archive and run ReturnBy (or its included platform launcher). The runtime and app are bundled. Keep the same browser profile and http://127.0.0.1:8769 address to retain saved work. Linux/Chrome was exercised from the actual GitHub download; macOS/Windows binaries are crosscompiled and unsigned, with no platform execution claim.

This exact [dc8bdc7 source](https://github.com/Jacob-Met/returnby/commit/dc8bdc7d0586285a31fead9e95050792337a4067) includes the saved-first phone desk, pending purchase collection, batch delivery handoff, reviewed backup differences, trip receipt search and named plans. It predates later receipt-policy work. [Release coverage and limits](docs/named-trip-release/README.md). Earlier builds remain in the historical release notes below.

## Your next return

- **Return to saved work.** On a phone, existing purchases lead the desk. **Add purchase** opens intake; returning to the list keeps your current review. Saving takes you to the purchase you just added.
- **Add a purchase.** Enter a paper receipt manually, paste a confirmation, or review exported text/HTML email. Correct the proposed store, date and return window before saving. Dates such as 05/11/2026 require a choice when both day/month interpretations are valid.
- **Wait for delivery.** Keep reviewed delivery-based purchases pending until you can confirm their return-clock start. Expand the pending count to choose a purchase; confirming one leaves the others intact.
- **Find and act.** Search saved purchases, see upcoming deadlines, export calendar reminders, and prepare an editable return-trip checklist. Save named copies for different errands and reopen their dates, selections and packing notes. CSV export below the saved list includes every saved purchase, even when the list is filtered.
- **Check a refund.** Record the amount and currency you expect, a date to check again, and notes. Mark received after checking for yourself. A partial refund record does not close the remaining purchase deadline.
- **Keep a copy.** Download a JSON backup for recovery or transfer. Review saved purchases, pending purchases and the working trip and named copies separately before restoring them.

Calendar files must be imported into your calendar. Check that app's notification settings. Imported entries are snapshots: ReturnBy cannot update or cancel them when a purchase changes. A follow-up date recorded in ReturnBy does not itself send a notification.

The known-return-by-date helper in this release calculates a day window from the confirmed clock. Reopening and changing that clock can change the saved deadline; review the proposed date before saving. Later development adds durable fixed-date intent and is not silently included in this source-pinned ZIP.

## What stays local

There is no inbox connection, upload or account synchronization. Saved purchases, refund notes, reviewed pending purchases and trip work use this browser's storage. Original email text is not retained in saved purchases or backups. Clearing browser data can remove saved work.

Backups are unencrypted and can contain purchase details, refund notes, reviewed pending fields and private packing notes. Keep them private. This release writes version 4 when named trip copies are present, preserving the existing working trip and pending purchases. Versions 1–3 remain readable; older releases may refuse version 4. Some unfinished input is local to its original browser or tab rather than part of the portable backup.

ReturnBy records your decisions. It does not arrange pickup, verify retailer eligibility, contact a merchant or confirm bank receipt.

## Actual release verification

Source dc8bdc7 passed 610 tests and the production build on fleet. The producer downloaded the formal Linux asset, verified its checksum and executed it with no installed runtime on PATH. The separate judge astra-kestrel-b6a904df3c used that actual entrypoint with unfamiliar purchases at desktop1440 and phone390: two errands, reload, cancelled replacement, changed-deadline recheck, printable HTML, real backup transfer and a renamed-copy conflict passed. The original phone navigation mistake and corrected follow-through remain preserved; no failed receipt is relabeled green.

[Independent judgment and ranked gaps](docs/named-trip-release/independent/JUDGMENT.md) · [Running executable matched to downloaded archive](docs/named-trip-release/independent/provenance.json) · [Short actual trip walkthrough](https://github.com/Jacob-Met/returnby/releases/download/returnby-named-trips-2026-11-10-dc8bdc7/ReturnBy-named-trips-dc8bdc7.mp4)

This is scoped acceptance, not whole-product parity or evidence of real-world returns/adoption. Native Linux was executed; macOS/Windows were crosscompiled. The clip shows fictional purchases in the actual packaged app, slowed to half speed with captions above the application.

## Earlier source-pinned work

The [independently used phone-desk0.4.0 release](docs/named-trip-release/earlier-phone-desk-README.md) retains its source, walkthrough and exact Tern judgment. The [batch-to-pending package](downloads/returnby-batch-pending-0c12cba/README.md) and [historical releases](README-history-2026-11-10.md) remain available. They are separate source pins, not additional unverified capabilities silently added to this build.

## Build from source

```sh
npm ci
npm test
npm run build
npm run preview
```

The maintained browser packager is `python3 tools/package_release.py /existing/output/directory`. Commit source first so the package identifies an exact revision. Browser checks in `tools/` use a separately installed Playwright/Chrome; estate checks run through Renpō rather than GitHub Actions.
