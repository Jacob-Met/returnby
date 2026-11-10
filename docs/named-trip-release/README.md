# ReturnBy 0.5.0 — separate errands, preserved packing work

Save Friday's parcel drop and Wednesday's bookshop visit as separate named plans in the existing return-trip planner. Reopen a copy with its date, selected purchases, packing checks and notes. Opening reads current purchases again, so changed return details need their instructions checked again; the saved copy stays unchanged.

This cumulative build includes the current return desk, several delivery-pending reviews, confirmed clocks, reviewed backup differences, trip receipt search, calendar and spreadsheet handoffs. Named copies use backup version4 alongside the existing working trip and pending purchases. Older versions1–3 remain readable. Restoring named copies is a separate reviewed action; matching copies skip and differing existing IDs stay current.

## Run the app
- Linux amd64: extract the tar.gz and run `./ReturnBy`.
- macOS Intel or Apple Silicon: extract the matching ZIP and open `Start ReturnBy.command`.
- Windows amd64: extract the ZIP and open `Start ReturnBy.cmd`.
- Browser ZIP fallback: Python3 required; use the included platform launcher.

The native executables include their runtime and the application; Python, Node and Go are not required. A browser is required. Keep the same browser profile and address (normally http://127.0.0.1:8769) to retain existing local data. `--version` reports exact source. These executables are unsigned. Linux amd64 was actually exercised; macOS/Windows are crosscompiled and have not been executed on those operating systems.

## Actual evidence
- `ReturnBy-named-trips-dc8bdc7.mp4`: short real interaction with the packaged Linux app, played at half speed for readability with narration captions above the app.
- `named-plans-1440.png` and `restored-plans-390.png`: actual desktop and phone flows.
- `result.json`: producer's actual packaged-app course.
- `SHA256SUMS`: exact downloadable asset checksums.

Fleet validation passed610 tests and production build. The actual extracted Linux executable passed two named plans, reload, cancelled replacement, rename, refused-storage recovery, changed order recheck, real backup download, and independently reviewed restoration in a fresh browser at1440/390px. Separate human-audience judgment is recorded in the project taskboard and repository; producer tests do not stand in for that judgment.

## Limits
Named plans are snapshots, not completed-return history or automatic synchronization. Up to200 named copies/2MiB are supported; archival and larger collections remain open work. Conflicting copies already in the receiving browser are preserved, not silently replaced. ReturnBy does not arrange a return, verify merchant policy or confirm a refund. Backups contain private purchase details and packing notes and are unencrypted.

Source: https://github.com/Jacob-Met/returnby/commit/dc8bdc7d0586285a31fead9e95050792337a4067
Producer: astra-marlin-82d1. All checks and packaging ran on fleet through Renpō; no GitHub Actions.

## Download verification

Formal release ID 440816506. The actual Linux asset 732676221 was downloaded from GitHub, matched SHA-256, and launched with PATH=/nonexistent before the full desktop/phone producer course. The maintained packager produced identical bytes on browser10 and build195.

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| ReturnBy-v0.5.0-windows-amd64.zip | 2830880 | `40a4c70220f316498f16a5371136db45a5acbf32fe9c105c817f017c0c85e215` |
| ReturnBy-v0.5.0-browser.zip | 347335 | `549ed00e1ba6e9b816d8d82861482ed2ff03c1f8c4a39c51fcc12cf7371002c3` |
| ReturnBy-v0.5.0-darwin-arm64.zip | 2656808 | `2f19b449c18816abcbfba6ec8364eb30efa2fcb8dd44f966285baf74ed9b881e` |
| ReturnBy-v0.5.0-darwin-amd64.zip | 2808920 | `bc90fef0443aeec235da07b2621190dab6635db7d4906f59f6037fb1c5f02428` |
| ReturnBy-v0.5.0-linux-amd64.tar.gz | 2762918 | `d09cf7312b115d981abe42fae2cda5865fb8e6b87ff83562cfdae68d59f5b08e` |

Separate judge astra-kestrel-b6a904df3c ACCEPTED the actual downloaded release at desktop1440 and phone390. [Full judgment and ranked gaps](independent/JUDGMENT.md), [preserved first-course result](independent/judgment.json), [corrected phone follow-through](independent/mobile-followthrough.json) and [running-executable provenance](independent/provenance.json) distinguish observed passes from the original navigation failure. No whole-product acceptance is claimed. The original executable pathname was found unlinked during judgment; the retained process hash exactly matched the downloaded archive member. The producer restored the pathname from that unchanged archive without stopping the process, and rechecked the executable SHA/source. No cause for the unlink is established.
