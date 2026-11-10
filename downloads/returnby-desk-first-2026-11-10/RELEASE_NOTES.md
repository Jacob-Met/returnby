# ReturnBy v0.2.0 — desk-first browser preview

**Built from source:** b5ab27fdd9c77100ec0a6d3894d497efb8d0e7c1 (merged PR #98, 2026-11-10).

**Download:** ReturnBy-v0.2.0-browser.zip (317,056 bytes)
**SHA-256:** 30dbe3457457aa1c6f51560f6ea8a16b5ad2336981a6687a8ba8efff0f629daf

## Open the application

Extract the ZIP, install Python 3, and run "Start ReturnBy.cmd" on Windows,
"Start ReturnBy.command" on macOS, or "./Start ReturnBy.sh" on Linux.
Open http://127.0.0.1:8769 in your browser. The app stays on the local machine,
does not connect to an inbox, and saves reviewed returns in that browser profile.
Keep the same local port when returning later.

## What changed

The actual return desk replaces the large marketing hero on the first screen.
Order paste/review and the saved-deadline tracker are immediately accessible.
The new compact mobile layout preserves the existing real tracker, saved-return
search, cross-tab review, calendar export, editing, batch intake, HTML receipt
import, backups and trip checklist. A repeated promotional strip was removed.

The companion desktop and phone PNG files are **real captured pixels from the
extracted ZIP**, using a fictional Northwind Outfitters order. They are not mockups.

## Checks and limitations

On a Linux Renpō fleet host, the source built under TypeScript/Vite and passed
480 existing unit tests, five browser stale-tab tests, and both 1440×900 and
390×844 compiled-browser sample-order journeys. After ZIP extraction, the
packaged Python launcher was started, and both actual Chrome journeys reviewed,
saved, reopened and rendered the fictional order with no script errors or
external requests. The archive passed ZIP CRC verification; the in-package
README pins the exact merged source commit.

Retail policies are local estimates; verify a store's current terms yourself.
Calendar reminders are file exports, not live subscriptions. Saved returns
remain in local browser storage; backups can contain private order details.
Linux/Chrome was exercised. Windows/macOS launchers are included but were not
independently exercised. Independent subjective design review remains open.
This is a versioned downloadable browser **preview**, not a hosted service or
a formal GitHub Release.
