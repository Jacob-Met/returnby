# Independent ReturnBy CSV consumer receiving

Reviewer: `estate-ae0a1ea0b247/coordination_review`.

**ACCEPT** the corrected `src/saved-returns-csv.ts` blob
`2636019c2f785b7ce8bbdab8ea7f3c489ad43d9a` at local source commit
`da8e814adbc0f087e2920d3129f998be56234044`, together with the separately reviewed
33-line download initializer, two main binding lines, and separate HTML panel.
The source acceptance is bounded to these exact bytes and their unchanged native
backup, deadline and store dependencies. Publication must retain incoming source
and use the repository's normal gates.

## Concrete finding and correction

The original module `448d7441efd9637a763d2674a44353cd7db155b8` refused an otherwise
valid saved field beginning with U+FEFF. The existing backup admitted and retained
both ordinary leading-BOM text and a BOM-prefixed formula. A default TextDecoder
removed the leading character during the CSV losslessness check, falsely making
both records appear unrepresentable.

`original-448d7441/minimal-refusal.json` records the native four-case witness.
That directory preserves the original four exercised modules, receiver, authored
corpus, failure log and initial TypeScript consumer receipt. The author changed
only the decoder configuration to preserve the literal BOM, plus a comment.
`corrected-minimal-receipt.json` establishes that ordinary text now exports, the
formula receives its reported apostrophe, the ordinary-formula control remains
protected, and a genuinely unpaired surrogate remains refused.

## Independent execution

`receive-with-python.py` supplies twelve original saved records to the actual
TypeScript module through Node 24.19.0's native type stripping. Its small resolver
only supplies the three observed extensionless source imports. No CSV or deadline
implementation is replaced. Python 3.12.14 then consumes each physical CSV using
the standard `csv` module, independently checks every decoded cell, and recreates
the exact bytes using its own CSV writer.

The same corpus ran under UTC, America/New_York and Pacific/Auckland. All three
exports have identical bytes. It includes embedded quotes and CRLF, tabs,
supplementary and combining Unicode, explicit formula-prefix expectations,
leading-zero identifiers, absent optional fields, saved source labels and offset
timestamps. Each export contains twelve records and the independently expected
eleven protected cells. No fictional raw-email or unrelated-property marker is
exported, and the native backup projection agrees with the approved CSV values.

Python civil-date arithmetic separately checks year 1000 and 9999 boundaries,
leap-year and century transitions, month/year changes, and spring/autumn local
clock transitions. The filename's UTC day boundary is checked independently.
Frozen inputs, the supplied Date, and all four source files stay unchanged.

`consumer-contract.ts` additionally passed a strict TypeScript 5.9.3 consumer
check for unknown and typed saved input, numeric count/byte/protection fields,
string output, and the immutable column tuple. Expected type errors are checked.
The exact compiler command and source pin are in its receipt.

The original consumer corpus and all assertions were retained for the corrected
run. Only expected source pins became environment parameters; the initial
receiver copies are preserved for that provenance. The minimal witness driver
was unchanged between its original and corrected executions.

## Scope and reproduction

This packet establishes exact CSV values and prefixes with an independent CSV
consumer. It does not claim Excel or LibreOffice execution, universal spreadsheet
display, or every historical time-zone transition. The author owns the separate
nine/ten native groups and browser evidence; this reviewer did not rerun those
suites or claim their browser execution.

Run the consumer with an accessible checkout containing the indicated local
source commit, or supply equivalent source pins after publication:

```sh
RETURNBY_CSV_REVIEW_COMMIT=da8e814adbc0f087e2920d3129f998be56234044 \
RETURNBY_CSV_REVIEW_BLOB=2636019c2f785b7ce8bbdab8ea7f3c489ad43d9a \
python3 receive-with-python.py /path/to/returnby
```

To reproduce the minimal original refusal without a checkout, run
`node minimal-bom-refusal.mjs /absolute/path/to/original-448d7441/source /new/output.json`.
Use a new receiving directory when rerunning; the scripts create authored input
and evidence files. `MANIFEST.json` binds the frozen complete packet excluding
itself. The review decision and source pins are also in `REVIEW.json`.
