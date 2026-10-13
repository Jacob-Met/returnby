# Received Mac installer V2

This reviewed successor creates a new ReturnBy installation from the exact original
received ZIP plus the adjacent, pinned repaired foreground runtime. It preserves
the ten application assets, original archive and original runtime. It does not
upgrade a V1 destination or migrate browser storage.

## Source and ownership

The application identity remains commit `83abbe9a00a5169354df25c734c00340ae73ae43`,
tree `cfd56ce9960f08c4f5983d5a7a3ca054373f34c8`. The original PR52 installer and
its author ref remain unchanged. This source is a child of root's reviewed
[runtime commit 1b12282](https://github.com/Jacob-Met/returnby/commit/1b12282de73e50a8f699c9ed03840a81ddd3d17f),
which preserves parent `8229ca3738a23de11b2d45cd216e64dbe676c03c` and the original
PR52 ancestry. Root owns runtime/native Mac receiving; Forge owns this bounded
installer, maintained installer tests and installer guide. Existing application
owners retain wider source composition and hosted adoption.

The installer hash is `a8190f86a0534348e1453aaabc661b1dca5788c64a1ba71fb73942bd0a0173d3`
(12,933 bytes). The adjacent runtime hash is
`d2bbfaa4440d639bf20e37bc9b0fc3e20d01c643609f1af11d49a57b27e37ac2` (5,744 bytes).
The archive remains `816e8d09fbecc27ffeb189aa3c889e48e5bc81f352ccc5b75f5cb9bd64badd71`
(260,719 bytes). Its original runtime hash remains
`7fa92cf4a00072c714e7367feb09fb7f7e2eaa39cf62c9bbef180b303b6191a2`.

## Install, verify and recover

Follow [the maintained opening guide](../../../tools/received_preview/README.md).
Keep `install_macos.py` beside its exact replacement `serve_returnby.py`; use
Python 3.12 or later on the intended Mac and an absent destination. Both input
files are verified before destination creation. Missing, changed, linked,
nonregular, truncated or oversized runtime input refuses without creating that
destination. After correcting the source input, the caller may explicitly repeat.

V2 keeps original runtime bytes at `recovery/original-serve_returnby.py`; the
installed and recovery `serve_returnby.py` copies both use the admitted replacement
bytes. The retained installer therefore has its own adjacent runtime and original
archive for a new installation. V2 self-check binds these roles separately and
refuses V1 receipts; the original V1 checker remains with its original copy.

The payloads and receipt precede the executable launcher. An output failure may
leave a partial destination: inspect and retain it, then choose another new
destination. There is no automatic cleanup, in-place repair or overwrite.

On macOS, reopening can wait up to 60 seconds for a released address. Keep the
terminal open until its URLs appear, or use Ctrl+C to cancel. An active or uncertain
endpoint refuses; a timeout is also a refusal. The runtime never selects another
origin or replaces an incumbent.

## Native author controls and independent review

[final-installer-receipt.json](native/final-installer-receipt.json) records actual
ThinkPad Linux/Python 3.14.4 execution, parent PID 3245082:

- Maintained installer tests: 17/17 normal and 17/17 optimized, children 3245158
  and 3245275.
- Root's exact generalized foreground receiver: 4/4 normal and 4/4 with optimized
  runtime children, PIDs 3245311 and 3245343. It covers three launches per Enter/EOF
  course, second-live-copy refusal, and loopback/wildcard incumbents with address
  reuse off and on.
- Five incoming source/test/doc files and all fourteen original received files
  remained byte/mode identical through the course; the original archive hash
  remained exact.

Only the installer platform precondition is simulated on Linux. Actual shell,
HTTP and runtime execution belong to Linux. In the installer optimized course,
the imported installer and retained checker subprocess receive optimization; the
production launcher deliberately keeps its normal recorded Python `-B` command.
The separate foreground course propagates `-O` into the runtime children.

The generalized runtime test is copied under the descriptive name
`test_foreground_restarts.py` inside the retained native packet. Its bytes exactly
match the maintained `tests/received_preview/test_linux_server_restart.py` at the
runtime parent; it is not a second maintained implementation.

[Independent final source review](independent/final-source-review.json) accepts
the complete V2 protocol, tests and corrected guide. It independently reads the
author receipt but makes no reviewer execution or Mac installation claim.

## Preserved findings

The first installer-only draft used the later-rejected runtime `387eed...`.
Its ten successful custody/recovery checks and conditional source review remain
historical; neither is runtime or Mac acceptance.

The first safe-runtime course passed 17 normal tests, then 16 optimized tests
with one receiver-fixture error: its own incumbent bind encountered TIME_WAIT
before launching the product. The original receipt and exact source packet remain
under `native/safe-*`. The final fixture explicitly admits released addresses on
Linux and waits under non-reuse binding on macOS; the product refusal assertions
remain. The receiver also closes its expected HTTP404 response.

After final execution, independent review found two guide-only characters: a
doubled continuation slash and an escaped apostrophe. They were corrected in
README without product/test changes.
[The separate guide receipt](native/final-guide-receipt.json) preserves old/new
hashes, proves every other source remained unchanged and checks both recovery
commands into their exact six arguments. The earlier native receipt honestly
retains its earlier README hash.

These bounded source/Linux results do not establish a newly installed Mac V2
copy. Root records native Mac installation, actual launcher reopening and retained
recovery separately. Original application receiving and the first rejected
Darwin reuse candidate remain in their existing records.

## Repeat focused controls

With the exact original archive available, run from this source checkout:

```sh
RETURNBY_RECEIVED_ARCHIVE=/path/to/received-returnby-83abbe9a.zip \
  python3 -B tests/received_preview/test_install_macos.py
RETURNBY_RECEIVED_ARCHIVE=/path/to/received-returnby-83abbe9a.zip \
  python3 -B -O tests/received_preview/test_install_macos.py
```

Use an owned writable TMPDIR if the shared temporary filesystem is full. These
tests launch a local foreground copy at port 8769; ensure that origin is free.
Root's runtime guide documents the separately scoped private-port receiver.

The exact historical/native input packets, runners and receipts are retained
together. To replay a packet runner, use a fresh owned directory containing the
matching input JSON, runner, exact archive named `received-returnby-83abbe9a.zip`
and a writable `tmp/`; runners use exclusive source/output directories. Do not
point them at an existing installation.
