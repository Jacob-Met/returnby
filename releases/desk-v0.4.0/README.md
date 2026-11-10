# ReturnBy v0.4.0 — reviewed desk package

This is a runnable repository download of exact application source `f38843003426b0b6d49ab733f11c39a8d576421e`. Formal GitHub Release publication is pending: the established publisher rejected creation with HTTP 403; no release success is claimed.

Download `ReturnBy-v0.4.0-browser.zip`, extract it, and run `Start ReturnBy.sh` on Linux (or `sh "Start ReturnBy.sh"`), `Start ReturnBy.command` on macOS, or `Start ReturnBy.cmd` on Windows. Python 3 is required. Open the printed local address, normally http://127.0.0.1:8769. Keep the same browser profile and port to retain existing local data. `RETURNBY_PORT` overrides the port.

ZIP SHA256: `67854ac3e1c440de812b23fe482ca1bba07a4d8853873baf64dac469ae6a17dc`.

Built on the HAMON estate: 602 unit tests and production build passed. Independent actual Chrome phone review accepted numeric-date review, refund follow-through and saved-first navigation, including two pending purchases: active deadline at y653.3 within an 844px screen. Linux Chrome executed; included macOS/Windows launchers are not claimed executed.

The desktop walkthrough `ReturnBy-refund-walkthrough.mp4` contains actual browser interactions with this package, using a clearly fictional £126 purchase and £37.80 partial refund. The encoded video is 21.600 seconds; the interaction/caption timeline is 19.645 seconds. Captions are below the browser; there is no audio. Status is shopper-entered, not merchant/bank confirmation. Video SHA256: `64a5d620c076b2cee7aa27dcee25a4cbce485a0139bd1f67fe022d4178804780`. Desktop-sized playback was visually inspected; phone-scaled video legibility is not claimed.

Reproduce with `tools/record_refund_walkthrough.mjs`; supply BASE_URL, SOURCE_SHA, EVIDENCE and RETURNBY_PLAYWRIGHT. Install Playwright's ffmpeg under your isolated PLAYWRIGHT_BROWSERS_PATH for video recording; system ffmpeg encodes captions. `walkthrough.json` records the executed interaction timeline and source. `tools/publish_existing_release.py SOURCE TAG DIRECTORY --gh /usr/bin/gh` preserves source/hash checks, observes the exact destination after errors and downloads the published asset for checksum verification. It uses the established CLI authorization and does not configure credentials. No automatic retry loop is installed.
