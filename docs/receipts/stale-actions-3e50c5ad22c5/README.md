# Keep other tabs' saved returns through Save and Remove

Contributor: `chatgpt-3e50c5ad22c5-production`, 2026-10-08 UTC. Scope is recorded
in ReturnBy issue #15. The existing #8/#10 product integration and #11/#14 editor
owners retain their work and receiving branches.

## Observed problem and correction

Ordinary new-order Save and Remove used the list remembered by the current tab.
Real browser receiving on the editor build reproduced lost additions and
corrections, resurrection of a removed unrelated order, deletion of an unseen
correction and overwrites after storage failures. All five new controls rejected
that source; `before-browser.log` retains the actual assertions and stored rows.

The production change is confined to `src/main.ts`. A new reviewed order is
appended to a freshly read saved list. Remove reads that list too and verifies
that exactly one selected record still matches the displayed order. A changed,
missing or ambiguous target is retained while the tracker refreshes and asks for
another reviewed attempt. A current-state read refusal uses the existing loading
error/retry path; a failed write keeps the draft, and retry reads storage again.
Other saved fields and records remain intact.

The editor/import commit boundary, store schema, parser, policy table, calendar
generator and existing confirmed Clear behavior are preserved. The latest-state
read is optimistic; simultaneous reads and writes across tabs are not an atomic
transaction. The contributor did not edit an author's working tree or ref.

## Source pins

| Stage | Durable commit | Tree |
| --- | --- | --- |
| Received editor PR #14 | `0e6e29d4a14bfdce0579085b4d79c5b4f54aeb13` | `394ea9a5c0755b2d943345c7d36cc8f4ddc5253e` |
| Five expected browser failures | `26879654250875afd8762688ff02e7104289158d` | `e54d056295ec59255aede9a4cb394884d3ebeeab` |
| Qualified correction | `8d1e2e8be2fd1acbc18bd3203f0723726696f067` | `da48863f8be8d2ba594e60046e60bc5dbe12faba` |

The isolated local input is author snapshot
`2bfb586670102f7e25e4d322b03e441598c61fcb`. All 64 materialized Git blobs were
checked against the exact PR #14 tree. That author's snapshot omits two unchanged
pre-existing PNG captures; publication preserves their remote blobs explicitly.
Local reproduction commit `b095e97fc2d4ba20b4fcbd0808ec58e621ae786d` and corrected
source commit `2bcf0eca8e5e3dc6a9f6c483fdd52ca568367639` therefore have different
tree hashes from the complete remote trees, but match every materialized blob.

The browser harness is identical between failure and success. Its filename moved
from `tools/check_stale_browser.test.mjs` to `tools/check_stale_browser.mjs` so the
optional Node/Playwright harness is not discovered by the native Vitest command.
`source-and-runtime.json` records this equality and exact source/build identities.
`before.log` is a separate initial launch failure caused by the optional
Playwright package not being on this checkout's module path; no browser acceptance
is claimed for that attempt. Supplying the documented `RETURNBY_PLAYWRIGHT` path
ran the actual baseline controls in `before-browser.log`.

## Qualification

**79 of 79 native tests pass** across seven files, including six new actual
application-handler cases in `tests/stale-actions.test.mjs`. They import the
unchanged application modules behind the repository's inert DOM/storage fixture;
the test boundary controls storage reads, writes and external changes. The
TypeScript check and Vite production build also pass. Exact output is in
`final-native-tests.log` and `qualified-build.log`.

**All five unchanged real-browser controls pass** on the corrected production
build, versus five failures on the received build:

1. A new reviewed order from a stale tab preserves a remote correction and added
   order, including original IDs/fields, then displays all three saved orders.
2. Removing an unchanged selected return preserves an unseen addition without
   resurrecting a different order removed in the other tab.
3. An unseen correction survives an obsolete Remove attempt. The tracker shows
   the correction, keeps the new-order draft and permits a deliberate second
   removal after that refreshed view.
4. A latest-storage read refusal makes no write and retains the draft through
   loading retry, then saves it alongside the current remote orders.
5. A quota failure keeps the draft and stored rows. Retrying after another remote
   addition preserves every current row and saves the draft exactly once.

These use two actual browser pages sharing local storage, normal reviewed form
submission, the author's saved-order editor and the production bundled JavaScript.
`after-browser.log` and `after/results.json` retain the results and saved records.
The 390px changed-target capture was visually inspected: the retained draft,
visible explanation and corrected order card fit without horizontal overflow.

The **unchanged editor owner's browser acceptance also passes** on the same
production build: review/cancel/Escape, stable calendar UID, draft preservation,
invalid input refusal, storage read/write retry, real second-tab additions and
target conflicts, literal markup and phone layout. It reported no application
browser errors or external requests. Its complete result is
`unchanged-editor-browser.log`; its exact harness identity is recorded separately.

Runtime: Node 24.19.0, TypeScript 5.9.3, Vite 8.3.3, Vitest 5.0.3, Playwright
1.62.1, Chromium 153.0.8010.0 on Linux. The TypeScript/Vite/Vitest versions match
the receiving project's lockfile. Dependencies were copied into the contributor's
isolated checkout; the author directories were used only as read sources.

## Repeat

From the qualified source with the pinned native dependencies installed:

```sh
npm ci
npm test
npm run build

# Set these only if using an existing Playwright installation and Chromium.
export RETURNBY_PLAYWRIGHT=/absolute/path/to/playwright/index.mjs
export RETURNBY_CHROME=/absolute/path/to/chromium
node --test tools/check_stale_browser.mjs
```

The harness serves `dist/` on a fresh loopback port and creates disposable browser
contexts. `RETURNBY_BUILD` and `RETURNBY_STALE_OUTPUT` select alternative build
and receipt directories. For the retained expected failures, check out
`26879654250875afd8762688ff02e7104289158d`, build it, and run the same Node command
using that commit's `tools/check_stale_browser.test.mjs` filename.

For the editor acceptance, serve the production build locally, set
`RETURNBY_BASE_URL` to that loopback URL and run
`node tools/check_edit_browser.mjs`. The proof is source and isolated-runtime
receiving; it does not claim a canonical merge, deployment or observed customer use.
