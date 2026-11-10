# ReturnBy — 2026-11-10 multi-confirmation browser preview

This is a self-contained, local-only runnable build of the [merged ReturnBy source](https://github.com/Jacob-Met/returnby/commit/ec5ed7acf589b360316ae81907827626f03f492f), based on [PR #85](https://github.com/Jacob-Met/returnby/pull/85).

**Package:** [returnby-browser-2026-11-10-batch-intake.zip](./returnby-browser-2026-11-10-batch-intake.zip)  
**SHA-256:** `23a77516a3c75ffc0a22b1951be6f92613e1e1e76e575ecda161a7263df3d86c`

After downloading, unzip the package. Start on Windows with `START-WINDOWS.cmd`, on macOS/Linux with `./start-mac-linux.sh`, or on any platform with `node serve.mjs` (Node.js 20+). Open `http://127.0.0.1:8787/`. No npm install or account required. Port is loopback-only.

**What's new:** Up to 20 local plain-text order confirmations can be corrected, selected, duplicate-reviewed and saved together through a new dedicated intake page. Existing single-order tracker, editing, backup, calendar exports, trip checklist and deadline overview stay available.

**Verification:** 461 Vitest tests passed, TypeScript and Vite build passed, six native Chrome groups passed including phone keyboard journey, actual file picker, stale writes and recovery. Screenshots of the genuine fictional-order screens are included. Clean ZIP extraction, 23 content hashes and local launch over HTTP passed on the Renpō fleet worker. Windows/macOS launchers and other browser combinations have not been independently tested.

**Privacy:** The app runs locally, confirmation source text is not uploaded or persisted, and retailer rules require independent confirmation. This is a versioned distribution branch, not a formal GitHub Release.

The previous [2026-11-10 browser preview](https://github.com/Jacob-Met/returnby/tree/a637cd465c26e2d6a4729a7e07e162f70e9f2b83/downloads) remains available without replacement.
