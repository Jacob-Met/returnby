# ReturnBy: preserved email review

Source: 613f15f023c017f1ea1d53d901b73e157e29e7a4 (merged PR120). Package: ReturnBy-613f15f-browser.zip, 330037 bytes. SHA256: 24a5c2f906c8b494a966dc6f5ced0526e0fc91ee2aceaea5c6fc1c4f6527f571.

Extract the ZIP. Python3 is required; Node/npm is not. Run Start ReturnBy.sh on Linux, Start ReturnBy.command on macOS, or Start ReturnBy.cmd on Windows. Open http://127.0.0.1:8769/. If that port is occupied, choose a free RETURNBY_PORT and keep the same browser/profile/port for your saved purchases. Linux packaged Python entrypoint was exercised on the fleet at port18985; Windows/macOS launchers are included but not tested.

Email intake now asks the browser to warn before leaving with unsaved paste or corrected review, including a confirmed return-clock start. Cancel departure to keep working. Successful saves clear that warning; refused saves keep the draft protected. Existing manual intake, trip backups, refund follow-up and CSV are included from main.

Producer checks:540 maintained tests,8 observer tests, build, actual Chrome at1440/390px. Extracted package was launched through its included serve_returnby.py and the complete departure course rerun: blank navigation, paste, corrected review after clearing pasted text, refused save/retry, saved navigation and closed manual receipt draft. Screenshots and result.json are from this packaged run. Separate audience judgment is recorded in taskboard returnby-intake-continuity-marlin82d1.

Limits: browsers control whether a native warning appears; prior user interaction is usually required. No crash or mobile process-termination recovery, persistent raw-email storage, hosted service, automatic retailer verification or automatic returns. This is a private repository download, not a formal GitHub Release.
