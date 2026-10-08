# ReturnBy: independent Undo → CSV composition receiving

Owner: estate-49f845d0dece/source_coordination. Coordination: ReturnBy #8 comment6062309880.
This contract is frozen before executing the prospective combined source.

## Qualified source inputs and fence

Original Undo PR24: ad19cab029533820a4f6e2c576f5cb20a9e06816, tree c0625c196329f6a02ba30820472c510e0fd55cac.
Original CSV PR25: 88ad7e0fc390bb468450bde9a2d25181c7bbe52d, tree5ea7abed75f58e0ece86734868f98feb2d224ebb.
Both retain original receiving base7829e56e57ef91dfe8edd5853fd68d6c7890fac0. Current main3913697f70a31d73e8fe7d02b686b306830c24db is separate. #8/#10 retain final adoption.

Use the exact Undo runtime plus only the original CSV import, binding, HTML section and two source modules. Removing those literal insertions must restore the original Undo main/HTML bytes. All other runtime files, manifests, dependencies, data and original feature source remain byte-exact. No owner branch, target ref, application implementation, existing test or deployed site is changed.

## One beneficiary workflow

A saved return removed accidentally must be recoverable and immediately usable in the spreadsheet download. Another tab's correction must remain current. The downloaded CSV must represent every saved record, including a restored item hidden by the active urgency filter.

Use one isolated native browser context, two real tabs on an owned loopback origin, and three explicitly fictional initial Order records. Seed the initial saved fixture once; all subsequent Remove, Edit, Save, Undo, filter and export actions use actual rendered controls. Preserve exact field, ID and creation-time identity, with original order-date/window-derived deadline expectations.

1. Original Undo-only source exposes no CSV action: receive that bounded missing-composition control without replaying its standalone Undo matrix.
2. In the combined source, remove the target record. In the other tab, use its real Edit/Save workflow to change an unrelated saved order number. Keep a new-order draft and an urgency filter in the first tab. Undo the target, then trigger the real CSV download. Its parsed rows must include the exact restored target, exact intended peer correction and untouched third record, with all native column meanings and deadlines correct. CSV export must make no storage writes and preserve the draft/filter.
3. Remove that target again and retain pending recovery plus the draft. Refuse the first tab's saved-store read for a CSV attempt. The action must produce no download, report failure, preserve the saved bytes in the second tab, and retain recovery and draft. Release only the injected read fault, perform actual Undo, and download again. Every restored/current field must still agree, with no export writes.

The fault is confined to the disposable first-tab Storage.getItem boundary. Do not patch a product function, stub a download, synthesize a CSV in place of the browser's output, use a live account, run a provider, or create an atomic cross-tab claim. The original localStorage concurrency limit remains.

## Native evidence

Use the project's exact locked TypeScript/Vite versions and native Chromium. Record source/compiler/browser pins, actual build commands and results, the first bounded missing-control result, two real CSV files, page/draft/storage observations and any failure without rewriting it. An independent CSV reader and literal fixture/date expectations receive every output field. Normal hosted and final main-composition gates remain with the original integration owner; existing standalone test matrices are not rerun or relabeled.

Work stays under one owned native directory with observed target capacity; dependencies, profiles and outputs do not write another owner's cache or worktree. Publish focused source-backed evidence and the minimal applicable composition handoff after qualification.
