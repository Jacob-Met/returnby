# Review several confirmations

From the tracker’s intake panel, choose **Review several order confirmations together**. The separate page uses the same local extraction rules, merchant table and deadline calculation as the tracker.

## Add and review

Paste one confirmation and choose **Add pasted confirmation**, or choose several UTF-8 `.txt` files. Keep one order confirmation in each file. The batch accepts at most 20 confirmations, 100 KiB per confirmation, and 1 MiB of original text in total. If any file fails admission or reading, none of that selected group is added; previous drafts and corrections remain.

Each confirmation has independent store, order number, order date, amount and return-window fields. Read the original text from its disclosure when needed. Correct the fields, then explicitly check **I reviewed these fields. Include this order.** Changing any field clears that order’s review check and retires the final preview.

Store and order number may remain empty, as in the existing tracker. The date must be a real supported calendar date. The window must be a positive whole number whose deadline and following calendar day are supported. Amounts remain literal text; the page does not add them or estimate refunds.

The supplied local rules are extraction aids. They do not verify a current retailer policy. A corrected merchant retains the chosen duration; the final preview recomputes whether that duration comes from the corrected merchant’s current local rule, the local fallback, or the person’s chosen window.

## Preview and save

Choose **Review selection** to inspect every selected new order and the number of existing saved records. The complete saved list must pass the shipped checklist reader’s limits and core-record checks: at most 2,000 records and 2 MiB. A refused list is left untouched.

Possible matches use a nonempty store and order number, ignoring case and surrounding spaces. A matching identity may refer to another saved record or an earlier selected confirmation. Review the warning and explicitly acknowledge it to add all selected orders. The page does not deduplicate, replace or reopen saved orders.

**Save reviewed orders** performs one append through the existing native store writer, after rereading the exact saved snapshot used by the preview. Existing record order and all JSON fields as read, including extra fields, are retained. The strict reader’s projected core fields are not substituted for the original stored objects. JSON formatting is not retained.

On success, only the saved confirmations leave the batch. Unselected drafts stay. Open the tracker to see the saved result.

## Refusal and retry

If the saved bytes change between preview and Save, the whole append is refused. Keep the drafts and choose **Review selection** again to inspect the current saved state.

A failed read or write keeps the drafts. An ordinary rejected local-storage write can be retried from the same preview with the same new IDs and creation timestamps. If a write took effect before an error was reported, the changed snapshot prevents that preview from appending a duplicate batch.

The final reread is optimistic. Browser storage has no transaction spanning this check and another tab’s write. It does not prevent a concurrent writer from racing after the check. Use one tracker tab while saving.

## Privacy and scope

Original confirmation text, source filenames, selections and unsaved corrections remain only in this page’s memory. They are never included in saved Order records. The page performs no upload, inbox read or network parsing. Leaving or reloading the page discards unsaved drafts.

Discarding a batch affects only this page’s transient drafts. Existing main intake, saved-order actions, parser/policy, calendar, checklist and the portable-recovery/completion contributions remain separate owner scopes.
