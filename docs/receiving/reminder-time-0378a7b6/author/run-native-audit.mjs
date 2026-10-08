import fs from 'node:fs';import {spawnSync}from'node:child_process';
const root='D:/Hamon/worktrees/returnby-discovery-0378a7b6',proof='D:/Hamon/worktrees/returnby-reminder-timing-0378a7b6-proof';
const r=spawnSync(process.execPath,['C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js','audit','--audit-level=moderate'],{cwd:root,encoding:'utf8',env:{...process.env,TEMP:proof+'/temp',TMP:proof+'/temp',npm_config_cache:proof+'/npm-cache'}});
fs.writeFileSync(proof+'/native-audit.log',r.stdout+'\n'+r.stderr);fs.writeFileSync(proof+'/native-audit.json',JSON.stringify({at:new Date().toISOString(),node:process.version,status:r.status,error:r.error?.message,signal:r.signal},null,2)+'\n');console.log(r.stdout+r.stderr);process.exitCode=r.status??1;
