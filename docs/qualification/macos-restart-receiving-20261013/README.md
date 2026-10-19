# ReturnBy: bounded Mac foreground reopening

## Usable result

The directly consumed server now keeps macOS non-reuse binding and waits up to 60 seconds for an unavailable, explicitly refusing loopback address to become available. It still binds only 127.0.0.1:8769, never chooses another port, and never changes another listener. A reachable endpoint, uncertain probe outcome, or other bind error refuses startup. Ctrl+C cancels the wait cleanly. Linux retains its existing released-address reuse behavior.

This is a server-source increment. The original archive and installed original Mac copy remain unchanged. The separate V2 installer receiving step will pin this server in a new versioned destination; this runtime record does not claim that receiving has already occurred.

Accepted server: 5,744 bytes, SHA256 d2bbfaa4440d639bf20e37bc9b0fc3e20d01c643609f1af11d49a57b27e37ac2.
Maintained lifecycle test: 6,328 bytes, SHA256 b395f99e7e428b475ab702c710c6f2081db2f4f435ab0c0b246ba88b3d491220.

## Actual native Mac result

Mac.lan, macOS arm64, user me UID501, /usr/local/bin/python3 3.13.7. Supervisor PID43980 and normal/optimized test children43993/43995 all exited0. Each child passed four methods: three successive HTTP/Enter launches, three HTTP/EOF launches, refusal of a second live copy, and four incumbent host/reuse combinations. The optimized parent passes -O into every server child.

The eight actual warm reopenings took 30.101–31.115 seconds. Fresh launches served the exact tracker in 0.055–0.120 seconds. Every successful request compared the complete HTTP body against the admitted index. Active-copy refusal left the first copy serving. Both exact-loopback and wildcard incumbents, with address reuse off/on, retained a verified byte exchange after the attempted start. All clients used private ephemeral loopback test ports; the actual installed foreground origin was not displaced.

The native test gives only startup readiness a 65-second budget. Incumbent refusal and shutdown retain five-second bounds. A Darwin incumbent test explicitly drains the new zero-byte probe before its own byte exchange. These are owned disposable test listeners, not probes of unrelated services.

The original installed server separately released its test address for a non-reuse bind after 30.351 seconds following a complete 10,454-byte HTTP response and Enter shutdown. That measurement motivated the bounded wait; it is not a promise about every Mac or socket state. The 60-second deadline is independently exercised with a controlled clock, not established by waiting through an actual full-duration native timeout.

Native receipts and executed supervisors are retained here. Source and test hashes stayed unchanged through execution.

## Why the smaller first fix was rejected

The original archive server (7fa92cf4…6191a2) and published Linux repair [8229ca37](https://github.com/Jacob-Met/returnby/commit/8229ca3738a23de11b2d45cd216e64dbe676c03c) preserve their separate provenance. This increment builds on the Linux repair.

The first local proposal simply enabled address reuse on Darwin. Expanded native controls found it could start alongside a wildcard listener on this Mac. The exact rejected source, expanded test, failed receipt and supervisor are preserved under rejected-candidate/. An original-server comparison passed those same incumbent controls. The rejected source was never installed into either existing application folder and is not the runtime shipped by this change.

An earlier four-method course omitted wildcard owners and did not propagate -O into server children. Its initial result was insufficient. The expanded failure and current final course retain that distinction; no optimized-runtime claim derives from the earlier parent-only run.

The accepted implementation leaves Darwin address reuse disabled on every construction. After EADDRINUSE, a bounded connection attempt decides whether waiting is useful. Only explicit ConnectionRefusedError permits another attempt. The probe is not treated as a lock: every later bind still uses the kernel's non-reuse behavior. Each failed HTTPServer construction closes its own socket through the existing Python TCPServer constructor lifecycle.

## Independent policy review

Anvil independently read the complete source diff against published8229ca37; asset admission and the HTTP handler are AST-identical. Its public-main witness ran the exact frozen source in normal and actually optimized Python3.12.14, passing15 courses per run. It opened no sockets and substituted explicit clock/server/thread boundaries. It complements the native kernel and wall-clock observations.

Courses cover the single deadline, remaining-budget cap, prompt refusal for reachable/uncertain endpoints, different bind errors, an incumbent appearing between attempts while reuse stays disabled, Ctrl+C, no socket operations after bad arguments/assets, platform policy, and successful cleanup. See independent/returnby-runtime-independent-review-v2.md and the full runner/receipts. Native receiving and simulated policy controls have separate attribution.

## Reproduce the focused source consumer

Use Python3.12+ and an extracted original received build with ASSETS.json and app/. This test stages those exact assets in new temporary directories.

```sh
RETURNBY_RECEIVED_DIRECTORY=/path/to/received-build \
  python3 tests/received_preview/test_linux_server_restart.py
RETURNBY_RECEIVED_DIRECTORY=/path/to/received-build \
  python3 -O tests/received_preview/test_linux_server_restart.py
```

The test supports Linux and macOS. RETURNBY_SERVER_SOURCE may select an exact comparison source. The historical native supervisors under this record contain the actual owner's exclusive receiving paths; do not run them blindly from an evidence download.

The fixed-origin launcher still prints the tracker and trip-checklist URLs after successful binding. A warm Mac startup can print a single waiting message before those URLs. Wait for the URLs before opening the browser. Press Enter or reach EOF after startup to close the server; Ctrl+C also cancels startup waiting.

## Boundaries

The ten application assets, manifest admission, URL routing and original application source83abbe9a are unchanged. This receiving does not repeat the complete application feature campaign, operate the original historical installation, migrate browser storage, update a hosted app, or claim other operating systems. The original Mac installed copy /Users/me/Applications/ReturnBy-Completion-d3745-83abbe9a is preserved for comparison. New installer adoption and actual new .command/browser receiving are recorded separately.

The original application/server authors and installation/runtime owners retain their scopes. This is a narrow independently reviewed correction discovered while carrying their original received build into actual Mac use.
