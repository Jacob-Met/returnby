# Reviewed multi-return calendar contribution

## Receiving status

The new ReturnBy workflow is implemented and locally qualified. A player can review
several saved deadlines, select exactly which to include, and download one calendar
file. The operation performs no storage writes and preserves the separate new-order
draft. Independent reciprocal review by this execution's engine contributor accepts
the frozen source: four native model groups and three actual Chromium groups passed.
The unchanged ten-file packet is retained under `independent-review/`, with its formal
verdict in [REVIEW.md](independent-review/REVIEW.md). There is no source integration,
public deployment, calendar subscription, or demonstrated production-use claim.

GitHub issue creation returned the existing secondary content-creation limit (403,
request `2C2E:1B3C82:FA85E:336CCE:6AC74EAE`). No retry, alternate identity or transport
was used. The exact scope was announced and accepted within the current execution
team before implementation. ReturnBy #8/#10 retains broader source integration;
#11/#14 retains its saved-order editor. Parent execution handles later publication.

## Exact source

All 66 blobs of editor PR #14 at `0e6e29d4a14bfdce0579085b4d79c5b4f54aeb13`
were independently compared to GitHub and reconstructed, including both PNG captures.
Its tree is exactly `394ea9a5c0755b2d943345c7d36cc8f4ddc5253e`; local snapshot
commit is `324099460987eca5bad18c97fc74685abb412375`. This retains #9's storage
load refusal and #14's corrected saved-record editor.

Current main `00bc85c68d37089ae91344369b35d14ae9e8cbc3` contributes precisely
#13's `src/ics.ts` and `tests/ics.test.ts`. Their Git blobs were verified before
composition. The resulting pre-feature baseline is local
`0ee7edf58e958e00d21c70b3ef56e5dadcfdc15d`, tree
`3e4a12fd6a6cad04ceafa9d892097aee834e889f`.

The implementation freeze is local commit
`1973a2230a8292fd487a87f9fdde02dba068649d`, tree
`cc2674728fff2781cd3d6c8e5902f38dc4197c64`. It changes nine paths and preserves
all 63 unrelated baseline blobs. The four changed existing files are README, index,
the ICS serializer and three additive lines in main. Five new files contain the
calendar model, controller, stylesheet, native tests and real-browser receiver.
Existing parser, policy, deadline, store and editor modules remain byte-identical.
The backup source is not part of this stack and must be composed by its receiving owner.

Fresh readback after qualification still reported main `00bc85c68...`; the current
calendar issue search returned only #8 and #11. This observation is not a permanent
ownership claim. Recheck moving source and claims before publication/integration.

## Behavior and qualification

- Baseline: 85 native tests and strict TypeScript/Vite build pass. In a real browser,
  two saved returns expose two separate calendar buttons and no batch calendar control;
  an individual download contains one event.
- Final: 117 native tests pass, including 32 new cases. The existing 85 remain unchanged.
  Strict TypeScript and Vite production build pass. Cases cover exact event text/UID,
  one calendar envelope, shared timestamp, deterministic order, existing alarms,
  Unicode folding, calendar-looking text, filter boundaries, invalid/duplicate IDs,
  stale or removed selection, unchanged unrelated data, immutable previews and limits.
- Actual Chromium 153.0.8010.0 with Playwright 1.62.1 passes the complete receiver against
  the final build. It uses real localStorage, native keyboard/button/checkbox activation,
  real browser downloads and a second tab's native editor/removal/addition paths.
  Every selected event equals the corresponding individually downloaded event bytes.
  Export attempts leave storage bytes and the new-order draft unchanged.
- The browser also exercises read refusal at dialog open and download, recovery without
  data loss, invalid/duplicate records, a 390 px viewport, visible initial review heading,
  and leap/year-end all-day dates in America/Los_Angeles and Pacific/Kiritimati.
  No application browser errors or external requests were observed.

Raw logs, screenshots, the actual selected ICS and the complete browser receipt are
included. `source-and-verification.json` binds the exact source, runtime executable,
tools, every final build file and source-preservation counts. The Chromium package's
font coverage does not demonstrate rendering of every CJK/emoji glyph; corresponding
calendar and DOM text preservation is tested directly.

The independent review adds delimiter/Unicode identity decoding, exact-byte size
expansion beyond the preflight lower bound, 28 calendar-boundary cases in four time
zones, storage-read refusal on reload, object-URL allocation refusal followed by a
newly duplicated identity, and recovery without storage writes. Its separate 390 px
Chromium context enables mobile/touch emulation and completes an actual one-event
download; no physical phone was used. All nine frozen implementation hashes remained
unchanged. The author's broader suite was inspected, not rerun or counted as independent
execution. Exact independent commands, build hashes and outputs are in the peer packet.

## Prepared native receiving route

The read-only check at 2026-10-08 08:42:57 UTC still finds PR #14 open, ready for review,
mergeable and at its exact source head. Its latest owner handoff preserves #8/#10's
broader integration ownership. The existing integrator branch is
`integrate/portable-recovery-20261008-8b336fefde84` at
`17e1a3286a5e8136d1d5dc09da37f33fd1baa100`; no combined PR was present in the observed
open-PR collection. The proposed calendar branch was absent from the branch inventory.

Prepare a separate `feat/calendar-batch-20261008-b55367d787c4` head with remote parent
`0e6e29d4a14bfdce0579085b4d79c5b4f54aeb13` and PR base
`feat/saved-order-edit-20261008-965d2e86e979`. Build the tree on remote
`394ea9a5c0755b2d943345c7d36cc8f4ddc5253e`. The diff includes the exact main #13
calendar-text repair composed before qualification. This is a single-parent stack;
it does not invent a main merge or change the editor owner's branch. The broader
calendar/backup composition remains with the established integration owner and is not
claimed qualified by this packet. Recheck the receiving head before publication.

`receiving-route.json` retains the relevant native URLs, owner comments, PR status,
branch/open-PR inventories and exact parent/tree identities. `source-and-verification.json`
continues to describe the original implementation qualification; this update changes
only receiving documentation and preserves the frozen product source.

## Retained failures and corrections

1. The first receiver assumed Clear selection was always enabled. After a real second-tab
   edit/removal left the Due soon filter empty, that control was correctly disabled and
   the helper timed out. The helper now first verifies zero checked boxes when Clear is
   disabled. Its original source/output/partial receipt remain under
   `rejected/empty-selection-harness/`; no product source was changed to satisfy it.
2. The initial complete browser pass did not check the initial phone scroll position.
   Visual inspection found that focusing Cancel scrolled the dialog past its heading.
   The corrected controller focuses the review heading. The receiver now asserts the
   heading is in the viewport on open. Original source/receipt/screenshot remain under
   `rejected/initial-dialog-focus/`.
3. A later TypeScript build refused direct NodeList iteration because this project's
   configured DOM library omits DOM.Iterable. The correction uses the supported
   NodeList.forEach API without changing tsconfig. That attempted shell sequence then
   ran the new receiver against the preceding build, and the new phone-heading check
   failed. Both outputs remain under `rejected/noniterable-nodelist/`; this was not a
   qualification of the then-current source. The final sequence stops on command failure,
   successfully rebuilds and passes the complete receiver against the newly hashed build.

## Replay

With the repository's declared Node dependencies installed:

```sh
npm test
npm run build
RETURNBY_PLAYWRIGHT=/absolute/path/to/playwright/index.mjs \
RETURNBY_CHROME=/absolute/path/to/chromium \
RETURNBY_EVIDENCE=/absolute/path/to/new-evidence \
node tools/check_calendar_batch_browser.mjs
```

An optional `RETURNBY_BASELINE_BUILD` points to the composed pre-feature baseline's
`dist` directory and enables the original UI counterexample. The browser receiver starts
its own loopback server and profiles, closes only those resources, and blocks nonlocal
requests. It needs no account, provider or private orders.

## Practical limits

The pre-download read checks freshness; it is not an atomic transaction with other
browser tabs. The file uses the existing saved UID, but the receiving calendar decides
whether to update or duplicate an already imported event. There is no automatic sync
or notification subscription, and downloaded events require another export after an edit.
The existing date/window and single-order semantics are retained. No Apple/Google/Outlook
calendar application import or scheduled notification was executed by this receiver.
