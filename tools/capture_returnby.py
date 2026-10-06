import argparse
import json
from datetime import date, timedelta
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.request import urlopen
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs): super().__init__(*args,directory=str(ROOT/'dist'),**kwargs)
    def log_message(self,*args): pass
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--chrome',default=r'C:\Program Files\Google\Chrome\Application\chrome.exe');args=ap.parse_args()
    out=ROOT/'public'/'captures';out.mkdir(parents=True,exist_ok=True)
    server=ThreadingHTTPServer(('127.0.0.1',0),Quiet);Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_address[1]}/';errors=[];bad=[]
    try:
        assert urlopen(url,timeout=5).status==200
        with sync_playwright() as pw:
            options={'headless':True,'args':['--disable-gpu']}
            if args.chrome: options['executable_path']=args.chrome
            browser=pw.chromium.launch(**options);ctx=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True);page=ctx.new_page()
            page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.on('response',lambda r:bad.append((r.status,r.url)) if r.status>=400 else None)
            page.goto(url,wait_until='networkidle');order_date=date.today()-timedelta(days=13)
            email=f"""From: Contoso Electronics <noreply@contoso.example>
Order number: CE90017
Order placed on {order_date.strftime('%B %d, %Y')}
Order total: $89.99"""
            page.locator('#paste').fill(email);page.locator('#find').click()
            assert page.locator('#preview').is_visible();assert page.locator('#preview [name=merchant]').input_value()=='Contoso Electronics';assert page.locator('#preview [name=orderNo]').input_value()=='CE90017';assert 'STORE MATCH' in page.locator('#preview').inner_text()
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
            download=info.value;ics_path=ROOT/'returnby-acceptance.ics';download.save_as(str(ics_path));ics=ics_path.read_text(encoding='utf-8');ics_path.unlink(missing_ok=True)
            assert 'TRIGGER:-P3D' in ics and 'DTSTART;VALUE=DATE:' in ics
            stored=page.evaluate("localStorage.getItem('returnby.v1')");assert 'Order placed on' not in stored
            page.screenshot(path=str(out/'returnby-desktop.png'),full_page=True)
            mobile=ctx.new_page();mobile.set_viewport_size({'width':390,'height':844});mobile.goto(url,wait_until='networkidle')
            overflow=mobile.evaluate('document.documentElement.scrollWidth>window.innerWidth');assert not overflow,'mobile horizontal overflow'
            mobile.screenshot(path=str(out/'returnby-mobile.png'),full_page=True)
            assert not errors,errors;assert not bad,bad
            print(json.dumps({'orders_saved':2,'custom_window_days':45,'ics_alarm':'-P3D','email_not_persisted':'Order placed on' not in stored,'mobile_overflow':overflow,'console_errors':errors,'http_errors':bad,'captures':[(p.name,p.stat().st_size) for p in out.glob('returnby-*.png')]}));browser.close()
    finally:
        server.shutdown();server.server_close()
if __name__=='__main__': main()