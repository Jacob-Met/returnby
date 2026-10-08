# Independent ReturnBy removal-undo receiving

Accepted against the application source `e6877263ae20b2eb8ecd27cc2014badb7d4206d3`, on the receiving owner's PR 20 source `7829e56e57ef91dfe8edd5853fd68d6c7890fac0`. This is an exact candidate-source acceptance; later current-main composition and integration remain separate gates. No production source was edited by this receiver.

## Model and source review

`receive-model.mjs` executes the unchanged TypeScript model through Node 24.19.0's native type erasure. All five independently authored groups pass: captured records are detached from later mutations; 16 combinations of retained position and newer saved state preserve unrelated records and order; three ordinary/special string identities admit equal JSON regardless of object-key order; 12 consequential field differences and two duplicate-identity cases refuse; and a proposed restoration can be retried against a different saved world without losing newer changes. The model SHA-256 is `c5a885be25b70885e284d76635cb7e453ae1be2c04ce87ee38f22adfd69d9d75`.

The complete controller, main hooks, markup and styling were also read. The removal snapshot comes from the fresh, uniquely selected saved row and is remembered only after successful persistence. Undo rereads storage, keeps a pending recovery on refusal, and clears it after a successful restore or explicit dismissal. Successful confirmed Clear retires the recovery. No source finding remains open.

## Actual native browser receiving

The cloud browser was not launched because its shared temporary filesystem failed the capacity check. The same hash-admitted compiled application was received on the existing Mac runtime: Darwin arm64, Node 26.3.0 and **Chromium 151.0.7922.34**. This is a separate browser version from prior cloud Chromium 153 work.

`receive-browser.mjs` passes three actual browser groups using two fresh tabs sharing only their disposable local origin:

1. A removal succeeds, its first Undo write is refused, and the other tab uses the real Edit and new-order Save controls. Retrying Undo preserves both newer records, restores the original reviewed fields and creation time, and does not write again on a repeated invocation. Two actual calendar downloads preserve all reminder content apart from their actual generation timestamps.
2. A different writer restores structurally equal data with reordered object keys. Undo refreshes the tracker and finishes without a write; the exact stored bytes remain unchanged.
3. A changed same-ID record causes refusal without losing the pending snapshot. Once the conflict is removed, an explicit retry restores the original data.

There were no page errors or external requests. All four served runtime asset hashes and the borrowed Chromium executable hash were unchanged before and after the run. The native process exited 0, and its own browser, server and temporary profile were closed/removed. The original native receipt and both `.ics` downloads were transferred with size/hash admission; `receiving-integrity.json` records the comparisons.

The write refusal is an authored failure before native `Storage.setItem`, not a claim that the Mac exhausted storage. These checks preserve the state observed at each fresh read; the existing localStorage API does not provide an atomic transaction across tabs. This packet does not claim a deployment or adoption by the final current-main integrator.

## Reproduction

Use an exact source checkout and an already installed supported Node/browser runtime:

```bash
node receive-model.mjs /absolute/source/src/removal-undo.ts /tmp/model-receiving.json
node receive-browser.mjs /absolute/built/dist /tmp/browser-receiving /absolute/playwright/index.mjs /absolute/chromium
```

The browser carrier requires at least 96 MiB of available temporary space, uses a new local server and fresh browser context, and closes its resources after success or test failure. Its source hash, raw results, downloaded files and artifact manifest are retained here. The production author's broader keyboard, phone, clear, reload and loading-retry receiving is a separate packet.
