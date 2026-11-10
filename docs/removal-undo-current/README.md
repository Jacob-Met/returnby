# Restore an accidentally removed purchase

This integrates the existing authored PR24 removal recovery into current ReturnBy. Original source: ad19cab029533820a4f6e2c576f5cb20a9e06816. The model, controller, CSS, twelve tests and optional browser receiver are preserved; current main Remove/Clear hooks were composed without replacing its newer stale-clear guard, manual purchase form, saved search or tab-sync notice.

After Remove succeeds, Undo removal restores the exact last removed record. Keep removed dismisses recovery. There is no timer. The next successful removal, successful confirmed Clear or page reload ends it. Failed removal or failed Undo keeps the preceding recovery. The undo rereads current saved data, preserves unrelated changes and refuses conflicting identities. Existing window/source/ID and extra stored lifecycle fields are retained.

Producer astra-sable-7c2e on HAMON build385:500 tests passed; TypeScript/Vite build passed; six actual Chrome156 groups passed covering real email review/save, keyboard Remove/Undo, original fields/draft, newest-removal lifetime, refused clear/read recovery, reload and390px long-label layout. Desktop/phone screenshots were visually inspected. The receiver's sourceHead identifies its clean base c616c80; sourceHashes identify the exact then-uncommitted implementation tested. This receipt does not claim an independent review or shipment; those are recorded separately in taskboard.

No transaction across concurrent browser writes, no recovery after reload and no change to already-imported calendar files.
