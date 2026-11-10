const {chromium}=await import(process.env.RETURNBY_PLAYWRIGHT||'playwright');
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
const out=process.env.EVIDENCE||'/tmp/returnby-refund-payments';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME||'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:390,height:940},acceptDownloads:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:18891');await page.locator('#manual-open').click();
 const manual=page.locator('#manual-form');
 for(const [name,value] of Object.entries({merchant:'West Harbour Clothing',orderNo:'WH-309',orderDate:'2026-11-03',windowDays:'30',total:'GBP 99.00'}))await manual.locator('[name='+name+']').fill(value);
 await manual.locator('[type=submit]').click();
 const open=()=>page.locator('[data-refund]').first().click(),form=page.locator('#refund-form'),save=()=>form.locator('[type=submit]').click(),data=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('returnby.v1')));
 await open();await form.locator('[name=amount]').fill('GBP 72.50');await form.locator('[name=note]').fill('Two parcels returned.');assert(await form.locator('[name=amount]').isVisible());await save();await open();assert.equal(await form.locator('[name=amount]').inputValue(),'GBP 72.50');assert.equal((await data())[0].refundPayments,undefined,'Simple amount notes remain supported');await page.locator('[data-enable]').click();assert.equal(await form.locator('[name=amount]').isVisible(),false);await page.locator('[data-currency]').selectOption('GBP');await page.locator('[data-expected]').fill('72.50');
 for(const [date,amount,note] of [['2026-11-10','20.00','First parcel'],['2026-11-12','22.50','Second parcel']]){await page.locator('[data-add]').click();const row=page.locator('[data-credit]').last();await row.locator('[data-date]').fill(date);await row.locator('[data-amount]').fill(amount);await row.locator('[data-note]').fill(note);}
 await save();await page.reload();assert.equal((await data())[0].refundPayments.credits.length,2);assert.match(await page.locator('#refund-pending').innerText(),/Still owed GBP 30.00/);
 await open();
 const firstPayment=await page.locator('[data-credit]').first().locator('[data-date]').boundingBox();
 const saveButton=await form.locator('[type=submit]').boundingBox();
 assert(firstPayment && saveButton && firstPayment.y+firstPayment.height<saveButton.y,'First payment and Save must fit together on phone');
 await page.locator('[data-credit]').nth(1).locator('[data-amount]').fill('99');
 await page.keyboard.press('Escape');await open();
 assert.equal(await page.locator('[data-credit]').nth(1).locator('[data-amount]').inputValue(),'22.50','Escape discards payment edits');
 await page.locator('[data-credit]').last().locator('[data-note]').focus();
 const visibleSave=await form.locator('[type=submit]').boundingBox();assert(visibleSave && visibleSave.y>=0 && visibleSave.y+visibleSave.height<=940,'Save stays in view while editing payments');
 await page.screenshot({path:out+'/compact-editor-phone.png'});
 await form.locator('[name=state]').selectOption('received');await save();assert(await page.locator('#refund-error').isVisible());assert.equal((await data())[0].refundState,'awaiting');
 await form.locator('[name=state]').selectOption('awaiting');await page.locator('[data-credit]').nth(1).locator('[data-amount]').fill('25');await save();assert.equal((await data())[0].refundPayments.credits[1].amountCents,2500);
 await open();await page.locator('[data-credit]').first().locator('[data-remove]').click();await save();assert.equal((await data())[0].refundPayments.credits.length,1);
 await open();await page.locator('[data-add]').click();const final=page.locator('[data-credit]').last();await final.locator('[data-date]').fill('2026-11-14');await final.locator('[data-amount]').fill('47.50');await final.locator('[data-note]').fill('Final credit checked');await save();assert.equal((await data())[0].refundState,'awaiting');
 await page.reload();await open();await form.locator('[name=state]').selectOption('received');await save();const expected=await data();assert.equal(expected[0].refundState,'received');
 await page.locator('#backup-heading').click();const downloaded=page.waitForEvent('download');await page.locator('#backup-export').click();const backup=await readFile(await(await downloaded).path());
 const fresh=await browser.newContext({viewport:{width:390,height:940}}),receiver=await fresh.newPage();await receiver.goto(process.env.BASE_URL||'http://127.0.0.1:18891');await receiver.locator('#backup-heading').click();await receiver.locator('#backup-file').setInputFiles({name:'refund-backup.json',mimeType:'application/json',buffer:backup});await receiver.locator('#backup-apply').click();
 assert.deepEqual(await receiver.evaluate(()=>JSON.parse(localStorage.getItem('returnby.v1'))),expected);await receiver.reload();await receiver.locator('#refund-history summary').click();await receiver.locator('#refund-history').scrollIntoViewIfNeeded();await receiver.screenshot({path:out+'/restored-phone.png'});assert(await receiver.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 console.log('PASS split credits, correction/removal, premature received refusal, explicit completion and downloaded fresh-browser restore');
 await fresh.close();await context.close();
}finally{await browser.close();}
