"""After npm run build: python tools/verify_day_refresh.py --browser /path/to/chromium."""
from __future__ import annotations

import argparse
import functools
import json
import threading
from datetime import datetime, timedelta, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

START = datetime(2026, 10, 8, 23, 59, 50, tzinfo=timezone.utc)
ROWS = [
    {"id": "other", "merchant": "Fictional Other", "orderDate": "2026-09-07"},
    {"id": "focused", "merchant": "Fictional Focused", "orderDate": "2026-09-08"},
]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def verify(build: Path, executable: str | None) -> dict:
    server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(build)))
    thread = threading.Thread(target=server.serve_forever, kwargs={"poll_interval": 0.01}, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{server.server_address[1]}/"
    checks, observations, errors, external = {}, {}, [], []
    try:
        with sync_playwright() as pw:
            options = {"headless": True}
            if executable:
                options["executable_path"] = executable
            browser = pw.chromium.launch(**options)

            def open_page(rows):
                saved = json.dumps([
                    dict(row, windowDays=30, windowSource="user", createdAt="2026-10-01T10:00:00Z")
                    for row in rows
                ], separators=(",", ":"))
                context = browser.new_context(timezone_id="UTC")
                page = context.new_page()
                page.on("pageerror", lambda error: errors.append(str(error)))

                def route(request):
                    if request.request.url.startswith(url):
                        request.continue_()
                    else:
                        external.append(request.request.url)
                        request.abort()

                page.route("**/*", route)
                page.add_init_script("localStorage.setItem('returnby.v1', " + json.dumps(saved) + ");")
                page.clock.install(time=START - timedelta(minutes=1))
                page.clock.pause_at(START)
                page.goto(url)
                page.locator("#list .card").first.wait_for()
                return context, page, saved

            def advance(page, trigger):
                if trigger == "midnight":
                    page.clock.run_for(11_000)
                else:
                    page.clock.set_system_time(datetime(2026, 10, 17, 10, tzinfo=timezone.utc))
                    page.evaluate("window.dispatchEvent(new Event('focus'))")

            def active(page):
                return page.evaluate("""() => ({
                    tag: document.activeElement.tagName,
                    id: document.activeElement.id,
                    ics: document.activeElement.dataset.ics || null,
                    del: document.activeElement.dataset.del || null
                })""")

            for trigger in ("midnight", "focus_after_suspend"):
                for action in ("ics", "del"):
                    context, page, _ = open_page(ROWS)
                    page.locator(f'[data-{action}="focused"]').focus()
                    page.evaluate("""() => {
                        window.exports = [];
                        const create = URL.createObjectURL.bind(URL);
                        URL.createObjectURL = blob => {
                            window.exports.push({type: blob.type, size: blob.size});
                            return create(blob);
                        };
                    }""")
                    before = active(page)
                    advance(page, trigger)
                    after = active(page)
                    page.keyboard.press("Enter")
                    ids = page.evaluate("JSON.parse(localStorage.getItem('returnby.v1')).map(row => row.id)")
                    exports = page.evaluate("window.exports")
                    key = f"{trigger}_{action}"
                    checks[key + "_same_row_and_action"] = before == after
                    checks[key + "_enter_works"] = (
                        len(exports) == 1 and exports[0]["type"] == "text/calendar" and ids == ["other", "focused"]
                        if action == "ics" else ids == ["other"]
                    )
                    observations[key] = {"before": before, "after": after, "exports": exports, "ids_after_enter": ids}
                    context.close()

                # The first row expires out of Due soon. Another row may enter it
                # during a long suspension; focus must not jump to that other row.
                context, page, _ = open_page([ROWS[1], dict(ROWS[0], orderDate="2026-09-20")])
                page.evaluate("document.querySelector('#filter-due').click()")
                page.locator('[data-ics="focused"]').focus()
                advance(page, trigger)
                focused = active(page)
                key = trigger + "_filter_fallback"
                checks[key + "_expired_row_left"] = page.locator('[data-ics="focused"]').count() == 0
                checks[key + "_selected_filter_focused"] = focused["id"] == "filter-due"
                page.keyboard.press("Tab")
                checks[key + "_keyboard_navigation_continues"] = active(page)["id"] == "filter-expired"
                observations[key] = {"focus_after_refresh": focused, "focus_after_tab": active(page)}
                context.close()

            context, page, saved = open_page([ROWS[1]])
            page.evaluate("""() => {
                document.querySelector('#paste').value = 'Fictional draft; Order placed October 1, 2026';
                document.querySelector('#find').click();
                document.querySelector('#preview [name=orderDate]').value = '2026-10-01';
                document.querySelector('#preview [name=windowDays]').value = '45';
                const field = document.querySelector('#preview [name=merchant]');
                field.value = 'Unsaved merchant edit';
                field.focus();
                field.setSelectionRange(2, 9, 'backward');
                window.draftField = field;
            }""")

            def draft():
                return page.evaluate("""() => {
                    const field = document.querySelector('#preview [name=merchant]');
                    return {
                        fields: Object.fromEntries(new FormData(document.querySelector('#preview'))),
                        paste: document.querySelector('#paste').value,
                        sameField: field === window.draftField,
                        focused: document.activeElement === field,
                        selection: [field.selectionStart, field.selectionEnd, field.selectionDirection],
                        stored: localStorage.getItem('returnby.v1'),
                        remaining: document.querySelector('.days-left').textContent,
                        expired: document.querySelector('#expired-count').textContent
                    };
                }""")

            before = draft()
            advance(page, "midnight")
            midnight = draft()
            advance(page, "focus_after_suspend")
            page.evaluate("window.dispatchEvent(new Event('pageshow')); document.dispatchEvent(new Event('visibilitychange'))")
            resume = draft()
            checks.update({
                "midnight_deadline_and_count": midnight["remaining"] == "EXPIRED 1D" and midnight["expired"] == "1",
                "resume_deadline": resume["remaining"] == "EXPIRED 9D",
                "unsaved_fields_preserved": before["fields"] == midnight["fields"] == resume["fields"],
                "paste_preserved": before["paste"] == midnight["paste"] == resume["paste"],
                "draft_node_and_focus_preserved": all(x["sameField"] and x["focused"] for x in (before, midnight, resume)),
                "caret_selection_preserved": before["selection"] == midnight["selection"] == resume["selection"],
                "no_storage_write_during_refresh": all(x["stored"] == saved for x in (before, midnight, resume)),
            })
            page.keyboard.insert_text("Replacement")
            page.evaluate("document.querySelector('#preview').requestSubmit()")
            added = page.evaluate("JSON.parse(localStorage.getItem('returnby.v1')).find(row => row.id !== 'focused')")
            checks["continue_typing_and_save"] = added["merchant"] == "UnReplacementerchant edit" and added["windowDays"] == 45
            for state in (before, midnight, resume):
                state.pop("stored")
            observations["draft"] = {"before": before, "midnight": midnight, "resume": resume}
            context.close()
            browser.close()
        checks["no_page_errors"] = not errors
        checks["no_external_requests"] = not external
        return {"passed": all(checks.values()), "passed_checks": sum(checks.values()), "failed_checks": sum(not x for x in checks.values()), "checks": checks, "observations": observations, "errors": errors, "external_requests": external}
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--build", type=Path, default=Path(__file__).resolve().parents[1] / "dist")
    parser.add_argument("--browser", help="Chromium executable; otherwise use Playwright's installed Chromium")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    result = verify(args.build.resolve(), args.browser)
    payload = json.dumps(result, indent=2) + "\n"
    if args.output:
        args.output.write_text(payload)
    print(payload, end="")
    raise SystemExit(0 if result["passed"] else 1)
