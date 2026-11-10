# Bring refund progress back to an existing browser

Actual released 9d24804 reproduction used three manually entered fictional purchases, two refund records and two real downloaded backup files. The second browser first imported the original backup. The first browser then marked a £28 refund received and added a £22 purchase. Importing the newer backup in the existing browser blocked both changes because one saved ID differed.

The preview now shows current and backup values for changed fields, including money and refund status. Choose the complete current purchase or the complete backup purchase. Unreviewed differences remain current while unrelated new purchases and chosen updates can be applied. This is an explicit local restore; no automatic sync or field-level merge is claimed. Trip restoration remains a separate review.

Producer validation on HAMON build182: production build, 577 unit tests, and three real Chrome groups covering updated-backup additions and received status, an intervening second-tab refund edit that revokes a previous choice, and failed browser storage followed by a successful retry. Real phone and desktop screenshots are attached. The comparison uses fictional receipts only. Independent quality judgment belongs to Mica.

Reproduce with tests/backup-progress.native.mjs. Set RETURNBY_BASE to the production server, PLAYWRIGHT_MODULE to the installed playwright-core module, and optionally RETURNBY_EVIDENCE and CHROME_BIN. The inline before/after fixtures came from the original actual browser download course.
