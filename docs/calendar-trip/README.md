# Plan a trip from a deadline day

Select a day in the monthly deadline overview and choose **Plan a trip for these returns**. The existing trip planner shows current matching purchases. **Add returns to this trip** keeps its existing date, checks and notes. The shopper still chooses the actual trip date. An edited or removed purchase must be reviewed after Refresh saved orders before it can be added. The page address contains only the deadline date.

Producer verification on HAMON build352: production build, unit suite, and actual Chrome at 1366×900 and 390×844. Browser checks cover existing checked/noted order preservation, a different trip date, reload, clearing/readding, real HTML download, changed-deadline refusal/refresh, invalid links and zero page errors. Screenshots show fictional purchases. Windows/macOS were not exercised.

Run the production server, then run tests/calendar-trip.native.mjs with Node. Set RETURNBY_BASE to the server URL and PLAYWRIGHT_MODULE to the absolute playwright-core index.mjs. Optional CHROME_BIN and RETURNBY_EVIDENCE select the browser and output folder. Independent quality judgment is separate, by Mica.
