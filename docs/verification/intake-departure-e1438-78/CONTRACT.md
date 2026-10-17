# Warn before leaving an unsaved ReturnBy intake

Owner: continuing e1438c9d058f/source_worker, with root's authorization for a bounded source-only offer. Original #8/#10 integration ownership and every existing source owner remain intact. No PR, main update, Pages, Actions, deployment or owner-branch mutation.

## Concrete reader outcome

Current main f5709e5b6ae1f8d8790e011fc775d808aeeb323e has an editable pasted confirmation and five reviewed intake fields but no departure handler. Closing, reloading or navigating away can discard those in-memory values. This is a source observation; no original browser or native dialog result is claimed.

Add a conditional standard beforeunload guard for this new-order intake only. The browser decides whether to show its ordinary leave/stay dialog; it may suppress the dialog. No draft recovery, autosave, guaranteed prompt, custom dialog text or background persistence is introduced.

## Exact four-path fence

- New src/intake-departure.ts: literal content predicate and event binding.
- Existing src/main.ts: one import, one binding and refresh calls after ordinary preview creation and after successful Save has cleared the intake. Preserve all original handler statements and semantics.
- New tests/intake-departure.native.mjs: one Node built-in test course executing the actual TypeScript module with controlled fields/window events.
- New docs/INTAKE_DEPARTURE.md: usage, exact guarded contents, standalone test command and qualifications.

Current intrinsic base tree b1ec658856b748af8f0346c63e1018f5290befd1 is complete. Both unchanged workflows select pull_request or push-main; neither selects issues or an isolated non-main source branch. No workflow modification or trigger is selected. Publication is a unique nondefault source offer only, with skip markers and full remote body/tree verification. A later current-stack composition or site adoption belongs to #8/#10.

## Content and lifecycle contract

A draft needs the guard if either condition is true:

1. The pasted-text value is not the empty string. Spaces, newlines, Unicode and markup-like text count literally; no parser is run and no trimming occurs.
2. The preview is visible and either one of merchant, orderDate, orderNo or total contains a nonempty literal string, or its existing windowDays input value differs from the current preview.dataset.days baseline. A missing window input contributes nothing. A hidden preview contributes nothing, including stale values. Thus a blank manually opened review with its ordinary default window stays clean, while an edited window alone is guarded even if invalid or cleared.

This is an unsaved-intake predicate, not validation or saved-order comparison. It does not inspect the tracker, saved editor, backup preview or completion state. It neither parses nor changes the values.

The binder attaches input and change observers to the existing paste and preview elements, plus one beforeunload listener only while the predicate is true. Repeated refresh/input/change calls never duplicate that listener. Returning to clean contents detaches it.

Programmatic preview creation and successful Save call the returned refresh function after their current statements. Existing failed Save behavior is untouched: a failure before the current clearing step leaves the guarded draft. The guard does not fix, hide or reinterpret separately owned storage/attribution behavior. When the beforeunload callback runs, it rechecks current fields before calling preventDefault and setting returnValue to the empty string; a stale attached listener must not block an already cleared draft.

Neither path changes field text, form structure, focus, selection, storage, clipboard, calendar or other network/filesystem state. The module has no imports and uses no timers. There is no cleanup on beforeunload and no unconditional handler that would burden an idle tab.

## Ownership evidence

The current open issue/PR inventory and all-state beforeunload/departure/reload-unsaved searches were read. #31 owns replacement protection when reparsing or loading a sample and explicitly excludes close/reload recovery. Its current comment list is empty. The complete60-comment #8 integration thread contains no beforeunload/departure handoff. Main still lacks that capability. Existing storage, parser, policies, deadline arithmetic, saved-order editor, backup, calendar, cross-tab, completion and checklist implementations remain unmodified.

The new refresh calls are an additive current-main offer, not an independently accepted composition with those unmerged owner stacks. No owner ref is updated and no old contribution is treated as abandoned.

## Planned meaningful receiving

Freeze a small independent semantic key before candidate exposure. Then source peer and one bounded Node course cover clean state, literal pasted contents, each visible reviewed field, changed-window-only and hidden stale fields, replacement-node refresh, repeated events, successful-clear versus retained failed-save draft, and synchronous callback recheck. Preserve exact draft objects/values and demonstrate no storage or field writes. The test observes cancellation of a controlled event; it does not claim an actual browser dialog or prevention on every device.

No npm dependency installation, old-suite replay or native browser invocation is selected. Keep full source/admission and any actual result limitations explicit. A practical source handoff can be reviewed through the existing owner integration route; the hosted application remains unchanged.
