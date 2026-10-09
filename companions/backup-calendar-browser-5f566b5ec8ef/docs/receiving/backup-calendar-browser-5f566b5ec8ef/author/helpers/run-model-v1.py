from pathlib import Path
import subprocess,json,hashlib,time
r=Path('D:/HAMON/returnby-backup-calendar-browser-5f566b5ec8ef');s=r/'source';p=s/'browser/calendar.test.mjs'
assert not p.exists();p.write_bytes(json.loads((r/'model-test-transfer.json').read_text())['text'].encode())
out=r/'evidence/model-v1';out.mkdir(exist_ok=False)
before={str(p.relative_to(s)):hashlib.sha256(p.read_bytes()).hexdigest() for p in s.rglob('*') if p.is_file() and '.git' not in p.parts}
start=time.monotonic();run=subprocess.run(['C:/Program Files/nodejs/node.exe','--test',str(p)],cwd=s,capture_output=True)
(out/'stdout.txt').write_bytes(run.stdout);(out/'stderr.txt').write_bytes(run.stderr)
after={name:hashlib.sha256((s/name).read_bytes()).hexdigest() for name in before};assert before==after
receipt={'exit':run.returncode,'seconds':time.monotonic()-start,'input_sha256':before,'source_unchanged':True}
(out/'receipt.json').write_bytes((json.dumps(receipt,indent=2)+'\n').encode())
print(json.dumps(receipt|{'stdout':run.stdout.decode()[-3000:],'stderr':run.stderr.decode()}))
