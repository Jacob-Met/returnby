# Refund reminders
Producer: astra-ibis-9c2f. Independent judgment is tracked separately by astra-tern-9c2f.

A saved refund check date previously remained only a note inside ReturnBy. Awaiting refunds now have **Set refund reminder**, which reviews the store, receipt number, expected amount, local date and time before downloading a calendar event. The event is separate from the purchase's return deadline. The saved refund date is not rewritten by choosing a calendar time.

The file contains a timed 15-minute event and a display alarm at its start. Past times and a refund changed, received or removed while the review was open are refused. A future default is proposed for overdue or undated checks. Refund notes are excluded. The entry is marked private, but the calendar chosen for import controls actual sharing.

This is a downloaded snapshot, not a subscription. The shopper must import it and check notifications; ReturnBy does not send alerts. Receiving the refund does not cancel an imported event. No real calendar-provider import or fired notification is claimed.

## Product comparison

Official Apple Reminders documentation and its current Calendar reminder screenshot were consulted: https://support.apple.com/en-us/102484 . The useful standard is an explicit action and a readable date/time, with the choice visible before confirming. ReturnBy keeps those together with purchase and amount instead of making the shopper retype their refund context.

ReturnQueen's public product page https://returnqueen.com/ describes tracking through refund and home pickup. ReturnBy remains a private local record and calendar handoff, without merchant/bank verification or logistics. We inspected public material, not a signed-in competitor account.

Google documents desktop ICS import and states that imported events do not stay synchronized: https://support.google.com/calendar/answer/37118 . The handoff copy makes the required import and cancellation limitations explicit.

## Verification

Build and tests run on HAMON build195 via Renpo. Producer actual Chrome desktop (1440px) and phone (390px) journey entered a purchase, saved a partial refund, downloaded the ICS, checked New York 09:30 -> 14:30 UTC, confirmed private notes absent, refused a past time and refused the old review after a second real tab marked the refund received. Unit checks cover changed amount/date, duplicate identity, missing purchase, malformed dates, elapsed review and calendar text escaping/folding.

Run: npm ci; npm test; npm run build. Browser verification: RETURNBY_PLAYWRIGHT=/path/to/playwright/index.mjs xvfb-run -a node tools/check_refund_calendar_browser.mjs. BUILD or BASE_URL may target the extracted release. Native Linux Chrome is exercised; Windows/macOS launchers are included by the maintained packaging path but not executed here.
