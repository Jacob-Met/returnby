# ISO timestamp receipt-date recognition

ReturnBy now recognizes the calendar-date portion of common ISO timestamps in pasted order confirmations. For example, `Order date: 2026-10-03T00:15:00+14:00` yields the reviewed order date `2026-10-03`. The parser keeps the date written on the receipt without converting the timestamp to UTC or the host timezone.

The existing matcher ended the date with a word boundary. There is no such boundary between a numeric day and the attached `T`, so these receipts produced no date hit. When a delivery date was present, the parser could select that delivery date instead.

## Source and ownership

This is an isolated child of the existing [parser integration PR #54](https://github.com/Jacob-Met/returnby/pull/54), pinned at `8df144cd393fd66a99f46683c54b55c97665d6e8`, tree `cc4ded942b2f59b8c2eac5f6e69d886a069557fb`.

The production delta is confined to the ISO pattern and its two component expressions inside `src/parse.ts:findDates`:

- Original parser blob: `6a59607db8418e20daf783f0738ba600dd16cf05`.
- Candidate parser blob: `adddc727f469289fa40cb69ab9223f0145747868`.
- Candidate parser SHA-256: `d6974c8b6b1e8142e5cf679d601ad495706723b6831fada983fa0ac4c05b7355`.
- New maintained test: `tests/parse-iso-timestamp.test.ts`, blob `cad4508823488281ce0d03ae3d50805a744d6f9d`.

The parent's subtotal and explicit-order-date changes remain intact. Its core-test blob remains `41ca82a8942dc111fa51a04396a16bcfaffa85c1`. Existing parser integration, deadline arithmetic, calendar, storage and product-feature owners retain adoption of their changes.

## Recognized forms

After `YYYY-MM-DD`, the matcher accepts upper- or lowercase `T`, a two-digit hour and minute, optional seconds with optional decimal fraction, and an optional upper- or lowercase `Z` or signed `HH:MM` offset. Hours are 00–23; minutes and seconds are 00–59. The ordinary date validator still admits the calendar date.

The matcher rejects malformed attached time fields, incomplete or compact offsets, and identifier-like trailing text. It accepts ordinary following whitespace and punctuation. This extension does not implement every ISO 8601 representation, leap seconds, or end-of-day `24:00`.

## Native verification

Author receiving completed on Jacob's ThinkPad, Linux, Node `v22.22.1`, npm `9.2.0`, on 2026-10-12.

| Check | Result |
| --- | --- |
| New 46-case regression suite against unchanged PR #54 parser | 26 passed; 20 expected failures |
| Complete maintained suite with the candidate | 120 passed; 0 failed |
| New regression suite in Pacific/Kiritimati | 46 passed; 0 failed |
| New regression suite in America/Los_Angeles | 46 passed; 0 failed |
| `npm run build` (strict TypeScript and Vite) | Exit 0 |
| Original and candidate source checks after execution | Exact bytes retained |

The new tests cover 12 timestamp forms, 20 malformed controls, punctuation, original text offsets, explicit order-date selection, fallbacks, and the five existing plain-date formats. The cross-timezone checks exercise the same 46 cases, rather than adding 92 distinct cases.

The ordinary test and build commands ran from an isolated 24-file runtime/test/config projection. Dependencies came from the unchanged lockfile via task-local `npm ci --ignore-scripts --no-audit --no-fund`; the original and candidate shared only this task's installed dependencies. Reference documents and static capture images were not needed for these checks.

The first direct Node TypeScript probe failed because the distro Node binary was compiled without TypeScript support. That environment failure is retained in the receipt and is not counted as evidence of a parser defect. The repository's ordinary Vitest route produced the before/after results above.

The complete [native receipt](receipt.json) includes commands, exit codes, original failures, dependency provenance, source hashes and the environment limitation. Its SHA-256 is `9f96acedbee9a028802022c689e9217cbb3c0389e99f1d30b58d4641e43a7f07`.

This is author source qualification. Independent receiving, actual-browser interaction and final stack adoption remain separate. Both repository workflows select PRs or main pushes; this publication opens no PR, updates no owner branch or main, and requests no Actions run or site deployment.
