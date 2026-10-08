import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {spawn}from'node:child_process';import {once}from'node:events';
const proof='D:/Hamon/worktrees/returnby-reminder-timing-0378a7b6-proof',app=proof+'/native-app',root='D:/Hamon/worktrees/returnby-discovery-0378a7b6';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),manifest=JSON.parse(fs.readFileSync(app+'/manifest.json','utf8'));
const report={at:new Date().toISOString(),source:manifest.source,groups:[],files:[]};let child;
try{
 child=spawn(process.execPath,[app+'/serve.mjs','0'],{cwd:app,stdio:['ignore','pipe','pipe']});
 let stderr='';child.stderr.on('data',b=>stderr+=b);const url=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server did not become ready')),5000);child.once('exit',code=>{clearTimeout(timer);reject(Error('Server exited '+code+': '+stderr));});child.once('error',e=>{clearTimeout(timer);reject(e)});child.stdout.once('data',b=>{clearTimeout(timer);const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+\//);m?resolve(m[0]):reject(Error('unexpected startup'));});});
 for(const row of manifest.files.filter(x=>x.path.startsWith('site/'))){
  const relative=row.path.slice(5),response=await fetch(new URL(relative,url));assert.equal(response.status,200);const b=Buffer.from(await response.arrayBuffer());assert.equal(sha(b),row.sha256);assert.ok(b.equals(fs.readFileSync(root+'/dist/'+relative)));report.files.push({path:relative,sha256:sha(b)});
 }
 report.groups.push('Included localhost server starts on its own ephemeral port and serves all ten exact independently received build leaves');
 assert.equal(report.files.length,10);report.result='pass';
}catch(error){report.result='fail';report.error=String(error.stack??error);process.exitCode=1;}
finally{if(child&&child.exitCode===null){const stopped=once(child,'exit');child.kill();await stopped;}report.ownServerStopped=true;report.completed=new Date().toISOString();fs.writeFileSync(proof+'/native-app-final-receipt.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
