import fs from 'node:fs';
const p='D:/Hamon/worktrees/returnby-reminder-timing-0378a7b6-proof';
let s=fs.readFileSync(p+'/receive-candidate.mjs','utf8');
s=s.replace("out=proof+'/candidate-browser'","out=proof+'/candidate-browser-v2'").replace('downloadsPath:out','downloadsPath:path.resolve(out)');
fs.writeFileSync(p+'/receive-candidate-v2.mjs',s);
