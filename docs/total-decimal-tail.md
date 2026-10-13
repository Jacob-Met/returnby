# Reviewing totals with an unfinished numeric match

The total extractor keeps its existing currency and number syntax, but no
longer marks a shortened numeric prefix as a recognized total when more
decimal digits immediately follow it.

For example, `Total: $12.3` previously returned `$12`, and
`Total: €1.234,56` previously returned `€1.23`. Those partial matches now
leave `total` empty and `found.total` false. The existing review form uses
that flag to highlight a field needing attention. Enter the correct literal
amount when reviewing the order; the parser does not convert currencies or
infer a locale.

Specifically, the existing amount match must not end immediately before an
ASCII digit, or a dot/comma immediately followed by an ASCII digit. This also
prevents the regular expression from backtracking to an even shorter prefix.
If a later supported total label has a complete match, that later value can
be selected. A first complete supported total still takes precedence.

Existing integer amounts, comma-containing amounts, two-digit decimal amounts,
currency symbols and whitespace removal are retained. A sentence-ending period
or comma that does not continue a number remains ordinary punctuation:
`Total: $12.34. Thank you.` still returns `$12.34`.
This is a narrow continuation check, not a new number parser or complete
validation of currency notation. Existing exponent, space-separated and other
ambiguous-format heuristics remain outside its scope. Confirm all extracted
fields before saving.

The subtotal label boundary, merchant, order-reference and date extraction,
saved fields, policy lookup and deadline calculation are unchanged.

## Verification

The maintained regression course uses the repository's existing Vitest setup:

```sh
npm ci
npm test -- tests/total-decimal-tail.test.ts
npm test
npm run build
```

It covers partial one-digit and overlong decimals, mixed separators, shorter
backtracking candidates, supported literal amounts and punctuation, later valid
labels, subtotal exclusions, and preservation of every non-total field.
Native qualification records source identities and the actual test/build
runtime separately. Parser execution and source-level review-form binding do
not claim a fresh browser, retailer, stored-data or deployed-site observation.
