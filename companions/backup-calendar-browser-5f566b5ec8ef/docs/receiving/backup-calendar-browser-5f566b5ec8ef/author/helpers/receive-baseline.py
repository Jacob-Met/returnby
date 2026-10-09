from pathlib import Path
import subprocess,json,hashlib,datetime
r=Path('D:/HAMON/returnby-backup-calendar-browser-5f566b5ec8ef');s=r/'source'
head=subprocess.check_output(['git','-C',str(s),'rev-parse','HEAD'],text=True).strip()
status=subprocess.check_output(['git','-C',str(s),'status','--porcelain'],text=True)
m=json.loads((r/'evidence/original-input-manifest.json').read_text())
for x in m['files']:assert hashlib.sha256((s/'original'/x['path']).read_bytes()).hexdigest()==x['sha256']
assert not status
out=r/'evidence/baseline';out.mkdir(exist_ok=False)
p=subprocess.run(['C:/Program Files/nodejs/node.exe',str(r/'baseline.mjs')],cwd=r,capture_output=True)
(out/'stdout.txt').write_bytes(p.stdout);(out/'stderr.txt').write_bytes(p.stderr)
receipt={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exit':p.returncode,'head':head,'input_files':m['files'],'status':status,'process':'actual installed Node24.19.0; original module only; not original fullcampaign replay'}
if p.returncode==0:receipt['result']=json.loads(p.stdout)
for x in m['files']:assert hashlib.sha256((s/'original'/x['path']).read_bytes()).hexdigest()==x['sha256']
(out/'receipt.json').write_bytes((json.dumps(receipt,indent=2)+'\n').encode())
print(json.dumps({'exit':p.returncode,'head':head,'checks':receipt.get('result',{}).get('checks'),'stderr':p.stderr.decode()[:2000]}))
