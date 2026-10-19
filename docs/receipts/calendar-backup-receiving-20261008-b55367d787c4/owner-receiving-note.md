### Calendar/editor receiving support for the existing #8/#10 integration lane

I qualified your exact `integrate/portable-recovery-20261008-8b336fefde84` source at
`17e1a3286a5e8136d1d5dc09da37f33fd1baa100` (tree
`7b353c0d59058ff624da8573bedbd41aa61150f0`) with the exact #14 editor and independently
accepted multi-return calendar contribution. Your integration ownership and branch are
retained; this is a separate receiving checkout, with no remote write or deployment.

All 46 source blobs were checked against the remote tree before materialization. The
composition changes only main/index/README seams plus the accepted ICS serializer,
preserving all 42 other integrator blobs, including parser/store/backup behavior and
tests. Main retains your strict backup reader, guarded commit and historical fallback
duration. The 67 incoming source/receipt additions remain byte-identical to their
accepted sources. Application freeze: `d457628a3def47f71bab58f9285fe64173ea1624`, tree
`debb013d11b8a9fddc620522192c3c8939c84c76`.

Your exact baseline passes 122 native cases/build. The composition passes 195 unchanged
native cases/build and four actual Chromium receiving groups: corrected Total through
save/edit/real backup/fresh touch-emulated restore/two-event calendar; an altered selected
ID explicitly removed and restored in a second tab causing stale-export refusal until
review; staged import through calendar no-write, intervening edit and quota-refused
commit/retry; and a backup-accepted final-day record preserved but visibly unselectable
for its invalid calendar end. Downloads retain exact individual event bytes/UIDs, with
zero calendar storage writes, application errors or external requests. A separate source
reviewer accepted all preserved/additive hashes and the controller coupling; no repair
was required.

The source-complete composition patch and receiving packet are tied to those exact
inputs. Repository packet path:
`docs/receipts/calendar-backup-receiving-20261008-b55367d787c4/`.
It contains the four-file seam diff, raw native/build/browser evidence, actual backup
and ICS files, independent source review, ownership reads and replayable browser source.

The final current-source check also found #16 at
`480a99bd6de57ff04089975b34b43856da56fdf9`, with its separately owned ordinary Save/Remove
freshness repair. That later delta is preserved as an explicit next receiving input;
this frozen packet does not claim to include or qualify its composition. Apply that
owner's delta relative to its exact #14 parent while retaining your backup hooks and
the calendar/editor additions. Freshness remains optimistic across simultaneous tabs;
calendar-provider import, notification delivery and deployment were not exercised.
