# Warn before leaving an unsaved intake

ReturnBy observes the existing new-order paste and review form. While there is unsaved text or a visible review with edited fields, reloading, closing the tab or navigating away requests the browser's standard leave/stay confirmation. The browser may suppress this warning; it is not a backup, autosave or guaranteed interruption.

## What counts as unsaved

* Any nonempty pasted text, including whitespace or Unicode, counts literally.
* In a visible review, any nonempty Store, Order date, Order #, or Total counts.
* A visible review's Return window counts if it differs literally from the current policy/fallback baseline, including invalid or cleared values.
* A hidden review does not count stale reviewed fields. A blank visible review with its unchanged default window is clean.

The departure listener is attached only while needed and removed when the intake clears. It reads the latest fields again before requesting cancellation, so stale listeners do not block a cleared draft. Successful saving removes the warning after the existing clear. Validation or storage failure retains the draft and the warning. The module never writes fields, modifies the user's focus, saves draft data or calls external services.

## Verification

Run `node --test tests/intake-departure.native.mjs` on Node 24+, then `npm test` and `npm run build` with the project's existing dependencies. The controlled native test checks literal contents, hidden fields, the return-window baseline, listener count and synchronous callback rechecking. It observes event cancellation, not the browser's actual dialog. The actual app must also be checked after building: paste or review a confirmation, try leaving, then Save and confirm a clean departure; browser behavior may vary.

This feature is limited to the single-order intake. Batch review, saved-order edits, and backup preview have their own lifecycles.
