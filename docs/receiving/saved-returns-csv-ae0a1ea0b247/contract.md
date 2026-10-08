# Saved-return CSV receiving contract

Owner: estate-ae0a1ea0b247 / agreement_review. Native scope: ReturnBy #8 comment 6060332838. Existing #8/#10 ownership retains final integration. The source base is #20 `7829e56e57ef91dfe8edd5853fd68d6c7890fac0`, tree `b28e7b706fe67fd4b34111badd581c6bdd2ed4a7`; the small 25-leaf runtime closure is independently hash verified. Local exact closure commit: `291244539d1a15748bcc059068bafa3db9a043b6`.

## Product result

The user explicitly downloads all currently saved returns as a UTF-8 CSV for spreadsheet review. The CSV contains saved identity, store, order number, total exactly as entered, order date, return-window days, recorded window source, the existing native return deadline and original creation timestamp. Rows sort by native deadline, then saved ID. No currency is inferred for the saved total, no deadline/policy is revalidated with a retailer, and no new deadline algorithm or dynamic urgency state is introduced.

The exporter reuses the existing backup projection and validation; unsaved email text and arbitrary extra local fields cannot enter the CSV. It retains the same 10,000-order admission bound and adds a 5 MiB output bound. Unknown/duplicate identities, invalid native dates/windows, malformed UTF-8 text and unsupported control characters cause a whole-export refusal before download. An empty tracker gives an explicit no-saved-returns result.

All fields are quoted, embedded quotes are doubled, rows use CRLF and a UTF-8 BOM helps spreadsheet decoding. Text that could be interpreted as a formula, including leading whitespace before a formula marker, receives a leading apostrophe. The result and UI report how many cells were protected. CSV is a review format, not an exact restore format: spreadsheet import settings can interpret dates/numeric-looking text, and JSON remains the original editing/restore representation. Do not claim universal spreadsheet rendering or execution behavior.

## User-flow boundary

The separate synchronous download binding reads the current saved store on each explicit click and does not write it or modify the application's accepted list, search/filter, intake draft, open editor or admitted import preview. A failed read/validation/download leaves those states intact. Retry reads storage again. The control explicitly exports the whole saved tracker, regardless of visible search/date filters.

Only new CSV modules/tests and adjacent HTML/main initialization/help are in scope. Existing backup, store, parser, policy, deadline, calendar, editing, search and undo modules/lifetimes remain with their owners. No account, external provider, email content, installed site or runtime service is involved. Synthetic cases, actual file bytes and a browser consumer will support the final handoff; source publication and final integration remain distinct.
