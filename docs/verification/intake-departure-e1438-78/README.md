# Unsaved intake departure warning: isolated source offer

[Read the immutable source guide](https://github.com/Jacob-Met/returnby/blob/6e88e5da44e0ab2320c4edf61e135cc456fe51a1/docs/INTAKE_DEPARTURE.md) for the four-path ReturnBy offer tracked in [issue 78](https://github.com/Jacob-Met/returnby/issues/78). The offer is based on main `f5709e5b6ae1f8d8790e011fc775d808aeeb323e` and remains separate from the existing #8/#10 integration work. No integration PR, default-branch update, hosted-site change or native browser receiving is part of this account.

## Consumer behavior

The module requests the browser's standard departure warning while the new-order intake contains literal pasted text, visible reviewed values, or a return-window value different from its current baseline. Hidden stale fields do not count. Clearing the intake removes the listener; the departure callback checks the actual values again before cancelling an event. No draft is persisted, and existing Save/storage behavior is preserved. Browsers may suppress the prompt, so this is not a guarantee against losing a draft.

The main integration consists of one import, one binding and refresh calls after preview creation and after successful Save clears the intake. All existing statements remain intact. Current-main source review establishes those insertion points; the controlled tests do not execute the complete application or compose other owners' pending branches.

## Original receiving

The [independent key](independent-departure-key.json) was frozen before the candidate. The single [controlled Node course](originals/PROCESS.json) passed all eight groups on its first run, with zero failed, skipped or cancelled groups and empty stderr. [Complete stdout](originals/stdout), the original request/process/streams and the [genuine terminal frame](focused-capture-start.json) are retained once.

The cases cover blank/default state, literal whitespace/Unicode/markup, every reviewed field, hidden stale values, current window baselines, repeated listener events, cleared versus retained drafts, replacement nodes and a synchronous callback recheck. Controlled field objects reject writes. These observations do not qualify an actual browser prompt, complete application, Vite build, TypeScript compiler or current owner-stack integration.

[Source review](reviews/machine-source-review.json), [original-result review](reviews/machine-result-review.json) and [whole fresh source receiving](source-publication.json) preserve the independent gates. One pre-capture guide sentence was narrowed to describe the supplied-window fixture precisely; after the sole passing course, one guide status sentence was projected to the observed result. Both changes were prose-only, and no selected command was repeated.

## Integration boundary

The original integration owners retain the decision to compose this isolated offer into their current stack and perform any subsequent receiving or adoption. Issue 31's replacement protection remains separate. The source branch and evidence branch do not authorize a merge, deployment, Pages or Actions change.

[The account manifest](SOURCE.json) identifies the retained original files and the exact source-offer commit. Runtime source is linked at that immutable commit instead of duplicated here.
