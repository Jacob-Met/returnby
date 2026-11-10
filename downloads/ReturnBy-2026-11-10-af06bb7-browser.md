# ReturnBy — standalone browser build (November 10, 2026)

**[Download ReturnBy-2026-11-10-af06bb7-browser.zip](https://raw.githubusercontent.com/Jacob-Met/returnby/main/downloads/ReturnBy-2026-11-10-af06bb7-browser.zip)**

Exact source: [af06bb7b265ef281182d24e01f6c8c7005c5d790](https://github.com/Jacob-Met/returnby/commit/af06bb7b265ef281182d24e01f6c8c7005c5d790) (includes merged [PR #91](https://github.com/Jacob-Met/returnby/pull/91)). This is a versioned **repository download**, **not** a GitHub Release tag or hosted service.

- Archive: **645,011 bytes**; SHA-256 `8b0919f2596484c9d40ac205e48a78393d2af78686587afcdec5d89f9bff7669`.
- Contents: exactly built Vite site; 2 actual Chrome screenshots of cross-tab status; manifest of enclosed file SHA-256 values; loopback-only Python 3 server; Windows `Start ReturnBy.cmd`, macOS `Start ReturnBy.command`, Linux `Start ReturnBy.sh`; instructions in `README.txt`.
- Extract the *entire* ZIP. Install **Python 3** if necessary. Run the platform launcher or `python3 serve.py` from the `ReturnBy` folder, then open **http://127.0.0.1:8769/**. Keep the terminal window open.
- Updates relative to the preceding release: an explicit **Review latest returns** notice when another tab changes saved order deadlines. This source also includes multi-confirmation review, exported `.eml` and HTML receipts, saved-order search, calendar exports, and stale-action protections.
- Scope: local-only. No account, online upload or npm installation. Saved orders belong to the browser profile and origin, and are **not** stored in the ZIP. Back up orders before changing browsers or clearing data. Return windows are planning aids; confirm retailer terms. The app does not sync separate devices.

## Checks performed on the pinned source

On fleet worker `node-894a834d551bb5961f31d0f529ba649e`, by GPT-6 worker `gpt6-keel-8f31`: `npm ci`, **480 Vitest tests passed**, TypeScript/Vite production build passed. Three actual Chrome two-tab tests passed using those built assets with saved/unsaved draft protections, and original stale-action browser tests passed on the prior integration source. The **clean-extracted archive** was launched with the included `Start ReturnBy.sh` and served on `127.0.0.1:8769`; actual Chrome edit and batch-calendar journeys passed without console errors, external requests or phone-width overflow; standalone ZIP member CRC, individual bytes, permissions and SHA-256 manifest were checked. Windows/macOS launchers were packaged but not natively run. A separate independent design judgment is not claimed.

A tested download is not a claim of production hosting or cross-platform runtime testing.
