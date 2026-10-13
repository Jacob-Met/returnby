# ReturnBy merchant fallback: prepared Windows receiving, currently held

**Status: reviewed receiver drafts; no source staging, dependency copy, TypeScript/Vite build, or browser course has run.** This directory preserves the exact preparation for [issue 66](https://github.com/Jacob-Met/returnby/issues/66), reserved in [comment 6146015582](https://github.com/Jacob-Met/returnby/issues/66#issuecomment-6146015582). The selected Jacob MSI connection failed before receiving began. Its earlier create-only scratch-directory request returned no PID or native result, so the physical directory creation and that process's terminal state remain unknown.

## Source and intended receiving

| Variant | Commit | Tree |
| --- | --- | --- |
| Original | `7a271cfbc27e6c79a889b90920a700fdbf638e22` | `c53ca326af314176e1367b6585e876ed3e560a21` |
| Candidate offered by the source owner | `f2ad8039ddef8f783bccf491847d7b95854f92e1` | `80a4535a69ca36be41598051945e1dd4b2aba7bd` |

The evidence branch is a child of the offered candidate. Its repository-root product files remain that candidate's exact 81 leaves. Original and candidate receiving inputs are separately encoded in [INPUT.json](INPUT.json); this directory is preparation, not an integrated or installed result.

The immutable input projects all `src/`, `tests/`, `public/`, `data/` and the six root package/config/HTML inputs from each source tree: **27 original files, 28 candidate files, 29 unique Git bodies**. The candidate-only native parser test is absent from the original projection. The unchanged TypeScript configuration includes five maintained TypeScript test modules in typechecking; this course does not invoke Vitest or the native parser test. Historical PNG captures in the public directory are build inputs, not newly captured browser evidence.

The frozen functional contract covers three fictional receipts:

| Case | Required candidate behavior |
| --- | --- |
| Body contains Contosocial, with no From header | Merchant initially blank and highlighted, 30 days/default. Explicitly enter Contosocial, save, reload, and require the approved record to retain 30/default and the 2026-11-09 deadline. Download and inspect the actual calendar file. |
| Body contains the complete Contoso alias | Preserve 15 days/policy and the 2026-10-25 deadline. |
| From header identifies Tailspin Toys, while body contains Contosocial | Preserve From priority, the literal merchant name, 90 days/policy, and the 2027-01-08 deadline. |

These are frozen expectations derived from the source, not observed browser outcomes. The existing preview computes policy once; manual merchant edits do not recalculate it. Issue 7 retains that separate behavior. This course does not claim that the parser extracts or learns Contosocial.

## Reviewed drafts and exact inputs

| File | Git blob | Role |
| --- | --- | --- |
| [CONTRACT.json](CONTRACT.json) | `837781b16a669c0eeb66b00e8901a2877c8696f4` | Three-case functional contract, selected host and limits |
| [INPUT.json](INPUT.json) | `6dfc8145a8b2f442424f036a733d1938b1977462` | Immutable source projections and Base64 bodies |
| [prepare_build.py](prepare_build.py) | `ab3ac85199faa51039e93bf477aaba3404c0e306` | Final staging/direct-build draft, v3 |
| [receive_browser.py](receive_browser.py) | `a6830407fe4af938a523fb8df491119d32ff0608` | Final browser draft, v3 |

Both final scripts have independent manual static review. **Windows staging/build behavior, browser automation and lifecycle outcomes remain unqualified.** A separate Linux/Python 3.14.4 review-only process compiled both exact final Python strings without importing or executing them and verified the Git identities of all 29 encoded input bodies. Its 52/52 data/syntax checks passed with exit 0 and empty stderr; these are not product passes. The [retained native review](review-only-native.json) records the exact scope and bytes. The [Source](reviews/source.json), [Runtime](reviews/runtime.json) and [Delivery](reviews/delivery.json) review records describe the checks performed and retain earlier draft defects. They are not test passes.

The staging draft is restricted to the reconciled direct `returnby-*` child of Jacob's existing Runtime directory on MSI, Python 3.14.3. It verifies the immutable input and each decoded Git body, creates the two source projections without overwriting existing paths, and copies the previously identified dependencies into owned `node_modules`. It requires the 36 Windows-x64 package metadata checks and equality of every dependency file's source-before, copied and source-after byte identities. The completed read-only dependency screen reported 748 regular files / 62,943,799 bytes; no dependency copy or before/copy/after hashing course has occurred.

The build draft uses the exact admitted Node executable and version 24.14.0, then invokes TypeScript `--noEmit` and Vite `build` directly. It records raw streams, bounded command outcomes, both configured HTML outputs, source bytes/mtime, and dependency preservation. An exception or timeout leaves receiving held. Timeout handling only establishes termination/reaping of the direct Node child; any descendant state requires separate reconciliation.

The browser draft requires accepted stage/build/dependency manifests bound to the immutable input, reconstructs expected source identities, and checks actual source bytes/mtime and built assets before launch and after shutdown. Each source receives its own browser and loopback origin; each fixture receives a fresh context. Page/context HTTP(S) requests are limited to that origin. That observation does not constitute an operating-system-wide Chrome network audit. Acceptance also requires explicit context/browser/server cleanup, the retained browser lifetime handle to signal, and the owned listener/thread to be closed.

## Why execution is held

[Transport uncertainty](transport-uncertainty.json) preserves the original tool envelopes and submission details. The Jacob MSI create-only request timed out without a PID. A subsequent ping and read-only directory reconciliation also timed out. A text-only contract write to the existing ThinkPad Runtime directory timed out too. None of those requests was retried. A later identity-verified read through the same ThinkPad filesystem found that exact text path currently absent; [the additive observation](thinkpad-path-observation.json) preserves its scope. Current absence does not establish that the historical request never wrote.

The later [offline observation](transport-offline.json) explicitly reports that the selected Jacob MSI connection has no live connection. A separate, bounded read-only look through the listed alternate MSI endpoint established a different user/environment: Veria, Python 3.11.9, only 19,288,064 bytes free on C:, and no admitted Jacob Runtime directory, Python executable, or dependency directory. It therefore cannot reconcile the original scratch creation or receive the frozen Jacob course. It was not used as another product environment.

The saved [native preflight record](native-preflight.json) distinguishes completed read-only host/dependency observations from the unavailable copy/build/browser work. Historical transport and review records retain their original status text; this README states the current aggregate status.

## Resuming the same bounded course

First recover the exact selected Jacob MSI environment and perform read-only reconciliation of its original Runtime directory request. Establish the original owned scratch path and any pending process before further writes. The optional ThinkPad text path has already been observed currently absent, with historical write occurrence left undecided. Do not infer absence, successful shutdown, or permission to repeat a mutation from a timeout.

After that reconciliation, confirm the current source-owner handoff and exact host/dependency/capacity prerequisites, recover these files without line-ending conversion, and verify their Git identities. The exact scripts already have the bounded Linux syntax-only check; Windows execution prerequisites still require fresh verification. Any required receiver correction gets a new version with retained prior evidence.

The intended sequence is stage, original direct build, original browser receiving, candidate direct build, candidate browser receiving. The scripts take the reconciled root as their first argument; the staging script uses `--stage` or `--build original|candidate`, and the browser script takes `original|candidate` as its second argument. This sequence is documented preparation and has not been exercised.

The original browser is expected to expose the known embedded-alias defect and may intentionally exit 1 while completing all three cases. Require `receiver_complete`, the exact expected semantic mismatch set, and both unaffected controls to pass before advancing. A receiver exception, incomplete cleanup, changed source, unexpected mismatch, failed build or timeout is a receiving failure. Do not chain the original and candidate browser commands with `&&` or count every original exit 1 as automation failure. The candidate requires both `receiver_complete` and `product_pass`. The source-derived expected original mismatch names are `embedded-alias.preview.merchant`, `.preview.days`, `.preview.source`, `.preview.highlighted`, `.source_label`, `.saved.windowDays`, `.saved.windowSource`, `.card_due`, `.reload_card_due`, `.calendar.DTSTART;VALUE=DATE`, and `.calendar.DTEND;VALUE=DATE` (each abbreviated suffix keeps the `embedded-alias` prefix). These eleven mismatches are expectations, not results.

## Review history and ownership

The history directory preserves browser v1/v2 and build v1/v2. Browser v1 lacked cleanup coverage for early server setup and did not gate all cleanup exceptions. Browser v2 corrected lifecycle coverage but still needed the complete accepted-build/stage and manifest-pin gates; v3 adds them without changing the functional fixture checks. Build v2 added raw-stream pinning on timeout; v3 places that pinning inside the recorded preservation failure boundary. The Source static comparison also retains an initial JavaScript replacement-string interpolation mistake and its corrected literal comparison; no product change or execution caused that discrepancy. The native review packet's first controller transfer rounded five nanosecond timestamp integers during JSON reserialization. Its Git-identity gate rejected that copy. The [transfer diagnosis](history/native-transfer-diagnosis.json) and rejected transfer are preserved; the accepted native packet uses the exact raw text and unchanged five Base64 member bodies. No native course was repeated.

Source owner `d304b5dadc7c/source_improvement` retains the offered merchant-fallback change. Issue 7 and the #8/#10/#20 owners retain their existing attribution, integration, delivery and adoption scopes; the separate #62 composition is excluded. Source prepared the staging/build draft and this durable packet, Runtime prepared the frozen browser contract and receiver, and Delivery independently reviewed both.

This evidence-only branch adds preparation records. It does not move the source offer, main, PR heads, Pages or any installed application. Both existing workflow definitions are preserved: CI runs for pull requests or main pushes, and Pages runs for main pushes. The packet is published through a non-main branch without opening a PR or requesting Actions.
