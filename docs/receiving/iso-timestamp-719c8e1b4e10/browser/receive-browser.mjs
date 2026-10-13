// Native browser consumer receiving for ReturnBy ISO timestamp order dates.
(async function receiveReturnByBrowser() {
  const assert=(await import('node:assert/strict')).default;
  const {createHash}=await import('node:crypto');
  const {readFile,writeFile,mkdir,mkdtemp,rm}=await import('node:fs/promises');
  const {createServer}=await import('node:http');
  const {spawn}=await import('node:child_process');
  const path=await import('node:path');
  const {fileURLToPath}=await import('node:url');
  const args={};
  for(let i=2;i<process.argv.length;i+=2){
    const key=process.argv[i];
    assert.ok(['--browser','--root','--output'].includes(key)&&process.argv[i+1],'Use --browser PATH --root BUILT_SOURCE --output NEW_DIRECTORY');
    assert.ok(!Object.hasOwn(args,key),'Do not repeat arguments.');
    args[key]=process.argv[i+1];
  }
  for(const key of ['--browser','--root','--output'])assert.ok(args[key],key+' required');
  const root=path.resolve(args['--root']),output=path.resolve(args['--output']);
  const digest=data=>createHash('sha256').update(data).digest('hex');
  const gitBlob=data=>createHash('sha1').update(Buffer.from('blob '+data.length+'\0')).update(data).digest('hex');
  const buildBytes=await readFile(path.join(root,'build-receipt.json'));
  const build=JSON.parse(buildBytes.toString('utf8'));
  assert.equal(build.accepted,true,'both source builds must pass');
  const contractBytes=await readFile(path.join(root,'browser-contract.json'));
  const contract=JSON.parse(contractBytes.toString('utf8'));
  const runtime=new Map(), sourceInputs=[];
  for(const variant of build.builds){
    for(const item of variant.outputs){
      const file=path.join(root,variant.variant,'dist',item.path),bytes=await readFile(file);
      assert.equal(digest(bytes),item.sha256,item.path);assert.equal(bytes.length,item.bytes,item.path);
      runtime.set('/'+variant.variant+'/'+item.path,{bytes,file,sha256:item.sha256});
    }
    for(const item of variant.source_manifest){
      const file=path.join(root,variant.variant,item.path),bytes=await readFile(file);
      assert.equal(gitBlob(bytes),item.git_blob,item.path);
      sourceInputs.push({variant:variant.variant,file,git_blob:item.git_blob,sha256:digest(bytes)});
    }
  }
  await mkdir(output);
  const owned=await mkdtemp(path.join(output,'browser-')),profile=path.join(owned,'profile');
  await mkdir(profile);
  const receipt={
    schema:'returnby.timestamp_browser_receipt.v1',
    actor:contract.actor,scope:contract.scope,
    startedAt:new Date().toISOString(),node:process.version,
    originalCommit:build.original_commit,candidateCommit:build.candidate_commit,
    buildReceiptSha256:digest(buildBytes),contractSha256:digest(contractBytes),
    sourceInputs,runtimeInputs:[...runtime].map(([url,x])=>({url,bytes:x.bytes.length,sha256:x.sha256})),
    checks:[],served:[],pageErrors:[],externalPageRequests:[],screenshots:[]
  };
  const server=createServer((req,res)=>{
    const url=new URL(req.url,'http://127.0.0.1'),entry=runtime.get(url.pathname);
    if(!entry){res.writeHead(404).end();return;}
    const mime=url.pathname.endsWith('.html')?'text/html':url.pathname.endsWith('.css')?'text/css':url.pathname.endsWith('.js')?'text/javascript':url.pathname.endsWith('.svg')?'image/svg+xml':'application/octet-stream';
    receipt.served.push({path:url.pathname,query:url.search,sha256:entry.sha256});
    res.writeHead(200,{'Content-Type':mime+';charset=utf-8','Cache-Control':'no-store'}).end(entry.bytes);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  let browser,socket,sessionId,nextId=0,navigationId=0,browserLog='',launchError;
  const pending=new Map();
  function command(method,params={},scoped=true){
    const id=++nextId;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout '+method));},12000);
      pending.set(id,{resolve,reject,timer});
      socket.send(JSON.stringify({id,method,params,...(scoped&&sessionId?{sessionId}:{})}));
    });
  }
  async function evaluate(expression){
    const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
    return r.result.value;
  }
  async function waitFor(fn,label,count=120){
    let last;
    for(let i=0;i<count;i++){
      try{const value=await fn();if(value)return value;}catch(error){last=error;}
      await sleep(75);
    }
    throw new Error('Timed out: '+label+(last?'; '+last.message:''));
  }
  async function view(){
    return evaluate(`(() => {
      const preview=document.querySelector('#preview');
      const fields={},missing={};
      for(const name of ['merchant','orderDate','orderNo','total','windowDays']){
        const el=preview?.querySelector('[name="'+name+'"]');
        fields[name]=el?.value??null;
        missing[name]=el?.parentElement.classList.contains('missing')??null;
      }
      return {
        url:location.href,complete:document.readyState==='complete',
        timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:new Date().getTimezoneOffset(),
        paste:document.querySelector('#paste')?.value,previewHidden:preview?.hidden,
        fields,missing,recognized:preview?.querySelector('.review-head strong')?.textContent??null,
        tracked:document.querySelector('#tracked-count')?.textContent,
        orders:JSON.parse(localStorage.getItem('returnby.v1')||'[]'),
        cards:[...document.querySelectorAll('#list .card')].map(x=>x.innerText),
        focusName:document.activeElement?.getAttribute('name'),
        fits:document.documentElement.scrollWidth<=innerWidth
      };
    })()`);
  }
  async function open(variant,label){
    const url=origin+'/'+variant+'/index.html?receiving='+encodeURIComponent(label)+'&navigation='+(++navigationId);
    await command('Page.navigate',{url});
    await waitFor(async()=>{const x=await view();return x.url===url&&x.complete&&x.tracked!==null&&x.previewHidden===true;},'fresh app document');
    return view();
  }
  async function click(selector){
    const point=await evaluate(`(() => {
      const el=document.querySelector(${JSON.stringify(selector)});
      if(!el||el.disabled||el.hidden)throw new Error('Control unavailable');
      el.scrollIntoView({block:'center',inline:'nearest'});
      const r=el.getBoundingClientRect();
      if(!r.width||!r.height)throw new Error('Control has no visible bounds');
      return {x:r.left+r.width/2,y:r.top+r.height/2};
    })()`);
    await command('Input.dispatchMouseEvent',{type:'mouseMoved',...point});
    await command('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
    await command('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
  }
  async function pasteAndFind(text){
    const before=await view();assert.equal(before.paste,'','new receipt begins with empty textarea');
    await click('#paste');
    await command('Input.insertText',{text});
    assert.equal((await view()).paste,text,'native text insertion');
    await click('#find');
    await waitFor(async()=>!(await view()).previewHidden,'review form');
    return view();
  }
  function assertRecognized(x,timezone){
    assert.equal(x.timezone,timezone);
    assert.deepEqual(x.fields,contract.expectedFields);
    assert.equal(x.recognized,'4 OF 4 FIELDS RECOGNIZED');
    for(const name of ['merchant','orderDate','orderNo','total'])assert.equal(x.missing[name],false,name+' recognized');
    assert.equal(x.fits,true,'viewport has no horizontal overflow');
  }
  async function healthyJourney(item,viewport,timezone,capture){
    const label=[viewport.name,timezone,item.name].join('/');
    const initial=await open('candidate',label);
    assert.deepEqual(initial.orders,[],'fresh fixture storage');
    const preview=await pasteAndFind(item.text);
    assertRecognized(preview,timezone);
    await click('#preview button[type=submit]');
    await waitFor(async()=>{const x=await view();return x.previewHidden&&x.tracked==='1';},'saved order');
    const saved=await view();
    assert.equal(saved.paste,'');assert.equal(saved.orders.length,1);
    const order=saved.orders[0];
    assert.equal(order.orderDate,contract.expectedFields.orderDate);
    assert.equal(order.merchant,contract.expectedFields.merchant);
    assert.equal(order.orderNo,contract.expectedFields.orderNo);
    assert.equal(order.total,contract.expectedFields.total);
    assert.equal(order.windowDays,30);assert.equal(order.windowSource,'policy');
    assert.equal(Object.hasOwn(order,'text'),false);assert.equal(Object.hasOwn(order,'email'),false);
    const reopened=await open('candidate',label+'/reload');
    assert.deepEqual(reopened.orders,saved.orders,'stored reviewed fields survive native reload');
    assert.equal(reopened.tracked,'1');
    assert.equal(reopened.cards.length,1);
    assert.ok(reopened.cards[0].includes('ORDER 2026-10-03'));
    assert.ok(reopened.cards[0].includes('#ISO-1001'));
    assert.equal(reopened.fits,true);
    if(capture){
      const repeated=await pasteAndFind(item.text);
      assertRecognized(repeated,timezone);
      await evaluate('window.scrollTo(0,0)');
      const {data}=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
      const bytes=Buffer.from(data,'base64'),name=viewport.name+'.png';
      await writeFile(path.join(output,name),bytes,{flag:'wx'});
      receipt.screenshots.push({path:name,bytes:bytes.length,sha256:digest(bytes),timezone,scenario:item.name,stage:'saved order and repeated review form'});
    }
    await click('#list [data-del]');
    await waitFor(async()=>(await view()).tracked==='0','native remove control');
    const removed=await view();assert.deepEqual(removed.orders,[]);assert.equal(removed.cards.length,0);
    receipt.checks.push({label,passed:true,preview:{fields:preview.fields,recognized:preview.recognized,timezone:preview.timezone,offset:preview.offset},savedOrder:order,reopenedCard:reopened.cards[0],removed:true});
  }
  try{
    browser=spawn(args['--browser'],['--headless=new','--disable-gpu','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--no-default-browser-check','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
    browser.stderr.on('data',x=>{browserLog=(browserLog+x.toString()).slice(-12000);});
    browser.on('error',error=>{launchError=error;});
    const port=await waitFor(async()=>{
      if(launchError)throw launchError;
      if(browser.exitCode!==null)throw new Error('Browser exited '+browser.exitCode);
      return (await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).trim().split('\n');
    },'browser launch',300);
    socket=new WebSocket('ws://127.0.0.1:'+port[0]+port[1]);
    socket.addEventListener('message',event=>{
      const message=JSON.parse(event.data);
      if(message.id){
        const p=pending.get(message.id);if(!p)return;
        clearTimeout(p.timer);pending.delete(message.id);
        message.error?p.reject(new Error(message.error.message)):p.resolve(message.result);
      }else if(message.method==='Runtime.exceptionThrown')receipt.pageErrors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);
      else if(message.method==='Network.requestWillBeSent'){
        const url=message.params.request.url;
        if(/^https?:/.test(url)&&!url.startsWith(origin+'/'))receipt.externalPageRequests.push(url);
      }
    });
    await new Promise((resolve,reject)=>{
      socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});
    });
    receipt.browser=await command('Browser.getVersion',{},false);
    const {targetId}=await command('Target.createTarget',{url:'about:blank'},false);
    ({sessionId}=await command('Target.attachToTarget',{targetId,flatten:true},false));
    for(const method of ['Page.enable','Runtime.enable','Network.enable'])await command(method);
    await command('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    await command('Emulation.setTimezoneOverride',{timezoneId:'Pacific/Kiritimati'});
    for(const item of contract.scenarios){
      await open('original','witness/'+item.name);
      const observed=await pasteAndFind(item.text);
      assert.equal(observed.fields.orderDate,item.originalDate);
      assert.notEqual(observed.fields.orderDate,contract.expectedFields.orderDate);
      if(item.originalDate===''){
        assert.equal(observed.missing.orderDate,true);
        await click('#preview button[type=submit]');
        const refused=await view();assert.equal(refused.focusName,'orderDate');assert.deepEqual(refused.orders,[]);assert.equal(refused.previewHidden,false);
      }
      receipt.checks.push({label:'original/'+item.name,passed:true,observedDate:observed.fields.orderDate,expectedWrittenDate:contract.expectedFields.orderDate,recognized:observed.recognized});
    }
    for(const viewport of contract.viewports){
      await command('Emulation.setDeviceMetricsOverride',{width:viewport.width,height:viewport.height,deviceScaleFactor:1,mobile:viewport.mobile});
      for(const timezone of contract.timezones){
        await command('Emulation.setTimezoneOverride',{timezoneId:timezone});
        for(const item of contract.scenarios)
          await healthyJourney(item,viewport,timezone,timezone===contract.timezones[0]&&item===contract.scenarios[0]);
      }
      const timezone=contract.timezones[1];
      await open('candidate',viewport.name+'/malformed');
      const invalid=await pasteAndFind(contract.invalid.text);
      assert.equal(invalid.fields.orderDate,'');assert.equal(invalid.missing.orderDate,true);
      assert.equal(invalid.recognized,'3 OF 4 FIELDS RECOGNIZED');
      await click('#preview button[type=submit]');
      const refused=await view();
      assert.equal(refused.focusName,'orderDate');assert.equal(refused.previewHidden,false);
      assert.equal(refused.tracked,'0');assert.deepEqual(refused.orders,[]);
      receipt.checks.push({label:viewport.name+'/malformed-attached-hour',passed:true,missingDate:true,saveRefused:true,focusedField:refused.focusName});
      await healthyJourney(contract.plain,viewport,timezone,false);
    }
    assert.equal(receipt.checks.length,14);
    assert.deepEqual(receipt.pageErrors,[]);assert.deepEqual(receipt.externalPageRequests,[]);
    receipt.status='passed';
  }catch(error){
    receipt.status='failed';receipt.error=error.stack;
  }finally{
    receipt.sourceUnchanged=true;
    for(const item of sourceInputs)if(gitBlob(await readFile(item.file))!==item.git_blob){receipt.sourceUnchanged=false;receipt.changedSource=item.file;}
    receipt.runtimeUnchanged=true;
    for(const entry of runtime.values())if(digest(await readFile(entry.file))!==entry.sha256){receipt.runtimeUnchanged=false;receipt.changedRuntime=entry.file;}
    if(!receipt.sourceUnchanged||!receipt.runtimeUnchanged)receipt.status='failed';
    if(socket?.readyState===WebSocket.OPEN)try{await command('Browser.close',{},false);}catch{}
    socket?.close();for(const p of pending.values())clearTimeout(p.timer);
    if(browser&&browser.exitCode===null&&browser.signalCode===null)browser.kill('SIGTERM');
    for(let i=0;browser&&browser.exitCode===null&&browser.signalCode===null&&i<30;i++)await sleep(100);
    receipt.browserExited=!browser||browser.exitCode!==null||browser.signalCode!==null;
    receipt.browserExitCode=browser?.exitCode??null;receipt.browserSignal=browser?.signalCode??null;
    if(receipt.browserExited)await rm(owned,{recursive:true,force:true});
    else{receipt.status='failed';receipt.cleanupError='Owned browser remains; profile retained.';}
    server.closeAllConnections();await new Promise(resolve=>server.close(resolve));receipt.serverClosed=true;
    receipt.browserLog=browserLog;
    receipt.finishedAt=new Date().toISOString();
    receipt.receiverSha256=digest(await readFile(fileURLToPath(import.meta.url)));
    const raw=JSON.stringify(receipt,null,2)+'\n';
    await writeFile(path.join(output,'receipt.json'),raw,{flag:'wx'});
    console.log(JSON.stringify({status:receipt.status,checks:receipt.checks.length,sourceUnchanged:receipt.sourceUnchanged,runtimeUnchanged:receipt.runtimeUnchanged,browserExited:receipt.browserExited,serverClosed:receipt.serverClosed,receiptSha256:digest(raw),error:receipt.error??null}));
  }
  if(receipt.status!=='passed')process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
