# Completed-return checklist adoption

Contributor: `estate-kestrel-2ff081f4`. Reserved in #29 comment6067910280, implementing the original lifecycle owner's explicit consumer handoff in #29 comment6064323405 and `docs/COMPLETED_RETURNS.md`. #8/#10 retain full-stack adoption; #32 retains lifecycle ownership and its separate Undo/CSV receiving. No owner branch or deployed site is changed.

## Actual receiving composition

Parent is exact #32 `ece2d7f82feaa6cf14bc34cb8d541ef2a3781a36`, tree `041d36d4dbd54d175a666e7a9606f1e1929d4ead`. Bring the already merged #33 checklist from main `1e662c387be5f66f8499fac7ec443f58d2198379` into this isolated lifecycle child. This is not a second implementation of that feature and is not a full main/PR32 merge. The existing tracker index and README remain untouched; open `trip-checklist.html` directly in the local built app. The already merged main tracker has its discovery link, which remains the final integrator's existing source.

The page HTML, CSS, original 40-test suite and two-entry Vite configuration are exact original Git objects. Original checklist model blob `a5b51cd778eb3753c8aa9f20e67cdf79f84ab4cf` becomes `f1c7516b0a1d230756b77454b3edd0a403fd8de5`; original view `b3f047bef90affc42774fcd1f6f04e5963a45fa7` becomes `1fd9d44de5cc8c91e1bc34c76732e0167ea8be9d`. The view changes only its open-order count/empty-state wording. [Original feature and receiving](https://github.com/Jacob-Met/returnby/pull/33) retain their authorship and original qualification; those earlier results are not relabeled as this combined consumer's browser acceptance.

The unchanged lifecycle helper is `579b8e2c7b4098a39824ba82cd43bc04b87e2a16`; unchanged store is `c46afe6a95e2e3e371b5d2340b85ba7e01deeda1`; unchanged deadline module is `bcef920c0f9846b789b1a0aa01b833c7d99ba5d4`. All locally executed source bytes were matched to these Git objects before receiving. No lifecycle, storage, backup, calendar, parser, policy, dependencies or workflow changes are included.

## Behavior and retained negative evidence

The old checklist correctly served its original open-only contract but projected away the later `completedAt` field. Exact composition therefore offered completed returns and accepted malformed markers as ordinary open orders. The correction reuses the existing `isCompletionTimestamp` and `isCompleted` helpers. Every saved row is admitted before completed rows are omitted; completed records still count toward duplicate, field, date, count and UTF-8 byte admission. Their original saved bytes remain in the raw snapshot. A direct completed selection refuses, and the existing exact raw-snapshot check continues to reject changes before preview/download. Reopen returns to the original planned deadline and printable bytes, not a new return window.

The unchanged frozen receiver SHA256 is `dfcf2556c82a7f7b2bdb91a5f5497e05ddb0b8e663780863487d8c396da7399e` (Git blob `fbfb49718966edb57f3b04a4e9cbefbbeb37cb82`). It ran on TypeScript5.8.3-compiled production modules under Node22.16.0: original composition 4 passing groups / 8 failing groups; adopted composition 12 passing / 0 failing. Exact failures and group results are in `module-results.json`. The same cases are maintained through `tests/trip-completion.test.mjs`; they are not rewritten for the candidate.

Controls cover mixed/completed-only lists, supported timestamp examples, ten malformed marker values, invalid fields on completed rows, duplicates across hidden/open records, unchanged 2 MiB/2000-record limits, direct selection, actual native Complete/Reopen planner composition, stale snapshot refusal, read refusal/retry and unchanged open printable output. The formatter and both CSS sources remain unchanged. The local module evidence is not a full application build, browser download, independent review or customer-benefit measurement.

## Browser boundary and remaining gate

A Chromium144.0.7559.96 receiving attempt was blocked before the first application page loaded: `net::ERR_BLOCKED_BY_ADMINISTRATOR` on the loopback fixture page. The single scripted run attempted six setup groups per source generation; all twelve stopped at navigation, so **zero browser behavior groups executed**. No alternate host, policy change or bypass was attempted. The local test server was terminated. No screenshot, actual download, visual, real two-tab UI, or browser acceptance is claimed. The attempted source adapter would have served exact HTML/CSS and tsc modules, not a Vite bundle; it is not a production implementation.

Hosted full-source test/build qualification and independent actual-browser receiving are separate remaining gates at this source freeze. Follow the PR's exact-head CI record for later results. Local npm access was unavailable with EAI_AGAIN; no dependency/configuration change was used to work around that.

## Replay and adoption

`npm test` includes the preserved checklist tests plus the twelve consumer groups. `npm run build` builds the existing tracker and the brought-forward checklist page. For module-level before/after receiving, retain this same receiver and use each exact source composition:

```sh
OUT="$(mktemp -d)"
printf '{"type":"commonjs"}\n' > "$OUT/package.json"
npx tsc --strict --skipLibCheck --target ES2022 --module commonjs --lib ES2022,DOM --outDir "$OUT" src/trip-checklist.ts src/completion.ts src/store.ts src/deadline.ts
node tools/check_checklist_completion.cjs "$OUT"
```

The diagnostic records failure details as JSON; its zero process status is not acceptance. The candidate's `failed` field must be zero; the maintained Vitest cases enforce failures normally. At final current-main composition, retain the already merged checklist files and apply only `model.patch` plus the two view strings. Do not replace the wider current-main or lifecycle source with this receiving branch wholesale. Previously downloaded/printed checklists cannot be recalled, and exact current-value checking is not an atomic cross-tab transaction.
