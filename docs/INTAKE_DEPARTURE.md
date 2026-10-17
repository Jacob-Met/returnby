# Unsaved intake departure warning

The source offer for [issue #78](https://github.com/Jacob-Met/returnby/issues/78) adds a conditional browser departure warning for the new-order intake. It preserves the existing #8/#10 integration hold: this branch does not update the hosted site, main, Pages or Actions, and has no integration PR.

When this source is integrated, entering pasted confirmation text or reviewed intake values arms the browser's standard `beforeunload` warning. A reload, close or navigation can then ask whether to leave. The browser controls whether it displays a prompt and its wording; this is not guaranteed prevention or draft recovery. No pasted text or draft is persisted by this feature.

## Which contents count

The pasted text counts whenever it is not the empty string. Whitespace, line breaks, Unicode and markup-like text remain literal data. The guard does not parse or trim them.

When the review form is visible, a nonempty Store, Order date, Order # or Total also counts. The return-window field counts when its literal value differs from the current policy/fallback baseline. Clearing that field or entering an invalid value still counts as an unsaved edit. A missing return-window control contributes nothing. A blank manually opened review with its unchanged default window is clean.

Hidden review fields do not count; they may contain values left over from a saved intake. Pasted text still counts independently. This rule concerns the current intake only, not saved tracker entries, editor drafts or backup previews.

## Save and editing behavior

The guard observes `input` and `change` on the existing paste and review elements. It registers one departure listener while contents need it and removes that listener when the intake becomes clean. Programmatic preview creation refreshes the guard after the current fields and policy baseline are installed. The existing successful Save path refreshes it after clearing the intake. Existing validation or storage failures that leave the intake intact leave it guarded; this change does not repair or reinterpret separately owned Save/storage behavior.

The departure callback reads current fields again before cancelling the event, so a programmatic clear cannot cause a stale warning. It does not clear controls, submit the form, change focus, or write to storage, clipboard or a network service. It uses no timer. The replacement protection owned by #31 remains separate.

## Focused receiving

From the repository root, with Node 24 or newer supporting built-in TypeScript stripping:

```sh
node --test tests/intake-departure.native.mjs
```

The eight controlled groups import the actual TypeScript module and cover literal contents, hidden stale values, each reviewed field, the current window baseline, listener uniqueness, clear/retained-draft transitions, replacement nodes and synchronous callback rechecking. The fixture rejects field writes and access to the supplied window's storage, clipboard, timer and network properties. It exercises controlled event cancellation; it does not launch a browser, show a native dialog, run the complete application or establish integration with other pending owner branches.

Validation status: the sole controlled cloud course passed all eight groups on the first run, with no skips and empty stderr. An independent source review covered the module, tests and all four additive main integration lines. No full Vite build, TypeScript compiler check, npm dependency installation or native/browser qualification is claimed.
