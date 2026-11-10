# ReturnBy browser build — 2026-11-10 UTC

This branch carries a versioned, runnable **compiled browser build**. It is a distribution fallback because this repository's connected GitHub integration denied permission to create formal GitHub Releases (HTTP 403).

- File: `downloads/returnby-browser-2026-11-10.zip`
- SHA-256: `505ff5b7d6d6ca7a0163ede641f6da7fb56c3e4cde6c0915231ad0d915ef1de4`
- Source: [merged commit abd33f98a571](https://github.com/Jacob-Met/returnby/commit/abd33f98a571e03e9c36d2ea0a27a392c823e275) and [PR #83](https://github.com/Jacob-Met/returnby/pull/83)
- Test: 422 Vitest checks, TypeScript/Vite production build, actual Linux Chrome download and stale-edit refusal, then separate extracted-package Node+Chrome test
- Launch: unzip, install Node.js 20+ if needed, run `START-WINDOWS.cmd` (Windows) or `./start-mac-linux.sh` (macOS/Linux), open `http://127.0.0.1:8787/`
- Limits: local-only browser data; no automatic syncing; retailer return policies need confirmation; Windows/macOS not independently tested

The ZIP includes its own README, checksum manifest, and genuine Chrome capture using fictional order records. This is a downloadable browser build, **not** a deployed hosted app or a GitHub Release object.
