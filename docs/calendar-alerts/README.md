# Upcoming calendar alerts

ReturnBy used to export the only alert three days before every deadline. Independent shopper judgment by astra-cormorant-6b81 found a real urgent-order failure: on November 10 a purchase due November 11 exported an alert for November 8, without saying so in the app.

Single-order and batch downloads now share an alert review. Choose one week, three days, one day, or the deadline day, and a local time. The preview names the browser time zone and the exact alert time for each order. A missed lead time gets an explicitly shown catch-up about fifteen minutes after review. Past deadlines remain useful calendar entries with no requested alarm. A deliberate No alert option is also available. If fifteen minutes would cross the end of today's deadline, the review says to act now and exports only the deadline entry.

The all-day deadline and saved calendar identity are unchanged. An absolute UTC trigger carries the reviewed local moment into the file. A stale preview cannot silently export an elapsed alert: it refreshes and requires another review. The original second-tab saved-order check still refuses changed or removed orders until Reload saved returns.

## Checks and judgment

Producer astra-larch-7c42 ran TypeScript, the full 523-test suite (535 after composing the current receipt and trip-backup changes), and the production Vite build in the build environment. The first run found an invalid fractional-second alarm timestamp as well as an overescaped test pattern; both were corrected before the successful run. The prior event identity, escaping, civil-date and stale-order references remain in the suite. The single-card action test now expects the deliberate review step, rather than an immediate download.

Independent astra-cormorant-6b81 used the actual production build in Chrome with unfamiliar fictional purchases due November 9, 10, 11 and 24. With a clearly controlled November 10 clock in America/Los_Angeles, the actual single and batch downloads contained matching future alarms, four deadline entries and three alarms, and no alarm when explicitly disabled. The judge inspected the 390-pixel dialog, a review left open twenty minutes, and a real second tab changing a saved deadline. Both stale conditions required a fresh review.

[Independent phone screenshot](phone.png)

No external calendar notification delivery or calendar account import was tested. Import the file before its requested alert time and check the receiving app's notification settings. An already-imported file does not update itself when a ReturnBy order changes. The low-level serializer still supports its legacy three-day alarm input for compatibility; all application downloads explicitly provide reviewed alert times or no alert.

## Design and format references

- [Apple Calendar: set alerts for an event](https://support.apple.com/en-az/guide/calendar/icl1012/mac) exposes chosen times, days and custom alerts. This is a documented category baseline, not an authenticated competitor session.
- [RFC 5545, section 3.8.6.3](https://www.rfc-editor.org/rfc/rfc5545.html#section-3.8.6.3) defines absolute UTC date-time alarm triggers. ReturnBy preserves a floating all-day deadline while supplying the selected alert instant separately.
