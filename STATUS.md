# ReturnBy — current desk

**[Download ReturnBy 0.14.0](https://github.com/Jacob-Met/returnby/releases/tag/v0.14.0)** · [Source](https://github.com/Jacob-Met/returnby/tree/main)

[Phone — merchant return document](https://github.com/Jacob-Met/returnby/releases/download/v0.14.0/ReturnBy-v0.14.0-merchant-return-phone.png) · [Desktop — offline return trip](https://github.com/Jacob-Met/returnby/releases/download/v0.14.0/ReturnBy-v0.14.0-merchant-return-desktop.png)

A saved return now carries merchant-issued QR images and PDF shipping labels into the offline trip. The original file stays on the device and in portable JSON backups, including on a new browser. The Linux application launches with those files and prepares a working offline trip sheet; the Windows and macOS builds are also packaged.

## Top gaps

1. **Other badly crumpled receipts can still hide their merchant or final amount.** One focused local recovery can read a real creased restaurant receipt, but lost ink and different folds still defeat the reader.
2. **Some calendar apps still retain obsolete reminders.** ReturnBy identifies and tracks the old downloaded dates for the shopper, but a calendar app can ignore cancellation files and still require manual deletion.
