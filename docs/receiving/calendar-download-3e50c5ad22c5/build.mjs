import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {spawnSync,execFileSync} from 'node:child_process';
const root='/dev/shm/hamon-returnby-calendar-3e50c5ad22c5';
const evidence=path.join(root,'receiving');
const sources={
 original:{directory:'/tmp/hamon-returnby-calendar-original-3e50c5ad22c5',commit:'1e662c387be5f66f8499fac7ec443f58d2198379',tree:'503ea217dc35f54aa7c9dbd1f92217544ad6dbc9'},
 candidate:{directory:'/tmp/hamon-returnby-calendar-candidate-3e50c5ad22c5',commit:'7cf2f6d6e1cd71143569f972ab6ca0bbc0c46772',tree:'20a738c38691d102d2f3c50cb74de1e8cc37f534'},
};
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function freeze(directory){
 const tree=execFileSync('git',['-C',directory,'ls-tree','-rz','HEAD'],{encoding:'utf8'}).split('\0').filter(Boolean);
 return tree.map(line=>{const [,mode,type,blob,file]=/^(\d+) (\w+) (\w+)\t(.+)$/.exec(line);assert.equal(type,'blob');const bytes=fs.readFileSync(path.join(directory,file));const actual=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');assert.equal(actual,blob,file);return {path:file,mode,blob,bytes:bytes.length,sha256:hash(bytes)};});
}
function artifacts(directory){const result=[];function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())scan(file);else{const bytes=fs.readFileSync(file);result.push({path:path.relative(directory,file),bytes:bytes.length,sha256:hash(bytes)});}}}scan(directory);return result.sort((a,b)=>a.path.localeCompare(b.path));}
if(!fs.existsSync(sources.original.directory+'/node_modules'))fs.symlinkSync(sources.candidate.directory+'/node_modules',sources.original.directory+'/node_modules','dir');
const receipt={createdAt:new Date().toISOString(),node:process.version,install:{command:'npm ci --cache <owned /dev/shm cache> --no-audit --no-fund',exitCode:0,log:'install.log',sha256:hash(fs.readFileSync(evidence+'/install.log'))},sources,commands:[]};
try {
 for(const [name,source] of Object.entries(sources)){
  const git=arg=>execFileSync('git',['-C',source.directory,'rev-parse',arg],{encoding:'utf8'}).trim();
  assert.equal(git('HEAD'),source.commit);assert.equal(git('HEAD^{tree}'),source.tree);
  source.before=freeze(source.directory);
  const run=spawnSync('npm',['run','build'],{cwd:source.directory,encoding:'utf8',timeout:180000,maxBuffer:8e6,env:{...process.env,npm_config_cache:root+'/npm-cache'}});
  const log=name+'-build.log';fs.writeFileSync(evidence+'/'+log,run.stdout+'\n'+run.stderr);
  receipt.commands.push({name,args:['npm','run','build'],exitCode:run.status,signal:run.signal,error:run.error?.message,log,logSha256:hash(fs.readFileSync(evidence+'/'+log))});assert.equal(run.status,0,name+' build');
  source.after=freeze(source.directory);assert.deepEqual(source.after,source.before);
  source.artifacts=artifacts(source.directory+'/dist');
 }
 receipt.complete=true;
}catch(error){receipt.error=error.stack;process.exitCode=1;}
finally{fs.writeFileSync(evidence+'/build-receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({complete:receipt.complete,error:receipt.error,commands:receipt.commands}));}
