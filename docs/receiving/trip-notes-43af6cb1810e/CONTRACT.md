# Typed trip notes contract

A person preparing a return trip can type optional shared pickup/drop-off instructions and include them in the existing reviewed, downloaded offline HTML. Notes are ordinary literal text, not order data or return eligibility facts.

- Up to1,000 Unicode code points; ordinary line breaks and tabs supported. Normalize CRLF/CR to LF as the textarea does. Refuse unsupported control characters or unpaired surrogate values instead of silently losing them.
- Notes remain only in this page's memory until the person downloads a file containing them. No localStorage write, account, inbox, API or schema mutation.
- Changing notes retires the preview and disables download until a new preview. Current saved-order byte checks continue before preview/download.
- Selection/date changes preserve the note draft while retiring the preview. Clear selection preserves the note draft. Explicit Refresh saved orders and page reload clear notes; the page says so.
- Notes are escaped as reading text and included only in the intended checklist, separate from saved facts. Download is self-contained HTML with existing offline/print flow.
- Preserve original tracker/store/parser/deadline/ICS, batch-intake and lookup source. Source fence is native5070. No Actions-triggering public operation.
