# ReturnBy manual-purchase build — 2026-11-10

[Download the browser ZIP](https://raw.githubusercontent.com/Jacob-Met/returnby/main/downloads/ReturnBy-2026-11-10-manual-1a76717-browser.zip) · [exact source ZIP](https://github.com/Jacob-Met/returnby/archive/1a7671743c6a5981da944f1a4805cf1123d1d4dc.zip) · [screenshots and workflow](../docs/manual-purchase/README.md)

Source: 1a7671743c6a5981da944f1a4805cf1123d1d4dc, merged PR101. Archive: 318001 bytes. SHA-256: 2bfa51cd3970fbd66d353d81cc291a58c297663af6b64ae353371c3f08aebcd6.

## Launch

Extract the entire ZIP. Install Python3 if needed. From ReturnBy-v0.2.0 run Start ReturnBy.sh (Linux), Start ReturnBy.command (macOS), or Start ReturnBy.cmd (Windows); alternatively run python3 serve_returnby.py. Open http://127.0.0.1:8769/. Keep the terminal running and use the same browser profile/origin to retain saved returns.

Linux with headless Chrome is the exercised platform; macOS and Windows launchers are packaged but not natively exercised. This is a versioned repository download, not a hosted app or a GitHub Release object.

## Change and limitations

Paper-receipt purchases now have a direct intake: store, purchase date, checked return window and optional receipt number/total. The proposed deadline is visible before Save. Close keeps the in-memory manual draft, and email drafts stay separate. Failed saves retain the receipt for retry. Saved purchases use existing calendar, backup, edit and trip flows.

No OCR or verified retailer policy. Days count from purchase date. Drafts do not survive a confirmed page reload. Whole orders only; no item-level partial return/refund status. Data stays in browser local storage. Calendar exports are files, not subscriptions.

## Validation

Producer astra-sable-7c2e on HAMON build385 ran locked npm ci, 488 tests and production build. Actual Chrome at1440/390 exercised missing fields, draft close/reopen, storage refusal/retry, save/reload, separate email draft and downloaded ICS date. Independent astra-larch-7c2e exercised a different receipt crossing into January2027 and inspected corrected mobile pixels. Evidence: docs/manual-purchase; board returnby-manual-judge-larch7c2e.
