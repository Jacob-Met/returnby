# ReturnBy

ReturnBy is an offline return desk: save a purchase, see what a retailer requires by which date, prepare your return trip, and follow the refund. Your orders and receipt photos stay in your browser.

**[Download ReturnBy 0.10.1](https://github.com/Jacob-Met/returnby/releases/tag/v0.10.1)** · [Source](https://github.com/Jacob-Met/returnby/tree/main)

[Phone view: backup restore](https://github.com/Jacob-Met/returnby/releases/download/v0.10.1/ReturnBy-v0.10.1-restore-phone.png) · [Desktop view](https://github.com/Jacob-Met/returnby/releases/download/v0.10.1/ReturnBy-v0.10.1-restore-desktop.png)

## Know which deadline you have

Some retailers require **carrier acceptance by one date** and **receipt by the merchant by a later date**. Choose **Ship by (carrier handoff)** as the first action and, when the retailer requires both, enter **Merchant must also receive by** as the second date. Both dates appear on the saved purchase, in the calendar view, the return-trip sheet, spreadsheet exports and backups. Downloading its calendar reminders creates two dated events, each with a distinct identity and alert.

Other returns keep the simpler one-date options: **Return by**, **Drop off by**, or **Merchant must receive by**. ReturnBy does not infer these requirements from a vague policy. Check the merchant's published instructions and confirm both dates yourself. An arrival deadline is not a safe day to mail a parcel.

## Use the desk

Download the archive for your computer: Linux, macOS (Intel or Apple Silicon), Windows, or the Python-based local browser ZIP. The native packages include their runtime and the offline English receipt reader. Open the included launcher, then use the app at **http://127.0.0.1:8769** in your normal browser. Keep the same browser profile and local address when upgrading to keep saved purchases and trips.

You can add a purchase by typing its details, pasting a confirmation email, adding local confirmation files in a batch, or reading a receipt photo. Review the proposed store, order date, confirmed return-clock start, duration, action and any second arrival date before saving. A delivery-based deadline can stay pending until you know the delivery date.

Saved purchases offer editing, a paper-receipt photo, return-document links, calendar reminder downloads, and a printable return-trip checklist. Finish a return to move it to History. Refund follow-up supports partial payments and future check dates.

## Restore saved work

Open **Back up or restore saved returns**, choose a ReturnBy JSON file, and review the additions or changed purchases. The import action appears above the long record list on phones and names the changes it will make. Nothing is imported just by choosing a file; when a saved purchase differs, explicitly choose whether to keep the browser's version or the backup's. Download a new backup from the same panel before changing computers.

## Saved work and privacy

ReturnBy has no account, inbox connection, or remote sync. Your original receipt image is stored in your browser and included in the downloadable JSON backup. Save a new backup before changing devices, clearing browser data, or changing the local server address. Backups are **unencrypted** and may contain order details, photos, return links, refund notes, and private trip notes. Store them securely.

Backups with two separate deadlines use **version 10**. Versions 1–9 remain readable in ReturnBy 0.10.1, including older backups with receipt photos. Earlier app releases cannot read version 10 safely; upgrade the app before restoring it. CSV is for spreadsheet review, not a substitute for a JSON backup.

Calendar files must be imported into your calendar app. ReturnBy does not send notifications itself, change an existing imported reminder when you edit an order, contact the retailer, arrange a return, or verify refund receipt. Make sure your calendar app's notifications are enabled.

## Build

Requires Node 22+ and a browser.

```sh
npm ci
npm test
npm run build
npm run preview
```

The maintained release builders are `tools/package_release.py` and `tools/package_native.py`. Local-browser courses run from `tools/check_*_browser.mjs` using Playwright and Chrome. The packaged app uses no cloud API for purchases or OCR.
