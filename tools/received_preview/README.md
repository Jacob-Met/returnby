# Install the received completion preview on a Mac

This V2 installer carries the existing ReturnBy completion/checklist build
into a separate, usable Mac folder. It keeps the original ten application assets
unchanged, retains the original foreground server under `recovery/`, and installs
a separately verified runtime supplied beside the installer. A relocatable
`.command` entry uses the Python interpreter that performs installation. It neither builds the web app
nor changes a hosted installation, existing local copy, or saved browser data.

## Use

Use Python 3.12 or later on the intended Mac. The release packet contains the
exact `received-returnby-83abbe9a.zip` input (260,719 bytes; SHA-256
`816e8d09fbecc27ffeb189aa3c889e48e5bc81f352ccc5b75f5cb9bd64badd71`).

```sh
python3 tools/received_preview/install_macos.py \
  --archive /path/to/received-returnby-83abbe9a.zip \
  --destination "/Users/me/Applications/ReturnBy-Completion-20261012-83abbe9a"
```

The separately pinned replacement is 5,744 bytes, SHA-256
`d2bbfaa4440d639bf20e37bc9b0fc3e20d01c643609f1af11d49a57b27e37ac2`.
Keep this installer beside this `serve_returnby.py`; a lone installer or
an original V1 runtime is not sufficient. The destination must not exist.
Installation admits the complete pinned archive and adjacent regular runtime
before creating the destination, uses exclusive directory/file creation, and
writes the executable entry after all payloads and the receipt. A failed or
interrupted install may leave a partial destination. Keep it for inspection and
choose another new path; installation never removes or overwrites it.

Double-click **Start ReturnBy.command**, open either printed address, and press
Enter in its terminal to stop. The fixed origin is `http://127.0.0.1:8769`.
`index.html` opens the tracker; `trip-checklist.html` opens the separate checklist.
The server refuses an occupied port and closes on Enter or EOF. Closing the
server leaves the user's deliberately saved browser records intact. On macOS,
an immediate reopening may print a waiting message while a closed connection
releases the address. Startup waits at most 60 seconds and accepts Ctrl+C to
cancel. Wait for the printed tracker/checklist addresses before opening the app;
a timeout is a refusal, after which the caller can explicitly try again later.

The generated `START-HERE.md` describes the app, stable origin, explicit
backup/restore, verification, and recovery. `recovery/` retains the complete
qualified input, original server, replacement runtime, and exact installer source.
Verify an installed copy with:

```sh
python3 tools/received_preview/install_macos.py --check "/path/to/installed/copy"
```

From an installed folder, the retained installer can create another new copy:

```sh
python3 recovery/install_macos.py --archive recovery/received-build.zip \
  --destination "/Users/me/Applications/ReturnBy-Completion-Recovered-V2"
```

The recovery installer admits its own adjacent `recovery/serve_returnby.py`.
The exact same verified bytes become both runtime copies in the new destination.
`INSTALLATION.json` uses the `returnby-macos-received-preview-v2` schema and
records separate `originalServerSha256` and `installedServerSha256` fields.
Self-check verifies the original archive/server, all ten assets, both replacement
runtime copies, launcher, guide, and retained installer. V2 deliberately refuses
a V1 receipt; use that original copy's retained V1 checker to verify it. Existing
V1 copies and their recovery files are not rewritten.

The existing Mac manual-receipt copy on port 48643 is a separate source generation.
This installer does not update it or automatically migrate its browser storage.

## Source, original receiving, and limits

The application is exact PR37 commit
`83abbe9a00a5169354df25c734c00340ae73ae43`, tree
`cfd56ce9960f08c4f5983d5a7a3ca054373f34c8`. `ASSETS.json` preserves all ten original
built-file pins; it is not a new build receipt. The original producer's native
delivery and independent browser results are recorded in
[PR37 comment 6078634497](https://github.com/Jacob-Met/returnby/pull/37#issuecomment-6078634497).
Application source authors and the #8/#10/#20 final stack owners retain their
existing scopes.

The original portable foreground entry from that MSI delivery was first carried
into this source tree unchanged (3,931 bytes, SHA-256
`7fa92cf4a00072c714e7367feb09fb7f7e2eaa39cf62c9bbef180b303b6191a2`). It was authored
and received by the `2d2d276bbccc/production_custody` team and retains those results
and limits. It is separate from the PR37 application-source commit. The new
installer is `estate-9846061bd2b7/runtime_integration` work; its results are recorded
separately. This V2 successor preserves that source and receiving history while
separating the original runtime custody from the installed runtime. The full
original `PROVENANCE.json` remains in the unchanged transfer archive.

The original application feature campaign is not repeated by entry receiving.
Source publication or a passing non-Mac test does not establish an installed Mac
application, physical desktop use, or wider stack/hosted adoption.

## Focused receiving

The optional standard-library receiver exercises exact assets, refused archive
and asset changes, refused symlinks, exclusive installation, argument forwarding,
an occupied port, a relocated Unicode/spaces path, and real HTTP/Enter/EOF lifecycle.
V2 also exercises absent, changed, linked, nonregular, truncated, and oversized
adjacent runtimes before destination creation; caller-corrected retries; reuse of
admitted bytes after a source change; custody and receipt changes; recovery through
the retained installer; and partial-write refusal followed by a new destination:

```sh
RETURNBY_RECEIVED_ARCHIVE=/path/to/received-returnby-83abbe9a.zip \
  python3 tests/received_preview/test_install_macos.py
```

It reports its actual host. On another operating system only the installation
platform precondition is simulated in a disposable test directory; shell/server
execution still belongs to that actual host. Such a result is not Mac acceptance.
No package manager, browser profile, existing server, dependency, workflow, or
service configuration is modified by these tests.


## Linux foreground restarts

The source foreground entry now enables address reuse on Linux so it can reopen
at the fixed local origin after an HTTP connection closes. It explicitly keeps
port reuse disabled: a second live copy or another active listener still owns
that address and makes this entry refuse to start. Other platforms retain the
original address-reuse setting.

That change first affected directly consumed server source. The original V1
Mac installer admitted the pinned archive and its original server. V2 retains
that archive and original server unchanged while admitting the separately pinned
adjacent replacement described above. Existing installed copies are not rewritten.
The navigation receiving package applies its server source update separately and
records its own manifest hash.

Run the focused Linux lifecycle receiver with an extracted original received
build containing `ASSETS.json` and `app/`:

```sh
RETURNBY_RECEIVED_DIRECTORY=/path/to/received-build \
  python3 tests/received_preview/test_linux_server_restart.py
```

The receiver checks real HTTP/Enter and HTTP/EOF restarts on one unchanged test
port, refusal of a second live copy, and preservation of an existing listener.
`RETURNBY_SERVER_SOURCE` optionally selects an earlier source file for comparison.
Python documents `SO_REUSEADDR` and closed sockets in `TIME_WAIT` in the
[socket module reference](https://docs.python.org/3/library/socket.html#socket.create_server).

The fixed-port incumbent fixture enables released-address reuse on Linux so a
previous HTTP test does not prevent the test owner from binding. It still leaves
port reuse disabled. On macOS the fixture retains non-reuse binding and may wait
up to 65 seconds for a refused endpoint; a reachable or uncertain endpoint is a
setup refusal. The separate foreground restart matrix covers both incumbent
reuse settings. An optimized installer-test run optimizes the imported installer
and retained checker child; the production launcher still uses its unchanged
recorded Python `-B` invocation. Actual optimized runtime controls are separate.
