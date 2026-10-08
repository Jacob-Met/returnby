# Actual LA7 browser receiving

**Accepted:** baseline 6/6 controls and candidate 8/8 groups under Node 24.21.0 / Chrome 154.0.8037.98; the baseline also retains the expected absent-selector negative observation. The real run finished at 2026-10-08T22:22:59.238Z. No product source or compiled asset changed.

- acceptance.json is the exact native acceptance (SHA-256 6b3c1b4eaa86ebc4143ead7fe3b4ef3e73f03e6efb6965559445ca72a584aa25).
- results.json is the complete actual browser result (SHA-256 96d60cd33d7342872fae88caf8040d8fdf60499d005e277f9e15ae0c26b14831), including real download events, card-order checks and cleanup.
- evidence.tar.gz contains 100 unique regular members / 925,249 uncompressed bytes: all 55 source/config/test inputs, 16 built assets, the actual driver, logs, two ICS downloads, six screenshots, snapshots and original receiving metadata.
- evidence-members.json gives every member's bytes, SHA-256 and Git blob, exact archive identity and complete verification result. Repository metadata, profile directories and unrelated files are excluded. The redundant transport/assembly files listed there are omitted; their byte identities remain in the original native receipt.
- reproduce-archive.py rebuilds deterministic USTAR/gzip from an extracted archive or original receiver plus that manifest, verifies every member, and refuses an existing output. It uses only Python stdlib and executes no app/browser/tests.

Archive SHA-256: 45c48355e8aa6f2593004f0215f5b1ed34fb6bc98a71686ab6b9d5f347097924; size 551,998 bytes. Two in-process constructions were byte-identical; the saved archive was reopened and every member verified.

To reproduce after extracting this archive into a fresh directory:

    python reproduce-archive.py EXTRACTED_ROOT evidence-members.json REBUILT.tar.gz

The earlier ThinkPad receipt remains unchanged and historical. Read [the dated addendum](../LA7-BROWSER-ADDENDUM.md) for the current scope: actual local browser qualification, with production/site adoption, hosted CI and fresh publication admission still outstanding. This is headless CDP keyboard/mouse receiving of synthetic storage fixtures, not physical input, parser/save-form retesting or GPU qualification.
