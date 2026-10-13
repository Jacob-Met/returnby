import argparse
import json
import tempfile
from functools import partial
from datetime import date, timedelta
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.request import urlopen
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
def main():
    ap=argparse.ArgumentParser(description='Receive a ReturnBy build or URL in a fresh browser context.')
    ap.add_argument('--chrome',default=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    source=ap.add_mutually_exclusive_group()
    source.add_argument('--dist',type=Path,help='Built directory to serve; defaults to the checkout dist directory.')
    source.add_argument('--url',help='Existing HTTP(S) consumer URL; no local server is started.')
    ap.add_argument('--output-dir',type=Path,help='New evidence directory; defaults to a unique temporary directory.')
    args=ap.parse_args()
    if not __debug__: ap.error('Run without -O so every acceptance assertion remains active.')
    build=None
    if args.url is not None:
        target=urlsplit(args.url)
        if target.scheme not in ('http','https') or not target.netloc: ap.error('--url must be an absolute HTTP(S) URL.')
    else:
        build=(args.dist or ROOT/'dist').resolve()
        if not (build/'index.html').is_file(): ap.error('--dist must contain a built index.html.')
    if args.output_dir:
        out=args.output_dir.resolve()
        if build is not None and out.is_relative_to(build): ap.error('--output-dir must be outside the built directory.')
        try: out.mkdir(parents=True,exist_ok=False)
        except OSError as exc: ap.error(f'Cannot create new evidence directory: {exc}')
    else:
        out=Path(tempfile.mkdtemp(prefix='returnby-acceptance-'))
    server=None;errors=[];bad=[]
    if build is None: url=args.url
    else:
        server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(build)))
        Thread(target=server.serve_forever,daemon=True).start()
        url=f'http://127.0.0.1:{server.server_address[1]}/'
    receipt={'passed':False,'target':url,'built_directory':str(build) if build else None,'output_directory':str(out),'console_errors':errors,'http_errors':bad}
    try:
        assert urlopen(url,timeout=5).status==200
        with sync_playwright() as pw:
            options={'headless':True,'args':['--disable-gpu']}
            if args.chrome: options['executable_path']=args.chrome
            browser=pw.chromium.launch(**options);ctx=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True);page=ctx.new_page()
            page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.on('response',lambda r:bad.append((r.status,r.url)) if r.status>=400 else None)
            page.goto(url,wait_until='networkidle');order_date=date.today()-timedelta(days=13);delivery_date=order_date+timedelta(days=7)
            email=f"""From: Contoso Electronics <noreply@contoso.example>
Order number: CE90017
Delivery: {delivery_date.strftime('%B %d, %Y')}
Order date: {order_date.strftime('%B %d, %Y')}
Subtotal: $79.99
Order total: $89.99"""
            page.locator('#paste').fill(email);page.locator('#find').click()
            assert page.locator('#preview').is_visible();assert page.locator('#preview [name=merchant]').input_value()=='Contoso Electronics';assert page.locator('#preview [name=orderNo]').input_value()=='CE90017';assert 'STORE MATCH' in page.locator('#preview').inner_text()
            expected={'merchant':'Contoso Electronics','orderNo':'CE90017','orderDate':order_date.isoformat(),'total':'$89.99'}
            observed={name:page.locator(f'#preview [name={name}]').input_value() for name in expected}
            receipt['parsed_review']={'expected':expected,'observed':observed}
            assert observed==expected,{'expected_review':expected,'observed_review':observed}
            page.locator('#preview button[type=submit]').click();assert page.locator('#tracked-count').inner_text()=='1';assert 'STORE POLICY / 15 DAYS' in page.locator('#list').inner_text();
            second_date=date.today()-timedelta(days=1)
            second=f"""From: Juniper Goods <orders@juniper.example>
Order number: JG5555
Order placed on {second_date.strftime('%B %d, %Y')}
Total: $42.50"""
            page.locator('#paste').fill(second);page.locator('#find').click();assert '30-DAY FALLBACK' in page.locator('#preview').inner_text()
            page.locator('#preview [name=windowDays]').fill('45');page.locator('#preview button[type=submit]').click()
            assert page.locator('#tracked-count').inner_text()=='2';assert 'YOUR RULE / 45 DAYS' in page.locator('#list').inner_text()
            page.locator('#filter-due').click();assert page.locator('#list .card').count()==1
            page.locator('#filter-all').click();assert page.locator('#list .card').count()==2
            with page.expect_download() as info: page.locator('#list button[data-ics]').first.click()
            download=info.value;ics_path=out/'returnby-acceptance.ics';download.save_as(str(ics_path));ics=ics_path.read_text(encoding='utf-8')
            assert 'TRIGGER:-P3D' in ics and 'DTSTART;VALUE=DATE:' in ics
            stored=page.evaluate("localStorage.getItem('returnby.v1')");assert all(marker not in stored for marker in ('Order placed on','Delivery:','Order date:','Subtotal:'))
            page.screenshot(path=str(out/'returnby-desktop.png'),full_page=True)
            mobile=ctx.new_page();mobile.set_viewport_size({'width':390,'height':844});mobile.goto(url,wait_until='networkidle')
            overflow=mobile.evaluate('document.documentElement.scrollWidth>window.innerWidth');assert not overflow,'mobile horizontal overflow'
            mobile.screenshot(path=str(out/'returnby-mobile.png'),full_page=True)
            assert not errors,errors;assert not bad,bad
            receipt.update({'passed':True,'orders_saved':2,'custom_window_days':45,'ics_alarm':'-P3D','email_not_persisted':True,'mobile_overflow':overflow,'calendar':ics_path.name,'captures':[(p.name,p.stat().st_size) for p in out.glob('returnby-*.png')]})
            browser.close()
    except Exception as exc:
        receipt['passed']=False
        receipt['failure']={'type':type(exc).__name__,'message':str(exc)}
        raise
    finally:
        if server is not None: server.shutdown();server.server_close()
        (out/'result.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(receipt))
if __name__=='__main__': main()
