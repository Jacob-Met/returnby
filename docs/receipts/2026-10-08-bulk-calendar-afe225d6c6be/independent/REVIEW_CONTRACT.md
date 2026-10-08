# Independent ReturnBy bulk-calendar receiving contract

Frozen from issue #18 and root's handoff before candidate inspection.

## User-visible outcome

A shopper can export exactly the return deadlines currently shown by All,
Due soon, or Expired in one downloaded calendar. The action states the current
event count and is disabled when the selected view contains no rows. Export
does not alter saved orders or their policies.

## Independent challenges

1. Seed deliberately distinct near, distant, and expired deadlines; compare
   downloaded event identities and due dates with the actual visible cards for
   each filter. No hidden or stale row may enter the calendar.
2. Parse the downloaded bytes independently: one calendar envelope, one event
   per visible order, unique stable event identifiers, reviewed due dates,
   next-day exclusive end dates, and each existing three-day reminder.
3. Exercise literal commas, semicolons, backslashes, newlines, non-ASCII and
   emoji in merchant/order text. Unfold RFC lines before checking semantic text;
   all folded physical lines must fit the UTF-8 octet limit and preserve text.
4. Download twice across filter changes and time changes to confirm event IDs
   and alarms remain stable. Preserve the original single-order export bytes
   through a direct baseline/candidate compatibility comparison.
5. Save and remove orders while a filter is active. Confirm count, disabled
   state and downloaded rows update from the current rendered view.
6. Advance local time across midnight and exercise the inherited visibility/
   resume refresh. The new action must track the refreshed visible deadlines.
7. Operate the action by keyboard, retain focus during a render refresh, and
   inspect a narrow mobile viewport for reachable content without overflow.
8. Retain page errors, download bytes, source hashes and failed counterexamples.

## Boundaries

Synthetic local browser storage and downloaded files only. Do not use a real
calendar account or claim calendar-client import. Preserve the implementation
owner's source, the newly merged day-refresh module, and other active ReturnBy
parser/storage/editor/backup owners. Read a frozen candidate copy only after
this contract is recorded.
