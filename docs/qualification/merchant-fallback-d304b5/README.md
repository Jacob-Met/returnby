# Merchant fallback receiving

A confirmation without a `From:` header can name an unrelated merchant that contains a configured alias. The original parser converts `Contosocial` to `contoso`; the existing policy lookup then correctly matches that manufactured alias and offers its fictional 15-day window.

The correction keeps such embedded names out of the fallback match. The merchant remains blank for review and the unchanged lookup returns 30 days with default attribution. Complete known names and aliases retain their existing spelling, order and policy values. `From:` display-name and domain priority are unchanged.

## Source and ownership

- Reservation: [issue 66](https://github.com/Jacob-Met/returnby/issues/66).
- Original main: `7a271cfbc27e6c79a889b90920a700fdbf638e22`, tree `c53ca326af314176e1367b6585e876ed3e560a21`.
- Original parser: 3,284 bytes, SHA-256 `92672dc6e57a0907b1fc4baaae7422c0377026fa946429a594ead98cb537f749`.
- Corrected parser: 3,496 bytes, SHA-256 `fef62a112b19f1729809f6cbc3eb2ad337ebe912a422cd5d1a71cb235ee61b4b`.
- Production delta: replace one fallback loop line with six lines in `src/parse.ts`. No other production file changes.
- [Issue 56 / merged PR 63](https://github.com/Jacob-Met/returnby/pull/63) retains the separate policy lookup repair. This correction leaves that file and its data exact.
- [PR 62](https://github.com/Jacob-Met/returnby/pull/62) retains the three month-token lines and order-reference expression. A temporary composition was qualified; it is not included in this source offer.
- Existing issue 8 / PR 10 / PR 20 owners retain stack and installed-copy adoption.

Letters, combining marks, numbers and underscore belong to the surrounding word. Separators such as spaces, punctuation and emoji permit a complete alias. Aliases are escaped literally, matching remains case insensitive, and configured alias order stays decisive. An empty configured alias retains the original early-stop behavior. This is lexical receipt parsing; it neither authenticates a merchant nor changes return terms. The repository policy table uses fictional examples.

## Run the maintained source course

From this repository with Node 24 or another Node version that supports built-in TypeScript stripping:

```sh
node tests/merchant-fallback.native.mjs
```

To receive a separate exact source snapshot, pass its root directory as the sole argument. The snapshot needs `src/parse.ts`, `src/policy.ts` and `data/policies.json`:

```sh
node tests/merchant-fallback.native.mjs /absolute/path/to/source
```

The course imports the actual parser and executes the actual policy lookup. Its only policy-loader adaptation resolves the existing static JSON import to the exact repository bytes and supplies Node's required JSON import attribute. It does not install packages or modify source files. It prints complete expected and actual records, source identities, runtime version and counts as JSON; a failed expectation exits 1.

## Observed qualification

The 48-case course was frozen before source editing, SHA-256 `727fde788f7aff87e621e1e00d1a9ed3cf522196947b89cdbdce57343b4e2872`.

| Actual Node 24.19.0 course | Passed | Failed |
| --- | ---: | ---: |
| Original main parser with corrected policy lookup | 27 | 21 |
| Corrected merchant fallback | 48 | 0 |
| Temporary composition with PR 62 | 48 | 0 |
| PR 62's unchanged date/reference/deadline course on that composition | 22 | 0 |

The negative cases include embedded ASCII and Unicode words, digits, combining marks and underscore. Controls check complete aliases, literal regular-expression characters, configured order, a later valid merchant, `From:` priority and exact nonmerchant fields.

The temporary composed parser is 3,615 bytes, SHA-256 `0178c91f71a934a7ce72197230236cbca443d690c0542c89fcf92fa81cfd013b`. Its donor is PR 62 commit `cf8fec84d7aeff3d5c9c34dad5585e86a5fc5e06`. The donor's changes and this change apply to separate lines. This is an integration check, not adoption of the donor branch.

An initial edit operation expanded the literal replacement token in the source-writing operation. The frozen literal-alias case caught the resulting invalid regular expression. The failed source and raw error are retained in qualification history; that attempt is not counted as a passing product run. The corrected course is unchanged.

Raw original, corrected and composition outputs accompany the qualification record.

A separate receiver froze 27 expectations before candidate exposure. Its unchanged actual-source course passed 14/27 on the original (13 boundary failures) and 27/27 on the corrected source. The reviewer verified all source fingerprints and the exact inverse of the six-line replacement. Its contract, receiver, original/corrected outputs and review disposition are included under `independent/`.

The independent candidate's first output write exhausted shared temporary storage after writing a partial receipt. It was not accepted as a pass. One unchanged repeat recovered a complete, hash-verified receipt; the partial attempt is retained separately. This is one complete independent candidate result, not two independent successes.

No full Vitest suite, TypeScript/Vite build, browser receiving, installed-copy adoption or main merge is claimed for this narrow offer. Existing test files, package and lockfile, policy data, UI, storage, calendar and workflows are preserved. No GitHub Actions execution is requested.
