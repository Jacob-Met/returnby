'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');

// Frozen before candidate editing. This arithmetic oracle never constructs a Date.
function nextCivilDay(iso) {
  let [year, month, day] = iso.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (++day > monthDays[month - 1]) { day = 1; if (++month > 12) { month = 1; ++year; } }
  return `${String(year).padStart(4, '0')}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
}
const zones = ['UTC', 'Pacific/Apia', 'Pacific/Kwajalein', 'Pacific/Kiritimati', 'America/Los_Angeles', 'America/New_York', 'Australia/Lord_Howe', 'Asia/Kathmandu'];
const cases = [
  ['2011-12-29', '20111230'], ['1993-08-20', '19930821'], ['1994-12-30', '19941231'],
  ['2011-12-30', '20111231'], ['2026-03-08', '20260309'], ['2026-11-01', '20261102'],
  ['2026-10-04', '20261005'], ['2026-04-05', '20260406'], ['2026-11-02', '20261103'],
  ['2024-02-28', '20240229'], ['2024-02-29', '20240301'], ['2025-02-28', '20250301'],
  ['1900-02-28', '19000301'], ['2000-02-28', '20000229'], ['2000-02-29', '20000301'],
  ['2100-02-28', '21000301'], ['2026-12-31', '20270101'], ['1000-01-01', '10000102'],
  ['9998-12-31', '99990101'], ['9999-12-30', '99991231'],
];
for (const [due, end] of cases) if (nextCivilDay(due) !== end) throw Error(`Incorrect frozen expectation: ${due}`);

if (process.argv[2] === '--child') {
  const {buildIcs} = require(path.resolve(process.argv[3], 'ics.js'));
  const {dueDate} = require(path.resolve(process.argv[3], 'deadline.js'));
  const stamp = new Date('2026-10-08T12:34:56.000Z');
  const rows = cases.map(([due, expectedEnd]) => {
    const order = Object.freeze({id:'frozen-id', merchant:'Étoile 家具,;\\\n🛍️'.repeat(8), orderNo:'AB,12;34\\x', due});
    const calendar = buildIcs(order, stamp);
    const unfolded = calendar.replace(/\r\n[ \t]/g, '');
    const actualEnd = /^DTEND;VALUE=DATE:(.*)$/m.exec(unfolded)[1].trim();
    const actualStart = /^DTSTART;VALUE=DATE:(.*)$/m.exec(unfolded)[1].trim();
    if (actualStart !== due.replaceAll('-', '')) throw Error('Start changed');
    if (!unfolded.includes('UID:frozen-id@returnby\r\n') || !unfolded.includes('TRIGGER:-P3D\r\n')) throw Error('Event contract changed');
    if (calendar.split('\r\n').some(x => Buffer.byteLength(x)>75)) throw Error('Fold exceeded 75 bytes');
    return {due, expectedEnd, actualEnd, pass:actualEnd===expectedEnd,
      calendar_sha256:crypto.createHash('sha256').update(calendar).digest('hex')};
  });
  const reachable = [['2011-12-28',1],['1993-08-19',1],['1994-12-29',1]].map(([date,days])=>{
    const due=dueDate(date,days), calendar=buildIcs({id:'reachable',merchant:'Fictional store',due},stamp);
    const actualEnd=/^DTEND;VALUE=DATE:(.*)$/m.exec(calendar)[1].trim();
    return {orderDate:date,windowDays:days,due,expectedEnd:nextCivilDay(due),actualEnd,pass:actualEnd===nextCivilDay(due)};
  });
  // 180 month/year-end and leap-adjacent modern compatibility cases per zone.
  const modern=[];
  for(let year=2020;year<=2029;year++) for(let month=1;month<=12;month++) {
    const mm=String(month).padStart(2,'0');
    modern.push(`${year}-${mm}-01`);
    if(month%2===0)modern.push(`${year}-${mm}-28`);
  }
  const digester=crypto.createHash('sha256');
  for(const due of modern) {
    const calendar=buildIcs({id:'ordinary',merchant:'Fixture Shop',orderNo:'12345',due},stamp);
    if(!calendar.includes(`DTEND;VALUE=DATE:${nextCivilDay(due)}\r\n`))throw Error('Modern calendar mismatch');
    digester.update(calendar);
  }
  process.stdout.write(JSON.stringify({zone:process.env.TZ,resolvedZone:Intl.DateTimeFormat().resolvedOptions().timeZone,rows,reachable,modern:{cases:modern.length,sha256:digester.digest('hex')}}));
} else {
  const root=path.resolve(process.argv[2]);
  const results=zones.map(TZ=>JSON.parse(cp.execFileSync(process.execPath,[__filename,'--child',root],{env:{...process.env,TZ},encoding:'utf8',timeout:10000})));
  const rows=results.flatMap(z=>z.rows);
  const reach=results.flatMap(z=>z.reachable);
  const out={created_at:new Date().toISOString(),node:process.version,versions:process.versions,source_dir:root,
    receiver_sha256:crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),
    boundary_summary:{total:rows.length,passed:rows.filter(r=>r.pass).length,failed:rows.filter(r=>!r.pass).length},
    native_call_chain_summary:{total:reach.length,passed:reach.filter(r=>r.pass).length,failed:reach.filter(r=>!r.pass).length},
    modern_cases:results.reduce((s,r)=>s+r.modern.cases,0),results};
  process.stdout.write(JSON.stringify(out,null,2)+'\n');
}
