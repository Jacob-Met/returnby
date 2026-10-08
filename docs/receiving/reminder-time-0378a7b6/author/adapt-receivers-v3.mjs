import fs from 'node:fs';
const p='D:/Hamon/worktrees/returnby-reminder-timing-0378a7b6-proof';
let s=fs.readFileSync(p+'/receive-candidate-v2.mjs','utf8').replace("out=proof+'/candidate-browser-v2'","out=proof+'/candidate-browser-v3'");
s=s.replace('await page.clock.install({time:clock});','await page.clock.install({time:clock}); await page.clock.setFixedTime(clock);');
s=s.replace('await page.clock.fastForward(61_000);',"await page.clock.setFixedTime(new Date('2026-03-01T12:01:01Z'));");
fs.writeFileSync(p+'/receive-candidate-v3.mjs',s);
let b=fs.readFileSync(p+'/receive-baseline-v2.mjs','utf8').replace("const root='D:/Hamon/worktrees/returnby-discovery-0378a7b6'","const root='D:/Hamon/worktrees/returnby-reminder-timing-0378a7b6-proof/baseline-canonical'").replace("out=proof+'/baseline-browser-v2'","out=proof+'/baseline-browser-v3'").replace("downloadsPath:out","downloadsPath:out.replaceAll('/', '\\\\')");
b=b.replace("await page.clock.install({time:new Date('2026-10-08T12:00:00Z')});","await page.clock.install({time:new Date('2026-10-08T12:00:00Z')}); await page.clock.setFixedTime(new Date('2026-10-08T12:00:00Z'));");
fs.writeFileSync(p+'/receive-baseline-v3.mjs',b);
