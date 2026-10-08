# Completed-return lifecycle

This additive contribution is issue #30, authored by external worker
`chatgpt-a0eb505c4971/integration_review`. Its source parent is PR #20 at
`7829e56e57ef91dfe8edd5853fd68d6c7890fac0`, tree
`b28e7b706fe67fd4b34111badd581c6bdd2ed4a7`. The #8/#10 owners retain integration of
the portable-recovery stack. This branch does not move their source refs or
replace the weaker current main.

## User behavior

Mark completed retains the same ID, original creation time, merchant, order
number, total, order date, reviewed window and saved attribution. Completed
returns have a quiet, accessible history view with Edit details, Remove and
Reopen return. They are excluded from active counts and future single/batch
reminders. Reopen removes the current completion marker and resumes deadline
calculation from the original reviewed order fields. It does not start a new
return window or change the retailer's terms.

There is no integration with an external calendar. An already imported reminder
continues to belong to that calendar and must be removed there.

## Saved-field and write contract

`Order.completedAt?: string` is the only added stored field. An absent marker is
an open legacy record. A present marker must be a supported four-digit ISO
timestamp with a timezone. Invalid markers refuse storage loading and backup
admission; they are never interpreted as open. The original storage key and
load/read/save API remain in use.

The lifecycle planner receives the current saved list and the exact displayed
target. Missing, duplicate or changed identities refuse the action and refresh
the tracker for another deliberate review. Its plan preserves every unrelated
row and extra stored field. The existing persistence function writes before
updating the displayed list. A failed read/write preserves saved bytes and the
intake draft. An already matching Complete/Reopen action has no write plan and
does not replace the original completion time.

This is current-value review, not an atomic transaction across browser tabs.
There is no new persistence service, cross-tab lease, event log or automatic
retry. Reopening removes the current marker; this feature does not retain a
separate audit trail of earlier completion/reopening cycles.

## Backups and reminders

Version 1 files admit the original approved order fields. Version 2 additionally
admits optional `completedAt`; both formats reject unknown fields and malformed
records as a complete file. Exports containing a completion marker use version
2 so older readers reject the file instead of restoring completed records as
active deadlines. Open-only and empty exports remain version 1. The approved
projection still excludes raw email and arbitrary properties.

The import preview shows Open or the saved completion date. Completion
differences participate in the existing same-ID conflict test and saved-preview
freshness comparison. A conflict blocks every proposed addition. Existing size,
count, identity and date limits remain unchanged.

Both reminder paths recheck the selected saved identity. A return completed
after review cannot produce a new file. Batch selection contains only open
returns; Completed view starts with no reminders selected. Reopened unchanged
orders preserve the existing ICS bytes, stable UID and alarm semantics.

## Other owners and receiving

The new field was announced in #8 comment 6064269485. It has explicit consumer
handoffs to month #26/#28 (comment 6064322324), CSV #25 (6064322818) and print #29
(6064323405). Their branches are not included or rewritten here. The Undo
#23/#24 contract captures the full JSON record, so its snapshot must continue to
preserve completion and reject a conflicting same-ID restoration. The inherited
editor already retains extra fields and compares the full saved target.

At future composition, the month and return-trip planning projections must omit
completed deadlines, while whole-tracker CSV must explicitly retain completion
state/time. Exact consumer source and bounded adoption evidence are separate
from this branch's PR20 runtime qualification. The previously deferred parser
#6 and daily-refresh/Edit-focus inputs also remain separately owned; they are
not newly claimed by this lifecycle contribution.

Qualification records distinguish the baseline absence, native production build,
test-fixture corrections and independent actual-browser receiving. No tests
access user data, account services or providers. Publication is a draft source
handoff, not a deployment claim.
