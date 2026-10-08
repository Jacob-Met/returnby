# Saved-order lookup receiving

ReturnBy can now find an individual saved return by part of its store name or order
number. This is useful after restoring a backup, whose existing admission limit is
10,000 orders. The query combines with the current date filter, retains deadline order,
and leaves the three global tracker counts intact. A separate status reports the visible
count. The input has a visible label, a native search control, and a Clear search button
that restores input focus.

Matching ignores case and repeated whitespace. Punctuation and accents remain literal;
the displayed leading `#` may be copied with an order number. Omitted optional order
numbers are accepted. Query changes never write storage or search the unsaved email.
The original editor, backup, calendar, parser, policy, storage and deadline modules are
unchanged. Calendar review still follows its existing date filter and explicit checkboxes;
the tracker explains that search applies only to the displayed tracker.

## Source and receiving route

| Role | Exact identity |
| --- | --- |
| Receiving base, PR #20 | `7829e56e57ef91dfe8edd5853fd68d6c7890fac0` |
| Receiving base tree | `b28e7b706fe67fd4b34111badd581c6bdd2ed4a7` |
| Identical local surrogate | `f6f030a040e14ba16cf6dc683921ba0d8e80369e` |
| Qualified application and tests | `1fbd1fc26f98f788826333494c5330e0c2f939d7` |
| Application tree | `abce32e4624ae5a24ef976a84a88955f3899b833` |
| Browser-harness origin guard only | `2657b9c7570891604dbfe2ff24cc6878cffcf6d7` |
| Guarded harness tree | `0e4d1a8b9df8a6986057d2188fa9c704372d56ae` |

All 191 original leaves were received and checked. The application contribution changes
only the existing `src/main.ts`, `index.html` and README, and adds the matcher, its CSS,
two test files and the optional browser receiver. All 188 other original leaves retain
their exact bytes and modes. The harness-only successor retains all 195 other application
freeze leaves. The following delivery commit adds this evidence without changing runtime.

The bounded source claim is [#8 comment 6059410633](https://github.com/Jacob-Met/returnby/issues/8#issuecomment-6059410633).
The existing #8/#10 owner retains the receiving branch and final main integration. This
contribution is stacked on #20, which was still open at the final source read. Main was
`3913697f70a31d73e8fe7d02b686b306830c24db`; its #17 daily refresh/focus work and the deliberately
deferred #6 parser remain explicit later composition inputs. This packet does not qualify
that later main composition or a deployment.

## Native and browser results

The exact base passes its **201 native tests and strict TypeScript/Vite build**. The
candidate passes **231 tests**: those 201 originals, 22 matcher cases and eight handlers
that execute the actual main module against the repository's inert storage/DOM boundary.
The candidate strict build also passes. Installed Node 24.19.0, TypeScript 5.9.3, Vite 8.3.3
and Vitest 5.0.3 were reused; temporary files, npm cache and Vite caches were kept in the
owned receiving prefix. No dependency was installed.

The same frozen main-handler witness fails the requested store/number lookup on the
unchanged base and passes its existing urgency/order/count/storage control. Six other
methods were deliberately not selected in that predecessor run. The 10,000-order test
finds the final record, retains reference order for 5,000 matching stores and leaves all
input fields unchanged. It tests the native matcher, not 10,000-card DOM performance.

The real production-build browser receiver passed on **Mac Chromium 151.0.7922.34**, using
the already installed Playwright 1.62.1 matching revision 1234. Nine transferred runtime
and harness files matched their hashes before and after the 6.04-second run. The original
build has no lookup input and keeps its date-filter control. Six candidate groups cover:

- Store/number matching, filter intersection, deadline order, global counts, Clear focus
  and the native search input's Escape behavior, with no saved-data write.
- Literal markup display and a saved order with no optional number.
- An edited store leaving the active query, preserving identity, historical fields and
  the separate new-order draft; the existing editor focus fallback remains usable.
- A complete backup despite the query, a newly imported matching row, and the existing
  calendar dialog selecting independently from the query. The downloaded calendar retains
  all four explicitly reviewed UIDs in deadline order.
- A searched-row removal that preserves an unseen addition made by a real second tab.
- Storage-read refusal, retained query/draft, explicit retry and restored current rows on
  a 390 × 844 viewport, with no horizontal overflow.

There were no application browser errors or external requests. The actual phone capture
was visually inspected. Both downloaded fictional artifacts and the screenshot are in
`evidence/browser/mac/`. The test uses fresh contexts, loopback builds and fictional data;
it does not import a calendar into an external calendar application or use a real account.

## Independent source review

The independent reviewer accepted the exact application source as **ACCEPTED_SOURCE_ONLY**.
The review checks all 196 Git leaves, the 188 unchanged original leaves and inverse source
spans for original action handlers, sorting, global counts, filtering and card identity.
It confirms optional-number handling and complete-store Save/Remove/editor/backup/calendar
bindings remain outside the filtered display rows. The reviewer executed no product or
browser tests; the native/browser results above are the author's qualification.

All nine peer packet files are adopted unchanged under `evidence/peer/`, including its
manifest SHA256 `ca6702181b3ea42ebe1b256c82b5aba1cfa1178c5658e96e07ddf52c46dee717`.
The peer explicitly retains the #20 receiving boundary and accepts the later harness-only
successor's unchanged application bytes without expanding the review to current main.

## Preserved failures and corrections

The initial npm attempt stopped before any tests because its default cloud cache could
not be written on the full volume. Redirecting npm cache into the owned receiving prefix
allowed the original source to pass. The first lookup candidate then exposed a real
development error: `Order.orderNo` was already optional, but the matcher called `trim`
without a fallback. Strict typecheck rejected it. A focused native case reproduced the
exception on frozen candidate `42c1d5c9e5fa98b71fe503105271f01e2a920c93`, then passed with the
empty-string fallback; its original log and source snapshot are retained.

Two ThinkPad browser attempts stopped before the baseline application loaded, with
Chromium 153 reporting `ERR_INSUFFICIENT_RESOURCES`. The first receiver also accessed
localStorage on opaque `about:blank`; the guarded successor limits fixture seeding to its
own loopback origin. That correction removed the opaque-origin error, but the ThinkPad
navigation failure remained. Neither attempt supplies a passing product check.

The first Mac launch looked for a browser under RDC's isolated seat cache and stopped
before launching. The final run uses the exact installed matching executable through the
receiver's existing `RETURNBY_CHROME` option. No browser was installed, no owner profile
or host protection was changed, and all earlier failures remain alongside the successful
run. These environment/receiver failures are distinct from the candidate's optional-number
error and from the original absence of the requested lookup feature.

## Replay and custody

Run `npm test` and `npm run build` with the repository's existing dependencies. For the
optional browser receiver, configure an installed Playwright module and browser:

```sh
RETURNBY_PLAYWRIGHT=/absolute/path/to/playwright/index.mjs \
RETURNBY_CHROME=/absolute/path/to/installed/chromium \
RETURNBY_BUILD=/absolute/path/to/qualified/dist \
RETURNBY_BASELINE_BUILD=/absolute/path/to/pr20/dist \
RETURNBY_EVIDENCE=/absolute/path/to/owned/browser-evidence \
RETURNBY_DOWNLOAD_DIR=/absolute/path/to/owned/downloads \
node tools/check_order_search_browser.mjs
```

The baseline option is optional. On Snap Chromium, choose a download directory visible
to the snap. The harness creates its own loopback server and fresh browser contexts.

`receipt.json` provides the compact machine-readable disposition. The frozen 48-file
evidence packet has manifest SHA256
`cdb8c67bb49e590550132600e3152c3a0ee2362c0f13e7689f147abbdfb0ce3f`; every member was verified
during native-to-cloud adoption. Complete original/surrogate Git history and the source
bundle remain at ThinkPad `/tmp/returnby-lookup-965d2e86e979`; exact Mac runtime files and
raw browser outputs remain at the same owned prefix on the Mac. Source publication must
use the real #20 commit as parent and preserve the receiving tree, rather than publishing
the local surrogate ancestry as canonical history.
