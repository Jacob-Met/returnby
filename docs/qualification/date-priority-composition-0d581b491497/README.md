# Month and reference corrections on current ReturnBy main

This narrow integration combines current main's explicit order-date and subtotal
behavior with the already received month-token and order-reference corrections.
Words such as `Octopus` no longer manufacture dates, and `Order notification` or
`Reorder ID` no longer manufacture or displace a genuine order reference. Valid
directly labeled order dates still take priority over nearby delivery dates.

## Exact inputs and change

The sole publication parent is current main
[`1883a078be5bbc1796818476ce3cb513e5ebf9db`](https://github.com/Jacob-Met/returnby/commit/1883a078be5bbc1796818476ce3cb513e5ebf9db),
tree `571c8b004c73e22438a050057278bfcc29d74dc1`. Only `src/parse.ts` changes among
its 54 files: the three existing month-token lines and one reference-label line.
All 53 other current-main files and modes remain exact, including the newly merged
checklist-link stylesheet and PR54 core tests. Original month/reference maintained
tests and bounded source receiving are additive.

The identical composed parser was first received against the month/reference source
[`af2e4f5f460f6880bdfb4b271fe93fd8a92558f6`](https://github.com/Jacob-Met/returnby/commit/af2e4f5f460f6880bdfb4b271fe93fd8a92558f6),
tree `8ba196c07305c5c529cc7d2b4043e60c56d274d3`, by inserting the existing five-line
date-priority span from [PR54](https://github.com/Jacob-Met/returnby/pull/54), exact
head `8df144cd393fd66a99f46683c54b55c97665d6e8`. During receiving, PR54 and the
checklist-link improvement merged. Publishing this same parser on current main
avoids importing the larger backup/completion UI stack from af2e4f5. The complete
main core-test file remains PR54 blob `41ca82a8942dc111fa51a04396a16bcfaffa85c1`.

The inserted span selects only already-valid `findDates` hits immediately following
the existing case-insensitive `Order date` label, with its existing whitespace and
optional-colon syntax. It chooses the first such valid occurrence in original text
order. If none exists, the prior nearby-order and chronological fallbacks remain.
The main publication keeps that entire date-priority function unchanged. Merchant,
total and found-field source is also unchanged, as are deadline, policy, storage,
UI, dependency and workflow files. `production.diff` retains the five-line
composition view; `current-main.diff` records the actual four-line main delta.

Qualified parser: 3,403 bytes, SHA-256
`6fdc382d9d3172d71cf66fd86e1597ff38c28c31b6977bbad5e0c096d9ecb55a`,
Git blob `84083e2dcc39b724ca6210ed40792406eb276d00`.

## Executed source receiving

These are distinct actual Node v24.19.0 courses on fictional receipt text:

| Course | Prior combined source | This composition |
|---|---:|---:|
| Author complete-record and existing `dueDate` seam | 7/22; 15 wrong date/deadline results | 22/22 |
| Independently frozen complete records, found flags and UTF-16 date offsets | 13/28; 15 wrong date selections | 28/28 |

The current-main original is a separate baseline with the explicit-date fix
already present. Actual receiving on its exact parser preserves these remaining
defects:

| Unchanged inherited receiver | Current-main original | Same composed parser |
|---|---:|---:|
| Order references | 27/45; 18 failures | 45/45 |
| Complete combined records | 3/20; 17 failures | 20/20 |
| Independent month tokens | 57/106; 49 failures | 106/106 |

The independent oracle was frozen before candidate or donor-test exposure. All 56
original/candidate date-hit arrays match its authored expectations. Its original
failures and candidate results remain unchanged under `peer/`; author raw results
and inherited rerun results are under `author/`. The five-line production diff was
independently accepted; removing it restores every prior parser byte.

The separately delivered 348-test/build/eight-browser-case qualification remains
bound to **af2e4f5**, and the main owner's 74-test/build/five-browser-check course
remains bound to **1883a078**. Neither result is promoted to this source. Full
maintained Vitest, TypeScript/Vite, browser and installed-app receiving have **not
run on this composition**. The original maintained tests are source inputs here,
not a claim they executed in Vitest on this exact current-main integration.

## Replay this composition

Use an existing Node build with TypeScript type stripping; the recorded runtime
was Node v24.19.0. These commands require no package installation. From the
repository root:

```sh
node tests/date-priority-composition.native.mjs
node tests/order-number-labels.native.mjs
node docs/qualification/date-priority-composition-0d581b491497/inherited/receive_combined_parser.mjs src/parse.ts
```

For the unchanged independent date-priority receiver, choose a new absent output
directory and run:

```sh
python3 -B docs/qualification/date-priority-composition-0d581b491497/peer/receive.py --source src/parse.ts --expected-sha256 6fdc382d9d3172d71cf66fd86e1597ff38c28c31b6977bbad5e0c096d9ecb55a --oracle docs/qualification/date-priority-composition-0d581b491497/peer/oracle.json --out /absolute/new-date-priority-receiving
```

The receiver copies exact source to `.mts` and uses Node's existing type stripping;
it does not transpile the product. A Node build without that support is an unmet
runtime prerequisite. Historical receipts keep the actual paths they executed.
`peer/README.md` explains the original arm and explicit `--node` selection.

## Integration boundary

This is a separate source branch based on the exact received main. Existing
#8/#10/#20 full-stack owners and the current-main receiving team retain adoption.
The prior combined preview and its native workspace are unchanged. The source
offer provides a normal reviewable PR; no main merge or installed-copy change is
claimed. A receiving owner can run the maintained suite/build and browser flow on
this exact composition, preserving both original negative courses. No Pages
operation or workflow setting is changed. The source/PR publication uses the
inspected skip route for the existing push/pull-request workflows and must retain
Jacob's no-new-Actions constraint.
