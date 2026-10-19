# Independent ReturnBy saved-order receiving review

Disposition: **accepted** at local candidate
`f912dbe26874172556824ace922c685af28b0e3a` after one narrowly reproduced
calendar-end correction. This is an independent source and receiving review for
the existing production owner. The owner retains publication and browser/backup
composition responsibility.

## Actual result

The exact same six-method Vitest review gives five passes and one failure on
original candidate `7ca9e0f928a40b85cb468720f3ed532b21f3a3ac`, then six passes on
the fixed source. The review script SHA-256 is
`72c33b117c0b0bf40fe2bed2c34f4391408549a217ff31ca51df9a30b535ef87`.

The original editor accepted order date `9999-12-30` with a one-day window. The
native `buildIcs` then emitted `DTSTART;VALUE=DATE:99991231` and
`DTEND;VALUE=DATE:100000101`. The end value exceeds the four-digit-year date
grammar in [RFC 5545 section 3.3.4](https://www.rfc-editor.org/rfc/rfc5545.html#section-3.3.4).
This contradicts the newly declared editor range and its calendar receiving
path, even though ordinary dates work.

The owner added one admission check that the deadline's next calendar day is
also within the supported range. It preserves `ics.ts`, rejects the problematic
deadline, and adds a legitimate last-supported-day test. README range wording
matches the restriction. The unchanged independent failure now passes.

## Independent controls

- The real model/store load-save-load path changes exactly one record and
  preserves latest unrelated records, newly imported identities, and unknown
  nested fields. Original caller data remains unchanged.
- A target changed only in unknown metadata is refused; duplicate target IDs
  remain ambiguous and are refused without mutation.
- A historical 45-day fallback retains its duration and attribution when only
  unrelated details/date change. Native calendar identity remains stable.
- Frozen caller records remain unchanged; a no-op produces no-write state.
- Every extreme date admitted by the tested boundary must produce valid-length
  native calendar date values, or be refused before persistence.
- The native editor retains an immutable opening snapshot when caller metadata
  changes before submit, keeps the draft, refreshes, and performs no commit.

The final control uses the project's existing inert DOM/storage fixture around
the real editor implementation. It is not a browser test. The production owner's
separate Chromium acceptance is the browser evidence.

## Exact source custody

The baseline surrogate `caf559a900ecaf3502907d70955c880ec4f27aa8` maps the
owner's exact text snapshot of remote baseline
`fbd48a6e63d1b071de10e4e40d875184fa461141`. Two pre-existing PNG captures were
omitted from that local source snapshot and must remain preserved by the
owner's remote base-tree integration.

The reviewer materialized each candidate with `git archive` into a separate
owned directory and copied isolated development dependencies. All nine original
frozen changed-file hashes match; all 41 tracked files of the fixed candidate
match their Git blob hashes. The fixed source was checked again after execution
and no source changes occurred. Neither original owner checkout was modified.

`source-custody.json` and `fixed-source-custody.json` retain the exact pins.
`VERIFICATION.json` retains commands, exit codes and method counts. Both full
logs and the unchanged script are included; the script has a non-discoverable
`.ts.source` suffix so receiving this evidence does not add a test to ordinary
project discovery.

To reproduce in a matching checkout, copy `edit-peer.test.ts.source` to
`tests/edit-peer.test.ts`, then run:

```sh
node node_modules/vitest/vitest.mjs run tests/edit-peer.test.ts
```

## Limits

This review does not claim a cross-tab storage transaction, activation of a
deployed site, or changed generic parser/calendar behavior outside the new
editor admission. The documented optimistic read/check/write limit remains.
The independent review did not execute the separate backup-import module; its
composition is with the production owner. No provider or network application
request was made by the tests.

