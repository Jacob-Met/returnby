# Date-only calendar end correction

Contributor: `estate-kestrel-2ff081f4`. Source-only handoff reserved in ReturnBy #8, comment6067693110. The #8/#10 integrator retains stack adoption; PR19 retains the batch-calendar implementation. No existing owner branch, saved data, account, native lease or deployment is changed.

## Correction and source

The sole production change replaces host-local DTEND arithmetic with UTC calendar arithmetic and UTC getters. DTSTART and DTEND remain DATE values with no timezone or time suffix. RFC5545 sections3.2.19,3.3.4 and3.6.1 define DATE formatting and the non-inclusive event end: https://www.rfc-editor.org/rfc/rfc5545.html . This is a calendar-serialization correction, not retailer policy advice or a change to the order's saved deadline.

Exact main parent: `1e662c387be5f66f8499fac7ec443f58d2198379`; complete base tree: `503ea217dc35f54aa7c9dbd1f92217544ad6dbc9`. Original ICS Git blob: `2b2b540cf58bab78b2aba84a70d748b6f9cd82b4` (1844 bytes). Corrected blob: `adad5866906baf91f85e4b5ed839ab68341ca2b5` (1933 bytes), SHA256 `8419ccbc34ffd142e3ef518f33cc81a5e47baa50eaf7fbcc055218cf389e011c`.

The unchanged deadline module was independently matched to Git blob `bcef920c0f9846b789b1a0aa01b833c7d99ba5d4` (837 bytes). Parser, policy, storage/admission, UI, dependencies, workflows and existing tests are outside this change. Unsupported input and year-overflow behavior is not widened or newly qualified.

## Retained negative evidence

The same frozen native receiver was run before and after the correction, on Node22.16.0 with TypeScript5.8.3 compilation. It uses fresh processes for eight named timezones and a separate integer Gregorian-calendar oracle that never constructs Date objects.

| Runtime zone | Reviewed due | Original DTEND | Expected and corrected DTEND |
| --- | --- | --- | --- |
| Pacific/Apia | 2011-12-29 | 20111231 | 20111230 |
| Pacific/Kwajalein | 1993-08-20 | 19930822 | 19930821 |
| Pacific/Kiritimati | 1994-12-30 | 19950101 | 19941231 |

Each defect is also reached using the unchanged production `dueDate(previousDate,1)` before `buildIcs`, not only by constructing a serializer input. The existing local deadline arithmetic itself is not changed or claimed timezone-independent.

Main original:157/160 date-boundary cases and21/24 production-call-chain cases pass; three fail in each group. Corrected:160/160 and24/24 pass. All1440 additional modern reminder cases keep their exact per-zone output digest. Each originally passing boundary retains its complete output digest. Tests cover leap/century rules, year rollover, ordinary daylight-saving boundaries, long Unicode/folding, existing UID and alarm, and admitted four-digit edge dates.

Frozen receiver SHA256: `1c7346449d46ce19ad9777a013f62c23ea7623313cc0f857ce64087637b7fc98`. The new Vitest file has eight timezone tests, each checking20 complete calendar byte strings. Full repository Vitest/Vite qualification is pending hosted CI at publication; native source compilation and the separate Node receiver are not mislabeled as a full application build or browser test.

## Existing batch-stack composition

PR19 input: `e64fd96ffda52ec571779edfeec609f7b01c3c9f`; its original ICS blob is `58c873a116ed6b265864cb3e7d5b0dd27fd81544` (2263 bytes). Applying only the same two-line correction/comment inside `eventLines` yields blob `c717408a5b5538baf2b8803491ecc7b233bfa0f9` (2352 bytes), SHA256 `d7f6582afd57894584fb0a85538cf091f07274712343880ec957cc17ea53793a`.

That exact source-only composition was compiled and passed the same160/160 plus24/24 checks. Its single-event results match the corrected main source completely; its original results match the failing main source. A supplemental native batch receiver checked four-event calendars in all eight zones: every event is byte-identical to its corresponding single export, only corrected DTEND lines can differ from original batch output, and the empty calendar remains byte-identical. This does not qualify the full PR19/PR20 UI or adopt their stack. Do not replace their whole ICS module with main's single-event module; carry only the two-line arithmetic delta and comment.

## Reproduce

With the project's declared dependencies installed, `npm test` includes the new native Vitest cases. For the frozen before/after diagnostic, use each exact source checkout and an isolated CommonJS output directory:

```sh
OUT="$(mktemp -d)"
printf '{"type":"commonjs"}\n' > "$OUT/package.json"
npx tsc --target ES2022 --module commonjs --lib ES2022,DOM --strict --skipLibCheck --outDir "$OUT" src/ics.ts src/deadline.ts
node tools/check_calendar_civil_end.cjs "$OUT" > calendar-civil-end.json
```

The diagnostic deliberately records failing cases as JSON rather than treating its process exit as an acceptance verdict. Read `boundary_summary.failed` and `native_call_chain_summary.failed`; both must be zero on the candidate. The maintained Vitest cases are the ordinary failing CI gate. No calendar-client import, actual-browser behavior, public deployment, independent human acceptance or observed customer benefit is claimed by the local receipt.
