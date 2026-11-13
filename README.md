# ReturnBy

ReturnBy is an offline return desk: save a purchase, see what a retailer requires by which date, prepare your return trip, and follow the refund. Your orders and receipt photos stay in your browser.

**[Download ReturnBy 0.14.0](https://github.com/Jacob-Met/returnby/releases/tag/v0.14.0)** · [Source](https://github.com/Jacob-Met/returnby/tree/main)

The saved return desk now carries the real merchant-issued QR code or shipping label into the offline return trip.

## Know which deadline you have

Some retailers require **carrier acceptance by one date** and **receipt by the merchant by a later date**. Choose **Ship by (carrier handoff)** as the first action and, when the retailer requires both, enter **Merchant must also receive by** as the second date. Both dates appear on the saved purchase, in the calendar view, the return-trip sheet, spreadsheet exports and backups. Downloading its calendar reminders creates two dated events, each with a distinct identity and alert.

Other returns keep the simpler one-date options: **Return by**, **Drop off by**, or **Merchant must receive by**. ReturnBy does not infer these requirements from a vague policy. Check the merchant's published instructions and confirm both dates yourself. An arrival deadline is not a safe day to mail a parcel.

## Use the desk

Download the archive for your computer: Linux, macOS (Intel or Apple Silicon), Windows, or the Python-based local browser ZIP. The native packages include their runtime and the offline English receipt reader. Open the included launcher, then use the app at **http://127.0.0.1:8769** in your normal browser. Keep the same browser profile and local address when upgrading to keep saved purchases and trips.

You can add a purchase by typing its details, pasting a confirmation email, adding local confirmation files in a batch, or reading a receipt photo. For crumpled or tilted paper, choose **Outline paper**, move the four numbered corners, then straighten it before reading. Very faint print gets a local contrast-recovery pass. Small wrinkled receipts can receive a more focused local read of their printed store and final total, with **Original view** available at any time. The saved paper photo remains untouched; all extracted fields require review. Review the proposed store, order date, confirmed return-clock start, duration, action and any second arrival date before saving. A delivery-based deadline can stay pending until you know the delivery date.

Saved purchases offer editing, a paper-receipt photo, merchant-issued return documents, calendar reminder downloads, and a printable return-trip checklist. Choose **Return QR / label** on a saved purchase to attach an actual JPG, PNG, WebP, or PDF authorization issued by the retailer. Reopen the image at the counter or print the PDF separately; the portable trip HTML embeds image QR codes and labels, and lets you save original merchant PDFs without a network connection. A link alone cannot guarantee offline access, and ReturnBy never fabricates merchant authorization. Finish a return to move it to History. Refund follow-up supports partial payments and future check dates.

## Restore saved work

Open **Back up or restore saved returns**, choose a ReturnBy JSON file, and review the additions or changed purchases. The import action appears above the long record list on phones and names the changes it will make. Nothing is imported just by choosing a file; when a saved purchase differs, explicitly choose whether to keep the browser's version or the backup's. Download a new backup from the same panel before changing computers.

## Saved work and privacy

ReturnBy has no account, inbox connection, or remote sync. Your original receipt image and any saved merchant-issued QR code or label are stored in your browser and included in the downloadable JSON backup. The downloaded offline trip sheet may also contain these private documents. Save a new backup before changing devices, clearing browser data, or changing the local server address. Backups are **unencrypted** and may contain order details, photos, return links, refund notes, and private trip notes. Store them securely.

Backups with merchant-issued return documents use **version 13**. Calendar-download history uses **version 12**; earlier versions 1–12 remain readable. Keep the same local browser address when updating ReturnBy, and update before importing a newer backup. CSV is for spreadsheet review, not a substitute for a JSON backup.

Calendar files still need to be imported into your calendar app. After changing a deadline, import the updated reminder with the same event identity and a higher revision; calendar apps that honor updates can replace its previous date. When you finish a return or remove a separate merchant-arrival cutoff, the tracker offers a one-event cancellation file to import. Some calendar apps ignore file-import updates or cancellations. ReturnBy now shows earlier downloaded event dates on the saved purchase or History card, so you know which obsolete events to remove directly in your calendar app; choose **I removed those calendar events** only after clearing them there. Those dates survive JSON backups, but a download does not prove import into a third-party calendar. ReturnBy never modifies external calendars or sends notifications on its own. Ensure calendar notifications are enabled.

## Build

Requires Node 22+ and a browser.

```sh
npm ci
npm test
npm run build
npm run preview
```

The maintained release builders are `tools/package_release.py` and `tools/package_native.py`. Local-browser courses run from `tools/check_*_browser.mjs` using Playwright and Chrome. The packaged app uses no cloud API for purchases or OCR.
