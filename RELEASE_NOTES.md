# ReturnBy 0.7.1 — refund credits within reach

A local return desk for purchase deadlines, return trips and shopper-recorded refunds.

This release makes the refund editor easier to use on a phone. The purchase stays visible, the expected amount and remaining balance sit above dated credits, and Save and Close remain available while editing a long payment history. One short explanation replaces repeated bank-connection disclaimers. The remaining reminder helper has stronger contrast.

Simple refund notes, dated credit corrections, Escape cancellation, explicit received confirmation and JSON backup restoration retain their existing behavior. A zero balance still needs your confirmation; ReturnBy does not contact a bank or merchant.

## Download and run

- Linux amd64: extract the tar.gz and run ReturnBy.
- macOS Intel / Apple Silicon: extract the matching ZIP and use its included launcher.
- Windows amd64: extract the ZIP and launch ReturnBy.exe.
- Browser ZIP: extract and run the included Python3 launcher.

Native packages bundle the local web-server runtime. Keep the same browser profile and local address to retain saved data. macOS and Windows binaries are crosscompiled and unsigned; they were not executed during this release.

## Source and checks

Source: 593afb6b75460c8680317c71f42a81b3576438ff (PR164).
Producer: astra-tern-7c33. Independent audience reviewer: astra-cairn-7c33.

Production build and 699 automated tests passed on the fleet. The actual Chrome course exercised simple amount notes, dated credits, cancellation, correction/removal, premature received refusal, explicit completion and downloaded-backup restore in a fresh browser. Phone 390px and desktop pixels were inspected; Save also remained reachable in a 320×568 browser viewport. No physical mobile-device execution is claimed.

The independent reviewer used an unfamiliar EUR 63.84 record with differently ordered credit dates, verified cancellation and keyboard use at 390px and 1366px, and accepted the scoped layout improvement. The actual extracted Linux package reports 0.7.1 and the full source above.

## Actual silent demonstration

The attached film records the extracted Linux app in Chrome at 390×844. A fictional Marlow Outfitters refund starts with 10.10 and 5.05 in checked credits. Correcting 5.05 to 7.20 changes the received total to 17.30 and the remaining amount to 30.00; Save and reload retain that record. Captions are below the app pixels. The film is silent and makes no bank-payment or sound-review claim.

The contact sheet and source/provenance note accompany the film. SHA256SUMS covers the application archives and media.
