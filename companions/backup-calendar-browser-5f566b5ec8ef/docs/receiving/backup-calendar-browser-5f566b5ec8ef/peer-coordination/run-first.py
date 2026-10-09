from pathlib import Path
import subprocess,time,json,hashlib
R=Path(r'D:/HAMON/returnby-backup-calendar-browser-peer-coordination-5f566b5ec8ef');O=R/'process-first';O.mkdir(exist_ok=False);s=R/'receiver.mjs';t=time.monotonic()
with (O/'stdout.txt').open('wb') as out,(O/'stderr.txt').open('wb') as err:
 p=subprocess.run([r'C:/Program Files/nodejs/node.exe',str(s)],cwd=R,stdout=out,stderr=err,timeout=60)
doc={'exit':p.returncode,'seconds':time.monotonic()-t,'script_sha256':hashlib.sha256(s.read_bytes()).hexdigest()}
(O/'process.json').write_text(json.dumps(doc,indent=2)+'\n',encoding='utf-8');print(json.dumps(doc),flush=True)
