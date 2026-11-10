import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const out = path.resolve(process.argv[2] || '/tmp/returnby-photo-evidence');
const build = path.resolve(process.env.RETURNBY_BUILD || 'dist');
const dir = await mkdtemp(path.join(tmpdir(), 'returnby-photo-'));
await mkdir(out, { recursive: true });
const port = Number(process.env.RETURNBY_TEST_PORT || 18981);
const debug = Number(process.env.RETURNBY_DEBUG_PORT || 19481);
const base = (process.env.RETURNBY_APP_URL || 'http://127.0.0.1:' + port).replace(/\/$/,'');
const server = process.env.RETURNBY_APP_URL ? undefined : spawn('python3', ['-m','http.server',String(port),'--bind','127.0.0.1','--directory',build], {stdio:'ignore'});
const chrome = spawn(process.env.RETURNBY_CHROME || '/opt/google/chrome/chrome', [
  '--headless=new','--no-sandbox','--disable-gpu','--no-proxy-server','--disable-dev-shm-usage','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1',
  '--remote-debugging-port='+debug, '--user-data-dir='+path.join(dir,'profile'),'about:blank',
], {stdio:'ignore'});
const delay = ms => new Promise(resolve=>setTimeout(resolve,ms));
let ws;
let captureFrame;
let expectedConfirm = false;
let confirmedReplacements = 0;
const checks = [];
const requests = [];
try {
  let tabs;
  for (let i=0;i<80;i++) {
    try { tabs=await fetch('http://127.0.0.1:'+debug+'/json').then(r=>r.json()); if(tabs.length)break; } catch {}
    await delay(100);
  }
  assert.ok(tabs?.length,'Chrome starts');
  ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
  let id=0;const pending=new Map();
  ws.addEventListener('message',event=>{
    const message=JSON.parse(event.data);
    if(message.method==='Network.requestWillBeSent')requests.push(message.params.request.url);
    if(message.method==='Page.screencastFrame'){captureFrame?.(message.params);void cdp('Page.screencastFrameAck',{sessionId:message.params.sessionId});}
    if(message.method==='Page.javascriptDialogOpening' && message.params.type==='beforeunload')void cdp('Page.handleJavaScriptDialog',{accept:true});
    if(message.method==='Page.javascriptDialogOpening' && message.params.type==='confirm' && expectedConfirm){expectedConfirm=false;confirmedReplacements++;void cdp('Page.handleJavaScriptDialog',{accept:true});}
    if(message.id){
      const target=pending.get(message.id);pending.delete(message.id);
      message.error?target.reject(Error(JSON.stringify(message.error))):target.resolve(message.result);
    }
  });
  const cdp=(method,params={})=>new Promise((resolve,reject)=>{
    const call=++id;pending.set(call,{resolve,reject});ws.send(JSON.stringify({id:call,method,params}));
  });
  const evaluate=async expression=>{
    const result=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
    if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const until=async (expression,message,limit=30000)=>{
    const start=Date.now();
    while(Date.now()-start<limit){
      if(await evaluate(expression))return;
      await delay(100);
    }
    throw Error('Timed out: '+message+'; state='+await evaluate("JSON.stringify({url:location.href,title:document.title,text:document.body.innerText.slice(0,300),reader:document.querySelector('#receipt-photo-status')?.textContent})"));
  };
  const click=async selector=>{
    const point=await evaluate("(()=>{const e=document.querySelector("+JSON.stringify(selector)+");if(!e)throw Error('Missing control');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();if(!r.width||!r.height||e.disabled)throw Error('Control is not available: '+"+JSON.stringify(selector)+");return{x:r.x+r.width/2,y:r.y+r.height/2};})()");
    await cdp('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
    await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
  };
  const fill=(selector,value)=>evaluate("{const input=document.querySelector("+JSON.stringify(selector)+");input.value="+JSON.stringify(value)+";input.dispatchEvent(new Event('input',{bubbles:true}));}");
  const capture=async name=>writeFile(path.join(out,name),Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Network.enable');
  // All HTTP requests outside the served build are blocked, including OCR CDN defaults.
  await cdp('Network.setBlockedURLs',{urls:['https://*','http://cdn*','http://tessdata*']});
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  const navigation=await cdp('Page.navigate',{url:base});
  assert.equal(navigation.errorText,undefined, 'Application entry loads: '+JSON.stringify(navigation));
  await until("!!document.querySelector('#receipt-photo-file')",'receipt module ready');
  // A precise printed-receipt specimen, explicitly synthetic; the actual OCR
  // worker reads its pixels. No text result or recognizer response is mocked.
  const png=await evaluate(`(()=>{
    const canvas=document.createElement('canvas');canvas.width=900;canvas.height=1180;
    const c=canvas.getContext('2d');c.fillStyle='#e7e1d2';c.fillRect(0,0,900,1180);
    c.translate(450,590);c.rotate(-0.012);c.translate(-450,-590);
    c.fillStyle='#fffdf7';c.fillRect(40,20,820,1140);
    c.fillStyle='#20201d';c.textAlign='center';c.font='bold 42px monospace';
    c.fillText('PAPER & PINE',450,110);
    c.font='24px monospace';c.fillText('18 MARKET STREET',450,160);
    c.textAlign='left';c.font='28px monospace';
    const lines=['Purchase date: 2026-11-10','Receipt # PP-8421','','Notebook            14.00','Pencil set           8.50','','Subtotal            22.50','Tax                  1.80','TOTAL              $24.30','','Returns within 14 days','Please keep your receipt'];
    lines.forEach((line,i)=>c.fillText(line,85,245+i*62));
    return canvas.toDataURL('image/png').split(',')[1];
  })()`);
  const sample=path.join(out,'synthetic-receipt.png');await writeFile(sample,Buffer.from(png,'base64'));
  await fill('#paste','Separate email draft stays here');
  await click('#photo-open');
  const {root}=await cdp('DOM.getDocument');
  const input=await cdp('DOM.querySelector',{nodeId:root.nodeId,selector:'#receipt-photo-file'});
  await cdp('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[sample]});
  await until("!document.querySelector('#receipt-photo-source').hidden",'photo preview');
  assert.equal(await evaluate("localStorage.getItem('returnby.v1')"),null);
  const started=Date.now();await click('#receipt-read');
  await until("document.querySelector('#receipt-photo-status').textContent.startsWith('Text read.')",'actual OCR',60000);
  const elapsedMs=Date.now()-started;
  const fields=await evaluate("Object.fromEntries(new FormData(document.querySelector('#manual-form')))");
  assert.equal(fields.merchant,'PAPER & PINE');assert.equal(fields.orderDate,'2026-11-10');
  assert.equal(fields.orderNo,'PP-8421');assert.equal(fields.total,'$24.30');
  assert.equal(fields.windowDays,'');assert.equal(fields.windowStartDate,'');
  assert.equal(await evaluate("localStorage.getItem('returnby.v1')"),null);
  await capture('receipt-review-desktop.png');
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate("document.querySelector('#manual-dialog').scrollTop=0");
  await capture('receipt-review-phone.png');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('#manual-form')).display!=='none'"),true);
  await click('#receipt-show-photo');
  await capture('receipt-source-phone.png');
  await click('#receipt-show-details');
  assert.equal(await evaluate("document.querySelector('#manual-dialog').scrollWidth<=document.querySelector('#manual-dialog').clientWidth"),true);
  const recovery=await evaluate("JSON.parse(sessionStorage.getItem('returnby.manual-draft.v1'))");
  assert.equal(recovery.fields.merchant,'PAPER & PINE');
  assert.equal(recovery.fields.windowDays,'');
  assert.equal(JSON.stringify(recovery).includes('base64'),false);
  assert.equal(JSON.stringify(recovery).includes('Please keep'),false);
  assert.equal(await evaluate("document.querySelector('#paste').value"),'Separate email draft stays here');
  await cdp('Page.reload');
  await until("document.querySelector('#manual-recovery')?.textContent.startsWith('Recovered unfinished purchase')",'same-tab recovery');
  assert.equal(await evaluate("document.querySelector('#paste').value"),'');
  await fill('#paste','Separate email draft stays here');
  await click('#manual-open');
  assert.equal(await evaluate("document.querySelector('#manual-form [name=merchant]').value"),'PAPER & PINE');
  assert.equal(await evaluate("document.querySelector('#receipt-photo-source').hidden"),true);
  assert.equal(await evaluate("document.querySelector('#receipt-photo-text').hidden"),true);
  assert.equal(await evaluate("localStorage.getItem('returnby.v1')"),null);
  checks.push({name:'same-tab reload recovers suggested fields without photo or raw OCR and without saving a purchase',passed:true});
  await capture('receipt-recovered-phone.png');
  await fill('#manual-form [name=windowDays]','14');
  await until("document.querySelector('#manual-deadline').textContent==='Return by 2026-11-24'",'reviewed deadline');
  await evaluate("document.querySelector('#manual-form').requestSubmit()");
  await until("!document.querySelector('#manual-dialog').open",'save');
  const saved=await evaluate("JSON.parse(localStorage.getItem('returnby.v1'))");
  assert.equal(saved.length,1);assert.equal(saved[0].merchant,'PAPER & PINE');
  assert.equal(saved[0].windowSource,'user');
  assert.equal(await evaluate("document.querySelector('#paste').value"),'Separate email draft stays here');
  assert.equal(JSON.stringify(saved).includes('base64'),false);assert.equal(JSON.stringify(saved).includes('Please keep'),false);
  checks.push({name:'actual offline receipt pixels to reviewed saved purchase',elapsedMs,fields,saved:saved[0]});
  await capture('receipt-saved-phone.png');
  // Cancellation must not permit a late worker result to replace a new manual draft.
  await click('#desk-add');
  await click('#photo-open');
  const doc2=await cdp('DOM.getDocument');
  const input2=await cdp('DOM.querySelector',{nodeId:doc2.root.nodeId,selector:'#receipt-photo-file'});
  await cdp('DOM.setFileInputFiles',{nodeId:input2.nodeId,files:[sample]});
  await until("!document.querySelector('#receipt-photo-source').hidden",'second photo');
  await click('#receipt-read');await click('#receipt-stop');
  await click('#receipt-show-details');
  await fill('#manual-form [name=merchant]','Manual draft after stopping');
  await delay(1000);
  assert.equal(await evaluate("document.querySelector('#manual-form [name=merchant]').value"),'Manual draft after stopping');
  assert.match(await evaluate("document.querySelector('#receipt-photo-status').textContent"),/Reading stopped/);
  checks.push({name:'stop reading keeps newer manual draft',passed:true});
  await click('#receipt-close-top');
  await click('#photo-open');
  assert.equal(await evaluate("document.querySelector('#manual-form [name=merchant]').value"),'Manual draft after stopping');
  checks.push({name:'close and reopen keeps source and draft',passed:true});
  // Replacing a receipt must release the previous receipt's exact-date helper.
  await click('#receipt-show-details');
  await fill('#manual-form [name=orderDate]','2026-11-01');
  await click('#manual-form .known-deadline summary');
  await fill('#manual-form-known-date','2026-12-31');
  await click('#manual-form .known-deadline button');
  assert.equal(await evaluate("document.querySelector('#manual-form [name=windowDays]').value"),'60');
  await click('#receipt-show-photo');
  expectedConfirm=true;
  await click('#receipt-read');
  await until("document.querySelector('#receipt-photo-status').textContent.startsWith('Text read.')",'replacement OCR');
  assert.equal(confirmedReplacements,1);
  assert.equal(await evaluate("document.querySelector('#manual-form-known-date').value"),'');
  assert.equal(await evaluate("document.querySelector('#manual-form [name=fixedDeadline]').value"),'');
  await fill('#manual-form [name=orderDate]','2026-11-09');
  assert.equal(await evaluate("document.querySelector('#manual-form [name=windowDays]').value"),'');
  checks.push({name:'new receipt releases previous exact-deadline helper before correcting purchase date',passed:true});

  if (process.env.RETURNBY_RECORD === '1') {
    await cdp('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    await evaluate("localStorage.clear();sessionStorage.clear()");
    await cdp('Page.reload');
    await until("!!document.querySelector('#receipt-photo-file') && !document.querySelector('#manual-dialog').open",'clean walkthrough page');
    const framesDir=path.join(out,'walkthrough-frames');
    await mkdir(framesDir,{recursive:true});
    const frames=[],writes=[],captions=[];
    const recordingStart=Date.now();
    const seconds=()=>(Date.now()-recordingStart)/1000;
    const caption=text=>{
      if(captions.length)captions.at(-1).end=seconds();
      captions.push({start:seconds(),text});
    };
    captureFrame=params=>{
      const file=path.join(framesDir,String(frames.length).padStart(6,'0')+'.jpg');
      frames.push({file,at:seconds()});
      writes.push(writeFile(file,Buffer.from(params.data,'base64')));
    };
    await cdp('Page.startScreencast',{format:'jpeg',quality:88,maxWidth:1280,maxHeight:900,everyNthFrame:1});
    caption('Read a paper receipt locally.\nThis walkthrough uses a fictional receipt.');await delay(3200);
    await click('#photo-open');
    const demoDoc=await cdp('DOM.getDocument');
    const demoInput=await cdp('DOM.querySelector',{nodeId:demoDoc.root.nodeId,selector:'#receipt-photo-file'});
    await cdp('DOM.setFileInputFiles',{nodeId:demoInput.nodeId,files:[sample]});
    await until("!document.querySelector('#receipt-photo-source').hidden",'walkthrough photo');
    caption('Choose an upright photo.\nThe image stays on this device.');await delay(3500);
    await click('#receipt-read');
    await until("document.querySelector('#receipt-photo-status').textContent.startsWith('Text read.')",'walkthrough actual OCR',60000);
    caption('Review every suggestion against the photo.\nThe return window still needs your confirmation.');await delay(4400);
    await fill('#manual-form [name=windowDays]','14');
    await until("document.querySelector('#manual-deadline').textContent==='Return by 2026-11-24'",'walkthrough confirmed deadline');
    caption('Enter the return window you checked with the store.\nReview the date before saving.');await delay(4000);
    await click('#manual-form [type=submit]');
    await until("!document.querySelector('#manual-dialog').open",'walkthrough saved');
    await evaluate("document.querySelector('#list').scrollIntoView({block:'center'})");
    assert.equal(await evaluate("JSON.parse(localStorage.getItem('returnby.v1'))[0].windowDays"),14);
    caption('Saved for November 24.\nFind it later, add a reminder or prepare a return trip.');await delay(4400);
    captions.at(-1).end=seconds();
    const duration=seconds();
    await cdp('Page.stopScreencast');
    captureFrame=undefined;await Promise.all(writes);
    assert.ok(frames.length>4,'real walkthrough frames recorded');
    frames[0].at=0;
    const concat=frames.map((frame,i)=>"file '"+frame.file+"'\nduration "+Math.max(.02,(frames[i+1]?.at??duration)-frame.at).toFixed(3)).join('\n')+"\nfile '"+frames.at(-1).file+"'\n";
    const time=s=>{
      const ms=Math.round(s*1000),h=Math.floor(ms/3600000),m=Math.floor(ms/60000)%60,sec=Math.floor(ms/1000)%60;
      return [h,m,sec].map(n=>String(n).padStart(2,'0')).join(':')+','+String(ms%1000).padStart(3,'0');
    };
    const srt=captions.map((c,i)=>(i+1)+'\n'+time(c.start)+' --> '+time(c.end)+'\n'+c.text+'\n').join('\n');
    const list=path.join(out,'walkthrough.ffconcat'),subtitles=path.join(out,'walkthrough.srt'),video=path.join(out,'ReturnBy-receipt-photo.mp4');
    await writeFile(list,concat);await writeFile(subtitles,srt);
    execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',list,'-vf',
      "pad=iw:ih+100:0:0:color=0x20302a,subtitles="+subtitles+":force_style='FontName=DejaVu Sans,FontSize=10,PrimaryColour=&H00FFFFFF,Outline=0,Shadow=0,Alignment=2,MarginV=6'",
      '-r','20','-c:v','libx264','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',video]);
    await writeFile(path.join(out,'walkthrough.json'),JSON.stringify({base,source:process.env.SOURCE_SHA||null,actualBrowserInteractions:true,syntheticReceipt:true,silent:true,duration,frames:frames.length,video,captions},null,2));
    checks.push({name:'captioned actual-use walkthrough',video,duration,syntheticReceipt:true,silent:true});
  }

  const foreign=requests.filter(url=>/^https?:/.test(url)&&!url.startsWith(base+'/'));
  assert.deepEqual(foreign,[]);
  const result={status:'PASS',producer:'astra-harbor-7c2e',scope:'Actual Chrome and actual Tesseract worker, synthetic printed receipt pixels; not a real-photo accuracy benchmark',checks,externalRequests:foreign,sourceRequests:requests.filter(url=>url.includes('receipt-ocr')),out};
  await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
} catch(error) {
  await writeFile(path.join(out,'failure.txt'),String(error.stack||error));
  throw error;
} finally {ws?.close();chrome.kill();server?.kill();}
