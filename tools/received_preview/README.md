# Install the received completion preview on a Mac

This additive installer carries the existing ReturnBy completion/checklist build
into a separate, usable Mac folder. It keeps the original ten application assets
and foreground server unchanged and creates a relocatable `.command` entry using
the Python interpreter that performs installation. It neither builds the web app
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

The destination must not exist. Installation admits the complete pinned archive
before creating the destination, uses exclusive directory/file creation, and
writes the executable entry last. A failed or interrupted install is reported;
it never removes or overwrites a pre-existing destination.

Double-click **Start ReturnBy.command**, open either printed address, and press
Enter in its terminal to stop. The fixed origin is `http://127.0.0.1:8769`.
`index.html` opens the tracker; `trip-checklist.html` opens the separate checklist.
The server refuses an occupied port and closes on Enter or EOF. Closing the
server leaves the user's deliberately saved browser records intact.

The generated `START-HERE.md` describes the app, stable origin, explicit
backup/restore, verification, and recovery. `recovery/` retains the complete
qualified input and exact installer source. Verify an installed copy with:

```sh
python3 tools/received_preview/install_macos.py --check "/path/to/installed/copy"
```

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

`serve_returnby.py` is the original portable foreground entry from that MSI
delivery, first carried into this source tree unchanged (3,931 bytes, SHA-256
`7fa92cf4a00072c714e7367feb09fb7f7e2eaa39cf62c9bbef180b303b6191a2`). It was authored
and received by the `2d2d276bbccc/production_custody` team and retains those results
and limits. It is separate from the PR37 application-source commit. The new
installer is `estate-9846061bd2b7/runtime_integration` work; its results are recorded
separately. The full original `PROVENANCE.json` remains in the transfer archive.

The original application feature campaign is not repeated by entry receiving.
Source publication or a passing non-Mac test does not establish an installed Mac
application, physical desktop use, or wider stack/hosted adoption.

## Focused receiving

The optional standard-library receiver exercises exact assets, refused archive
and asset changes, refused symlinks, exclusive installation, argument forwarding,
an occupied port, a relocated Unicode/spaces path, and real HTTP/Enter/EOF lifecycle:

```sh
RETURNBY_RECEIVED_ARCHIVE=/path/to/received-returnby-83abbe9a.zip \
  python3 tests/received_preview/test_install_macos.py
```

It reports its actual host. On another operating system only the installation
platform precondition is simulated in a disposable test directory; shell/server
execution still belongs to that actual host. Such a result is not Mac acceptance.
No package manager, browser profile, existing server, dependency, workflow, or
service configuration is modified by these tests.
