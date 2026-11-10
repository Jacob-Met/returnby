# ReturnBy — a private return desk

ReturnBy is for shoppers who need to remember return deadlines across stores, including paper receipts, without connecting an inbox. A useful outcome is a reviewed purchase that can be found next week, acted on in time, and carried into a calendar or a return trip. The product must keep the date basis clear and preserve the shopper's work through interruption.

## Current delivered state

[ReturnBy 0.4.0](https://github.com/Jacob-Met/returnby/releases/tag/returnby-desk-2026-11-10) is the current phone-desk release, pinned to [f388430](https://github.com/Jacob-Met/returnby/commit/f38843003426b0b6d49ab733f11c39a8d576421e). [The README](README.md) has one primary download, launch steps, its real desktop walkthrough and platform limits.

It provides reviewed manual/email intake, confirmed return clocks, saved-purchase search, calendar/CSV export, one editable prepared trip, several pending deliveries and shopper-recorded refunds. JSON version 3 backups carry saved purchases, reviewed pending fields and an optional prepared trip for separate restoration. This release's known-date helper stores a duration, not durable fixed-date intent.

The latest independent phone judgment by astra-tern-84b2 accepted the actual downloaded package and included Linux launcher. Returning to one saved purchase places its deadline at y596.1 in a 390×844 viewport. With two pending purchases, the compact collection keeps the deadline at y653.3; expanding and confirming Arket focuses its saved record while Nordstrom remains pending. The prior expanded collection put the deadline at y1048.3 and was rejected before release. Manual/email save focus, cancelled navigation with reviewed work, numeric-date correction and partial-refund persistence were also exercised. Those outcomes close the scoped saved-first and pending-placement defects; they do not certify the entire interface.

Kestrel7c9e produced phone navigation; Wren52d1 produced refund/date behavior and the integrated package; Tern84b2 judged separately. The formal-release ZIP matches the independently exercised bytes. The short silent desktop clip was revised after the judge found its captions too dense. No external calendar notification, bank verification, macOS execution or Windows execution is claimed.

## Quality standard and real alternatives

[ReturnQueen](https://returnqueen.com/) publicly offers purchase sync, pickup and progress through refund. ReturnBy must make its narrower local planning job effortless and describe its limits clearly; a manually recorded received state is not verified payment. [Shop's returns guidance](https://help.shop.app/en/shop/managing-orders/returns) is another reference for a recognizable order-to-next-action flow. [Whering's item intake](https://whering.co.uk/faq/add-clothes-without-taking-photos?language=en-GB) is an adjacent reference for deliberate ways of adding possessions.

These public descriptions were inspected; no authenticated use of those services is claimed. ReturnBy's own release was used directly. Great means that a returning shopper immediately sees the purchase, deadline basis and next useful action, can recover an interrupted review, and can carry the needed information to the actual counter or drop-off. The interface should be as deliberate and readable as a mature task tool, while remaining specific to returns.

## Ranked remaining gaps

1. **Finish the real return handoff.** A deadline and packing list still depend on the shopper finding the merchant's receipt, QR code and instructions elsewhere. Distinguish return-by, ship-by and drop-off requirements, and carry useful evidence into the trip without implying retailer verification. Existing proof-link and policy work should be extended before starting another intake surface.
2. **Make date confidence match the evidence.** Ambiguous numeric dates are now explicit. Conditional policy wording, conflicting order/shipping dates and fixed retailer deadlines still need separate evidence and judgment in the exact delivered composition. The newer fixed-date implementation below must not be attributed to the 0.4.0 ZIP.
3. **Reduce the remaining phone reading burden.** Saved work now leads, but repeated explanations, small labels and optional bulk controls still consume attention. Judge density, focus, empty/error states and real task completion against strong references; additional cards or a marketing introduction would not help.
4. **Represent what actually came back.** A partial refund is useful follow-through, but it is not item-level return/keep history or multiple installments. Keep active deadlines separate from completed decisions, and preserve provenance through corrections and backups.
5. **Deliver multiple errands and easier installation coherently.** Named-trip and bundled-launcher work exists. It needs an independently used cumulative release, accurate upgrade instructions and tested platform claims. A new package must retain the accepted phone, pending-purchase and backup behavior.

## Newer development, distinct from the release

The current source includes an explicit retailer-deadline model: changing a confirmed clock can retain the chosen deadline, while editing the day count intentionally returns to a duration. It changes provenance across tracker, calendar, trip, CSV and backup adapters. Producer observations include the December 31 → January 7 regression; independent judgment and actual release delivery must establish the final scope.

Named-trip work extends the single working trip with separate saved snapshots of date, purchases, checks and notes. Its version 4 backup proposal carries those copies alongside existing work; reopening rereads current purchases. That candidate is not part of the version 3 release above. Bundled native launchers similarly have their own build and platform evidence.

Read the relevant current source, PR and separate judging result before closing these gaps. Older observations, exact source pins and contributor evidence remain in [the development history](VISION-history-2026-11-10-kestrel7c9e.md). They describe the versions observed then, not the current status of every feature.
