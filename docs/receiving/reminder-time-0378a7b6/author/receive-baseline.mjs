import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
import {createServer} from 'file:///D:/Hamon/worktrees/returnby-discovery-0378a7b6/node_modules/vite/dist/node/index.js';
import {chromium} from 'file:///D:/Hamon/worktrees/surgeon-trails-0378a7b6-proof/browser-tools/node_modules/playwright-core/index.mjs';
const root='D:/Hamon/worktrees/returnby-discovery-0378a7b6',proof='D:/Hamon/worktrees/returnby-reminder-timing-0378a7b6-proof',out=proof+'/baseline-browser';fs.mkdirSync(out);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),files=['src/main.ts','src/ics.ts','src/deadline.ts','src/store.ts','index.html'],hashes=()=>Object.fromEntries(files.map(p=>[p,sha(fs.readFileSync(root+'/'+p))])),original=hashes();
const report={at:new Date().toISOString(),source:execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes:original,errors:[],externalRequests:[],groups:[]};
const server=await createServer({root,configFile:false,cacheDir:proof+'/vite-baseline',logLevel:'error',server:{host:'127.0.0.1',port:0}});await server.listen();const base='http://127.0.0.1:'+server.httpServer.address().port;let browser;
try{
browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',headless:true,downloadsPath:out,env:{...process.env,TEMP:proof+'/temp',TMP:proof+'/temp'}});
const context=await browser.newContext({acceptDownloads:true,timezoneId:'UTC',viewport:{width:1440,height:1000}}),page=await context.newPage();await page.clock.install({time:new Date('2026-10-08T12:00:00Z')});
page.on('pageerror',error=>report.errors.push(String(error)));await page.route('**/*',route=>{if(new URL(route.request().url()).origin===base)return route.continue();report.externalRequests.push(route.request().url());return route.abort();});
const order={id:'near-deadline',merchant:'Fixture Shop',orderNo:'R-18',total:'$40',orderDate:'2026-09-10',windowDays:30,windowSource:'user',createdAt:'2026-10-08T11:00:00Z'};
await page.addInitScript(value=>localStorage.setItem('returnby.v1',JSON.stringify([value])),order);await page.goto(base,{waitUntil:'networkidle'});
assert.equal(await page.locator('#list [data-ics]').count(),1);assert.match(await page.locator('#list').textContent(),/RETURN BY 2026-10-10/);
const downloadEvent=page.waitForEvent('download');await page.locator('#list [data-ics]').click();const download=await downloadEvent;await download.saveAs(out+'/original-near-deadline.ics');const ics=fs.readFileSync(out+'/original-near-deadline.ics','utf8');assert.match(ics,/DTSTART;VALUE=DATE:20261010/);assert.match(ics,/TRIGGER:-P3D/);
assert.equal(await page.locator('input[type=datetime-local]').count(),0);assert.equal(await page.locator('dialog').count(),0);
assert.deepEqual(JSON.parse(await page.evaluate(()=>localStorage.getItem('returnby.v1'))),[order]);await page.screenshot({path:out+'/original-near-deadline.png',fullPage:true});
report.fixtureNow='2026-10-08T12:00:00Z';report.order=order;report.alarmDate='2026-10-07';report.groups.push('Actual saved order due in two days immediately downloads fixed three-day alarm, already one day before fixture today; no timing review control; storage exact');assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);assert.deepEqual(hashes(),original);report.sourceUnchanged=true;report.result='pass';
}catch(error){report.result='fail';report.error=String(error.stack??error);process.exitCode=1;}finally{await browser?.close();await server.close();report.completedAt=new Date().toISOString();fs.writeFileSync(out+'/receipt.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
