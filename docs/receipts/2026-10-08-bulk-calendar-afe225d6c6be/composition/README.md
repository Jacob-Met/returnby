# Bulk calendar composition receiving

This is a bounded receiving proof for ReturnBy issue #18. It combines the exact
published editor/storage action stack from PR #16 with current main's date
refresh and the independently corrected bulk calendar contribution.

## Exact inputs

- PR #16 head: `480a99bd6de57ff04089975b34b43856da56fdf9`.
- PR #16 tree: `e439842851966ad29f6fc2787c951967e23358b5`.
- Current main: `3913697f70a31d73e8fe7d02b686b306830c24db`.
- Bulk production patch SHA256:
  `ec9b10f44a9dcb6529f8ab9b499af58abb00b41c3036a4420134ddcf44c9c14c`.
- Composition patch SHA256:
  `b294a2b774990c1a04be65967c787ecbd17b0118c361893d6eda516d28f92987`.

All 81 published base files were materialized with Git blob verification.
`source.json` records the imported main blobs and final source
hashes. `composition.patch` applies to that exact PR #16 source snapshot and
contains ten source/test/harness paths. It does not include or replace the
broader backup/parser integration owned through issue #8.

The combined `main.ts` clears the export in the existing load-failure early
return and lets date refresh restore an existing edit button's focus. The
corrected calendar component's selected-filter callback remains intact.

## Receiving results

The exact PR #16 baseline passed 79 native cases. The final composition passed
105 cases across ten test files and the TypeScript/Vite production build.
`final-native.log` and `final-build.log` retain the
actual output. The build ran the same two commands declared by `npm run build`:
`tsc --noEmit` followed by `vite build`, using the unchanged existing dependency
installation.

The independent browser receiver exercised four groups against that production
bundle in Chromium 153 and saved five real ICS downloads:

1. Editing a saved deadline moved it out of Due soon, updated the export count
   from two to one, and retained its UID with the corrected date in All.
2. A failed current-storage read disabled the bulk export. Retrying used the
   newer saved rows and preserved the unsaved intake text.
3. Initial storage refusal exposed no downloadable rows and recovered normally.
4. Date refresh retained the existing edit action's focus, moved a focused
   newly empty bulk export to the selected filter, and preserved an open editor
   draft and field focus.

Each saved calendar was checked independently for one calendar envelope, exact
visible event identity/order and deadline, the existing three-day alarm, CRLF
content lines, and UTF-8 physical line limits. The run recorded zero page errors
and zero external requests. The 360 px phone layout had no horizontal overflow
and its capture was visually inspected.

`browser.json` contains bundle/source hashes, individual
results and download hashes. The reusable native Node receiver is
`verify-composition.mjs.source` in the receiving packet. It uses only a loopback static
server, synthetic local orders and fresh browser contexts.

## Environment and limits

An initial npm build attempt could not begin while the shared filesystem was
full; the later direct build passed. Automatic review rejected a forced cleanup
command, and those targets were left intact. Browser profiles then used a new
ordinary task directory on the existing process-scoped temporary filesystem;
retained receipts and captures stayed in the persistent execution workspace.
One earlier successful browser run was repeated because its full artifacts had
been placed on process-scoped temporary storage. Only the retained run is
counted here. Raw runtime timestamps are preserved as emitted; they are distinct
from the estate/tool UTC clock used for the receiving checkpoint.

This packet qualifies source composition. Its combined runtime is not published
to main by the bulk-calendar PR, and it makes no claim about the broader backup
or parser stack, live deployment, or import into a particular calendar service.
