# ReturnBy — current desk

**[Download ReturnBy 0.12.1](https://github.com/Jacob-Met/returnby/releases/tag/v0.12.1)** · [Source](https://github.com/Jacob-Met/returnby/tree/main)

[Phone — receipt review](https://github.com/Jacob-Met/returnby/releases/download/v0.12.1/ReturnBy-v0.12.1-receipt-review-phone.png) · [Desktop — receipt review](https://github.com/Jacob-Met/returnby/releases/download/v0.12.1/ReturnBy-v0.12.1-receipt-review-desktop.png)

The local receipt reader now recovers the printed store and final paid total from a real small, wrinkled restaurant receipt that the previous release missed. In the downloadable Linux app it suggested Brixx and $14.46, left the unclear date blank, and kept the original image for review. The existing offline photo-to-saved-purchase flow still works.

## Top gaps

1. **Some calendar apps retain obsolete reminders after a return date changes or is cancelled.** An imported update or cancellation does not always remove the old reminder, leaving shoppers with conflicting deadlines.
2. **Returns that require merchant authorization still lack the merchant's actual QR code or shipping label.** A paper receipt or an offline trip sheet alone will not get these parcels accepted.
3. **Other severely creased receipt layouts can still hide necessary printed facts.** Recovery succeeds on the observed restaurant photo, but folds and missing ink can leave store, date or total unreadable elsewhere.
