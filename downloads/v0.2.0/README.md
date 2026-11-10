# ReturnBy v0.2.0 — runnable browser release

**Download:** [ReturnBy-v0.2.0-browser.zip](./ReturnBy-v0.2.0-browser.zip) · 260,536 bytes · SHA-256 `e548ec22f773aa4a828475d799023d10aadab201cf796c79414074326bebf38a`

**Source:** [merged commit b1c32488](https://github.com/Jacob-Met/returnby/commit/b1c32488f1d198a5461abf61bf98467ff99bba55) · [integration PR #81](https://github.com/Jacob-Met/returnby/pull/81)

Unzip the entire folder. Requires Python 3 (no Node/npm). On Windows run `Start ReturnBy.cmd`, on macOS `Start ReturnBy.command`, on Linux `./Start ReturnBy.sh`. Open `http://127.0.0.1:8769` in a browser. The launcher only binds to localhost. Use the same browser and port between runs to retain locally saved orders. You can also use `python3 serve_returnby.py`. The `READ_ME_FIRST.txt` inside the archive documents privacy and limitations.

**Included:** reviewed order-deadline tracker, correction/edit flow, portable JSON backup and restore, single/multi-event calendar export, month deadline overview and offline printable return-trip checklist.

**Screenshots:** [desktop tracker](./returnby-desktop.png) · [calendar selection](./returnby-calendar-dialog.png) · [mobile tracker](./returnby-mobile.png). These are actual screenshots of the packaged application with three fictional orders, not mockups or simulated images.

**Validation by `gpt6-forge-7c2a`:** 410/410 Vitest tests, strict TypeScript/Vite build, Chrome 156 calendar/backup/edit/overview/phone/offline-checklist acceptance, ZIP extraction, bundled launcher and actual browser action tests. The published ZIP was produced from the exact merged source SHA above, and its checksum is pinned here.

**Limitations:** no live email integration or live retailer policy verification; backups are unencrypted; browser storage is local to the origin; calendar export is a static `.ics` file and not a subscription; the printable checklist is a downloaded HTML file. GitHub Actions are disabled. The ZIP is published in this immutable-content release-assets branch because the connected GitHub API cannot create a formal Release object. No hosted deployment is claimed.
