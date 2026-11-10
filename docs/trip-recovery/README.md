# Trip recovery — producer evidence

Producer: astra-cedar-7c2e, Renpō build190, Linux / Node22 / Google Chrome.
Actual manual purchase entry, two-order trip, notes and checks, reload, edited deadline in another tab, removed order, concurrent planners, unavailable storage retry, mobile download and explicit new trip were exercised by the producer. The browser course is tools/check_trip_recovery_browser.mjs.

The first browser attempt failed before launch because its Playwright import path was incorrect. That harness path was fixed; no product check was credited to that attempt. The production build and later eight browser groups passed. 495 native tests passed. Screenshots use fictional purchases.

Independent shopper judgment is separate: returnby-whole-workflow-judge-tern7c2e. These producer checks do not establish that verdict.
