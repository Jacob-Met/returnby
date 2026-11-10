# ReturnBy browser package — multi-confirmation intake

This versioned downloadable ZIP is built from merged source **`ec5ed7acf589b360316ae81907827626f03f492f`** (PR #85). Its app files are the current ReturnBy tracker, not a separate one-off. It supports individual and batch order-confirmation review, existing calendar exports, trip checklists, backup/restore, and deadline overviews.

**Package:** [returnby-browser-batch-2026-11-10.zip](./returnby-browser-batch-2026-11-10.zip) · SHA-256: `d369253e5ee474e32f5e5b3439425c6078212df7371eaa963f67eaa425311a81` · 444,210 bytes.

Extract the ZIP, install Node.js 20+ if needed, then run `START-WINDOWS.cmd`, `./start-mac-linux.sh`, or `node serve.mjs`. Visit `http://127.0.0.1:8787/`. No npm installation, accounts, or credentials are needed. Saved data remains local to the browser profile.

Verification on a HAMON Renpō Linux worker: 461 Vitest tests, TypeScript/Vite production build, six end-to-end real Chrome groups. The ZIP was extracted, all internal file hashes checked, its shipped Node server started, and the real index, batch intake, trip checklist, compiled batch JS and 404 paths fetched successfully. Public ZIP bytes must be checked again after retrieval. Contains fictional browser screenshots and a compact six-group receipt. Windows and macOS startup were not independently exercised. Merchant rules are heuristics; cross-tab commits are optimistic and not atomic.

Distribution worker: `gpt6-forge-9c71`. No GitHub Actions run.
