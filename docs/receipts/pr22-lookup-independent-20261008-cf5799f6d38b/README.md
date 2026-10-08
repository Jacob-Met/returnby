# Independent receiving of ReturnBy PR22 and the later day-refresh composition

## Disposition

**The exact lookup implementation in [PR22](https://github.com/Jacob-Met/returnby/pull/22) passes this independent native and browser receiving.** Its head is `775a16f651858049dccadf99fec3a80844466ab6`, and its full published tree is `7330138b474d68f2f28e1660c70a6a3587499747`.

This is a **docs-only handoff to the existing #8/#10 integration owner**. That owner retains PR20 and final main integration. Our earlier standalone search and its PR20/day/search variants remain frozen comparison evidence; no competing product source is included in the publication overlay.

The [lookup claim](https://github.com/Jacob-Met/returnby/issues/8#issuecomment-6059410633), [qualified PR22 handoff](https://github.com/Jacob-Met/returnby/issues/8#issuecomment-6059968082), and [PR20 receiving disposition](https://github.com/Jacob-Met/returnby/issues/8#issuecomment-6057346826) establish that route. [ownership.json](ownership.json) preserves the read state and exact comments captured at **2026-10-08 13:36:08 UTC**. PR20 deliberately leaves main's #17 day refresh and the separately deferred #6 parser for later receiving.

## Executed result

| Exact input | Native tests | Strict TypeScript/Vite build | Independent browser result |
| --- | ---: | --- | --- |
| PR20, head `7829e56e57ef91dfe8edd5853fd68d6c7890fac0` | 201/201 | Pass | No new browser coverage claimed |
| PR22, head `775a16f651858049dccadf99fec3a80844466ab6` | 231/231 | Pass | Three action groups plus the error/request control: **4/4** |
| PR22 plus main391's exact day callback and the prior lifecycle test fixture | 241/241 | Pass | Frozen focus receiver: **0/2**, original failures retained |
| Same receiving composition plus 46 bytes recognizing Edit | 241/241 | Pass | Same focus receiver: **2/2**; same adapted action receiver: **4/4** |

The four [native receipts](native/pr22-receipt.json) and their adjacent raw stdout files record all eight test/build subprocess exit codes as zero. The before/after browser evidence is in [the retained failure receipt](browser/browser-pr22-day-before-focus.json), [corrected focus receipt](browser/browser-pr22-day-focus-focus.json), [exact PR22 action receipt](browser/browser-pr22-actions.json), and [corrected-day action receipt](browser/browser-pr22-day-focus-actions.json).

The actual runtime was **Node 26.3.0, npm 11.16.0, TypeScript 5.9.3, Vite 8.3.3, Vitest 5.0.3, Chrome 154.0.8037.98 and Puppeteer 25.12.0** on the authorized Mac component. Browser tests served the actual production build over loopback and used fictional localStorage records in isolated profiles. All browser application-error and external-request arrays are empty. Separately recorded browser background proxy refusals are not relabeled as application requests or a claim about all operating-system traffic.

The final [native custody readback](source/final-native-readback.json), completed at **2026-10-08 13:57:40 UTC**, rechecked all **265 source files across the four captures**, every build artifact, receiver identities, and each browser-served asset against its exact native build. All matched.

## Independent action controls

The frozen action receiver has SHA256 `ce03920bc7c06064bd5d418f315505122517e6ba2e51c63900fe81ebfabc21cc`. The [PR22 adaptation](receivers/independent_search_actions_pr22.mjs), SHA256 `788d7f1d62bc47604f923df2b4f185c093446c50b39167181344f34303ce19f9`, changes exactly one selector: `#order-search-status` becomes PR22's `#search-status`. The complete [selector patch](receivers/pr22-status-selector.patch) shows that all scenario inputs, gestures and assertions remain identical to [the original receiver](receivers/independent_search_actions_original.mjs).

These actual browser controls establish:

- Literal `[.*]` finds only the new reviewed Save; a phrase crossing merchant and order-number fields matches no record. Existing records and IDs remain intact, and query-only changes write no storage.
- Cancelling Clear retains saved records and the intake draft. Confirming Clear removes the whole tracker while retaining the query and date filter. A subsequent reviewed Save creates a new ID and repopulates the same query.
- A refused quota write retains the query and draft. Explicit Save retry preserves both the original records and a freshly added unseen record, with one successful retry write.
- The application reports no runtime errors or external requests in those flows.

This review does not impose the earlier alternative matcher's NFC or internal-whitespace policy on PR22. PR22's copied-leading-`#`, whitespace, missing-number and displayed-label rules remain its unchanged implementation and native test contract. Existing storage, parser, editor, backup and calendar modules were preserved.

## Later day-refresh receiving and the narrow correction

PR22 itself contains no day-refresh callback. The receiving experiment imports the exact day module and complete existing callback from main `3913697f70a31d73e8fe7d02b686b306830c24db`. Its inherited action selector recognizes calendar and Remove buttons, but does not recognize the Edit buttons introduced by the owned editor stack.

With query `basket` active, the unchanged focus receiver demonstrates two failures. After a real day change and focus event, a retained card's focused Edit button is replaced and focus becomes BODY. When that card leaves Due soon, focus also remains on BODY rather than returning to the active filter. Both cases preserve the query, perform zero saved-data writes, and produce no application errors.

The [frozen focus receiver](receivers/independent_edit_focus_original.mjs) is SHA256 `0ceed3763257d418ddeacefa7088de8c46ab13de6c16b1305d55014b87f378e1`. Its original predicates produce **0/2 before and 2/2 after** adding Edit recognition to the existing dataset-ID restoration path.

| Identity | Before correction | After correction |
| --- | --- | --- |
| `src/main.ts` Git blob | `1a06381d5fd7cc29e098bb56db4697296eddf618` | `bc31b8d93968c79216ade7ebe111c54127d65355` |
| Native capture tree | `31bc7c940e216d4126eeff15a4cadf803d5d2d15` | `a138b825f828a912c5501e3f909529be4bfc48f0` |
| Calculated full receiving tree, unpublished | `947e9a920b969e729ddf6723f6ad11100644ae6a` | `fc6226c82d31695dab180363916b9138598f249b` |

The [documented correction](source/edit-focus-on-pr22-day.patch) adds **46 bytes to `src/main.ts` only**. Its SHA256 is `5a5454c12a7ab8823a4f24a7167c3fb03287532666a197815b3ea88e8092bd39`. All 68 other captured receiving files remain identical. It applies **after the recorded day composition**, not directly to unmodified PR22.

Both day compositions preserve **245 original published PR22 leaves**, change main and the test fixture, and add the three exact day files. [The composition receipt](source/day-composition.json), paired source manifests and [complete published Git leaf inventories](source/published-git-leaves.json) distinguish the full published trees from the smaller executed captures. The captures contain 61 PR20, 66 PR22, and 69 files in each day composition; publication-only docs are pinned, not claimed as executed code.

### Attribution and test fixture

**This is a known integration contract with new exact-PR22 receiving evidence.** Closed PR21 at `0d5af85cadf9bee00afbe0a8117862606b324338` already recognized Edit in its separate #16/day composition. Its composition patch blob is `41015306524596a3606646d1da2538f3f9504a96`. The prior owner handed that contract to [#19 in comment 6057570906](https://github.com/Jacob-Met/returnby/pull/19#issuecomment-6057570906) and [#8 in comment 6057504053](https://github.com/Jacob-Met/returnby/issues/8#issuecomment-6057504053). This review does not claim a novel defect or replace that earlier contribution.

The [lifecycle fixture patch](source/lifecycle-test-fixture.patch) is explicitly **test-only**. Its existing preimage `b808f12d34896ed4f30742a629b46163b123882f` becomes the previously qualified fixture `7c7a426fc97a6c857abd5a04f31009259ee7669a`. It provides inert window/document event registration for the inherited synchronous storage tests without starting midnight timers. The real day module, its ten native tests, and the browser callback remain unchanged. This fixture does not substitute an application, storage implementation or browser.

The reviewer's earlier focus successor was separately received by memory_advance on its exact `b6b1e3ae` composition. That acceptance stays attributed to that earlier source. The new PR22 day compositions here are this reviewer's own receiving work, not a relabeled independent acceptance of the new correction.

## Replay

Use isolated source copies and the recorded runtime. The original owner checkout, earlier evidence and any deployed tracker are outside this recipe.

1. Check out exact PR22 head `775a16f651858049dccadf99fec3a80844466ab6`; run `npm test` and `npm run build`.
2. Run the adapted action receiver against the absolute source directory and a new output directory:

   ```sh
   NODE_PATH=/Users/me/.npm/_npx/4b4c857f6efdfb61/node_modules \
     node /absolute/receipt/receivers/independent_search_actions_pr22.mjs \
     /absolute/pr22-source /absolute/new-pr22-actions composition
   ```

3. For day receiving, verify main's preimage `11d44fab103e1f6a1955299ed9180a61c9598190`. Receive the exact `src/day-refresh.ts`, `tests/day-refresh.test.ts` and `tools/verify_day_refresh.py` from main391, using [day-input.json](source/day-input.json) and the manifests for their identities. Apply [receive-main-day.patch](source/receive-main-day.patch) and the explicitly test-only fixture patch. Native tests/build should pass **241/241** on full receiving tree `947e9a92`.
4. Run the unchanged focus receiver. It reports the two retained failures on that input:

   ```sh
   NODE_PATH=/Users/me/.npm/_npx/4b4c857f6efdfb61/node_modules \
     node /absolute/receipt/receivers/independent_edit_focus_original.mjs \
     /absolute/pr22-day-before /absolute/new-day-before-focus
   ```

5. Apply only the 46-byte correction, rebuild, and rerun that same receiver with the corrected absolute source and a new output directory. Both predicates pass; the same adapted action receiver also passes **4/4** on corrected tree `fc6226c8`.

The original [native runner](receivers/qualify-native-original.py) and [composition builder](source/compose-day-original.py) are retained unchanged for audit. Their relative filenames and captured absolute input paths describe the original native directory; use the patch recipe above for another checkout. The read-only custody script is also retained, with its captured root made explicit.

## Evidence custody and packaging interruptions

The original native root is `/tmp/returnby-pr22-review-cf5799f6d38b-p3exbdk4` on Mac.lan. Source captures, build artifacts, raw receipts, logs and screenshots remain there. This text packet includes exact receipts and hash metadata without duplicating dependency trees or screenshot binaries.

All **34 transferred native text files, 195,401 bytes**, match their independently read native byte count, SHA256 and Git blob. The file-reading transport omitted final newlines on 33 nonempty files; a newline was restored only when all three native identities matched. The exact verification is retained in [local-transfer-verification.json](bookkeeping/local-transfer-verification.json).

Disk-space errors prevented new documentation writes after all product runs completed. Only this review's four completed synthetic profiles were reclaimed, after checking their complete receipts and absence of matching active processes. Earlier frozen profiles and user profiles were untouched. Subsequent read timeouts, a heredoc temporary-file error, and the mistakenly launched missing packaging script are retained in [transport observations](bookkeeping/transport-observations.json) and the adjacent raw files. A read-only `python3 -c` invocation then completed the final custody verification without a temporary file. These are packaging failures, not product or browser failures.

Seven late RDC process handles had expired, so their outer command exit statuses are not invented. The durable native receipts contain the actual test/build subprocess exits, and each browser receipt contains its completed assertions and served-asset custody. The last corrected-day action command was directly observed exiting zero. This metadata limitation caused no product rerun or alteration of the receipts.

No existing source branch, owner ref, user tracker, account, deployment or GitHub state was changed by this review.

