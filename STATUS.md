# ReturnBy — current desk

**[Download ReturnBy 0.12.0](https://github.com/Jacob-Met/returnby/releases/tag/v0.12.0)** · [Source](https://github.com/Jacob-Met/returnby/tree/main)

[Phone — faint receipt before/after](https://github.com/Jacob-Met/returnby/releases/download/v0.12.0/ReturnBy-v0.12.0-receipt-recovery-phone.png) · [Desktop — receipt review](https://github.com/Jacob-Met/returnby/releases/download/v0.12.0/ReturnBy-v0.12.0-receipt-review-desktop.png)

The paper-receipt reader now lets shoppers outline the four paper corners, straighten the image, and retry faded text locally. A brighter review image appears when needed; Original view restores the unmodified paper photo, which is still what ReturnBy saves. The local reader recovered merchant, purchase date and total from severely faint print that its first pass could not read. Purchases still require the shopper to review every suggested fact.

## Top gaps

1. **Small, wrinkled receipts still lose the store and final total.** On a real crumpled restaurant receipt, the reader left both fields incomplete; enhanced contrast cannot reconstruct warped letters.
2. **Some calendars retain obsolete reminders after a cancellation import.** ReturnBy cannot confirm whether an external calendar accepted the changed or cancelled event.
3. **A return needing merchant authorization still lacks its specific QR or shipping label.** A receipt or offline trip sheet does not replace the merchant's return authorization.
