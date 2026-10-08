# Completed returns in the printable trip checklist

The isolated checklist/PR32 composition projected away `completedAt`. A person who had completed a return could therefore choose it for a new trip; malformed completion markers were also silently admitted. The proposed adoption retains and validates the optional marker using the completion owner's exact existing predicates, excludes completed options, and refuses completed selected records. Reopen restores the original record to trip planning.

**Accepted for the existing #8/#10 owners' adoption.** This is a qualified dependent consumer patch and an evidence packet. No main or owner branch, deployment, saved user data, workflow, or dependency manifest was changed.

## Source and ownership

The frozen contract precedes candidate inspection at 2026-10-08T19:15:14.4330509Z. It names the checklist owner (issue29/PR33), completion owner (issue30/PR32), and canonical #8/#10 integration owner. The same main and PR32 refs remained current on the final primary check.

- Checklist source: main `1e662c387be5f66f8499fac7ec443f58d2198379`.
- Completion producer: PR32 `ece2d7f82feaa6cf14bc34cb8d541ef2a3781a36`, tree `041d36d4dbd54d175a666e7a9606f1e1929d4ead`, dependent on `7829e56e57ef91dfe8edd5853fd68d6c7890fac0`.
- Thirty source/config files were staged from those exact primary refs. The native closure retains the actual completion tracker, storage, backup and deadline modules. The checklist's six-file intake is verbatim from integrated main, including the existing two-entry Vite configuration.
- Only `src/trip-checklist.ts` and `src/trip-checklist-view.ts` change. Candidate Git blobs are `dc4fee28af022e0fb9fd27cf93c15e0c0646fe1c` and `f43164c448d284bcfa9b7594746559e5ddf94686`. The other28 primary files remain exact.
- The added seven-method receiver is `7096e5b3f9d966f90fe7a67ec8e400a619af945f`. The same unchanged file receives both source variants.

The original contract asked for a selection-completed-before-download check. Source inspection and execution showed that the existing whole-raw-snapshot fence already refuses this case. It is retained as a passing control, not reported as a repaired defect. The product correction is completion admission and eligibility when loading/preparing a fresh trip.

## Measured receiving

| Receiver | Original composed source | Proposed adoption |
| --- | --- | --- |
| Seven focused native Vitest methods | 3 pass /4 fail | 7 pass |
| Existing checklist methods | not repeated for baseline | 40 pass |
| Real TypeScript check and Vite production build | both exit0 | both exit0 |
| Same real two-tab browser workflow | 3 pass /4 fail | 7 pass |

The browser operated the actual built tracker and checklist: Mark completed in the tracker, exclude the completed choice, download an unchanged open sibling, mark that sibling completed from the other tab after preview, observe the existing stale refusal with no extra download, refresh an all-completed list, Reopen the original record, and download its exact retained fields. A later malformed record refuses the entire source without modifying storage. Literal markup, Unicode, a newline in the reviewed order number, money text, identity, user-selected window attribution and deadline are retained.

Two completed candidate downloads match the original control bytes: 5,797B/SHA256 `742bf00cd099a8a505c47df004928eae6e90f5437f2d4b6f149542086c5595bf` and 5,831B/`ad535db274baf4f3ed594c51a66b3180612f565d296e25c16bc738ebcc9057d1`. Both are included. The inspected1280×1000 screenshot shows the reopened single selection and literal reviewed fields without visible overlap. No phone, external print-dialog or deployed-app result is claimed.

Native/build/browser source pins were checked before and after. Browser runs had no page exceptions, failed app requests, or external page requests. All fixtures were synthetic in exclusive profiles.

## Runtime and retained setup evidence

The actual native/browser execution was on MSI as `MSI\\jacob`, Node24.14.0, private exact-lock npm11.9.0 installation (Vite8.3.3, Vitest5.0.3, TypeScript5.9.3), and existing Chrome for Testing153.0.8010.36, sandbox enabled. No host/global install or shared cache changes were made.

The first two browser transport attempts produced zero product gates: the launchers exited0 after handing off to live owned child browsers. The final harness reads the owned profile's actual DevTools endpoint. The baseline reconnected to its original unused profile; the candidate used a fresh profile. The unchanged consumer assertions then produced the measured results. Both zero-gate raw receipts are retained separately.

MSI later fell below the unchanged2GiB free-memory floor, so no further MSI process or allocation was used for packaging. Root authorized a guarded alternate Windows host for custody only. Actual Git apply/check there reconstructs all30 baseline leaves and all31 candidate leaves. An initial default Git run converted LF to CRLF through existing `core.autocrlf=true`; the failure is retained. Process-local `-c core.autocrlf=false -c core.eol=lf` then preserved every exact blob. Neither a global Git setting nor product source changed. This is patch/source verification, not another native/browser qualification.

Earlier LA7 connection timeout, ThinkPad npm ENOSPC, and local scratch zero-free-space were setup limitations; no ReturnBy test/source adoption occurred on those routes.

## Owner replay and adoption

`checklist-intake.patch` copies the existing checklist component into exact PR32; `completion-adoption.patch` applies the two-source correction and adds the receiver. The separately retained raw intake contains the full selected source closure and exact primary refs.

In a new isolated checkout of PR32:

```sh
git -c core.autocrlf=false -c core.eol=lf apply --check checklist-intake.patch
git -c core.autocrlf=false -c core.eol=lf apply checklist-intake.patch
git -c core.autocrlf=false -c core.eol=lf apply --check completion-adoption.patch
git -c core.autocrlf=false -c core.eol=lf apply completion-adoption.patch
npm ci --cache ./private-npm-cache --no-audit --no-fund
npm exec -- vitest run tests/completion-checklist-independent.test.ts tests/trip-checklist.test.ts
npm run build
```

The exact executed scripts are preserved for replay in a fresh directory. They deliberately refuse existing output directories and enforce1GiB disk/2GiB memory floors. The browser harness names the qualified local CfT executable; a receiving machine must explicitly pin its own equivalent executable rather than silently claiming the original environment.

The full canonical stack (#8/#10), Undo/CSV receiving, month view, calendar civil-date repair, main navigation, hosted CI and deployment remain outside this isolated acceptance. This packet does not adopt those owners' contributions or qualify a broader composition. Root/source owners should apply the bounded delta within their normal final stack receiving.

Native originals remain at `C:\\Users\\jacob\\hamon-returnby-completion-checklist-3dcb83a1`. Custody and patch verification are at `C:\\Users\\minec\\hamon-returnby-custody-3dcb83a1`. Download GUIDs and raw commands remain in the unmodified receipts; the manifest pins the compact selected packet.
