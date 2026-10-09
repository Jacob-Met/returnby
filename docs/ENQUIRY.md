# Prepare a return enquiry

Open **Prepare a return enquiry** above the saved list, beside **Plan a return trip**, or open `enquiry.html` directly. Select a saved order, describe the items, add optional context and a sign-off, and choose the question you want to ask. **Prepare enquiry** creates a subject and message that you can edit before copying or downloading.

The message asks the store to confirm its instructions or eligibility. It uses your saved merchant, order reference and order date as literal text. It does not estimate a refund, interpret amounts or promise that a return is available. This composition uses the completion-aware saved-order reader, so only open orders are selectable. Completed orders remain in tracker history. If you deliberately choose **Reopen return** there, return here and choose **Refresh saved orders** before selecting and preparing a new enquiry. This page never reopens an order itself. A valid completed-only collection has no selectable orders; the existing page uses its generic empty-list message.

## Review and use the message

The final subject and message are editable. **Copy message** and **Download text** use those complete edited fields, including the subject. The file is UTF-8 plain text with CRLF line endings, no BOM, and the filename returnby-enquiry.txt. It contains no script or automatic sending action. Check the actual recipient before using it.

Changing the selected order or the details form keeps your wording and the previous message visible, but disables copy/download until you explicitly prepare a new draft. Preparing replaces edits in the previous message. The page reminds you to review the item details when switching orders.

Item details are required (2,000 UTF-16 code units maximum); optional context allows 4,000 and sign-off 200. The reviewed subject allows 200 on one line and the message 16,000. These match the browser’s native text-field length units.

## Saved data and failures

The page uses the existing strict saved-order reader: the whole list must be readable and admitted. It reads the exact saved raw snapshot again before Prepare, Copy and Download. If another tab changes the collection, refresh and prepare again. This is an optimistic freshness check, not an atomic cross-tab transaction.

Failed refresh preserves the selected order, authored fields and any prepared message. A successful refresh retains wording but requires a fresh preparation. If the selected order disappeared, select another one. The feature performs no storage write and does not repair unreadable records.

A clipboard refusal leaves the message available for download or manual selection. A download-start failure also keeps the draft for explicit retry. A browser download request does not prove that an operating-system save completed. An already requested clipboard operation cannot be recalled, but its late completion will not announce success for a newer draft.

**Clear this draft** asks for confirmation when wording exists. Cancel preserves everything; confirmation clears only this page’s authoring fields and message, keeping the selected saved order. Closing or reloading the page loses unsaved draft wording. No pasted email, draft or clipboard text is persisted by this feature.

There is no inbox access, automatic email, recipient lookup, account, external service, local-storage write, or merchant-policy update.
