# Partial returns walkthrough

This short, silent recording follows one fictional purchase through the real application: review a purchase, record returned and kept quantities, prepare a trip containing the remaining shirt, finish that return, review mixed History, and download a backup.

The caption band identifies the sample as fictional. Browser actions, item calculations, trip contents, History and the backup download are actual application behavior. A recorded return is a user record; it does not establish merchant acceptance or refund payment.

## Reproduce

Build and serve the application at a loopback HTTP address. Run the maintained Playwright recorder with a real Chrome executable. Its environment variables select the application URL, output directory, Playwright module and browser. Use a fresh browser context; the recorder enters its own fictional data. Then run the shared encoder in docs/html-receipt-walkthrough/encode.py with the capture directory and output filename ReturnBy-items-walkthrough.mp4.

The recorder writes the source revision, observed stage times and browser errors to capture.json, plus an actual downloaded sample backup. The encoder places captions above the unaltered browser viewport. The result has no audio track and is labelled silent.

## Recorded source

The initial recording uses source 280065a65e5e91eedf7f720f13b5ab4385acef50. Later source changes must be described separately, or the clip recorded again when they affect its story. The initial clip does not demonstrate the subsequent History correction handoff.

Keep the MP4, screenshots, exact source and supported launch instructions with the matching versioned release. Do not describe capture scripts alone as a delivered demonstration.
