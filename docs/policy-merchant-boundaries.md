# Merchant-name boundaries in the local policy lookup

Issue: [#56](https://github.com/Jacob-Met/ReturnBy/issues/56).

## User-visible problem and change

At baseline `1e662c387be5f66f8499fac7ec443f58d2198379`, lookup accepted any substring of a merchant name. An authored receipt from **Contosocial** was parsed correctly, but the embedded “Contoso” alias selected the fictional Contoso Electronics 15-day policy. It should receive the existing editable 30-day fallback.

The lookup now requires a complete local policy name or alias. Unicode letters, combining marks, numbers and underscore count as continuing the same word. Thus `Contosocial`, `ÉContoso` and `contoso_warehouse` stay unknown. Existing names and aliases still match without case sensitivity; spaces and punctuation still admit decorations such as `Contoso - Outlet`. If an embedded occurrence is followed by a complete alias, the complete occurrence can match.

Alias text is escaped before constructing the regular expression. The existing policy values, exported `knownMerchants` list, table precedence and fallback remain unchanged. This is lexical admission for the checked-in fictional table; it does not authenticate a retailer or establish actual return terms. Saved orders are not migrated.

## Source boundary

The only production change is `src/policy.ts`, blob `17000e74183e89f95633053aac0f73ab2f129ac6` (971 bytes, SHA-256 `1752f81e3fb63c4ab038fd74bf5528cb437828278b672376b5ba885988d7334a`). The regression addition is `tests/policy-boundaries.test.ts`, blob `faea01235435516b2b498845427bfa71c4e856e6`.

The qualified source base is `a6f29e6cf72868ad7143b362b6cf4a244c23aecc`, which accepted the independently owned subtotal and explicit-order-date fixes from PRs #4 and #6. Their parser blob `6a59607db8418e20daf783f0738ba600dd16cf05` and core-test blob `41ca82a8942dc111fa51a04396a16bcfaffa85c1` remain exact.

Within that qualified composition, all 53 unrelated receiving-base leaves retain their exact Git blobs and modes. This includes parser, deadline, storage, UI, policy JSON, dependency lock and both workflows. The new five-method test file covers embedded names, every existing name/alias, case and whitespace, Unicode word content, punctuation, later complete matches, table precedence, fallback and the actual exported parser-to-lookup path. It does not replace other owners’ parser, deadline or storage work.

## Original-first qualification on the prior base

The following initial courses used baseline `1e662c387be5f66f8499fac7ec443f58d2198379` plus the exact policy candidate where indicated. They remain historical qualification for that source. Current receiving-base qualification appears separately below.

The [portable receiving record](qualification/policy-merchant-boundaries-20261013/receiving.json) keeps these distinct courses and their exact source/artifact hashes.

| Course | Original | Final candidate |
| --- | --- | --- |
| Nine authored different-merchant lookup cases | 0/9 correctly stayed on fallback | 9/9 correctly stayed on fallback |
| Seven existing compatibility controls | Recorded expected behavior | All seven unchanged |
| Authored Contosocial parser → lookup | Merchant correctly parsed; 15 days / policy | Same parsed fields; 30 days / default |
| Complete maintained Vitest suite | Not rerun as a baseline suite | 73/73 tests across five files; no failures or skips |
| Strict TypeScript and production Vite build | Both exit 0 | Both exit 0 |

The author-run functional course uses the actual exported parser and lookup, transpiled in memory by existing TypeScript 5.9.3 under Node 22.22.1. Its nine cases are separate from the five new Vitest methods and the complete 73-test suite. The raw candidate witness retains its historical `candidate_pending_blob` marker; its exact source SHA above binds it to the final published blob.

The maintained suite uses Vitest 5.0.3, followed by TypeScript 5.9.3 `--noEmit` and Vite 8.3.3. These versions match the checked-in lockfile and were already present on the native machine. No packages were installed. All executed source hashes remained unchanged during the final course.

The first parallel Vitest attempt was unsuccessful: 27 loaded tests passed, but two suites failed to load temporary SSR files with `ENOENT`. The complete unchanged suite then passed with its own `TMPDIR` and `--no-file-parallelism`. Both records are retained. The original and final Vite builds each reported the expected non-destructive warning that the new absolute output directory sits outside the project root.

The final maintained commands were:

```sh
node node_modules/vitest/vitest.mjs run --no-file-parallelism --reporter=json --outputFile=<owned-receipt-path>
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vite/bin/vite.js build --outDir <owned-output-directory>
```

The native receipt records the actual absolute arguments and owned temporary directory. Public dependency packages were reused through links in an owned `node_modules` directory; new cache entries remained in the owned workspace. Earlier unavailable builtin TypeScript and disk-space attempts are recorded separately as environment failures, not passing product tests. An intermediate source assembly error was detected by full inspection, discarded before Git publication and replaced by the exact reviewed candidate above.

## Independent review and prior-base browser receiving

The shared-context worker independently read the complete final source and tests, checked alias and precedence semantics, compared all source hashes and received the full native Vitest/build evidence. It approved the bounded change without findings.

The independent runtime worker froze two authored receipt fixtures at 375×812 and 1280×900 before receiving candidate bytes, then exercised the actual built UI: paste, find, review, save and reload. The original build passed both Contoso controls but failed both Contosocial policy/deadline scenarios (46/52 checks overall). With the unchanged receiver and acceptance, the candidate passed **all four scenarios and all 52 checks**.

Contosocial now shows and saves **30 days / default**, with **2026-11-02** as the return date for the authored October 3 order. Contoso still shows and saves **15 days / policy**, with **2026-10-18** as its return date. All parsed fields remained exact. Only approved fields entered local storage; the full email, sender address and personal-note sentinel were absent. Reload retained the same record. No external requests, page errors or horizontal overflow occurred, and every served response matched the build hashes.

The course used Chromium 153.0.8010.12, Playwright 1.63.0 and Python 3.14.4. Both ten-asset distributions and the acceptance file remained unchanged, and the local server stopped after each course. This is local production-bundle receiving with authored data; it is not public deployment or evidence of an installed end-user profile. The raw receipt states the actual browser runtime settings.

An earlier original-only receiver attempt collected response bodies after reload and hit a Playwright timing error. That failed record is retained separately. Moving byte collection before navigation corrected the receiver; the acceptance did not change, and the original was rerun before the candidate with the same refrozen v2 receiver. The final original and candidate raw receipts are retained with SHA-256 `692ef6d28dbdb93cfb0205345dd24939eb04d7200b2673f27ac05abf14d8e999` and `bb3afb8f8b041d519006ce5ea9a05825db1e2fe3bfffd7442b8ee13506cf9268`, respectively.

## Current receiving-base qualification

After the parser fixes reached `a6f29e6cf72868ad7143b362b6cf4a244c23aecc`, the exact unchanged policy helper and regression file were composed onto that accepted source in a separate workspace. The complete maintained suite passed **79/79 tests across five files**, including the accepted parser regressions, with no failures or skips. Strict TypeScript and Vite production build both exited 0. All 53 unrelated receiving-base leaves and all 55 executed source inputs stayed exact.

The independent runtime worker then received this current production build with the same frozen four-scenario receiver and acceptance: **4/4 scenarios and 52/52 checks passed** again. Contosocial retained 30 days / default / November 2 through review, save and reload; the Contoso control retained 15 days / policy / October 18. Storage, privacy, exact served bytes, viewport fit and request/error checks passed; the ten-asset distribution and acceptance remained unchanged and the server stopped. The current raw browser receipt is 23,351 bytes, SHA-256 `e7759d0d943ab53207181d1ad38a9a40590a42e5882ae760c2e01c9dcd2028be`. The new main bundle is `assets/main-Bo40Juke.js`, 10,024 bytes, SHA-256 `bb096a8fffc9363e7051376a8eb6d204eead84a190f185e3248f926916f5ec46`.

The earlier 73-test and prior-base browser courses are retained separately; they are not relabeled as current-source execution. The raw current author qualification is 36,032 bytes, SHA-256 `f58640c2fb91a8ff103d66fe7594e0f6780490b5a4e15c9267bc9440f643e4c2`; its 79-test Vitest JSON is 27,126 bytes, SHA-256 `83f7e14bc8396caeeba838c5a082fa22700a733ad737c6dbd7de44acdaca1c74`.

## Publication composition

Before publication, main advanced to `2deafe75f0ce3593da765e7de51c01bb62dc6877` through a separately reviewed checklist-link color/focus correction, its browser receiving utility and guide (including truthful completion output), and the README link to that guide. The four changed or added paths are `src/style.css`, `tools/capture_returnby.py`, `docs/BROWSER_ACCEPTANCE.md` and `README.md`. Every TypeScript product module, maintained test, policy-data file and dependency input remains the same as the qualified composition above.

The publication overlays only this reviewed policy helper, regression file and two evidence files onto the new 55-leaf main tree, preserving all **54 unrelated accepted leaves**. Complete Git-tree comparison verifies that preservation. The 79-test and 52-check browser courses remain bound to the pinned `a6f29e6` composition; no extra runtime course or new qualification of the other owners’ CSS/receiving changes is claimed. Earlier screenshots therefore show the earlier checklist-link styling.

## Delivery limits

The source change and local production bundle can be independently received without deploying the public site. The standing GitHub Actions hold remains in effect: existing workflow definitions are unchanged, and source publication uses supported skip directives. No hosted CI, Pages deployment, real retailer policy validation or migration of existing saved orders is claimed.
