# New-order deadline preview

The existing order-email review now shows a calculated return-by date before
**Save**. Select **Find details** or a sample, then check the date shown below the
return-window field. Editing **Order date** or **Return window** updates that
readout immediately. The keyboard focus stays in the field being edited.

This is a preview of the existing calculation, using the reviewed order date and
number of days. It does not establish a retailer's actual return policy. The
policy/source text and editable source fields keep their existing behavior.
**Save** continues to use the same data and admission rules.

## Incomplete or unsupported values

A missing or invalid calendar date shows a prompt to enter a valid order date.
A missing, nonpositive, fractional or unsafe whole-number window shows a prompt
to enter a positive whole number of days. A calculation outside the supported
four-digit calendar range shows a prompt to check the date and window.
These prompts replace the preview; they do not change either input.

The date calculation still comes from `src/deadline.ts`. This increment does not
change its existing early-year or timezone semantics, retailer lookup, parsing,
storage, saved-order editing or calendar export. Those remain separate concerns.

The readout uses a polite live region. A form event for unrelated fields does not
rewrite it, and repeated events with the same result do not announce a new value.
The stable form receives one input and one change listener; new parsed reviews
refresh the same binding.

## Maintained checks

With the repository's lock-pinned dependencies installed:

```sh
npm test -- tests/intake-deadline.test.ts tests/core.test.ts
```

The focused course contains 28 new pure/binding cases and 12 unchanged core
cases. The binding fixture is deliberately inert; native input behavior,
focus preservation, saved-state conservation and narrow rendering are received
separately in a real browser.

## Qualification for this increment

- Original source: `7a271cfbc27e6c79a889b90920a700fdbf638e22`.
- Native author course: Node 26.11.0 / Vitest 5.0.3 on macOS, UTC; 40/40 tests
  passed, process exit 0 and empty stderr. The 18 staged source files and 16
  copied original source files retained their bytes, modes, modification times
  and inodes. Only the two selected test modules ran.
- The new-order preview changes one existing application file and adds a small
  module. The existing date helper, Save handler, parser and storage are
  byte-for-byte unchanged.
- An independent consumer froze the original before receiving the candidate.
  Both complete projections built with TypeScript and Vite. The original passed
  44 observation/control checks while lacking the preview; the candidate passed
  46 checks with the same observer and criteria. These are browser checks, not
  additional unit tests.
- Chrome 155.0.8059.40 used a fresh UTC context and owned loopback server at
  1280 px and 390 px. Ordinary/leap/year-boundary edits, missing/invalid windows,
  input/change events, unrelated edits, repeated Find, all three samples,
  storage conservation and final Save agreement passed. The final reviewed
  2026-10-14 plus 14 days matched the saved card's 2026-10-28.
- All 58 original and 60 candidate source files retained their bytes, modes,
  modification times and inodes. Managed browser closure was observed; no
  operating-system Chrome exit code is claimed. No external requests or page
  errors occurred.
- These results qualify a local built consumer. They do not establish hosted
  publication or change the separately owned website deployment.

Raw criteria, the exact executed observers, focused-test output, both browser
receipts and build streams are retained in
[the receiving record](receiving/intake-deadline/README.md). The historical
consumer observer expects its original Mac directory layout, installed Python
Playwright/Chrome and separately prepared complete source inventories; it is
not a standalone application command. Use the maintained test command above
for the focused checks.
