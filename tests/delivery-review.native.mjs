import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=path.resolve(process.env.APP_DIR || 'dist');
const server=createServer(async(req,res)=>{try{const file=path.join(root,req.url==='/'?'index.html':req.url);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/opt/google/chrome/chrome',args:['--no-sandbox']});
try {
const p=await browser.newPage();await p.goto(`http://127.0.0.1:${server.address().port}`);
await p.locator('#paste').fill('Store: Nordstrom\nOrder #785164\nOrder date: November 1, 2026\nDelivered: November 8, 2026\nTotal: $129.00\nReturns accepted within 30 days of delivery.');
await p.getByRole('button',{name:'Find the deadline',exact:true}).click();
if(!process.env.RELEASED){assert.match(await p.locator('#intake-deadline').innerText(),/awaiting/);assert.match(await p.locator('body').innerText(),/Delivery date mentioned: 2026-11-08/);await p.getByRole('button',{name:'Save deadline to tracker'}).click();assert.equal(await p.locator('[data-ics]').count(),0);}
if(!process.env.RELEASED){await p.getByRole('button',{name:'Keep purchase pending delivery'}).click();await p.reload();await p.getByRole('button',{name:/pending delivery — resume review/}).click();assert.equal(await p.locator('[name=orderDate]').first().inputValue(),'2026-11-01');assert.match(await p.locator('#intake-deadline').innerText(),/awaiting/);}
await p.locator('[name=windowStartDate]').first().fill('2026-11-08');await p.getByRole('button',{name:'Save deadline to tracker'}).click();assert.match(await p.locator('body').innerText(),/RETURN BY 2026-12-08/);assert.match(await p.locator('body').innerText(),/confirmed by you/);
await p.getByRole('button',{name:'Add calendar reminder',exact:true}).click();const d=p.waitForEvent('download');await p.locator('#calendar-download').click();const downloaded=await d;const ics=await readFile(await downloaded.path(),'utf8');assert.match(ics,/DTSTART;VALUE=DATE:20261208/);assert.match(ics,/user-confirmed/);if(!process.env.RELEASED) assert.equal(await p.evaluate(()=>localStorage.getItem('returnby.pending-delivery')),null);console.log('PASS: review gate, separate clock, saved deadline and downloaded calendar');
}finally{await browser.close();server.close();}
