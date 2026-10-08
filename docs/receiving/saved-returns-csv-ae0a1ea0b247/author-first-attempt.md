# First native author attempt

The first `node --test tools/receive-saved-csv.mjs` run executed the real TypeScript exporter and unchanged backup/deadline dependencies: 8 of 9 groups passed, one test assertion failed, with no skips. The scoped strict TypeScript compiler check passed.

The failed group, `keeps optional saved text empty and numeric-looking order numbers exact in file bytes`, incorrectly assumed source-array order for equal deadlines. Its input IDs were `RETURN-A` and `B`, so the specified deterministic ID ordering correctly emitted `B` first. The test expected the empty optional fields at positional row 1 and instead saw `00000000000001234567890` and `0.00`. This was a receiver expectation error, not a product serialization defect.

The correction identifies the two decoded rows by saved ID before checking their values. Product code remains unchanged. This note preserves the first tool-result finding; it is a structured summary, not an independently retained raw process log.
