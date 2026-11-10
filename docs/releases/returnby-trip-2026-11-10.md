# ReturnBy — resumable return trips

[Download the browser ZIP](https://github.com/Jacob-Met/returnby/releases/download/returnby-trip-2026-11-10/ReturnBy-2026-11-10-trip-54c12f5-browser.zip) · [GitHub Release and assets](https://github.com/Jacob-Met/returnby/releases/tag/returnby-trip-2026-11-10) · [Actual browser demonstration](https://github.com/Jacob-Met/returnby/releases/download/returnby-trip-2026-11-10/ReturnBy-trip-demo-54c12f5.mp4)

This experimental local browser release lets a shopper leave an unfinished return trip and resume its date, selected purchases, packing checks and drop-off notes. Reopening uses current saved order facts. A changed return rule asks for another instructions check; an unavailable purchase keeps its notes outside the printed trip. The downloaded HTML sheet works offline.

The snapshot includes manual-purchase entry, confirmed return-window start dates, removal undo and the corrected backup-date preview. Later work on trip transfer, refunds, calendar alerts and the mobile return desk is not included in this pinned ZIP.

## Run it

Extract the ZIP. Python 3 is required; Node/npm is not.

- Windows: Start ReturnBy.cmd, or run `py -3 serve_returnby.py`.
- macOS: Start ReturnBy.command, or run `python3 serve_returnby.py`.
- Linux: run `python3 serve_returnby.py`, or `bash "Start ReturnBy.sh"`.

Open http://127.0.0.1:8769/. Keep the same browser profile and port to retain existing data. This release uses that fixed loopback port; if it is occupied, the launcher reports the conflict. Do not open index.html directly.

Save a purchase, choose **Prepare a return-trip checklist**, set a date and select purchases. Mark packing checks and add notes. Leave and reopen the planner to continue. **Preview printable trip** reads the saved facts again before a real HTML download.

## Exact build and actual use

Source: [54c12f5290bca26d8876424e5d0a0dc9a29b42d8](https://github.com/Jacob-Met/returnby/commit/54c12f5290bca26d8876424e5d0a0dc9a29b42d8), merged PR106 with the concurrent backup preview correction.

ZIP: 322,932 bytes. SHA-256:
`ae975c11c83c5323d6bd99ffc3ac056aeb4b0842abb88de95b111538e71e24d0`.

Producer **astra-cedar-7c2e** ran 516 native tests, the TypeScript/Vite build and the real Chrome trip workflow. The public GitHub asset was then downloaded without authentication (HTTP 200), matched the ZIP digest, extracted and run through its included Linux launcher at port 8769. Actual manual purchase → date/checks/notes → reload → real downloaded offline sheet passed; the downloaded build also retained the plan at 390px without horizontal overflow.

Independent **astra-tern-7c2e** accepted a different shopper journey at the feature source and the composed confirmed-start integration: a real second tracker tab changed the start date, the planner retired its previous preview, kept notes and used the corrected deadline. That separate judgment is recorded in returnby-whole-workflow-judge-tern7c2e; the producer performed the published-package run.

The release includes actual desktop/phone/printed-sheet images and a 35-second silent, captioned browser recording. The recording shows real selection, packing, leaving/reopening and an offline download with fictional purchases. Captions sit below the app; no interaction is simulated.

Linux/Chrome were exercised. Windows/macOS launchers are packaged but were not independently run.

## Privacy and limits

One editable trip per browser origin. Order backups in this particular release contain orders only. Notes appear in downloaded sheets. No account sync, retailer-policy verification, pickup or refund verification is provided; check current store instructions yourself.

[Earlier distributions](../HISTORICAL_RELEASES.md) remain available for reference.
