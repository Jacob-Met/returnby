# ReturnBy local enquiry composer — frozen receiving contract

Owner: hamon-ultra-ab529ac65023-20261008/coordination-integration.
Canonical source: 1e662c387be5f66f8499fac7ec443f58d2198379 / tree503ea217dc35f54aa7c9dbd1f92217544ad6dbc9.
Native Windows source is an explicitly labelled 34-file canonical runtime projection; final source composition must preserve all54 canonical leaves except the three additive entry/documentation spans.

## Product outcome
From the tracker, open a separate "Prepare a return enquiry" page. Read the existing saved collection with the unchanged strict parseSavedOrders/readSavedOrders reader. Select one saved order, author item details, optional reason/context and sign-off, and choose return instructions, exchange options, or an eligibility question. Prepare a plain-text subject and message, edit them explicitly, then copy the complete text or download it as UTF-8 .txt. This page sends nothing and writes no saved data. It does not confirm eligibility, reserve a return, calculate a refund, interpret the literal total, or change any lifecycle state. Saved completed records are historical saved orders, not a claim of open eligibility.

Exact source fence: new enquiry.html, src/enquiry.ts, src/enquiry-view.ts, src/enquiry.css, focused tests/receiver/guide/evidence. Only one link in index.html, one input in vite.config.ts and an additive README section touch existing files. All existing main/store/parser/policy/date/calendar/checklist source, tests, dependency lock and workflows remain exact.

## Frozen model contract
- Select only an ID present in the admitted snapshot; missing/unknown IDs refuse.
- Preserve saved merchant, order number and order date as literal message text. Missing merchant/order number is explicitly "Not recorded". Do not include derived deadline, amount, window, completion inference or retailer contact information.
- Item details are required and at most2000 UTF-16 code units; reason/context at most4000; sign-off at most200. Fields are strings; whitespace-only item details refuse, while otherwise text is retained literally. Request is exactly instructions/exchange/eligibility.
- Fixed initial subjects are "Return instructions enquiry", "Exchange options enquiry", "Return eligibility enquiry". They contain no inferred address or merchant identity.
- Message uses a literal authored template with saved facts and user text. It asks the retailer to confirm eligibility, relevant deadline, steps and any applicable requirements. It never asserts an entitlement or that an action was submitted.
- Generated draft is frozen and does not mutate the snapshot or its raw storage string.
- User-edited subject must be nonblank, at most200 units and one line; body must be nonblank and at most16000 units. Download/copy text is "Subject: "+subject+CRLF+CRLF+body with all line endings normalized to CRLF, then one final CRLF. Unicode and other text remain literal; no BOM. Filename is fixed returnby-enquiry.txt.

## Frozen controller contract
- A failed initial read is an explicit error, not an empty successful list. Failed refresh preserves the prior selected order, all author fields and draft.
- Refresh succeeds atomically: retain user-authored fields, retain selection if its ID remains, invalidate prior preview and require explicit Prepare again. If the order disappeared, retain authored text and require another selection. No automatic source replacement becomes exportable.
- Changing selection retains authored fields but invalidates the prepared preview, with explicit visible guidance to review item details for the new order. No silent clearing.
- Editing an input detail invalidates the prepared preview and disables copy/download, retaining its visible message until explicit Prepare. Editing subject/body keeps the prepared source binding.
- Preparing rereads the exact saved raw snapshot first. Copy/download also reread it immediately before their effect. Any change or read failure refuses the action without storage writes, clipboard invocation or Blob allocation; prior fields/message remain. This is optimistic freshness, not a cross-tab transaction.
- Copy uses a single explicit clipboard.writeText call. Missing/rejected clipboard support keeps the full message and provides the download alternative. No automatic retry.
- Download uses only the reviewed formatted text. URL allocation failure keeps the draft and permits explicit retry. Revoke only the URL created by the action; no claim that OS save completed merely because anchor.click returned.
- Pending clipboard completion must not overwrite status for a newer preparation/selection. Own operation identity guards asynchronous feedback.
- Reset is explicit and confirmed when authored work exists; cancellation changes nothing. Successful reset clears author fields/preview and retains the selected saved order.
- Use textContent/value for all authored/saved text. No email transport, mailto launch, network parsing, Worker, account, external asset, local/session storage write or dependency change.

## Frozen actual-browser groups
1. Original exact build has no enquiry entry/page; existing tracker controls load. Candidate link opens actual built enquiry page.
2. Two authored saved orders (including markup-like/Unicode/newline strings and unrelated nested/completion fields) produce exact subject/body and actual downloaded bytes matching independent literal expectations. Whole raw storage and other keys remain byte-exact.
3. Item/reason/request edits retain old text but disable effects until Prepare; editable final subject/body is reflected exactly in actual download. Switching orders preserves user wording while requiring new review.
4. Empty, invalid and unreadable saved data refuse without writes. Refresh read failure preserves all work. Real same-origin second-tab changes invalidate Prepare/copy/download; explicit refresh+Prepare uses the changed saved facts.
5. Controlled clipboard port receives exactly the reviewed text; rejection/missing support preserve retry/download. Delayed completion cannot announce a stale draft as the current copy. This is browser-controller receiving with a stubbed clipboard port, not an OS clipboard acceptance claim.
6. Injected createObjectURL failure preserves edited draft; explicit retry produces one actual completed download with exact bytes. All observed download GUIDs must complete and be individually checked; no unexamined extras.
7. Keyboard-only selection/input/Prepare/Enter download and390px layout receive visible focus, readable fields, no body overflow; inspect desktop/phone captures. Reset-cancel preserves all work and reset-confirm clears only this page.
8. Storage snapshots before/after every effect plus instrumented write/storage/Worker/off-origin boundaries establish no tracker mutation or network/send. Current canonical source pins remain exact before/after tests.

All fixtures are synthetic and isolated. Preserve original failures and harness corrections. Node/Vitest/build, actual browser, controlled clipboard port, real downloaded files, visual inspection and final current-parent source composition remain distinct gates. No GitHub Actions or trigger-capable publication.
