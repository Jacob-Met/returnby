from pathlib import Path
import json,subprocess,hashlib,time
r=Path('D:/HAMON/returnby-backup-calendar-browser-5f566b5ec8ef');s=r/'source'
g=json.loads((r/'guide-transfer.json').read_text())['text'];(s/'browser/README.md').write_bytes(g.encode())
p=r/'browser-v1.py';b=p.read_bytes();(r/'evidence/browser-helper-unrun-draft.py').write_bytes(b)
t=b.decode();line="mixed=[order('late'),order('done',completedAt=at),order('edge',orderDate='9999-12-30',windowDays=1),order('early',orderDate='2026-09-01')]\n"
assert t.replace('\r\n','\n').count(line)==1
t=t.replace('\r\n','\n').replace(line,'');p.write_bytes(t.encode())
start=time.monotonic();run=subprocess.run(['C:/Users/Veria/AppData/Local/Programs/Python/Python311/python.exe','-X','utf8','-B',str(p)],cwd=r,capture_output=True)
(r/'evidence/browser-v1-process-stdout.txt').write_bytes(run.stdout);(r/'evidence/browser-v1-process-stderr.txt').write_bytes(run.stderr)
receipt={'exit':run.returncode,'seconds':time.monotonic()-start,'helper_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'guide_sha256':hashlib.sha256((s/'browser/README.md').read_bytes()).hexdigest()}
(r/'evidence/browser-v1-process.json').write_bytes((json.dumps(receipt,indent=2)+'\n').encode())
print(json.dumps(receipt));print(run.stdout.decode()[-1800:]);print(run.stderr.decode()[-1000:])
