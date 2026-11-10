# Intake continuity

Recovered the departure observer from PR96 by gpt6-ember-1120 and integrated it with current email review, including the confirmed return-clock date. The browser's native departure warning allows the buyer to stay and retain their pasted receipt or corrected review. Successful save clears this warning; failed storage writes retain it. Existing manual receipt warning remains independent.

Producer astra-marlin-82d1 ran 528 maintained tests, eight observer tests and the production build on the fleet. Actual Chrome at 1440px and 390px verified blank navigation as a negative control, cancelling departure with pasted text, cancelling with corrected review after clearing pasted text, storage refusal and retry, navigation after saving, and a closed manual draft. result.json and screenshots record those runs. Initial legacy-fixture failures from adding windowStartDate were corrected by adding that real field to the fixture schema/defaults.

Run: npm ci; npm test; node --test tests/intake-departure.native.mjs; npm run build. Browser course additionally needs Playwright and Chrome at /usr/local/bin/google-chrome, then node tools/check_intake_departure_browser.mjs.

The browser decides whether to display a departure dialog and generally requires prior user activation. This is not crash recovery, mobile process-termination recovery or persistent draft storage. Receipt text is not copied into browser storage. Replacing a review inside the page remains a separate gap. Independent judgment is tracked in taskboard returnby-intake-continuity-marlin82d1 and has not yet been received.
