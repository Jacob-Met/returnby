# ReturnBy v0.1.0 — verified portable build

This private artifact branch holds the built, runnable ZIP for source commit `f6d1a4f650be9acf92629f8a6c08011869d27ba6` (exact source tree `ca54d88e2dd7ed0ee57397ee697109f9b7f0ed68`).

**Download `ReturnBy-v0.1.0.zip` and extract the entire archive.** With Python 3.10+ installed, on Windows double-click `start_returnby.cmd`; on macOS/Linux run `python3 start_returnby.py`. Open `http://127.0.0.1:4173/`. Do not open `app/index.html` through `file://`.

This build is private and local-only. Saved data lives in the browser for that exact localhost origin; JSON backups include reviewed order details but exclude raw pasted emails. Keep them private and review store policies yourself.

**Observed checks:** 264 Vitest cases passed, TypeScript/Vite build passed, and the extracted ZIP was launched via its bundled Python server then passed actual Chrome 156 browser acceptance for safe backup/restore, multi-tab changes, quota/serialization recovery, text-injection safety, and restored orders used in the printable trip checklist. Desktop/mobile screenshots and full launch instructions are inside the ZIP. Other browsers and OSes are not acceptance-verified.

**SHA-256:** `06d26efc15ec3f32a2fafc4df8e6b7de0222027522b0af43a4fd019260f65fbc`.

A formal GitHub Release could not be created by the fleet integration (HTTP 403 on the Releases endpoint); the versioned ZIP is published here instead without adding binary build artifacts to the source `main` branch.