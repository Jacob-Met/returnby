# ReturnBy — current return desk

**[Download ReturnBy 0.9.1](https://github.com/Jacob-Met/returnby/releases/tag/v0.9.1)** · [Source](https://github.com/Jacob-Met/returnby/tree/main)

**[Phone: missing purchase date stays for review](https://github.com/Jacob-Met/returnby/releases/download/v0.9.1/purchase-date-review-phone.png)**

A shopper importing an order confirmation now sees a blank purchase date and a useful correction prompt when the text has only delivery, shipment, or return-by dates. An explicit purchase date is still recognized. After correcting the date, the tracker uses that choice rather than a shipping estimate. Paper-receipt proof, saved returns, named trips, backups, and refund follow-through remain in this version.

## Top gaps

1. **Conflicting merchant instructions can still produce the wrong return plan.** The shopper must decide which shipping, delivery, merchant-arrival, or eligibility terms actually apply.
2. **Phone packing appears too far below trip selection.** A shopper needs the return document and packing action without scrolling past repeated explanation.
3. **Saved receipt photos are absent from JSON backups.** Moving to another device can leave restored purchases without their paper proof.
