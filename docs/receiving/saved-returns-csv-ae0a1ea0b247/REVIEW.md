# Saved-returns CSV receiving packet

## Current source and scope

The current implementation adds an explicit read-only CSV download of all currently saved returns. The final pure-module correction is frozen in local commit `da8e814adbc0f087e2920d3129f998be56234044`: exporter blob `2636019c2f785b7ce8bbdab8ea7f3c489ad43d9a`, UI `8321f2b207364bbd8eecc2b64c49ad67e19c0d05`, main `1bca9a5d3d57bd796b43c81606eed5a1c83e66db`, HTML `ab039d13a53369a5528c9947f5323b8101b7b3b9`. Later changes only preserve review and delivery evidence.

Source is received from ReturnBy PR #20 at `7829e56e57ef91dfe8edd5853fd68d6c7890fac0` / tree `b28e7b706fe67fd4b34111badd581c6bdd2ed4a7`. The scope claim is https://github.com/Jacob-Met/returnby/issues/8#issuecomment-6060332838. The existing #8/#10 receiver retains final shared integration. The contribution is separately stacked on the unchanged #20 branch. Parser, policy, saved schema, storage, editor, importer, calendar, lookup, undo and day-refresh source ownership remains intact.

## Independent acceptance

The coordination reviewer independently accepted the corrected exporter and unchanged UI/main/HTML hooks. Its same twelve-record consumer corpus passes in UTC, America/New_York and Pacific/Auckland. Python's CSV reader recovers every one of the nine cells per record, and its writer reproduces the exact file bytes. Independently calculated civil deadlines match the native output, and approved backup projection, recorded sources/timestamps and caller inputs remain exact. Each output contains the independently expected eleven protected cells. Four minimal leading-BOM/surrogate controls and a strict TypeScript consumer contract pass.

The peer packet preserves the original refused source and the unchanged receiving corpus alongside the corrected results. Corrected consumer receipt SHA256: `8e35c838a976671c42b111ccd4420c01d2989824cb3b80f6bd8c2d0957580739`; corrected minimal receipt: `ce5bf4f2062a6f481e74374c79eef93bb734be7aa40ee3ab81b37fbd6836d195`. The reviewer did not repeat the browser run or claim Excel/LibreOffice execution.

## Author receiving of the final source

Ten meaningful native TypeScript source groups and a strict TypeScript5.9.3 check pass; exact commands and logs are in `unicode-repair`. They include the corrected leading-U+FEFF boundary and retain the existing rejection of unpaired surrogates and unsupported controls.

The final compiled app passes seven Chromium groups and produces six real native CSV downloads, decoded by Python's independent CSV reader. The local build uses preinstalled Vite5.4.21 solely as supplementary browser receiving. The repository's locked Vitest5/Vite8 dependency gate was not available locally and is not claimed passed by this packet. No dependency was installed. `browser-unicode-successor/build-and-retention.json` binds every copied input and emitted asset; its `browser-receipt.json` binds the exact driver and unchanged product sources.

1. Keyboard download includes all saved returns despite a date filter, excludes raw extra email data, retains ordinary leading-BOM text, protects BOM-prefixed formula text, and preserves the active uncommitted form and visible list.
2. An actual Save in another tab appears in a fresh CSV without changing the first tab's view or draft.
3. A real admitted backup-file preview remains pending, while the CSV contains only saved records and the uncommitted intake remains intact.
4. One explicitly controlled storage-read refusal creates no download or state mutation; explicit retry includes a subsequent native Save.
5. One explicitly controlled object-URL refusal creates no download or state mutation; explicit retry succeeds, allocated URLs are revoked and no temporary anchor remains.
6. A 390-pixel phone view produces a native download and fits the viewport. Its exact retained screenshot was visually inspected and accepted.
7. An empty saved tracker gives the explicit empty-state message without making a file or changing storage.

The final browser receipt SHA256 is `d63d42a7e270e80550ead5b7e390652a9653a4f887b0750cc8a42ac191d14841`; its driver is `b39450234964de27fcf2d42b521c6652c059295c7ffa2b19fb2f13880a5cf6e4`. There were zero page errors. All records are synthetic. External font requests were blocked; no private data, provider or live application endpoint was used. Spreadsheet import settings can change display or interpretation. Exact CSV byte/consumer truth is established; JSON backup remains the exact restore format.

## Preserved earlier attempts

The original exporter `448d7441` used a default TextDecoder that strips a leading U+FEFF while decoding UTF-8. Independent receiving proved that both ordinary and formula-like leading-BOM text passed the native backup projection exactly but were incorrectly refused by that losslessness check. The final change sets `ignoreBOM:true`, preserving the literal character during the check. No production UI or native admission/deadline logic changed.

The first native author attempt contained one incorrect row-order expectation; the product source was unchanged. `author-first-attempt.md` records the correction to identify rows by their saved IDs.

The first browser run passed two groups before an import-preview fixture failed its precondition: a deliberately seeded extra `originalEmail` property was safely excluded by CSV but refused by the existing import planner's strict current-record admission. Its exact driver, files, logs and receipt remain in `browser-first-attempt`. A separate ordinary saved-record context fixes that precondition while retaining the original projection challenge. The subsequent seven-group passing packet and its exact driver remain in `browser-corrected`; the final Unicode successor is separate.

A later storage-full interruption truncated only an in-progress browser-driver write. That file was restored from the preserved Git object, the intended receiving change was reapplied, and its syntax check passed before execution. No truncated source or evidence was tested or promoted. Only this task's reproducible unpublished payload copies and a redundant transport archive were reclaimed; every archive member had first been verified against its retained file and committed Git object.

## Integration boundary

This source packet establishes the stated isolated behavior. The existing integration owner receives the final native contribution, locked dependency CI and eventual main/deployment decisions through the stacked PR. Owner refs, stored user records and deployed services are unchanged by this contribution.
