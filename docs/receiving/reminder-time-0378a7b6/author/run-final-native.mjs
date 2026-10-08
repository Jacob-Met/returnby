import fs from 'node:fs';import {spawnSync} from 'node:child_process';
const root='D:/Hamon/worktrees/returnby-discovery-0378a7b6',proof='D:/Hamon/worktrees/returnby-reminder-timing-0378a7b6-proof';
const receipt={started:new Date().toISOString(),node:process.version,commands:[]};
for(const [name,args]of[['final-native-tests',['test']],['final-native-build',['run','build']]]){
const r=spawnSync(process.execPath,['C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js',...args],{cwd:root,encoding:'utf8',shell:false,env:{...process.env,TEMP:proof+'/temp',TMP:proof+'/temp',npm_config_cache:proof+'/npm-cache'}});
fs.writeFileSync(proof+'/'+name+'.log',r.stdout+'\n'+r.stderr);
receipt.commands.push({name,args,status:r.status,signal:r.signal,error:r.error?.message});fs.writeFileSync(proof+'/final-native-gates.json',JSON.stringify(receipt,null,2));if(r.status!==0){console.log(JSON.stringify(receipt));process.exit(1);}
}receipt.completed=new Date().toISOString();fs.writeFileSync(proof+'/final-native-gates.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
