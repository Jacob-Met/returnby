# ReturnBy — confirmed return-window clock

**Current source:** [92baeb99324ce60538bdefb3c36768fe419dfe43](https://github.com/Jacob-Met/returnby/commit/92baeb99324ce60538bdefb3c36768fe419dfe43) (merged [PR #103](https://github.com/Jacob-Met/returnby/pull/103))  
**Distribution:** `downloads/ReturnBy-2026-11-10-clock-92baeb9-browser.zip` — 318,671 bytes  
**SHA-256:** `f9c7a2b294a462e9263b52236740bc2cae40ce98e511ecf62227ccb5e5d89cb9`  
**Format:** local browser ZIP, not a formal GitHub Release or hosted service.

## How to launch

Extract the ZIP. Python 3 is required, but Node/npm is not required for users. Run **Start ReturnBy.cmd** (Windows), **Start ReturnBy.command** (macOS), or **./Start ReturnBy.sh** (Linux), then open **http://127.0.0.1:8769/**. Saved order data lives in browser localStorage for this local origin and profile. Keep backups private: they contain order details.

## What is new

A person can explicitly enter a **confirmed return-clock start date**, such as a delivery date, separately from the order date. The chosen date affects the tracker, editing, batch email import, exported calendar reminders (with origin description), saved-return month overview, backup export/restore and printable trip checklist. Legacy saved orders still count from purchase unless edited. This build includes already-merged manual purchases, local HTML/.eml receipt review and saved-order search.

## Tested against the actual packaged ZIP

**Worker:** gpt6-kepler-8f42, GPT-6 (runtime reasoning effort not visible). On the estate browser machine, the exact merged source passed `npm ci`, **495 tests**, and `npm run build`. The project packager produced the ZIP with an embedded source pin. The extracted `Start ReturnBy.sh` served `index.html` on local port 8769 (HTTP 200). Real Chrome exercised an unfamiliar synthetic order email, changed its start to Nov 6 and saved the Dec 6 deadline, downloaded a correct all-day .ics, edited the clock to Nov 8 and obtained Dec 8, exported a JSON backup retaining the date, reopened the tracker, visited the December monthly overview, rendered the printable trip plan, and added a second order via batch intake. A **390px** mobile viewport had no horizontal overflow; the tested journey had **zero JavaScript page errors**.

[Desktop view](./returnby-confirmed-clock-2026-11-10/clock-tracker-desktop.png) · [Phone view](./returnby-confirmed-clock-2026-11-10/clock-tracker-mobile.png) · [Trip plan](./returnby-confirmed-clock-2026-11-10/clock-trip-print.png). These images show the built app with fictional orders; no actual customer data is represented.

## Limitations and open gaps

1. The local policy table is only an estimate. A user-entered start date is marked *confirmed by you* but not verified independently with the retailer, and the actual rules can differ.
2. Calendar reminders are downloaded files, not live subscriptions. A later edit requires downloading an updated file.
3. Linux/Chrome launch and workflow were exercised. Windows and macOS launchers are included but not independently executed here.
4. No external retailer-policy corpus was tested, and an independent contributor still needs to judge the UI against strong product alternatives.

This build is an actual, source-pinned distribution, not a standalone patch or proposed integration.
