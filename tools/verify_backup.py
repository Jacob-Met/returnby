"""Exercise the built local ReturnBy application, including actual file round-trip.
Run: npm run build && python tools/verify_backup.py
All sample data is fictional. No credentials, mail or external services are used.
"""
from datetime import datetime, timezone
import functools
import hashlib
import http.server
import json
from pathlib import Path
import tempfile
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'receiving' / 's03-backup'
OUT.mkdir(parents=True, exist_ok=True)
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{server.server_port}'
checks = []
errors = []
external = []
def check(name, condition):
    if not condition:
        raise AssertionError(name)
    checks.append(name)

def monitor(page):
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: external.append(request.url) if not request.url.startswith(BASE) else None)

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
        context = browser.new_context(viewport={'width': 1440, 'height': 1000}, accept_downloads=True)
        page = context.new_page(); monitor(page)
        page.goto(BASE + '/index.html')
        for _ in range(2):
            page.click('#sample')
            page.click('#preview button[type=submit]')
        source_raw = page.evaluate("localStorage.getItem('returnby.v1')")
        check('real sample parse-review-save flow creates two orders', len(json.loads(source_raw)) == 2)
        page.click('a[href="./backup.html"]')
        page.wait_for_selector('#download-backup:not([disabled])')
        with page.expect_download() as dl:
            page.click('#download-backup')
        export_path = OUT / 'fictional-returnby-backup.json'
        dl.value.save_as(export_path)
        envelope = json.loads(export_path.read_text())
        check('download contains actual approved tracker fields only', envelope['orders'] == json.loads(source_raw))
        check('export metadata uses supported version', envelope['version'] == 1 and envelope['format'] == 'returnby-backup')
        check('export leaves source storage byte-for-byte unchanged', page.evaluate("localStorage.getItem('returnby.v1')") == source_raw)
        fresh = browser.new_context(viewport={'width': 1440, 'height': 1000}, accept_downloads=True)
        dest = fresh.new_page(); monitor(dest); dest.goto(BASE + '/backup.html')
        dest.set_input_files('#backup-file', str(export_path))
        dest.wait_for_selector('#backup-preview:not([hidden])')
        check('preview states new records before confirmation', '2 new records' in dest.inner_text('#import-summary'))
        check('preview does not write target storage', dest.evaluate("localStorage.getItem('returnby.v1')") is None)
        check('confirmation required before write', dest.is_disabled('#apply-backup'))
        dest.check('#confirm-import'); dest.click('#apply-backup')
        check('confirmed restore round trips approved fields', json.loads(dest.evaluate("localStorage.getItem('returnby.v1')")) == envelope['orders'])
        dest.set_input_files('#backup-file', str(export_path)); dest.wait_for_selector('#backup-preview:not([hidden])')
        check('repeat restore skips both exact duplicates', '2 identical records skipped' in dest.inner_text('#import-summary') and dest.is_disabled('#apply-backup'))
        conflict = json.loads(export_path.read_text()); conflict['orders'][0]['windowDays'] = 17
        dest.set_input_files('#backup-file', {'name': 'conflict.json', 'mimeType': 'application/json', 'buffer': json.dumps(conflict).encode()})
        dest.wait_for_function("document.querySelector('#import-summary').textContent.includes('1 conflicting')")
        check('conflicting identifier blocks all writes', dest.is_disabled('#confirm-import') and dest.is_disabled('#apply-backup'))
        check('conflict preserves target fields', json.loads(dest.evaluate("localStorage.getItem('returnby.v1')")) == envelope['orders'])
        dest.set_input_files('#backup-file', {'name': 'invalid.json', 'mimeType': 'application/json', 'buffer': b'{broken'})
        dest.wait_for_function("document.querySelector('#backup-notice').textContent.includes('not readable JSON')")
        check('malformed file has visible error and disabled write', dest.is_disabled('#apply-backup'))
        extra = dict(envelope['orders'][0]); extra['id'] = 'fictional-extra'; extra['merchant'] = '<img src=x onerror="window.injected=true">'; extra['orderNo'] = 'EXTRA-01'
        extended = {**envelope, 'orders': envelope['orders'] + [extra]}
        dest.set_input_files('#backup-file', {'name': 'extra.json', 'mimeType': 'application/json', 'buffer': json.dumps(extended).encode()})
        dest.wait_for_function("document.querySelector('#import-summary').textContent.includes('1 new records')")
        check('untrusted merchant is rendered as text, not HTML', dest.locator('#backup-rows img').count() == 0 and dest.evaluate('window.injected !== true'))
        dest.check('#confirm-import')
        tab = fresh.new_page(); tab.goto(BASE + '/index.html')
        tab.click('#sample'); tab.click('#preview button[type=submit]')
        changed = tab.evaluate("localStorage.getItem('returnby.v1')")
        dest.wait_for_function("document.querySelector('#backup-notice').textContent.includes('Saved records changed')")
        check('cross-tab change retires preview and disables import', dest.is_disabled('#apply-backup') and not dest.is_visible('#backup-preview'))
        check('cross-tab records are not overwritten', dest.evaluate("localStorage.getItem('returnby.v1')") == changed)
        # Restore a fresh valid preview for screenshots; these remain fictional fixtures.
        dest.click('#refresh-backup')
        dest.set_input_files('#backup-file', {'name': 'extra.json', 'mimeType': 'application/json', 'buffer': json.dumps(extended).encode()})
        dest.wait_for_function("document.querySelector('#import-summary').textContent.includes('1 new records')")
        dest.screenshot(path=str(OUT / 'desktop-preview.png'), full_page=True)
        phone_context = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, accept_downloads=True)
        phone = phone_context.new_page(); monitor(phone); phone.goto(BASE + '/backup.html')
        phone.set_input_files('#backup-file', str(export_path)); phone.wait_for_selector('#backup-preview:not([hidden])')
        check('phone layout does not overflow the viewport', phone.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
        phone.screenshot(path=str(OUT / 'phone-preview.png'), full_page=True)
        phone.check('#confirm-import'); phone.click('#apply-backup'); phone.click('a[href="./index.html"]')
        phone.wait_for_selector('#list .card')
        check('restored orders appear in actual tracker after navigation', phone.locator('#list .card').count() == 2)
        blocked = browser.new_context()
        blocked.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError')}})")
        denied = blocked.new_page(); monitor(denied); denied.goto(BASE + '/backup.html')
        check('blocked storage has actionable error without an uncaught exception', denied.is_disabled('#download-backup') and 'could not be read' in denied.inner_text('#backup-notice'))
        corrupt = browser.new_context(); bad = corrupt.new_page(); monitor(bad); bad.goto(BASE + '/backup.html')
        bad.evaluate("localStorage.setItem('returnby.v1','{broken')"); bad.reload()
        check('malformed saved data remains untouched', bad.evaluate("localStorage.getItem('returnby.v1')") == '{broken' and bad.is_disabled('#download-backup'))
        check('no outbound requests or uploads during acceptance', not external)
        check('no uncaught JavaScript errors during acceptance', not errors)
        for ctx in [context, fresh, phone_context, blocked, corrupt]: ctx.close()
        browser.close()
finally:
    server.shutdown(); server.server_close()
receipt = {'recorded_at': datetime.now(timezone.utc).isoformat(), 'data': 'fictional sample orders and explicitly authored negative fixtures', 'tested': 'local production dist, not live-site deployment', 'browser': 'headless Chromium', 'checks': checks, 'page_errors': errors, 'external_requests': external, 'artifact_sha256': {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in OUT.iterdir() if path.is_file() and path.name != 'browser-receipt.json'}}
(OUT / 'browser-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt, indent=2))
