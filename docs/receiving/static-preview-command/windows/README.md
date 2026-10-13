# Independent Windows receiving of the preview command

Six cases were frozen before candidate exposure in `frozen-cases.json`.
The receiver exercised the unchanged helper from commit
`8c8d48bd0b7f745fe9a5ad6245bb236f3a7ef3ad`, Git blob
`2d30a8a10014f8d21e5d34febc1f446e36fceba3`. The later evidence-only
head `0ae99e516724d2cdfb1da1cde13af1e5f027f077` preserved that helper.
Its independent review is [retained on PR74](https://github.com/Jacob-Met/returnby/pull/74#pullrequestreview-5507562379).

## Actual result

One course on verified MSI / Veria, Windows CPython 3.11.9, completed with
collected outer PID 21860 exit 0 in 5.46 seconds. All six cases /37 checks
passed. This is a separate peer course, not a replay of the ten author tests.
The original MSI / jacob Python 3.14 stage did not run: the route disconnected
before receiver write/start. Its earlier stage was preserved; it supplies no
test result here.

| Frozen case | Observed result |
| --- | --- |
| Intact Unicode and spaced paths | Five extracted members /four payloads, four exact HTTP responses, owned child 28528 ready and exit 0, listener closed |
| Wrong outer SHA-256 | Exit 1 before output creation |
| Changed payload with matching outer digest | Exit 1 before output creation |
| Duplicate archive member | Exit 1 before output creation |
| Occupied listener | Owned child 30116 exit 1, truthful failed receipt, zero requests to the incumbent, incumbent retained until its own observer stopped it |
| Existing output directory | Exit 1; exact sentinel and directory membership preserved |

The source, frozen criteria and all six archives retained bytes and native
metadata. The packaged VERIFY.py tripwire was never executed. The intact
extraction and the retained failed extraction matched their original payloads.
No browser, dependency install, application build or application code ran.

## Raw evidence

`MANIFEST.json` lists all 28 exact original files /63,600 bytes: frozen
criteria, executed observer, fixture manifest, complete raw receipt, twelve
CLI streams, six ZIP fixtures, both inner receipts and four server streams.
Repeated identical fixtures are intentionally retained under their actual
case paths. The manifest excludes this index and itself.

The native publication packet was 92,672 bytes, SHA-256
`671ac8ff82d91c64f7d035183b85a7c1c0208b2d356019f2f557f5f39755af1e`,
Git blob `6887d9df53a6c8ec9b8c7c57f3d8106d5557434f`. Packing PID23444
exited 0. A preceding packaging-only attempt used the wrong log filename and
failed before creating a packet; the completed CLI course was not repeated.

The executed observer retains its historical native path and is evidence,
not an additional portable command. Use the [maintained command guide](../../../RECEIVE_STATIC_PREVIEW.md)
for normal receiving. Native receipts retain original nanosecond integers
without JSON reserialization. This course establishes bounded CLI behavior
and byte integrity; it does not establish package provenance or browser behavior.
