# ReturnBy — current desk

**[Download ReturnBy 0.13.0](https://github.com/Jacob-Met/returnby/releases/tag/v0.13.0)** · [Source](https://github.com/Jacob-Met/returnby/tree/main)

[Phone — calendar cleanup](https://github.com/Jacob-Met/returnby/releases/download/v0.13.0/ReturnBy-v0.13.0-calendar-cleanup-phone.png) · [Desktop — calendar cleanup](https://github.com/Jacob-Met/returnby/releases/download/v0.13.0/ReturnBy-v0.13.0-calendar-cleanup-desktop.png)

The offline tracker now remembers the dates of calendar files prepared for download. When a deadline changes or a return is finished, the saved return identifies old events that may remain in a calendar app, with a shopper-confirmed cleanup action. A cancellation uses the last downloaded date. The delivered Linux app worked through the full changed-date, cancelled-cutoff and completed-return journey on desktop and phone; Windows and macOS builds are also packaged.

## Top gaps

1. **A return requiring a merchant-issued QR code or shipping label still stalls when the shopper is offline at handoff.** ReturnBy keeps a web link, not an offline, zoomable/printable copy of the merchant document.
2. **Other badly crumpled receipts can still hide their printed merchant or final amount.** The focused local reader recovers one real restaurant photo; lost ink and different folds can defeat it.
3. **Importing a reminder cannot remove an old event in every calendar app.** ReturnBy now names the dates to remove and lets the shopper confirm cleanup, but has no account access to delete external events itself.
