**[Download ReturnBy-2026-11-10-backup-progress-db35c9d-browser.zip](./ReturnBy-2026-11-10-backup-progress-db35c9d-browser.zip)** · [SHA-256](./SHA256SUMS.txt)

This is a versioned repository download built from merged source db35c9decf3ecaa38301de37d7bdd9d4bd652752. It is not a formal GitHub Release. Formal release publication returned HTTP403 after the fleet's previously working authenticated account became unavailable; the tested ZIP is delivered here without changing its bytes.

# ReturnBy: update an existing browser from a later backup

A later backup can now bring received refunds and corrected purchases back into a browser that already has those purchases. The preview compares changed amounts, dates, refund status and notes, and lets you keep the complete current purchase or use the complete backup purchase.

Unreviewed differences stay current. Unrelated new purchases and explicitly chosen updates can still be applied. If another tab changes purchases during review, the old choices are cleared and must be reviewed again. A refused browser write keeps the review and choices available for retry. Trip restoration remains a separate choice.

Source db35c9decf3ecaa38301de37d7bdd9d4bd652752, merged PR134. This is a cumulative v0.3.0 browser package built by the maintained release script, including earlier confirmed clocks, pending delivery review, refund follow-up and reminder export, manual draft recovery, CSV, trips and deadline-day handoff.

Extract the ZIP and run the included launcher with Python3: Start ReturnBy.sh (Linux), Start ReturnBy.command (macOS), or Start ReturnBy.cmd (Windows). Open http://127.0.0.1:8769/. Keep the same browser profile and port for the same local purchases; READ_ME_FIRST.txt explains explicit alternate ports.

Validation: exact merged production build and 595 tests passed on HAMON build182. The extracted ZIP's included launcher was executed and actual Chrome exercised later-backup additions and received updates, a newer second-tab edit revoking a previous choice, keep-current preserving newer notes while adding unrelated purchases, and storage refusal/retry. Attached images show actual desktop/390px phone UI with fictional purchases. Linux/Chrome were exercised; Windows/macOS launchers were packaged, not separately run.

The repository and release are public; purchase details remain browser-local. No live sync, bank or merchant verification, or automatic combination of fields from different purchase versions is claimed. Choosing a version replaces the complete reviewed purchase, so compare every changed field.
