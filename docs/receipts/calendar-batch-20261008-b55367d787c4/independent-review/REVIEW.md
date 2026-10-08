# Independent ReturnBy calendar receiving review

Reviewer: `estate-b55367d787c4 / engine`, distinct from the implementation owner.

## Verdict

Accept this bounded contribution. Source inspection and seven independently authored
receiving groups found no blocking defect. The production checkout remained clean,
and all nine implementation file hashes matched the frozen source after execution.
No product source, dependency cache, or authored acceptance test was modified.

The reviewed implementation is `1973a2230a8292fd487a87f9fdde02dba068649d`, tree
`cc2674728fff2781cd3d6c8e5902f38dc4197c64`, over composed receiving baseline
`0ee7edf58e958e00d21c70b3ef56e5dadcfdc15d`. The evidence-only head observed was
`0e0b5e411b3c3c588254cab6978dbb6110c3d90b`. `provenance.json` records exact source,
commands, executable and output hashes; `artifact-hashes.json` binds this packet.

## Independent native model receiving

Four groups execute the exact calendar model, deadline and serializer TypeScript
source through the installed TypeScript 5.9.3 compiler and Node 24.19.0. The small
receiver uses standard transpilation and its own module loader; it does not substitute
a calendar implementation. Results and exact source hashes are in `model-review.json`.

1. Six distinct delimiter/Unicode identities survive independent TEXT decoding,
   without merging identities or creating content lines. CRLF/calendar-looking titles
   remain literal text, UTF-8 decodes without replacement, every physical line fits
   the 75-byte bound, and reversed input/selection order produces identical bytes.
   Frozen input records remain unchanged, and each event retains its existing alarm.
2. A selected identity becoming ambiguous is refused. An unrelated duplicated identity
   cannot replace a selected event. A duplicated reviewed identity is refused. Changes
   only to non-exported metadata preserve exact selected calendar bytes.
3. Twenty-eight date cases cover Gregorian leap and non-leap centuries, daylight-saving
   boundaries, year rollover, year 1000 and the final supported deadline. UTC,
   America/Los_Angeles, Pacific/Kiritimati and Asia/Kathmandu produce the expected
   all-day start/end dates and day counts.
4. A 260-record backslash-heavy fixture remains below the inexpensive size lower bound
   but exceeds 4 MiB after escaping/folding. The exact-byte guard refuses it. Selecting
   one of those same records succeeds, establishing that the refusal follows the
   selected output size rather than merely the presence of a long saved field.

## Independent actual-browser receiving

Three groups execute the author's exact, hash-verified production build in Chromium
153.0.8010.0 with fresh isolated profiles, fictional orders and loopback-only requests.
The browser opens the real dialog, operates its native buttons/checkboxes and receives
actual downloaded files. `browser-review.json` records the build hashes and results.

1. A storage read failure during explicit reload preserves the visible selected choice
   while disabling stale controls and focusing the error. After storage recovers,
   explicit reload retains only the selected identity, previews its edited deadline,
   and leaves newly added returns unselected.
2. An injected object-URL allocation failure keeps the dialog and reviewed selection,
   reports the failure and produces no file. A duplicate of that selected identity
   arriving before retry is then refused by the fresh read, before another download
   allocation attempt. Reload exposes both duplicates as disabled; removing the
   ambiguity does not silently restore selection. An explicit new choice downloads
   exactly one event with its current date/title and existing UID, closes the dialog,
   returns focus to the opener, and leaves saved storage bytes unchanged. The actual
   recovered file is `browser-recovered-reminder.ics`.
3. A 390 px context with `isMobile: true` and `hasTouch: true` uses native emulated
   touch activation to open the visible review heading, clear/select a return and
   receive the correct one-event browser download. This is browser touch emulation;
   no physical phone was used.

The observed application storage-write count is zero. There are no page errors or
external requests. The distinct original author's 117-test suite and broader browser
suite were inspected, not rerun or claimed as independent execution here.

## Scope and replay

This review covers local source/model/UI and file preparation. It does not claim
integration, deployment, real calendar-provider import, automatic synchronization or
scheduled notification delivery. The implementation explicitly asks the user to
review/download and documents that receiving calendar software controls duplicate or
update behavior. Its pre-download storage reread is not an atomic cross-tab transaction.
The source preserves the inherited deadline and single-event serialization semantics.

From this packet directory, with the indicated read-only source/build/runtime present:

```sh
node model-review.mjs
node browser-review.mjs
```

`RETURNBY_SOURCE` can point both receivers at the frozen ReturnBy checkout, and
`RETURNBY_BROWSER_RUNTIME` can point the browser receiver at the installed Chromium/
Playwright directory. The receiver checks every final build-file hash before launch.
No account, production orders or external service is required. The two raw logs retain
all seven passing groups; there was no failed test run or product repair in this review.
