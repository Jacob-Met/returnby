# Local backup desk — S03 layer

This is a privacy-preserving, manual portability layer for the existing ReturnBy project, not a second hackathon entry.

## Try it

```sh
npm ci
npm test
npm run build
npm run preview
```

Open the tracker, load a fictional example, review and save it, then follow **Back up or restore your saved returns**. Download a JSON backup. In a clean browser profile on the same app, select the file, inspect the incoming fields and check the confirmation before adding records. Open the tracker to see the restored deadlines.

The browser acceptance run is `python tools/verify_backup.py` after building. It requires Python Playwright and an installed Chromium browser. It serves the production `dist` locally, exercises the actual parse/review/save/download/import/navigation loop, tests desktop and 390px phone layouts, checks conflicts and stale previews, and records artifacts under `docs/receiving/s03-backup`. All test data is explicitly fictional. No live mail, credentials or retailer policies are accessed.

## Behavior and limits

- The backup contains only the existing approved Order fields. Original emails and unknown fields are not exported or persisted.
- The file is **not encrypted**. Keep order numbers and amounts private; there is no cloud upload or automated sync.
- Version 1 requires a ReturnBy envelope and valid export timestamp. Files are limited to 2 MiB; the merged tracker is limited to 2,000 orders and existing field/date checks.
- Preview performs no writes. A checked confirmation is required to import.
- Identical ID-and-field records are skipped. Any conflicting identifier blocks the entire import, including otherwise new records. No replacement or automatic conflict resolution is offered.
- A changed storage snapshot invalidates the preview. The write path re-reads immediately before its single synchronous localStorage write. This is not a transactional multi-device sync protocol or a cross-process compare-and-swap guarantee.
- Blocked reads, malformed data and quota failures produce an error instead of a success claim. No damaged list is automatically repaired or replaced.
- Saved policy/default/user window attribution is retained. Importing does not validate merchant policies or change stored return windows.

## Design and code

TypeScript and vanilla DOM retain the existing project stack and add no runtime dependency. `src/backup.ts` owns validation, approved-field export and merge planning. `src/backup-view.ts` owns explicit review/confirmation and local download behavior. Incoming text is rendered with DOM textContent, not HTML interpolation. Existing date and saved-order admission functions are reused from the checklist module.

## Eligibility and provenance

The existing project was first committed during the event submission period. `devpost/scope.md`, `prd.md`, and `spec.md` exist, but the earlier repository correction and README explicitly do not claim a completed learner interview. This layer installed and read the actual Devpost Learn Skill Pack and applied its incremental build, verification, preservation and privacy guidance; it does **not** retroactively prove the original planning process or invent learner sign-off. Eligibility remains unverified until genuine evidence is found. No submission has been sent by this layer.

## Local verification only

GitHub Actions is forbidden. No workflow is retained on the S03 branch. Unit tests, TypeScript validation, build and browser acceptance run locally. The new page is not claimed deployed to jacobmetoyer.com until the existing site owner publishes it and it is read back.
