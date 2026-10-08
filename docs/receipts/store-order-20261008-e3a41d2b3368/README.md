# ReturnBy: optional store order

A person preparing errands can choose **Store A–Z, then deadline** to review one store's saved returns together. The ordinary deadline order remains the default. Sorting changes only the visible list; date filters, global counts, saved records and original card actions keep their behavior.

Claim: https://github.com/Jacob-Met/returnby/issues/35  
Contributor: autonomous-e3a41d2b3368 / local_recovery  
Receiving base: `1e662c387be5f66f8499fac7ec443f58d2198379`, tree `503ea217dc35f54aa7c9dbd1f92217544ad6dbc9`.

## Exact contribution

Six paths: new `src/list-order.ts`, `src/list-order.css` and `tests/list-order.test.ts`; narrow hooks in `src/main.ts`; one labeled select in `index.html`; an appended README usage section. The main inverse-patch gate reconstructs the original main bytes exactly. Card markup, Save/Remove/calendar handlers, counts, date filters, day-refresh callback, schema, persistence and dependencies remain unchanged.

English alphabetical comparison ignores case and repeated whitespace and normalizes Unicode only in temporary comparison keys. It retains every original row and merchant string. Within a store, deadlines remain earliest first; ties stay stable. Unnamed stores appear last. The choice is transient and resets on reload.

The existing #8/#10 owner retains stack adoption. This source is against current main at the recorded cut, not a composed #20/#22/lifecycle stack and not a deployed-site result. Lookup, editor, portable recovery, lifecycle, calendar, month, CSV, Undo and checklist owners retain their scopes.

## Executed qualification

- Native ThinkPad Node22.22.1: baseline **68/68** and candidate **73/73** maintained Vitest cases; both strict TypeScript/Vite builds exit0.
- The five focused tests cover default reference ordering, store contiguity, within-store deadlines, literal field preservation, case/spacing/Unicode comparison, stable ties, unnamed records and filtered membership.
- The same actual-main/minimal-DOM receiving contract gives original **6 passed / 5 expected failures**, candidate **11/11 passed**. It observes actual main handlers, actual deadline functions and the real ICS builder through TypeScript5.9.3 transpilation.
- Sorting/filter/day refresh preserve unfinished input and cause zero persistence calls. Explicit calendar selection produces exactly identical bytes in baseline and candidate, with the selected saved ID/date. Explicit Remove produces exactly the same saved records/order and one existing persistence call.
- All26 frozen baseline source inputs and29 candidate inputs remain byte-identical through native receiving.

The source closure includes all current runtime TypeScript/CSS/data, project tests, build/config files, HTML entries and favicon. Unrelated historical evidence and screenshot assets were not copied into this native project fixture. Publication must preserve every unrelated actual Git tree leaf separately.

No dependency installation occurred. Individual read-only links reuse the owner's Ledgerly installation at `/home/jacob/hamon-universal-e3a41d2b3368-ledgerly-intake/candidate/web-demo/node_modules`, with private cache directories. TypeScript5.9.3, Vite8.3.3 and Vitest5.0.3 exactly match ReturnBy's lock. This is a borrowed compatible toolchain result, not a fresh `npm ci` claim.

## Original failed receiving attempts

All are retained with their original code/logs; no product source was changed after the first candidate:

1. The initial local Node24 baseline fixture tried to assign to constant `todayISO`. The corrected fixture supplies a receiving clock to the VM and retains the exact application source.
2. Native Node22 exposes the stripping API but lacks compiled TypeScript support. The successor uses the already qualified TypeScript5.9.3 compiler with unchanged expectations.
3. The minimal VM initially omitted browser-global `TextEncoder`, needed by the existing ICS implementation. The successor supplies Node's original implementation.
4. The receiver initially expected the wrong existing UID suffix `@returnby.local`. Actual unchanged source and both outputs use `@returnby`. The final receiver checks the exact existing UID line. The original assertion failure remains.

## Replay and limits

From the native packet root, with its recorded read-only dependency links available:

```sh
node receive-main-v4.mjs /absolute/path/to/fresh-packet-copy
```

The receiver refuses to overwrite `MAIN-RECEIVING.json`; use an isolated fresh copy. Normal project commands are `npm test` and `npm run build` inside baseline/candidate. Receipts pin the exact source and outputs.

This does not execute a real browser, prove visual rendering/keyboard interaction or claim hosted CI. The label/select and wrapping CSS were reviewed as source. Root explicitly chose this bounded gate after the prior ThinkPad Chromium admission timeout; no browser discovery/retry, new CI job, install, cleanup or live data action was performed. Search promotion remains paused.
