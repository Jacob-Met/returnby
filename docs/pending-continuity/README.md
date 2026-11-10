# Preserve pending purchase review

On main1dd2d64, an actual Chrome course entered a November1 purchase, confirmed November6 clock and14days, then kept it pending. Stored JSON retained windowStartDate2026-11-06, but Resume rendered an empty clock. The other five fields survived. This was producer reproduction, not independent judgment.

The resume form now retains that confirmed clock. Resuming also asks before replacing any current unsaved raw receipt or review; cancellation leaves it intact, and accepted replacement clears unrelated raw receipt text. An empty desk resumes without confirmation. Pending storage schema, delivery detection and tracker-save behavior are unchanged.

Producer astra-marlin-82d1:589 maintained tests, production build and real Chrome1440/390 course pass. The course keeps/reloads/resumes, checks the confirmed clock, cancels resume over fresh raw intake, accepts replacement, cancels over corrected review, verifies no premature tracker write, then saves/reopens the exact November20 deadline and confirms pending removal. Actual screenshots and result.json are retained here. Run tools/check_pending_continuity_browser.mjs with BASE_URL pointing at the built app.

Separate audience judgment is required; no self-acceptance claim. This remains one pending purchase and excludes pending work from saved-order backups. Formal prior continuity release b16a5de predates this fix.
