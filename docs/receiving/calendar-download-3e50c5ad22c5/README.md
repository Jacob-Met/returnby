# Independent saved-order Calendar download receiving

PR34's calendar-end correction passes the actual ReturnBy review → Save → Calendar-download path on its exact successor source. Three browser timezone contexts reproduce the original one-day extension; the corrected source emits the intended next civil date. Five ordinary controls retain their calendar bytes after replacing only the runtime DTSTAMP.

This packet is an evidence-only contribution by `chatgpt-3e50c5ad22c5 / production`, reserved in [PR34 comment6067843142](https://github.com/Jacob-Met/returnby/pull/34#issuecomment-6067843142). It changes no application source, existing assertion or owner ref. PR34 retains its correction, PR19 retains batch composition, and #8/#10 retain final product adoption.

## Frozen sources and actual runtime

| Input | Commit | Complete Git tree |
| --- | --- | --- |
| Original current-main parent | `1e662c387be5f66f8499fac7ec443f58d2198379` | `503ea217dc35f54aa7c9dbd1f92217544ad6dbc9` |
| Corrected PR34 successor | `7cf2f6d6e1cd71143569f972ab6ca0bbc0c46772` | `20a738c38691d102d2f3c50cb74de1e8cc37f534` |

All 111 tracked file observations across the two worktrees match their Git blobs and SHA-256 records. The same 20 production-build artifact observations match before and after receiving. Each exact checkout passed its unchanged `npm run build` command, including strict TypeScript and Vite. The declared lock installed 38 packages with exit0 in an isolated owned directory. Versions: Node22.22.1, TypeScript5.9.3, Vite8.3.3 and Vitest5.0.3. No donor dependency store was modified.

Actual browser: installed Chromium153.0.8010.47, revision73934a44f61e6b3878d1943064c141a5a820f5f7. The dependency-free CDP driver uses a fresh disposable browser profile and a separate browser context per case. The only environment fixture is a deterministic `crypto.randomUUID` return so original/candidate calendar identities can be compared exactly. Timezone overrides use the browser's native date implementation; no date, calendar, parser, storage or application function is replaced. Runtime timestamps remain real and are normalized only for cross-run comparison.

## Completed downloads and decisive controls

Every case uses physical keyboard events to paste a fictional confirmation, activate **Find the deadline**, enter a one-day reviewed window, activate **Save deadline to tracker**, then activate the real **Add calendar reminder** button. Receiving waits for the browser's completed download event and reads the file bytes from disk. No record is seeded directly into storage.

| Browser timezone | Saved/visible deadline | Original actual DTEND | Corrected actual DTEND |
| --- | --- | --- | --- |
| Pacific/Apia | 2011-12-29 | 20111231 | 20111230 |
| Pacific/Kwajalein | 1993-08-20 | 19930822 | 19930821 |
| Pacific/Kiritimati | 1994-12-30 | 19950101 | 19941231 |

The other five cases are the historical Apia date in UTC and a modern deadline2026-10-08 in each of UTC and the three Pacific zones. They produce the same complete event bytes in both builds after normalizing DTSTAMP. Across all16 completed downloads:

- The visible deadline and DTSTART agree.
- UID comes from the actual saved order, and title/order number/three-day alarm remain exact.
- Actual files retain CRLF and at most75 UTF-8 bytes per physical calendar line.
- Exact saved storage bytes and visible tracker state remain unchanged by downloading.
- Only the three intended DTEND lines and runtime timestamps differ across source generations.
- There are zero application page errors, failed served resources or external network requests.
- The browser exits0 and its owned profile is removed.

The named files under `downloads/` are byte-for-byte copies of the completed browser downloads. Their original browser GUID, suggested filename, full hash and saved-state witness are in `browser-receipt.json`. The source-bound native paths and exact build outputs remain in `build-receipt.json`.

## Preserved receiver failure and bounded disposition

The original browser process exits1 at its final **No external application requests** assertion. All16 interactions and calendar assertions had already passed. Its predicate admitted loopback and blob URLs but misclassified16 inline SVG data URLs as external requests. The retained event stream has80 loopback asset requests and16 local inline SVG data URLs; none is an external network request.

The original `browser-receiver.mjs`, process log and receipt are preserved exactly. Original receiver SHA-256:
`b62bd3c33478e0fd43b37f062da36902c2e273938f2d43897792c620ff5e98bd`.
Original receipt SHA-256:
`bdcf49e80355ddb7016563a2f615ca59719a4af28969955d57204ec98928fbff`.

The focused `postcheck.mjs` exits0. It tests eight positive/negative URL-classification controls, classifies the preserved event stream, rereads all16 real download files, verifies all saved-state/byte comparisons, and completes the deferred source/build hash check. Its complete result is `postcheck-receipt.json`. It does not repeat or relabel the completed browser interactions.

`browser-receiver-replay.mjs` is supplied for a future complete replay. It differs from the original receiver only by allowing local `data:` URLs in the last request predicate. Its SHA-256 is `173ff94c20691934764fcbe22158804974739ce80dd852d5ba905b7a2a37e02e`. That successor itself was not rerun; acceptance here is the original16 completed browser cases plus the explicit focused postcheck, not an invented whole-run exit0.

## Replay and limits

The exact executed build/source preparation is recorded in `build.mjs` and `dependency-receipt.json`. The native custody root is `/dev/shm/hamon-returnby-calendar-3e50c5ad22c5/receiving`; original and candidate worktrees are the two owned `/tmp/hamon-returnby-calendar-{original,candidate}-3e50c5ad22c5` paths. The scripts retain these concrete paths and the installed browser path so the original run can be reconstructed without guessing which source was used. The browser driver provenance records its copied source hash and the sole profile-directory substitution.

The maintained exact-head GitHub CI independently reports [run37834880846](https://github.com/Jacob-Met/returnby/actions/runs/37834880846) completed/success for the same PR34 successor; `hosted-ci.json` preserves that direct API result. This packet does not claim another full native test-suite run.

This qualifies one browser engine's actual single-order download path with synthetic data. It does not qualify a calendar-provider import, notification delivery, physical phone, live customer account, PR19/PR20 combined UI, date calculation outside the existing contract, source merge or deployment. The original app's unrelated behavior and current product adoption boundaries remain unchanged.
