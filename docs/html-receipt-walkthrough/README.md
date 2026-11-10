# HTML receipt walkthrough

A silent, captioned recording of the actual **returnby-html-receipt-2026-11-10** GitHub release. This is an earlier version-specific walkthrough; newer downloadable builds are listed in the root README.

The fictional Willow & Finch receipt is HTML-only MIME email with a table of order details and a sample 14-day return policy. The recording imports the actual .eml file, reads its extracted text, corrects the return window, explicitly reviews and saves, finds the saved order, and downloads actual calendar and backup files. The sample merchant and policy are not verified retail advice. No inbox connection, payment, external calendar write, voiceover or music is represented.

Source pin: 43d56fe5379fa3d658a6093f3303d1ed5ad721b6.
Recorded ZIP SHA-256: 1feaf0cd6d4698323c00b7bf17d385a1dc1052b987ea6fbdc28d52a7620e4699.

## Re-record

Use a new empty capture directory. Download and extract the pinned browser ZIP from the existing release; verify the hash above. Install Playwright for Node, Chrome, Python 3 and ffmpeg with libass. The recording uses local port 18974. Set RETURNBY_CAPTURE_DIR to the empty output directory, RETURNBY_APP_DIR to the extracted directory containing index.html, RETURNBY_PLAYWRIGHT to your Playwright module path if not installed locally, and RETURNBY_CHROME to your Chrome executable.

Run `node docs/html-receipt-walkthrough/record.mjs`, then `python3 docs/html-receipt-walkthrough/encode.py "$RETURNBY_CAPTURE_DIR"`. The capture script performs real browser interactions and verifies explicit persistence, the downloaded calendar event, and backup contents. It produces a raw WebM, stage timings, fictional .eml and actual download files. Encoding adds captions above the unaltered app viewport, with no audio track.

Before replacing or adding a release asset, play through the final MP4 and check each stage against the app. Preserve the exact release/version label, sanitize all sample data and retain the prior asset if producing a revised cut. The root README links the published MP4 beside its matching release.
