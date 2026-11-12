import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const {chromium}=await import(process.env.RETURNBY_PLAYWRIGHT||'playwright');
const port=4177, base='http://127.0.0.1:'+port+'/';
const server=spawn('node',['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
const contexts=[];let browser;
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEUlEQVR4nGP4X8/wH4QZYAwAWqQJ9XavesYAAAAASUVORK5CYII=','base64');
async function open(width=390,height=844){
 const context=await browser.newContext({viewport:{width,height},acceptDownloads:true});contexts.push(context);
 const page=await context.newPage();await page.goto(base,{waitUntil:'networkidle'});return page;
}
async function save(page){
 await page.locator('#paste').fill('From: Harbor Outfitters\nOrder number: RETURN-11\nOrder placed on October 1, 2026\nTotal: $42.00');
 await page.locator('#find').click();
 for(const [key,value] of Object.entries({merchant:'Harbor Outfitters',orderNo:'RETURN-11',orderDate:'2026-10-01',total:'$42.00',windowDays:'30'}))
   await page.locator('#preview [name='+key+']').fill(value);
 await page.locator('#preview button[type=submit]').click();
}
async function photos(page){
 return page.evaluate(()=>new Promise((resolve,reject)=>{
  const open=indexedDB.open('returnby-receipt-photos',1);
  open.onerror=()=>reject(open.error);
  open.onsuccess=()=>{
   const db=open.result,request=db.transaction('receipts','readonly').objectStore('receipts').getAll();
   request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{resolve(request.result.map(r=>({id:r.id,size:r.photo.size,rotation:r.rotation,type:r.photo.type})));db.close();};
  };
 }));
}
async function choose(page,file){
 await page.locator('#backup-file').setInputFiles({name:'transfer.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(file))});
 await page.locator('#backup-preview').waitFor({state:'visible'});
}
try{
 for(let i=0;i<80;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
 browser=await chromium.launch({headless:true,executablePath:process.env.RETURNBY_CHROME||'/usr/local/bin/google-chrome',args:['--no-sandbox']});
 const source=await open(1440,900);await save(source);
 await source.locator('button[data-receipt]').first().click();
 await source.locator('.receipt-proof-input input').setInputFiles({name:'receipt.png',mimeType:'image/png',buffer:png});
 await source.waitForFunction(()=>document.querySelector('.receipt-proof-message')?.textContent?.includes('Original photo saved'));
 await source.locator('.receipt-proof-dialog [data-proof=rotate]').click();
 await source.locator('.receipt-proof-dialog .receipt-proof-close').click();
 const before=await photos(source);assert.equal(before.length,1);
 await source.locator('#backup-heading').click();
 const downloaded=source.waitForEvent('download');await source.locator('#backup-export').click();
 const backup=JSON.parse(await readFile(await (await downloaded).path(),'utf8'));
 assert.equal(backup.version,9);assert.equal(backup.photos.length,1);
 assert.equal(Buffer.compare(Buffer.from(backup.photos[0].data,'base64'),png),0);
 const receiver=await open();await receiver.locator('#backup-heading').click();
 await choose(receiver,backup);await receiver.locator('#backup-apply').click();
 await receiver.waitForFunction(()=>document.querySelector('#backup-message')?.textContent?.includes('saved here'));
 assert.deepEqual(await photos(receiver),before);
 await receiver.locator('button[data-receipt]').first().click();
 await receiver.locator('.receipt-proof-image canvas').waitFor({state:'visible'});
 assert(await receiver.locator('.receipt-proof-image canvas').evaluate(c=>c.width>0&&c.height>0));
 const old=await open();await old.locator('#backup-heading').click();
 const legacy={...backup,version:1};delete legacy.photos;
 await choose(old,legacy);await old.locator('#backup-apply').click();
 await old.waitForFunction(()=>JSON.parse(localStorage.getItem('returnby.v1')||'[]').length===1);
 assert.equal((await photos(old)).length,0);
 await choose(old,backup);await old.locator('#backup-apply').click();
 await old.waitForFunction(()=>document.querySelector('#backup-message')?.textContent?.includes('saved here'));
 assert.deepEqual(await photos(old),before);
 console.log(JSON.stringify({newProfilePhoto:true,photoOnlyRestore:true,legacyImport:true,originalReopened:true,rotation:before[0].rotation}));
} finally {for(const c of contexts)await c.close();await browser?.close();server.kill('SIGTERM');}
