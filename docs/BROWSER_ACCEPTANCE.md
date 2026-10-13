# Browser acceptance from a build or URL

The maintained receiver `tools/capture_returnby.py` runs the real ReturnBy page
in a new browser context with fictional orders. It checks the review fields
before saving, then exercises the existing tracker, editable return window,
filters, calendar download and phone layout.

Use a Python environment with Playwright and an installed Chrome/Chromium.
The script does not install dependencies, build the app, publish a site or
reuse your ordinary browser profile. Run without Python `-O`; optimized mode
is refused because it removes acceptance assertions.

## Receive an already built directory

Build through the repository's ordinary instructions, or select an exact
already received build. Keep its source/asset hashes with the resulting receipt.

```powershell
py -3 tools/capture_returnby.py --dist C:\work\returnby-build --output-dir C:\work\receiving\run-01
```

`--dist` must contain `index.html`. The receiver serves that directory through
a temporary loopback HTTP server and stops its own server when receiving ends.
It does not change the supplied build. The evidence directory must be outside
that build.

With neither source option, the receiver uses the source checkout's `dist`
directory as before. `--dist` and `--url` are mutually exclusive.

## Receive an existing consumer URL

```powershell
py -3 tools/capture_returnby.py --url https://jacobmetoyer.com/returnby/ --output-dir C:\work\receiving\published-01
```

Supply an absolute HTTP(S) URL to a ReturnBy consumer you intend to inspect.
This makes ordinary requests to that URL and its page resources, then exercises
the page with fictional local browser records. It does not start a local
server or change a deployed site. A URL result records what was actually
served at that time; a matching source revision requires a separate asset
identity check. No certificate or browser security policy is bypassed.

The existing `--chrome` option selects an executable. Its default remains the
usual Windows Chrome path. Pass `--chrome ""` to use Playwright's configured
Chromium, if already available.

## Keep evidence separate from the source

`--output-dir` must name a new directory; existing directories are refused.
Parent directories can be created. If omitted, a unique temporary directory
is created and its absolute path appears in the printed receipt.

Successful receiving keeps these files:

- `result.json`: target, actual parsed review values and their expectations,
  tracker/calendar/layout results, and observed console/HTTP errors.
- `returnby-acceptance.ics`: the actual downloaded calendar bytes.
- `returnby-desktop.png` and `returnby-mobile.png`: actual full-page captures.

A failure after receiving starts keeps a `passed: false` receipt with its
exception and any completed observations/artifacts, and the process still
fails. CLI admission errors occur before receiving and do not claim a run.
Earlier evidence is never overwritten. The script no longer writes captures
into `public/captures` or a calendar into the repository root.

## What the maintained course checks

The first fictional confirmation puts a delivery date before its explicit order
date, and a subtotal before its final order total. The receiver checks merchant,
order number, the exact explicit order date and the final total in the actual
review form before Save. A regression to either earlier extraction defect
therefore fails before a misleading order is saved.

The existing two-order course remains: a 15-day store match, an unlisted
merchant's editable 45-day window, due/all filtering, the actual calendar
download with its three-day alarm, exclusion of pasted-email text from saved
storage, desktop capture and a 390 × 844 phone layout without horizontal
overflow. These are bounded product checks, not verification of real merchant
terms, every calendar property, cross-tab concurrency, complete accessibility
or a deployment.
