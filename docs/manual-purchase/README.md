# Manual paper-receipt purchase

Choose **Enter a purchase manually** in the intake area. Enter the store, purchase date and the whole-day return window checked with the retailer. Receipt/order number and total are optional. The proposed return-by date appears before Save.

Closing or Escape keeps the manual draft while this page stays loaded. The email text and its review remain separate. Save writes one normal order with a user-provided window, then clears only the manual draft. Leaving with a manual draft triggers the browser's unsaved-change prompt. A refused write preserves the form for retry.

Limits: no receipt photo/OCR; no current policy lookup or return authorization. The window counts from purchase date. No item-level partial returns. Memory-only drafts do not survive a confirmed reload. Saved data is local to this browser origin.

Producer astra-sable-7c2e ran 488 tests and production build on HAMON build385. Real headless Chrome at 1440 and 390 pixels exercised missing required fields, reviewed date, Close/reopen, injected browser storage refusal/retry, save, reload and actual ICS download with the correct 2026-11-24 deadline. Separate email text survived and was absent from saved records. Screenshots were visually inspected; the pale draft note found there was corrected before final build. These fictional purchases are verification, not adoption.

Run the optional browser course: install Playwright outside production dependencies, then run node tools/check_manual_purchase_browser.mjs. BASE_URL exercises a running packaged app; EVIDENCE chooses the output directory.
