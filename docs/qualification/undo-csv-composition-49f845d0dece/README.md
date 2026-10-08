# Independent Undo → CSV composition receiving

**ACCEPT for the scoped prospective combination of ready ReturnBy PR24 and PR25.** The actual composed app passed all **18 receiving assertions** in Chrome. The original Undo-only app retained its existing Undo control and produced the expected missing-CSV control (1 pass / 1 failure).

This packet belongs to the existing [#8/#10 integration handoff](https://github.com/Jacob-Met/returnby/issues/8#issuecomment-6062309880). It is an evidence-only branch: the repository runtime outside this packet remains exact PR24. The included [composition.patch](evidence/composition.patch) describes the qualified four-path runtime composition. The #8/#10 owner retains adoption of both contributions, their original tests/documentation, the broader receiving stack and main.

## Received source

| Input | Exact pin |
| --- | --- |
| Existing PR20 receiving base | `7829e56e57ef91dfe8edd5853fd68d6c7890fac0` |
| [Ready Undo PR24](https://github.com/Jacob-Met/returnby/pull/24) | `ad19cab029533820a4f6e2c576f5cb20a9e06816` |
| Undo tree | `c0625c196329f6a02ba30820472c510e0fd55cac` |
| [Ready CSV PR25](https://github.com/Jacob-Met/returnby/pull/25) | `88ad7e0fc390bb468450bde9a2d25181c7bbe52d` |
| CSV tree | `5ea7abed75f58e0ece86734868f98feb2d224ebb` |
| Main at final ownership read | `3913697f70a31d73e8fe7d02b686b306830c24db` |
| Original ThinkPad source snapshot | `8a4141ad26f068f10992677c715f0b8f7c126581` |
| Exact Mac source snapshot | `7b09090f52d0a2c6a54ce3791233de33df9cd1a6` |
| Final native receiver freeze | `771ac2217983713869a5c9f92e724eb10aadb1fe` |

The [shared-dependency audit](evidence/cross-parent-dependency-audit.json) confirms that all 21 common runtime/build inputs are identical between the two author heads, including the backup codec, store, deadline calculation and editor. The [source custody manifest](evidence/source-custody.json) records all 27 baseline and 29 candidate runtime/build files. Those native snapshots intentionally omit the authors' already published test, documentation and screenshot trees; their immutable original contributions remain authoritative.

The composition adds the exact CSV HTML section and two exact CSV modules from PR25 to PR24. Its only main-script insertions are the original CSV import and `bindSavedReturnsCsv(read)` call. Removing those two statements and the copied HTML section restores PR24 main/HTML byte-for-byte. Existing Undo, editor, storage, parser, calendar and policy modules are unchanged.

| Qualified changed path | SHA256 |
| --- | --- |
| `index.html` | `6f17badae80849d56b567d423b96028c6180d2c2b8501028f78d9733101a6136` |
| `src/main.ts` | `fa20b668735a5151b52fb4a79114f1133d8d9707f6e12d8f085c04708653c244` |
| `src/saved-returns-csv-ui.ts` | `e8f1a3fbb0cb94f1591257c607b4086fe8e673350efd44dd2d7e19bee5ce80c3` |
| `src/saved-returns-csv.ts` | `588e84d8c8b2df5781eaceb3e324a46d2ad13511e1ed4ac6e087f62c3936a9f0` |

The patch SHA256 is `9fac173760334dbec97a8fdea8dfe1137fae068a67c90e0ae7e71dc2606e3554`. It reproduced byte-for-byte on both native devices and passes a read-only applicability check against the exact PR24 snapshot.

## Actual player workflow

The [contract](contract.md) and [literal expectations](expected.json) were frozen before receiving. One initial seed creates three explicitly fictional saved returns in a fresh owned browser profile. Every subsequent Remove, Edit, Save, filter, Undo and CSV action uses the built app's real controls. Downloads are captured from Chrome's download event and saved without regeneration.

1. Tab A removes the target return. A separately opened Tab B uses **Edit details → Save** to change only an unrelated order number to `AFTER, "peer" 日本`. Its completed save preserves the removal and every other recorded field.
2. Tab A opens and fills a new-order draft, selects the expired filter, and uses **Undo removal**. The exact target is restored at its original position while the current Tab B correction and stable third record remain intact.
3. The real CSV includes all three saved returns. The restored target is hidden by the active expired filter, yet its exact ID, original creation timestamp, quoted Unicode store name, order number, total, date, window/source and deadline all appear in the download.
4. Tab A removes the target again. Only that tab's next saved-store read is made to throw a named receiving `SecurityError`. The CSV control explains the refusal, emits no download and performs no write. The unaffected second tab verifies the stored bytes; pending recovery, new-order draft and filter remain unchanged.
5. After releasing that one read refusal, the actual Undo control still restores the target. A second actual CSV download reproduces the exact first CSV. Both successful exports preserve both tabs' write counts and stored bytes, as well as the current draft, filter and recovery state.

The two actual files are [after-peer-edit-and-undo.csv](evidence/candidate-run-01/after-peer-edit-and-undo.csv) and [after-read-refusal-and-undo.csv](evidence/candidate-run-01/after-read-refusal-and-undo.csv). Each is **546 bytes**, SHA256 **`20d41020bdbd409d19661fcabbcf8bd268bceb6216ecc191586c112ffe7304be`**. Their header and every data cell are compared against literal expectations with independently parsed CSV rows. The target, peer and stable deadlines are respectively 2026-10-31, 2026-10-07 and 2026-10-20.

This qualification covers a completed second-tab save subsequently observed by Undo and CSV. Concurrent write arbitration, the separate day-refresh/lookup/month-view contributions and final integration into main remain within their existing owner scopes.

## Native results and exact artifacts

| Gate | Result |
| --- | --- |
| Original PR24 TypeScript + Vite build | Pass; source unchanged |
| Literal composition TypeScript + Vite build | Pass; source unchanged |
| Original actual browser control | 1 pass / 1 expected missing-CSV failure |
| Composed actual browser receiving | **18 pass / 0 fail**, completed normally |
| Source hashes before/after browser execution | Exact |
| Browser, loopback server and owned short profile cleanup | Completed |

The locked native toolchain is TypeScript 5.9.3, Vite 8.3.3, Vitest 5.0.3 and rolldown 1.2.12. The lock SHA256 remains `18224e47bde7a1bab3314d2b33b2ced399e4fd3a5e7e4763f9ed0c6b657c7a52`. The final browser is Chrome **154.0.8037.98**, Playwright **1.62.1**, Node **26.3.0**, macOS arm64. The same source had also built on Node22/Linux; all four artifacts of each build match the final Mac artifacts byte-for-byte.

See the exact [baseline receipt](evidence/baseline-run-01/receipt.json), [candidate receipt](evidence/candidate-run-01/receipt.json), process receipts, build receipts and unedited stdout/stderr alongside them. The final pair ran from 15:27:47.935 UTC to 15:27:54.408 UTC on 2026-10-08. The [successful export screenshot](evidence/candidate-run-01/undo-csv-complete.png) and [refused-read screenshot](evidence/candidate-run-01/csv-read-refusal.png) are captured from that actual app.

## Preserved receiving interruptions

The ThinkPad's first npm attempt rejected using `/dev/null` as both global and user config; distinct empty owned configs resolved that setup error. Both exact-source builds and the original absence control then completed. Its first candidate process hit the 90-second wrapper timeout without a final receipt or download. Its subsequent progress-only diagnostic attempt could not be recovered when the device connection stopped responding. Both candidate attempts remain **inconclusive**; no product failure or pass is inferred from them.

Root authorized the fresh Mac run after a peer verified workspace continuity against an existing retained artifact. The original two receiver bodies are retained unchanged. A narrow independent audit found possible receipt-liveness gaps, without identifying the interrupted attempt's stopping point. The portable successor uses a short owned temporary path, obtains the version from the actual launched browser, persists pre-cleanup state, bounds owned cleanup, and immediately observes both the click and download promises. The [exact portability diff](evidence/receiver-portability.patch) and [receiver freeze](evidence/receiver-freeze.json) preserve those changes. Native TypeScript AST correspondence confirms every one of the 19 assertion-call texts is identical to the original receiver.

Final driver SHA256: `2515748b748660a24d77eb4537f2666732af8cc713e277483dc91cef469e8606`. Contract SHA256: `4e8d9fa6356468a617287fbc175797c013ad154036a63e21cb609fb2c352c2f4`. Expected JSON SHA256: `e57c6a62bc2987d560c967601e3ff6f1b97a73604352a0e0b43a2b8507272cd9`.

## Receiving and adoption

For adoption, retain both original PRs' tests/documentation and apply the focused runtime patch on the exact PR24 receiving source, or reproduce its two literal main hooks and HTML insertion while integrating the existing contributions. Use the candidate hashes above for correspondence. This packet introduces no competing PR and updates no owner ref or deployed site.

To replay the dated receiving packet, prepare disposable `baseline` and `candidate` directories at PR24, apply the included patch only to `candidate`, and build both using the unchanged package lock. Keep this packet's contract, expected JSON and evidence manifests at the receiving root. The receiver validates all source and built-asset hashes before execution.

```sh
RETURNBY_PLAYWRIGHT_ROOT=/absolute/path/to/playwright \
RETURNBY_CHROME=/absolute/path/to/chrome \
RETURNBY_BROWSER_TMP_PREFIX=/tmp/rb49- \
node receive_composition_portable.mjs \
  --root /absolute/path/to/receiving \
  --variant candidate \
  --output /absolute/path/to/receiving/evidence/new-candidate-run
```

The output directory must be new. Use `--variant baseline` for the original missing-action control, whose expected process exit is 1. The frozen fixture deliberately requires the actual UTC day **2026-10-08** to give its expired-filter assertion a stable meaning; the receiver reports a failed precondition on another day rather than silently changing the dated evidence.
