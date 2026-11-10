# Receipt photos in ReturnBy

Choose **Read a receipt photo**, select a JPG, PNG or WebP, make the printed text upright, then choose **Read this receipt**. Use the source zoom to inspect small print. On a phone, switch between **Photo** and **Details**; reading opens Details with a visible review message.

The reader suggests a store, purchase date, receipt number and total. Check every field against the image. It can misread crumpled paper, faint printing, logos or complex layouts. Missing or ambiguous dates stay blank. Enter the return window you checked with the retailer; the reader never treats printed return language as a verified policy.

No purchase is added to the tracker until **Save purchase to tracker**. Unfinished fields, including photo suggestions, recover after a reload in the same tab; they stay separate from saved purchases until you review and save them. The photo and raw recognized text are held only on the open page and are cleared after saving or reloading. Closing the dialog keeps the current draft and photo on that page; removing a photo keeps already entered details. **Discard unfinished purchase** clears its recovery copy. The existing email draft stays separate.

## Reading and recovery

- **Rotate 90°** changes the image that is read. **Zoom photo** changes only how it is displayed.
- **Stop reading** cancels the pending handoff. A late result cannot overwrite newer details.
- Replacing a receipt releases any exact-date helper from the previous receipt before new suggestions are applied.
- Editing purchase fields while reading keeps those edits; the recognized text remains available for manual copying.
- A missing reader, unsupported image or failed read leaves the form available for manual entry.
- JPG, PNG and WebP images up to 20 MB are accepted. HEIC/PDF require conversion to one of those image formats.
- The included model reads English printed text. Handwriting, line-item extraction, perspective correction and automatic policy verification are outside this feature.

## Offline package and reproduction

The build includes Tesseract.js 7.0.0, its matching WebAssembly cores and the English trained data package 1.0.0. The worker, core and model paths point to the same served app. No OCR service or CDN is needed to use the complete ZIP. The reader loads when requested.

Normal build commands are unchanged: npm ci, npm test, npm run build. The prebuild/predev step copies the locked reader assets into public/receipt-ocr, which is generated and excluded from source control. The existing release packer includes those assets. Apache-2.0 notices accompany the reader.

The producer browser course is:

    node tools/check_receipt_photo_browser.mjs /path/to/new/evidence

It uses installed Chrome, Node 22 and Python 3. RETURNBY_BUILD, RETURNBY_CHROME, RETURNBY_TEST_PORT and RETURNBY_DEBUG_PORT select an existing build/browser/unused ports. RETURNBY_APP_URL targets an already running packaged launcher instead of starting a test server. It uses real OCR of synthetic printed pixels, explicit review/save, retained separate drafts, cancellation, close/reopen and phone controls. External hostname resolution is denied while numeric loopback remains available. This is a behavior course, not an OCR accuracy benchmark. RETURNBY_RECORD=1 also records a captioned, silent real-use walkthrough with the clearly labelled fictional receipt; FFmpeg is required for the optional clip. SOURCE_SHA records the served source in its manifest.

## Design decisions and evidence

The considered approaches were a separate scan page, an inline photo panel in the main tracker, and an extension of the existing manual-purchase dialog. The dialog keeps the source, review and ordinary save path together without a second tracker or stored schema. Desktop uses image beside fields. The initial stacked phone version buried the fields; actual screenshot review led to Photo/Details controls and an always-visible review message.

Producer: astra-harbor-7c2e. Independent judging: astra-forge-9a4d on an unfamiliar synthetic layout, cancellation, missing-worker recovery and actual phone composition; astra-cairn-9f4b on an untouched photographed receipt. The original real-photo finding is retained: a survey banner was suggested as merchant and an amount before “TOTAL PURCHASE” was missed. The parser now recognizes a printed storefront-number header before promotional copy, supports that total layout, and keeps the warning with the fields. Recognition remains a suggestion.

The public photograph used for independent comparison is [Walmart Food Receipt 11 Sep 2021](https://commons.wikimedia.org/wiki/File:Walmart_Food_Receipt_11_Sep_2021.jpeg), by Cryptogoth, CC BY-SA 4.0. It is a test input, not user data, and is not bundled as a sample. Its ambiguous short date remained manual. The real-image result does not establish general retailer or photo accuracy.

## Ranked gaps

1. Reliable review of faint/crumpled or perspective-distorted paper: source zoom helps correction, but a cropped/straightened image could improve recognition.
2. More languages and non-image receipts require deliberate support and separate real-input judgment.
3. The original image is not retained with saved purchases; this is intake assistance, not a receipt archive or replacement proof of purchase.
