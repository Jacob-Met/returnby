# Receive a prepared ReturnBy preview

Use this command to check a downloaded preview ZIP, its exact manifest and the
static files served from a fresh extraction. It needs Python 3.11 or later and
only the standard library. It does not run code inside the ZIP.

Get the expected SHA-256 from the delivery record you trust. From the repository:

```sh
python3 -B tools/receive_static_preview.py \
  --archive returnby-intake-and-long-cards-6eef8ae0-v1.zip \
  --sha256 d73df74c588e9387bab391b2cf2c731056a7b1e01feb4bc89bde79a2a829f06f \
  --output new-combined-receiving \
  --port 8799
```

On Windows, use `py -3 -B` instead of `python3 -B`. Quote paths containing
spaces. Relative archive/output paths are relative to the caller's directory.
The output's parent must already exist; the output directory itself must not.
Choose an unused port from 1 through 65535.

## Result

Exit 0 means the complete archive was admitted, the homepage and every
`preview/` file returned HTTP 200 with exact bytes, the owned server exited
successfully, and the archive and extracted files retained their observed
bytes and native metadata.

The output directory contains:

- `package/`: the complete fresh extraction.
- `receiving.json`: exact identities, HTTP responses, server PID/exit and
  conservation results, with an explicit success or failure.
- `server.stdout` and `server.stderr`: the owned server's readiness and
  normal HTTP access log or startup error.

The server stops before the command returns. To explore the app afterward,
follow `package/OPEN-FIRST.md` when the package provides it, or the project's
opening instructions for `package/preview/index.html`. That is a separate
browser session; this receiver does not inspect the app's behavior.

Exit 1 means refusal or incomplete receiving. An archive/manifest refusal or
existing output directory fails before creating a new output directory or
starting a server. A later failure retains the partial extraction and receipt
for inspection. Keep those results; use a different new output directory for
another attempt. The command does not erase a failed course or change the input.

## What admission checks

The expected outer SHA-256 covers the entire ZIP, including its manifest.
The archive must contain ordinary, unique file members, `preview/index.html`
and a `MANIFEST.json` using either `hamon.exact-delivery-manifest/1` or
[`hamon.delivery-zip/1`](#previews-produced-by-the-maintained-estate-zip-packer).
The manifest's `files` array must list every payload except `MANIFEST.json`.
Both formats declare exact `path`, integer `bytes` and `sha256` identities;
the original `hamon.exact-delivery-manifest/1` format also declares and checks
`git_blob`. The packer's format has the additional field and size constraints
listed in its section below.

Paths must be relative and canonical. Directory entries, symlinks, encrypted
members, parent traversal, file/directory collisions and case or Unicode
aliases are refused. Paths also avoid reserved Windows names and characters.
Limits are 64 MiB compressed archive, 16 MiB per file, 128 MiB expanded total,
4,096 members, 16 path components and 1,024 characters per member name.
Reading every admitted member also checks ZIP CRCs.

The helper starts a child running its own maintained static-server code with
the current Python interpreter. The child binds only `127.0.0.1`, disables
address reuse and requests exclusive ownership where Windows provides it.
The parent waits for that child's exact PID and fresh readiness token before
sending any GET. An occupied port refuses without requesting or stopping the
incumbent. The parent closes its owned stdin pipe to stop the server, then
collects the process; a forced stop or nonzero exit cannot count as success.

No proxy, redirect following or external application request is involved in
the receiver's HTTP requests. Packaged HTML and JavaScript are bytes here,
not executed content. The helper does not run the package's `VERIFY.py`,
install dependencies, build, open a browser, read tracker storage, migrate data,
start a service or change an installed copy.

These are integrity and opening-route observations. The caller still evaluates
source provenance and the delivery record. A manifest is not a signature, and
this result is not a browser, accessibility, retailer-policy or security audit.
Archive mode metadata is not a promise about permissions recreated by another
operating system.

## Maintained checks

```sh
python3 -I -B -m unittest discover -s tools -p 'test_receive_*preview.py' -v
```

The ten original command-line cases include a real small HTTP course with Unicode and
percent-bearing filenames; an inert packaged-code tripwire; wrong archive
and payload digests; duplicate, noncanonical and aliased members; a Boolean
byte count; and preservation of existing output and listener sentinels.
The second ten-method module exercises the estate packer's manifest format,
its exact literal and binary HTTP payloads, schema mixing, malformed fields,
name constraints and manifest/file-count limits. The command above runs both
modules (20 test methods). Every subprocess has a bounded wait; fixture
directories are temporary.

The first native author course ran all ten cases on macOS with CPython 3.13.7.
The same candidate then received the already built combined PR71 ZIP: 28
members, 27 payloads and 11 exact HTTP responses (homepage plus ten preview
files), with owned-server exit 0. Neither course rebuilt the application or
opened a browser.

A separate peer froze six cases before candidate exposure and exercised this
same helper on Windows CPython 3.11.9: all six cases /37 checks passed,
including exact Unicode-path HTTP, admission refusals, and preserved occupied
listener/output controls. The successful server exited 0; the bind-refused
child exited 1 without requesting the incumbent. The native evidence and
limits are in the [receiving record](receiving/static-preview-command/README.md).

The combined preview is available through its [Eyes opening guide](https://docs.google.com/document/d/1nwO-iiVNjNjMjURDF-R5NCrauVV43vGgGxEClw1tK4Y/edit).
That guide links the exact saved ZIP in the existing project record. A fresh
saved-download GET on MSI / jacob returned the expected 464,024 bytes and
SHA-256 above; this is separate from the Windows CLI course on MSI / Veria.
Source publication and review are recorded on [PR74](https://github.com/Jacob-Met/returnby/pull/74).


## Second received package: RecallWeave MinHash

The unchanged helper has also received one concrete package from a second
project: the offline RecallWeave MinHash teaching companion. This records that
actual archive and opening route; it does not establish acceptance of arbitrary
applications or replace their own source/browser review.

The package is `RecallWeave-Minhash-Companion-0d3fa410-v1.zip`, **320,771 bytes**,
with SHA-256
`41a78f125d9ff54da3395d7d0e6ffbb08626f5d871087efbc507443d3a5e9cbb`.
Its manifest binds RecallWeave tree
`12ee5a0cc5b23053b71a54bc36dade5d7d286e14`. This standalone package predates the
separate directory-mapping increment; it is not a hosted or main-branch release.

The root contributor ran the exact maintained helper
`2d30a8a10014f8d21e5d34febc1f446e36fceba3` (13,114 bytes, SHA-256
`beb836cc29bd3f44a8a6995cd98cc853e9844c2862f2cfe6dbe173a4f235ecac`)
on Windows with the existing Veria Python 3.11 interpreter, a new output root
and loopback port **8807**. No helper code change was needed.

The [unaltered native receipt](receiving/static-preview-command/recallweave-minhash-receiving.json)
records **57 ZIP members / 56 manifest payloads** and these **four HTTP 200**
responses:

| Route | Exact package member | Bytes |
| --- | --- | ---: |
| `/` | `preview/index.html` | 48,370 |
| `/index.html` | `preview/index.html` | 48,370 |
| `/minhash.md` | `preview/minhash.md` | 10,174 |
| `/probability-foundations.json` | `preview/probability-foundations.json` | 13,164 |

The two homepage routes return the same exact received standalone HTML,
Git `c601c22c99c53aef15de4f21ed4a3fa3ec69b0ce`. The guide is
`ee10d4e34b2a996d4f25944f4fcb623f5b76855c`; the original probability course is
`82cc4bdd8bf22afc5ca84098a0b19c3d485d2f45`. The owned server **PID 33356**
reported readiness and then exited **0**. The outer archive and all **57**
extracted files retained their recorded bytes and native metadata.

For this exact saved ZIP, the same command contract is:

```sh
python3 -B tools/receive_static_preview.py \
  --archive RecallWeave-Minhash-Companion-0d3fa410-v1.zip \
  --sha256 41a78f125d9ff54da3395d7d0e6ffbb08626f5d871087efbc507443d3a5e9cbb \
  --output new-minhash-receiving \
  --port 8807
```

Use the Windows interpreter form described above when appropriate, and choose
an unoccupied port and a new output directory. The recorded server has already
stopped. The package's own opening guide describes the separate direct-file
browser route.

The raw receipt was copied byte-for-byte from RecallWeave Git blob
`49b15dfc66399651c1b0ee0716b5e5584e181d4f`; no receipt data was reserialized.
This documentation update independently read that saved result and performed
no receiver, browser, build, model, course-import or installation replay.
The separately qualified mathematical model and 167-check browser course are
recorded under [RecallWeave issue333](https://github.com/Jacob-Met/RecallWeave/issues/333).
They are not counted again as HTTP checks. The existing no-Actions and
RecallWeave managed-Pages integration boundaries remain unchanged.


## Previews produced by the maintained estate ZIP packer

The receiver also accepts the exact `hamon.delivery-zip/1` manifest produced by
[estate-push-tools make_delivery_zip.py](https://github.com/Jacob-Met/estate-push-tools/blob/38cc62a2bfbd8c05bb75ab84ded70352245fde0b/make_delivery_zip.py).
This connects an existing explicit-file packer to the same receiving command.
The original `hamon.exact-delivery-manifest/1` format remains supported.

For the packer's schema, the top-level fields must be exactly `schema` and
`files`. Every payload row must have exactly `path`, `bytes` and `sha256`.
Digests must be 64 lowercase hexadecimal characters. Extra fields, including a
Git identity or product-tree claim mixed into this schema, are refused.
The receiver compares each supplied byte count and SHA-256 to the complete
actual member and requires exact manifest/archive membership.

The packer's limits also apply: a manifest at most 1 MiB, 1–1,024 payloads,
at most 64 MiB total payload bytes, and printable-ASCII names at most 240
characters without surrounding component spaces or Windows device stems.
Internal spaces and arbitrary literal file bytes are supported. The receiver
retains its own existing limits as well, including 64 MiB compressed archive,
16 MiB per member and 16 path components. A valid general delivery ZIP can
therefore be outside this preview receiver's supported subset. Every accepted
preview still needs `preview/index.html`; only the explicit preview folder is
served. No selected payload script is executed.

Use the producer's separately documented manifest-pin/creation command to
make a new ZIP, then supply its independently retained final archive SHA-256
to the same receiving command shown above. Neither tool authenticates a
publisher or makes arbitrary HTML trustworthy.

The receipt now names `manifest_schema` and `manifest_fields_checked`.
For the packer's schema, the fields checked against manifest declarations are
`bytes` and `sha256`; Git blob identities in HTTP/extracted observations are
computed from received bytes, not supplied by that manifest. The original
schema still checks all three declared fields, including `git_blob`.
The existing source/tree field remains null when the manifest supplies none.

Both schema routes retain the same create-only output, full archive/path
admission, independently identified loopback server, occupied-listener
refusal, orderly owned-server cleanup and byte/metadata preservation.
