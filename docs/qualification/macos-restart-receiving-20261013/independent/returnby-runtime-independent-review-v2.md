# ReturnBy foreground runtime: independent review

## Decision and exact scope

The frozen runtime is accepted by independent source review and by 15 public-`main()` policy courses in both normal and optimized Python. Native Mac restart timing, operating-system exclusion, and the final V2 installation remain separately qualified by the owner's native controls. This review opens no sockets, starts no real worker thread, and runs no Mac process.

- Reviewed source: `serve_returnby.py`, 5,744 bytes.
- SHA-256: `d2bbfaa4440d639bf20e37bc9b0fc3e20d01c643609f1af11d49a57b27e37ac2`.
- Source was frozen and unpublished at this review. A later publication binding must identify this exact content.
- Published Linux comparison: `Jacob-Met/ReturnBy` commit `8229ca3738a23de11b2d45cd216e64dbe676c03c`, source SHA-256 `8e5c20f3fa0517171b990683fd9b3c393cdb62f3ab5d66af076a88f48a9d6499`.

The complete source diff was read. Asset admission and the HTTP handler are AST-identical to that published Linux version. The fixed loopback origin, explicit disabled port sharing, immutable admitted asset bytes, and successful-server shutdown lifecycle are retained. Linux retains address reuse; Darwin retains non-reuse binding.

## Why the earlier candidate was rejected

The first Darwin reuse candidate, SHA-256 `387eedac9dd5fc671d7919068566738f8ea152486180f97c479acdffd13f084b`, passed the initial restart and exact-loopback cases. Independent review identified two missing controls: child optimization propagation and a wildcard incumbent.

The expanded native receipt then recorded the same two wildcard failures in normal and genuinely optimized children: the candidate exited successfully alongside an existing `0.0.0.0` listener with address reuse either off or on. That source and its failed `expanded-restart-receipt.json` remain separate historical evidence. The expanded test is 5,830 bytes, SHA-256 `ceb8d01234e42a35437db5e4f2bf12b48a02561ea33f021638370ebd29ea8bd1`.

The accepted policy preserves non-reuse on every Darwin bind. Only an `EADDRINUSE` bind failure followed by an explicitly refused connection to the exact loopback endpoint permits a retry. A reachable listener, timeout, uncertain socket error, or other bind error stops startup. The probe determines whether waiting is useful; each subsequent bind still relies on kernel exclusion. No different port is selected and no other process is changed.

One monotonic 60-second budget bounds the retry loop. Probes and sleeps are each capped at 0.25 seconds and at the remaining budget. The wait announcement appears once; Ctrl-C cancels startup cleanly. This is bounded waiting, not immediate reopening. The owner's separately read native measurement of the unchanged original server found the private test port available for non-reuse bind after 30.351 seconds following a complete 10,454-byte HTTP response and Enter shutdown. That measurement does not establish a universal TIME_WAIT duration.

## Independent executed policy witness

`receive-returnby-startup-policy.py` executes the exact frozen `main()` with explicit socket, server-constructor, clock, worker, and asset-admission boundaries. It tests policy decisions, not kernel behavior. No fake socket-close result is presented as an operating-system observation.

The 15 courses cover fresh Darwin start and cleanup; two explicit refusals followed by success; reachable-incumbent refusal and probe closure; timeout and uncertain-error refusal; non-address bind failure; repeated refusals ending at the single deadline; remaining-budget probe capping; a newly appearing incumbent between attempts while all binds remain non-reuse; startup cancellation; existing Linux and other-platform refusal behavior; invalid assets and arguments before socket activity; and fresh Linux cleanup.

Both cloud Python 3.12.14 runs passed all 15 courses. The optimized run actually executed the source with `sys.flags.optimize == 1`; the witness uses explicit checks that remain active under optimization. The complete course results are identical across both runs. Source bytes were checked before and after each run and remained unchanged.

Replay against this exact source in a new output path:

```sh
python -B receive-returnby-startup-policy.py \
  --source /path/to/exact/serve_returnby.py \
  --output /new/path/policy-normal.json
python -B -O receive-returnby-startup-policy.py \
  --source /path/to/exact/serve_returnby.py \
  --output /new/path/policy-optimized.json
```

The runner refuses a different source hash and refuses to overwrite an output receipt.

| Evidence file | Bytes | SHA-256 |
| --- | ---: | --- |
| `receive-returnby-startup-policy.py` | 11,322 | `3e768daa63f0437eb105e55fbbbf267b64fa2f6556867663597242337195ea43` |
| `returnby-startup-policy-normal-receipt.json` | 21,866 | `cbf499cda3c85705e9cad7f2bd34d257450c56fdec236fa2f7fd7d1184834241` |
| `returnby-startup-policy-optimized-receipt.json` | 21,866 | `4c3520b11516925f2fb6134f5b99cb1130073d15a7675741da605ebdd89db971` |

## Native evidence and source references

The original installed application and its 19 retained files were read only. Its installation receipt passed admission of all ten assets. Its launcher receipt retains three successful courses followed by a Chrome screenshot timeout; its separate checklist receipt retains 14 matching checks followed by the actual immediate-reopen `Errno 48` failure. Both overall failures remain honestly labeled. The two original 390-pixel screenshots were visually reviewed and agree with the empty checklist and tracker-backlink observations. None of this is relabeled as V2 installation acceptance.

- [Apple socket-option manual](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/setsockopt.2.html): distinguishes address reuse from duplicate address/port bindings; archival documentation alone does not qualify the current Mac.
- [Apple XNU bind implementation](https://github.com/apple-oss-distributions/xnu/blob/main/bsd/netinet/in_pcb.c): option-dependent wildcard matching motivated the additional native control. The current source tree was not assumed to be the exact installed kernel.
- [CPython 3.13.7 socket-server lifecycle](https://github.com/python/cpython/blob/v3.13.7/Lib/socketserver.py): `TCPServer.__init__` closes its socket when bind or activation raises, before reraising. The retry constructs a new server on each attempt.
- [Python 3.13 socket documentation](https://docs.python.org/3.13/library/socket.html): platform-dependent socket semantics and bounded timeout interface.

The earlier `returnby-runtime-review-v1.json` and conditional installer protocol review remain immutable. Final V2 runtime pinning, installer execution, native restart/listener controls, and publication must refer to their own final evidence.
