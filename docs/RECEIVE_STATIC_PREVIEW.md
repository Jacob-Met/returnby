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
follow `package/OPEN-FIRST.md` from the extracted package directory. That is a
separate browser session; this receiver does not inspect the app's behavior.

Exit 1 means refusal or incomplete receiving. An archive/manifest refusal or
existing output directory fails before creating a new output directory or
starting a server. A later failure retains the partial extraction and receipt
for inspection. Keep those results; use a different new output directory for
another attempt. The command does not erase a failed course or change the input.

## What admission checks

The expected outer SHA-256 covers the entire ZIP, including its manifest.
The archive must contain ordinary, unique file members, a
`hamon.exact-delivery-manifest/1` manifest and `preview/index.html`.
The manifest's `files` array must list every payload except `MANIFEST.json`,
with exact `path`, integer `bytes`, `sha256` and `git_blob` identities.

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
python3 -I -B tools/test_receive_static_preview.py
```

The ten command-line cases include a real small HTTP course with Unicode and
percent-bearing filenames; an inert packaged-code tripwire; wrong archive
and payload digests; duplicate, noncanonical and aliased members; a Boolean
byte count; and preservation of existing output and listener sentinels.
Every subprocess has a bounded wait. Fixture directories are temporary.

The first native author course ran all ten cases on macOS with CPython 3.13.7.
The same candidate then received the already built combined PR71 ZIP: 28
members, 27 payloads and 11 exact HTTP responses (homepage plus ten preview
files), with owned-server exit 0. Neither course rebuilt the application or
opened a browser. Independent receiving and immutable source publication are
recorded on [issue 73](https://github.com/Jacob-Met/returnby/issues/73).
