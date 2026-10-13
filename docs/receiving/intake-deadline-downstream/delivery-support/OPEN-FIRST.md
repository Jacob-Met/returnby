# ReturnBy — preview a deadline before saving
Received local build • issue 69 / PR70 • package v1 • 13 October 2026

## Open the prepared app

Extract the ZIP into a fresh folder. From that folder, run:

macOS / Linux:
    python3 -B -m http.server 8797 --bind 127.0.0.1 --directory preview

Windows:
    py -3 -B -m http.server 8797 --bind 127.0.0.1 --directory preview

Open http://127.0.0.1:8797/ in a fresh browser profile. Keep the terminal open.
Ctrl+C stops this temporary server. If startup reports that port 8797 is occupied,
do not stop another process; choose an unused port and use its matching URL.
An ordinary new browser window shares the same profile's stored orders.

No npm install, build, account, installer or browser download is needed. Python
3.11 or later with its standard library is sufficient for the opening command.
This separate review origin does not migrate existing browser data. The existing
owner's completion copy at 127.0.0.1:8769 and the earlier review at 8793 remain
separate. This packet does not install an update or publish the hosted website.

## Try the live preview

Paste this fictional confirmation:

    From: Northwind Outfitters <orders@northwind.example>
    Order date: 2026-10-13
    Order # NW-INTAKE-7001
    Order total: $42.50

Choose **Find the deadline**. In the editable review, below Return window (days),
the calculated return-by date initially shows **2026-11-12** for 30 days.

Change Order date to **2026-10-14** and Return window to **14**. The readout changes
to **2026-10-28** before Save. Clearing the date or entering a fractional window
such as 1.5 replaces the readout with a prompt; it does not invent a deadline or
save an order. Restore the complete values before saving.

The readout uses the existing date calculation and reviewed fields. It does not
establish the retailer's actual policy. Confirm that policy with the retailer;
the existing policy/source text and editable fields remain in place.

Optionally select **Save deadline to tracker** with the complete date/window.
The saved card should agree with the preview. Use Remove for this fictional
order when finished. The saved example in the retained screenshots includes a
preexisting fictional control record from receiving; no browser storage/profile
or preseeded saved orders are distributed in this packet.

## What was received

Root independently froze and observed the original before candidate exposure.
The complete original and candidate projections each passed TypeScript and Vite.
The original browser course passed 44 observation/control checks while lacking
this new readout; the candidate passed 46. The separate author unit course passed
28 new cases plus 12 unchanged core cases, 40/40. These counts describe distinct
courses, not a combined test total.

The candidate browser course used a fresh UTC context with macOS/Python 3.13.7,
Playwright 1.63.0 and existing Chrome 155.0.8059.40 at 1280 px and 390 px. It covered
ordinary/leap/year boundaries, missing/invalid inputs, input/change updates,
unrelated edits, repeated Find, three samples, focus and saved-state conservation,
and final preview/Save agreement. No outside requests or page errors were observed.
All 58 original and 60 candidate source files retained bytes/modes/mtimes/inodes.
Managed browser disconnection was observed; an OS Chrome process exit code was
not measured. The unchanged date helper's early-year/timezone semantics remain
outside this increment. No physical-mobile or broad-accessibility claim is made.

The actual screenshots are review/candidate/desktop-review.png and narrow-review.png,
with before-images under review/original/. The PNGs in preview/captures/ are older
public reference assets included by the unchanged build; they are not this new
receiving course's screenshots.

## Exact source and evidence boundary

The app was built once from the 60-file product tree
72168cc88069503805a2fe925875d10db0d37649.
Source publication ed2dc1328ab9da9ea09bae72eddfe4a2ca921a83 and adopted main
3518703f4aa35a2d4f17de01fc1e0bdea11cdd69 have 78 leaves: the same 60 product files
plus 18 documentation/evidence files added after receiving. They do not relabel
the browser's earlier source inventory or imply another build.

https://github.com/Jacob-Met/returnby/pull/70
https://github.com/Jacob-Met/returnby/issues/69#issuecomment-6149068907
https://github.com/Jacob-Met/returnby/blob/3518703f4aa35a2d4f17de01fc1e0bdea11cdd69/docs/INTAKE_DEADLINE_PREVIEW.md
https://github.com/Jacob-Met/returnby/tree/3518703f4aa35a2d4f17de01fc1e0bdea11cdd69/docs/receiving/intake-deadline

The selected three changed product files, both raw browser receipts/build streams,
frozen criteria and executed observer, unit receipt/streams/observer, and exact
published guides are included. The whole repository and dependencies remain at
the source links; they are not duplicated in this practical build packet.
The source intake's earlier certificate/setup failure remains documented in the
receiving record; no completed browser course was discarded or repeated here.
Issue 68 card wrapping and broader stack/deployment work are separate increments.

## Optional integrity check

From the extracted folder:
    python3 -B VERIFY.py
or on Windows:
    py -3 -B VERIFY.py

The verifier checks exact payload membership, sizes and SHA256 using explicit
exceptions, independent of Python optimization flags. It runs no app, browser,
test, server or build. Modes are recorded as archive metadata; identical Windows
native permissions are not asserted. The manifest is an integrity record, not
a signature. Keep the sealed packet intact; put your own notes elsewhere.
