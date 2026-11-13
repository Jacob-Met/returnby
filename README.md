# ReturnBy

ReturnBy is an offline return desk: save a purchase, see what a retailer requires by which date, prepare your return trip, and follow the refund. Your orders and receipt photos stay in your browser.

**[Download ReturnBy 0.12.1](https://github.com/Jacob-Met/returnby/releases/tag/v0.12.1)** · [Source](https://github.com/Jacob-Met/returnby/tree/main)

[Phone: receipt recovery](https://github.com/Jacob-Met/returnby/releases/download/v0.12.0/ReturnBy-v0.12.0-receipt-recovery-phone.png) · [Desktop: receipt review](https://github.com/Jacob-Met/returnby/releases/download/v0.12.0/ReturnBy-v0.12.0-receipt-review-desktop.png)

## Know which deadline you have

Some retailers require **carrier acceptance by one date** and **receipt by the merchant by a later date**. Choose **Ship by (carrier handoff)** as the first action and, when the retailer requires both, enter **Merchant must also receive by** as the second date. Both dates appear on the saved purchase, in the calendar view, the return-trip sheet, spreadsheet exports and backups. Downloading its calendar reminders creates two dated events, each with a distinct identity and alert.

Other returns keep the simpler one-date options: **Return by**, **Drop off by**, or **Merchant must receive by**. ReturnBy does not infer these requirements from a vague policy. Check the merchant's published instructions and confirm both dates yourself. An arrival deadline is not a safe day to mail a parcel.

## Use the desk

Download the archive for your computer: Linux, macOS (Intel or Apple Silicon), Windows, or the Python-based local browser ZIP. The native packages include their runtime and the offline English receipt reader. Open the included launcher, then use the app at **http://127.0.0.1:8769** in your normal browser. Keep the same browser profile and local address when upgrading to keep saved purchases and trips.

You can add a purchase by typing its details, pasting a confirmation email, adding local confirmation files in a batch, or reading a receipt photo. For crumpled or tilted paper, choose **Outline paper**, move the four numbered corners, then straighten it before reading. Very faint print gets a local contrast-recovery pass. Small wrinkled receipts can receive a more focused local read of their printed store and final total, with **Original view** available at any time. The saved paper photo remains untouched; all extracted fields require review. Review the proposed store, order date, confirmed return-clock start, duration, action and any second arrival date before saving. A delivery-based deadline can stay pending until you know the delivery date.

Saved purchases offer editing, a paper-receipt photo, return-document links, calendar reminder downloads, and a printable return-trip checklist. Finish a return to move it to History. Refund follow-up supports partial payments and future check dates.

## Restore saved work

Open **Back up or restore saved returns**, choose a ReturnBy JSON file, and review the additions or changed purchases. The import action appears above the long record list on phones and names the changes it will make. Nothing is imported just by choosing a file; when a saved purchase differs, explicitly choose whether to keep the browser's version or the backup's. Download a new backup from the same panel before changing computers.

## Saved work and privacy

ReturnBy has no account, inbox connection, or remote sync. Your original receipt image is stored in your browser and included in the downloadable JSON backup. Save a new backup before changing devices, clearing browser data, or changing the local server address. Backups are **unencrypted** and may contain order details, photos, return links, refund notes, and private trip notes. Store them securely.

Backups containing a calendar event revision use **version 11**, retaining revisions across computers, edits and History. Earlier versions 1–10 remain readable, including backups with original receipt photos. Update ReturnBy before restoring version 11 into an older app. CSV is for spreadsheet review, not a substitute for a JSON backup.

Calendar files still need to be imported into your calendar app. After changing a deadline, import the updated reminder with the same event identity and a higher revision; calendar apps that honor updates can replace its previous date. When you finish a return or remove a separate merchant-arrival cutoff, the tracker offers a one-event cancellation file to import. Some calendar apps ignore file-import updates or cancellations: check the old event is gone and remove it manually if it remains. ReturnBy never modifies external calendars or sends notifications on its own. Ensure calendar notifications are enabled.

## Build

Requires Node 22+ and a browser.

```sh
npm ci
npm test
npm run build
npm run preview
```

The maintained release builders are `tools/package_release.py` and `tools/package_native.py`. Local-browser courses run from `tools/check_*_browser.mjs` using Playwright and Chrome. The packaged app uses no cloud API for purchases or OCR.
