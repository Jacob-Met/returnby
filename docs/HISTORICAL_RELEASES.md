# Historical ReturnBy distributions

Use the current download in the [main README](../README.md). The descriptions below are retained as historical records; claims such as “current” refer to their publication date. Launch commands and supported features vary between snapshots.

## Resumable trip snapshot — November 10, 2026

[Release notes, exact source, launch steps and real browser clip](./releases/returnby-trip-2026-11-10.md). This independently judged snapshot introduced saved trip dates, selected purchases, packing checks and drop-off notes. It has been superseded by the cumulative release linked from the main README.

## Earlier source-pinned download — preserved email review

[Download ReturnBy browser ZIP](../downloads/returnby-intake-613f15f/ReturnBy-613f15f-browser.zip) · [source, launch instructions, checksum and limits](../downloads/returnby-intake-613f15f/README.md) · [desktop](../downloads/returnby-intake-613f15f/review-1440.png) · [phone](../downloads/returnby-intake-613f15f/review-390.png).

Merged source613f15f adds unsaved email-review departure protection and includes current manual purchases, portable prepared trips, refund follow-up and CSV export. Extract and run the included Python3 launcher. Actual packaged Linux/Chrome entrypoint exercised at desktop and phone sizes. Browser departure warnings let you cancel leaving and retain your review; this does not provide crash recovery. Independent audience judgment is tracked separately.


## Earlier downloadable build — confirmed return-window start

**[Download source-pinned ReturnBy ZIP](https://raw.githubusercontent.com/Jacob-Met/returnby/main/downloads/ReturnBy-2026-11-10-clock-92baeb9-browser.zip)** · [launch instructions, checksum and tested limitations](../downloads/ReturnBy-2026-11-10-clock-92baeb9.md) · [actual desktop screenshot](../downloads/returnby-confirmed-clock-2026-11-10/clock-tracker-desktop.png) · [actual phone screenshot](../downloads/returnby-confirmed-clock-2026-11-10/clock-tracker-mobile.png).

Adds a **user-confirmed return-window start date** when a retailer counts from delivery rather than purchase. The same reviewed date now flows through saved orders, corrected deadlines, calendar reminders, backups, monthly planning, batch intake and trip sheets; older orders retain their order-date behavior. Includes manual-purchase entry, HTML/.eml receipts and saved-order search. Built from the merged [source commit 92baeb9](https://github.com/Jacob-Met/returnby/commit/92baeb99324ce60538bdefb3c36768fe419dfe43); independently exercised from its extracted ZIP in Chrome. **SHA-256:** f9c7a2b294a462e9263b52236740bc2cae40ce98e511ecf62227ccb5e5d89cb9.

Extract the archive, run the local Python 3 launcher for your platform, and open http://127.0.0.1:8769/. All order data stays in your browser. Confirm retailer policy yourself. This is a downloadable local browser application, **not a hosted service or formal GitHub Release**.

## Previous downloadable build — paper-receipt purchases

[Download ReturnBy](https://github.com/Jacob-Met/returnby/releases/download/returnby-manual-2026-11-10/ReturnBy-2026-11-10-manual-1a76717-browser.zip) · [source, launch steps, checksum and limitations](../downloads/ReturnBy-2026-11-10-manual-1a76717.md)

Adds direct manual purchase entry alongside email import, saved deadlines and reminder exports. Extract, run the Python3 launcher, then open http://127.0.0.1:8769/. Linux/Chrome exercised; Windows/macOS launchers packaged.

## Earlier downloadable browser preview — desk-first return tracker (November 10, 2026)

**[Download ReturnBy v0.2.0 ZIP](https://raw.githubusercontent.com/Jacob-Met/returnby/4516bfe3ec68d12fda4578ce078262c361457637/downloads/returnby-desk-first-2026-11-10/ReturnBy-v0.2.0-browser.zip)** · [Actual desktop screenshot](https://raw.githubusercontent.com/Jacob-Met/returnby/4516bfe3ec68d12fda4578ce078262c361457637/downloads/returnby-desk-first-2026-11-10/desk-first-desktop.png) · [Actual phone screenshot](https://raw.githubusercontent.com/Jacob-Met/returnby/4516bfe3ec68d12fda4578ce078262c361457637/downloads/returnby-desk-first-2026-11-10/desk-first-phone.png) · [Package notes](https://github.com/Jacob-Met/returnby/blob/4516bfe3ec68d12fda4578ce078262c361457637/downloads/returnby-desk-first-2026-11-10/RELEASE_NOTES.md).

This build puts working order intake and saved deadlines in the first desktop viewport instead of an oversized marketing opening. It retains search, cross-tab review, HTML/.eml receipt import, calendar reminders, backups and trip planning. **Source:** [b5ab27f](https://github.com/Jacob-Met/returnby/commit/b5ab27fdd9c77100ec0a6d3894d497efb8d0e7c1), merged via [PR #98](https://github.com/Jacob-Met/returnby/pull/98). **ZIP SHA-256:** 30dbe3457457aa1c6f51560f6ea8a16b5ad2336981a6687a8ba8efff0f629daf (317,056 bytes).

Extract the ZIP, install Python 3, launch Start ReturnBy.cmd (Windows), Start ReturnBy.command (macOS) or ./Start ReturnBy.sh (Linux), and open http://127.0.0.1:8769. The ZIP was downloaded back from GitHub, checksum-verified, extracted and exercised in actual Chrome with fictional reviewed/saved orders at desktop and phone sizes. Source builds passed 480 unit tests plus five Chrome stale-tab tests. Linux/Chrome was exercised; Windows and macOS launchers are included but not separately tested. Confirm retailer return windows yourself. This is a versioned downloadable preview branch, **not a formal GitHub Release** or hosted service.


## Previous downloadable build — cross-tab-safe ReturnBy (2026-11-10)

**[Download the standalone ZIP](https://raw.githubusercontent.com/Jacob-Met/returnby/main/downloads/ReturnBy-2026-11-10-af06bb7-browser.zip)** — [source pin, checksum, launch steps and testing](../downloads/ReturnBy-2026-11-10-af06bb7-browser.md).

This pinned build includes the merged cross-tab review notice alongside HTML receipt import and saved-order search. Extract and run the appropriate local launcher (Python 3 required), then visit http://127.0.0.1:8769/. It is a versioned repository download, not a new GitHub Release. Existing downloaded releases remain linked below.

## Earlier GitHub release — HTML receipt import and saved-return search

[Watch the silent HTML-receipt walkthrough (MP4)](https://github.com/Jacob-Met/returnby/releases/download/returnby-html-receipt-2026-11-10/ReturnBy-HTML-receipt-walkthrough.mp4) · [Recording scope and reproduction](./html-receipt-walkthrough/README.md)

The actual released app now has a captioned, fictional-sample walkthrough: HTML-only email → review and correct the return window → explicit Save → find the order → download a calendar reminder and backup. This clip demonstrates this pinned release, not the newer builds above.

[Download the browser ZIP](https://github.com/Jacob-Met/returnby/releases/download/returnby-html-receipt-2026-11-10/ReturnBy-v0.2.0-browser.zip) · [release notes and exact source ZIP](https://github.com/Jacob-Met/returnby/releases/tag/returnby-html-receipt-2026-11-10)

This release adds readable HTML-only exported email receipts to the existing review/save workflow and includes store/order-number search. Authored plain text takes precedence; HTML is parsed as data without loading images, links, stylesheets or scripts. Review every field: CSS layout and image-only receipts are not interpreted.

Extract the ZIP, install Python 3, and run Start ReturnBy.sh (Linux), Start ReturnBy.command (macOS), or Start ReturnBy.cmd (Windows), then open http://127.0.0.1:8769/. Source: 43d56fe5379fa3d658a6093f3303d1ed5ad721b6, merged PR #95. SHA-256: 1feaf0cd6d4698323c00b7bf17d385a1dc1052b987ea6fbdc28d52a7620e4699.

Producer checks passed the original 472 tests plus five HTML cases, the production build and actual Chrome desktop/mobile file selection through review, save and calendar download. The public ZIP was downloaded, hash-verified, extracted and run through the same browser journey. Independent astra-ibis-4d8a exercised different table receipts, nested alternatives and attachments at 1366/375px, including explicit review before persistence, real backup and two-event calendar downloads, no external requests or script execution, and mobile visual inspection. Linux/Chrome were exercised; Windows/macOS launchers are packaged only. This is a downloadable local application, not a hosted service.

## Earlier formally released build — saved-order search and corrected email import (2026-11-10)

**[Download the current ReturnBy ZIP](https://github.com/Jacob-Met/returnby/releases/download/returnby-search-2026-11-10/ReturnBy-v0.2.0-browser.zip)** — [release notes, source and assets](https://github.com/Jacob-Met/returnby/releases/tag/returnby-search-2026-11-10).

The current browser release is built from commit [7535b9c](https://github.com/Jacob-Met/returnby/commit/7535b9c15c1cd1abab850248561b3c3afa671401) and includes the corrected merchant/receipt parsing merged in [PR #89](https://github.com/Jacob-Met/returnby/pull/89), plus saved-return search. The actual GitHub ZIP was independently downloaded, run and checked with an unfamiliar synthetic exported email, including selection, save, reopened tracker and 390-pixel mobile layout. **ZIP SHA-256:** 440af93913849e6ebb998e76856c131fdb2d3ac97c125c289eedc4989557e54d.

Extract the ZIP. With Python 3 installed, run Start ReturnBy.cmd on Windows, Start ReturnBy.command on macOS or ./Start ReturnBy.sh on Linux, then visit http://127.0.0.1:8769/. The ZIP is a local browser application, not a hosted service. No inbox connection or receipt upload is involved: the original email remains in the current page, and only reviewed fields are saved to this browser's local storage. Return windows are estimates you must check against retailer policy. Windows and macOS launchers are packaged but have not been independently exercised by this reviewer.

Export the original order email as a plain-text .eml to import it. The local importer deliberately ignores attachments, including forwarded messages embedded as attached emails; paste the original confirmation text instead if necessary.

## Earlier release — original .eml import before receipt fixes (2026-11-10)

**[Historical ReturnBy v0.2.0 .eml ZIP](https://github.com/Jacob-Met/returnby/releases/download/returnby-eml-2026-11-10/ReturnBy-v0.2.0-browser.zip)** — [source at dd21f4f](https://github.com/Jacob-Met/returnby/releases/tag/returnby-eml-2026-11-10). This prior package has SHA-256 957648cce351f8cd17f94e8a78a18bd690cc218b431b7bcc62f2749949cb2d18 and predates PR #89's corrected store-name and order-number recognition. Use the current release above rather than this historical ZIP for everyday tracking.

## Download the multi-confirmation browser preview — 2026-11-10

**[Download the new multi-confirmation ReturnBy ZIP](https://raw.githubusercontent.com/Jacob-Met/returnby/c908f9c8176554afa1aba8c672ad07042156d637/downloads/returnby-browser-2026-11-10-batch-intake.zip)** — [package checksum and launch notes](https://github.com/Jacob-Met/returnby/tree/c908f9c8176554afa1aba8c672ad07042156d637/downloads). SHA-256: `23a77516a3c75ffc0a22b1951be6f92613e1e1e76e575ecda161a7263df3d86c`.

This build adds review and local saving of up to 20 pasted or UTF-8 text-file order confirmations together, while retaining individual editing, backups, calendar exports, the trip checklist and deadline planning. Extract the ZIP, run `START-WINDOWS.cmd` or `./start-mac-linux.sh` (Node.js 20+), and visit `http://127.0.0.1:8787/`. The compiled package needs no npm install. It was checked after a clean extraction and then downloaded back from GitHub byte-for-byte; the six actual Chrome receiving groups passed on desktop and phone. Source: [merged PR #85](https://github.com/Jacob-Met/returnby/pull/85). This is a versioned distribution, not a formal GitHub Release.

## Previous single-confirmation browser preview — 2026-11-10

**[Download the verified ReturnBy browser ZIP](https://raw.githubusercontent.com/Jacob-Met/returnby/a637cd465c26e2d6a4729a7e07e162f70e9f2b83/downloads/returnby-browser-2026-11-10.zip)** — [distribution record and launch details](https://github.com/Jacob-Met/returnby/tree/a637cd465c26e2d6a4729a7e07e162f70e9f2b83/downloads).

Unzip the package, install Node.js 20+ if necessary, run `START-WINDOWS.cmd` on Windows or `./start-mac-linux.sh` on macOS/Linux (or `node serve.mjs`), and open `http://127.0.0.1:8787/`. This is a loopback-only local app with compiled assets, no npm install or account required; saved returns stay in that browser profile. It includes the [single-reminder stale-deadline fix](https://github.com/Jacob-Met/returnby/pull/83), a file checksum manifest and a real Chrome screenshot with fictional orders. Its public ZIP was downloaded back and matched the tested archive byte-for-byte (SHA-256: `505ff5b7d6d6ca7a0163ede641f6da7fb56c3e4cde6c0915231ad0d915ef1de4`). The merged source is [abd33f98](https://github.com/Jacob-Met/returnby/commit/abd33f98a571e03e9c36d2ea0a27a392c823e275). Verified on Linux with Node 22 and Chrome 156; Windows/macOS launchers and other browsers were not independently exercised.

**Previous version:** [ReturnBy v0.2.0 browser ZIP](https://raw.githubusercontent.com/Jacob-Met/returnby/9cd8d0d5f2fd8ba32a0525db65e292cae92ccdcf/downloads/v0.2.0/ReturnBy-v0.2.0-browser.zip), built from [b1c32488](https://github.com/Jacob-Met/returnby/commit/b1c32488f1d198a5461abf61bf98467ff99bba55). That historical package has **Python 3** launchers and uses port **8769**; it predates the new calendar freshness fix. Both downloads are on versioned GitHub distribution branches because the connected GitHub integration cannot create formal Releases.
