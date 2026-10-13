# Receive a preview made by the maintained estate ZIP packer

This increment connects two existing commands: estate-push-tools'
`make_delivery_zip.py` and ReturnBy's `tools/receive_static_preview.py`.
The packer declares `hamon.delivery-zip/1`; the original receiver admitted only
`hamon.exact-delivery-manifest/1`. The new receiver explicitly admits both,
retaining each format's declared fields and the receiver's narrower preview limits.

Use the [maintained opening instructions](../../RECEIVE_STATIC_PREVIEW.md).
The CLI and its create-only output directory remain the same. Supply the expected
outer ZIP SHA-256 from a delivery record you trust. This is an integrity and
loopback HTTP check; it does not authenticate a publisher or execute packaged code.

## Published source and scope

Base: ReturnBy `a5133ab2dce0675e4698ab7afdbcd412681f96d4`.
The executable change is limited to manifest admission and two receipt fields.

| Source | Git blob |
| --- | --- |
| Original receiver | `2d30a8a10014f8d21e5d34febc1f446e36fceba3` |
| Candidate receiver | `669b1b13ac3c980c8acbba4acff9bb24d71efba4` |
| Unchanged original ten-method tests | `5e3f81450ba70509635a02061075aa6468c8b5a6` |
| New ten-method packer tests | `b1047d89da87387f6445c2e952bde7e4a2060272` |
| Final opening guide | `8f89fa24a7d0cdcf6c6599b0c316d3b950678050` |
| Actual maintained packer | `34e192096abed7216025e8141a9cf3106bb82dfd` |

The packer is unchanged source from
[estate-push-tools commit38cc62a2](https://github.com/Jacob-Met/estate-push-tools/blob/38cc62a2bfbd8c05bb75ab84ded70352245fde0b/make_delivery_zip.py).
The new format requires exact top-level `schema/files`, exact
`path/bytes/sha256` rows, lowercase digests, complete membership and the packer's
manifest/name/count/total-byte bounds. Mixed declarations refuse. The legacy
format still checks its supplied Git identities. The receipt reports which
schema and declared fields were checked; calculated Git identities are byte
observations, not supplied authentication. A packer manifest supplies no product tree.

This receiver still imposes 16 MiB per member and 16 path components, so not every
valid general delivery ZIP is a supported preview. The required homepage remains
`preview/index.html`. Archive admission, occupied-output/listener handling,
private readiness/PID checks, HTTP, orderly server cleanup and custody are unchanged.
Reversing the two implementation spans restores the original receiver exactly.

## Actual native author course

[author/receiving.json](author/receiving.json) and its exact stdout/stderr retain
the completed Windows MSI/Veria CPython3.11.9 course. Outer process23124 was
collected with exit0; child31308 exited0. The actual command was:

```sh
python3 -I -B -m unittest discover -s tools -p 'test_receive_*preview.py' -v
```

All20 test methods passed, including the unchanged ten-method legacy suite.
Subtests are not counted as additional methods. The new suite covers literal
Unicode/CRLF and binary payloads, the explicit new receipt fields, malformed
and mixed schemas, payload mismatch, uppercase SHA, name restrictions, manifest
and payload-count bounds, and Boolean byte counts.

The six source/driver/packet witnesses retained bytes, mode, nanosecond mtime and
inode; the source path set remained exactly four files and no temporary files
remained. Verbose unittest results are in `tests.stderr`; stdout is empty.
The staged guide was `06eb2b15`, before the final prose-only corrections.
The executable and both test modules were unchanged after receiving.
[author/process-collection.json](author/process-collection.json) is a separately
labelled connected-tool process collection, not a native receipt.

## Independent original-first receiving

The peer froze [oracle.json](independent/oracle.json) before candidate exposure.
It executed the actual maintained packer once against four exact fictional
payloads: Unicode/CRLF HTML, all256 byte values, literal Unicode notes and an inert
`VERIFY.py` tripwire. The resulting ZIP was1379 bytes, SHA-256
`3a8bddb245a8951df52543bbd0f3c78221061049d2f26c2b3e8b3f2b220e5f8f`.

| Phase | Actual outcome |
| --- | --- |
| [Original](independent/original-receiving/receiving.json) | 20 checks; the packer ZIP refused with unsupported schema before output, while the legacy mirror received four exact HTTP200 responses. |
| [Candidate](independent/candidate-receiving/receiving.json) | Nine CLI cases /41 checks; packer and legacy ZIPs each received four exact HTTP200 responses, and seven malformed cases refused before output. |

Original outer14656 / observer32456 and candidate outer7156 / observer33532
were collected with exit0. The actual producer child30904 exited0.
Successful owned servers21728 (original legacy),31816 (candidate packer) and25588
(candidate legacy) reported readiness and exited0.

The seven refusals are a mixed row, mixed top-level metadata, a missing legacy
Git field, altered binary payload with a repinned outer archive, uppercase SHA,
a non-ASCII producer member and a duplicate ZIP member. Every case preserved the
packaged-code tripwire. Source/fixture witnesses remained exact (19 original,
20 candidate); successful courses preserved each archive and all five extracted
members. The full record keeps command arguments, child exits, exact streams,
HTTP identities and the three nested receiver receipts.

The final packer receipt explicitly reports `hamon.delivery-zip/1`,
`["bytes", "sha256"]` and null product tree. The legacy receipt reports its
original schema and all three checked fields.

## Evidence custody and review

[MANIFEST.json](MANIFEST.json) indexes70 preserved evidence paths. The independent
[native publication packet](independent/publication-packet.json) retains all63
native source/fixture/archive/receipt/stream files, exact base64 bytes and complete
before/after metadata. The root independently recomputed every one of those63
payloads' size, SHA-256 and Git blob identity, compared metadata without rounding
nanosecond timestamps, and joined declared fixtures to all HTTP/extracted results.
The author raw files were also admitted from their exact native byte packet.

The packet preserves one packing-only failed attempt: process14096 exited1
because an asynchronous staging file was not yet present. The subsequent packing
process34808 exited0 after that dependency completed. No receiving course was
replayed to obtain a better result.

Source and guide were independently reviewed by the source worker. Runtime
receiving and its limits are recorded at
[issue76's peer checkpoint](https://github.com/Jacob-Met/returnby/issues/76#issuecomment-6154695011).
This increment does not change the ReturnBy app, parser-owner work, deployment,
installed applications, workflows or account settings. Native courses used fresh
D: work roots and process-only TEMP/TMP; no dependencies were installed.
