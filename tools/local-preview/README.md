# ReturnBy on this Mac

Double-click **Launch ReturnBy.command** to open ReturnBy. Keep its terminal window open while you use the app. Press **Control+C** in that window when you finish.

ReturnBy always opens at **http://127.0.0.1:48643/index.html**. Use the same browser and address each time to keep this local tracker's saved returns. If the address is occupied, the launcher stops and leaves the other program alone; close your earlier ReturnBy terminal before trying again.

## Enter and keep a receipt

Choose **Enter a receipt manually**. Enter the purchase date and the return window you checked with the retailer; the store, order number and total are optional. Choose **Review deadline**, check the displayed details, then choose **Save to tracker**.

Use **View tracker** to return to the saved list. The existing **Backup** action downloads a portable copy. Keep a backup before clearing browser data, changing browsers or moving to another computer. A backup from the separately hosted ReturnBy site can be reviewed through this package's existing import controls; this package does not copy that site's browser data automatically.

The app stores reviewed returns in your browser. This launcher does not read or write those records. It serves only its bundled pages on this Mac's loopback address and makes no external request. The existing app has no account or inbox connection.

## Keep or restore this package

The original qualified ZIP is retained at **recovery/qualified-preview.zip**. The complete installer sources are in **recovery/installer/**. Existing installations are never overwritten. To create another recovery copy, use an explicitly new destination:

    "/Library/Frameworks/Python.framework/Versions/3.13/bin/python3" -B \
      recovery/installer/install.py \
      --archive recovery/qualified-preview.zip \
      --destination "/Users/me/Applications/ReturnBy-recovered"

Only run one copy at a time: the fixed address is also the browser storage identity. The installer records the Python interpreter it actually uses in the generated launcher. This copy uses the already installed Python 3.13 runtime; it installs no dependencies.

From this folder, **./Launch\ ReturnBy.command --check** verifies all nine app files without starting a server. **--no-open** starts the same entry without automatically opening a browser.

## What this copy contains

This is the exact independently qualified manual-receipt preview, source commit d153659d1f561e1c316a1f9278b3d0b32c222c2f, built on owner-qualified baseline bd07785d10ba40e524756b059c3f3cc548927f9f. Its original **site/BUILD-MANIFEST.json** lists the nine unchanged built files. The retained ZIP is 26,444 bytes, SHA-256 45d5f732879ab0101295648c59c1955b5f8ec190aa4c44a42b46bc24a9b464e4.

This local copy is separate from newer owner installations and the hosted site's release. It has no automatic update or background startup service. Retailer terms and return eligibility still require your own confirmation.
