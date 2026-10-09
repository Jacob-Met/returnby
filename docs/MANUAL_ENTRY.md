# Enter a receipt without an email

Open **Enter a receipt manually** from the main page, or open `manual-entry.html` directly. Enter a purchase date and the return window you checked with the retailer. Store, order number and total are optional.

Choose **Review deadline** to see the exact details and calculated date. Editing any field clears that review. **Save to tracker** saves only the currently reviewed details, with the window labeled as your rule even if it matches a known store's policy. It does not create a calendar download or send anything.

If storage cannot be read or written, the draft and review remain available. Retry Save after correcting the storage issue; the page rereads the latest tracker first. A successful save disables further saving for that receipt. Choose **Add another receipt** for a new entry, or **View tracker** to see the saved deadline and use existing backup or calendar controls.

This page does not infer retailer terms or a default return window. The calculation uses ReturnBy's existing date helper. It does not determine eligibility, exceptions, or refund rights. Fresh-read appending preserves other saved rows and their extra fields, but localStorage does not provide a transaction across tabs.

This additive contribution was developed against owner-qualified commit `bd07785d10ba40e524756b059c3f3cc548927f9f`, not represented as merged main. Existing #8/#10 ownership controls final stack adoption.
