# Independent judgment: named return trips

Date: 2026-11-10
Producer: astra-marlin-82d1
Judge and browser-course author: astra-kestrel-b6a904df3c

## Verdict

ACCEPT the saved-errand improvement in the actual downloaded Linux release at source dc8bdc7d0586285a31fead9e95050792337a4067. Two separately named errands can retain different purchases, dates, packing checks and notes. Opening an old copy consults the changed tracker deadline, clears the now-stale instructions check and preserves the original copy. Actual backup restoration carries both errands without replacing the working trip; repeating the import keeps a locally renamed same-ID copy.

This is a scoped product improvement, not a claim that ReturnBy matches the overall polish or service capabilities of the best alternatives, that a real return happened, or that real customers adopted it. No additional product work is opened here after the taskboard archive instruction. The existing release and evidence are completed and preserved.

## Actual delivered build

Release: https://github.com/Jacob-Met/returnby/releases/tag/returnby-named-trips-2026-11-10-dc8bdc7
Linux archive: ReturnBy-v0.5.0-linux-amd64.tar.gz
Archive SHA256: d09cf7312b115d981abe42fae2cda5865fb8e6b87ff83562cfdae68d59f5b08e
Executable SHA256: b584f2d5b8571ed174d76a192e65e93e765d3f3d39aac0c87d2a608f8480f1c4
Version observed directly from the running executable: ReturnBy 0.5.0; Source dc8bdc7d0586285a31fead9e95050792337a4067.

The producer downloaded and launched the release. The judge used that actual running entry point at browser10 http://127.0.0.1:18997. To establish which program served it, the judge matched port18997's listener to PID122082, read its retained executable and compared its SHA256 to the executable member in the downloaded release archive. The archive SHA256 also matched the published package record. The original pathname had become unlinked while the process continued running; this is recorded rather than silently treating the failed pathname version command as a pass. The producer was told to preserve/restore the active artifact.

Only Linux execution was observed here. The existence of macOS/Windows assets is not a run result for those platforms. Phone observations are Chromium at390 px, not a claim of physical iOS/Android testing.

## Unfamiliar user journey

All purchases and notes below were fictional and entered through the actual UI. No localStorage seeding or direct model calls substituted for user actions.

- Gannet Workshop GW-23917, $74.00, ordered Nov2, confirmed clock Nov6, 14-day window -> Nov20 deadline.
- Lumen Supply LS-80052, $129.40, ordered Oct28, confirmed clock Nov7, 30-day window -> Dec7 deadline.
- Saved Friday desk drop-off for Nov13 with all packing checks and "Service desk before 17:00. Keep courier receipt."
- Started a separate Nov23 errand for Lumen with a different selection and "Box stays at studio; bring adapter." Saved it and renamed it Monday supply run.
- Reloaded. Both names and the active errand's date/notes persisted.
- Cancelled opening Friday's copy. The full saved state and current Lumen notes stayed unchanged. Accepted Open and received Friday's own date, checks and note.
- Edited the real Gannet purchase through the tracker to a 5-day window from Nov6 -> Nov11. Reopened the old Friday copy. The current plan showed Nov11, marked the Nov13 trip 2 days late and cleared instructionsChecked while keeping packed, receiptReady and the note.
- Downloaded the actual printable HTML. It contains the new Nov11 deadline and exact note.
- Downloaded the actual version 4 JSON backup. It contains2 purchases and2 named copies; the original Friday saved copy remains equal as parsed data to the copy captured before editing the purchase.
- In a fresh browser context, imported the purchases and separately added named copies. Neither order was selected in the previously empty working trip.
- Opened Friday's imported copy. It used the restored current Nov11 deadline, preserved notes and required the instructions check again.
- Renamed the imported copy locally, then selected the original backup again. Preview reported1 changed copy kept; Add 0 named plans stayed disabled; the existing working plan and renamed copy were unchanged.
- Final phone document width 390 matched its 390 viewport; no horizontal page overflow in this course. No pageerror event was observed.

## Failures and their resolution

The first course completed the full desktop 1440journey. At390 it completed copy creation, reopening, changed-deadline checks, printable output and actual backup import, then timed out looking for the desktop tracker link. The actual mobile import screen had a visible "Open return-trip planner" link in the backup panel and a "Your returns" button above. This was a judge navigation assumption, not evidence of missing restored data.

The original failure JSON and screenshot are preserved. A separate mobile follow-through repeated only the unresolved fresh-restore/conflict segment using the visible backup-panel link and passed. The first command is not relabeled green.

A preliminary --version command against the supplied executable pathname failed because the pathname had been unlinked. The live process remained available. Its actual executable version, file hash and equality with the downloaded archive member were then independently observed. These are separate checks, not a rewritten receipt.

## Visual judgment and ranked gaps

I inspected the actual desktop two-errand screen and the actual390 px reopened/restored plan, as well as the real import failure screen. I also retrieved and visually inspected Cultured Code's official Things screenshot collage, rather than relying on memory:
https://culturedcode.com/things/
https://culturedcode.com/things/2024-01-20/images/whatsnew-collage-io60.png

The added saved-plan list is a useful choice: real errand names lead each row; date and selected-order count are subordinate; Open and Rename stay attached to the row; desktop and phone retain the same intelligible structure. It avoids a new hero, decorative tile grid or separate dashboard. The actions worked in the actual delivered build. This supports the scoped acceptance.

The broader interface remains less direct than the Things reference. Ranked gaps for any later authorized continuation:

1. Make the active working errand's identity clearer. After opening a named copy the page still says "Your next return trip"; understanding that edits affect a separate working copy depends on explanatory text. A clear current-errand label would reduce uncertainty without changing the immutable-copy contract.
2. Reduce repeated instruction text and the vertical distance to the packing work on phone. The opened copy list, storage explanations, order-selection panel and separate preview explanation occupy several screens for only2 orders. Things puts the current list and its actions in the foreground with less repeated guidance. Collapsing completed choices and shortening helper prose would matter more than recoloring.
3. Unify the tracker and trip page's visual language. The tracker/import view has orange accents and monospace labels; the trip view uses forest green, serif headings and different button/link treatment. The new list fits the trip page, but the whole journey still feels assembled from separate screens.
4. Preserve an intelligible copy lifecycle as errands accumulate. Open/Rename currently work; repeated edits produce new copies. The need for archiving or deliberate replacement should be judged against actual repeated use, not implemented as speculative hardening.

No claims about a competitor's interactive behavior were inferred from its screenshot. ReturnQueen's official return-service page was also read for category context, but this course did not operate that paid service.

## Evidence and checks

Fleet host: browser10, owner node-dcf311816cb43acd87f054291242f746
Judge evidence: /tmp/astra-kestrel-b6a904df3c/named-release-judge
Judge scripts: named-release-judge.mjs and named-mobile-follow.mjs in the parent directory.

- judgment.json: preserved first course, desktop pass and phone navigation timeout.
- mobile-followthrough.json: remaining phone segment pass.
- 1440-two-named-errands.png: actual desktop library.
- 390-follow-restored-plan.png: actual phone current-deadline warning and preserved notes.
- 390-failure.png: original mobile navigation state.
- 1440/390-backup.json and trip-sheet.html: actual downloaded synthetic outputs.

Native command IDs:
- kestrel-b6a904-named-release-course (exit 1: desktop pass, phone harness navigation timeout)
- kestrel-b6a904-named-mobile-follow (exit 0)
- kestrel-b6a904-named-process-proof (exit 0)
- kestrel-b6a904-running-binary-proof (exit 0)
- kestrel-b6a904-native-archive-match (exit 0)

The producer's610 tests and own browser courses were not rerun by this judge and are not represented as my checks.
