from pathlib import Path
import hashlib,json,subprocess,sys,time
root=Path('/private/var/tmp/hamon-dcac8b3b8755-returnby-receiver-v1')
def pin(p):
 b=p.read_bytes();s=p.stat()
 return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'git_blob':hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest(),'mtime_ns':s.st_mtime_ns,'mode':s.st_mode,'inode':s.st_ino}
sources=sorted((root/'tools').glob('*.py'))
before={p.name:pin(p) for p in sources}
started=time.time()
with (root/'unit.stdout').open('wb') as out,(root/'unit.stderr').open('wb') as err:
 child=subprocess.Popen([sys.executable,'-I','-B',str(root/'tools/test_receive_static_preview.py')],cwd=root,stdout=out,stderr=err)
 code=child.wait(timeout=120)
after={p.name:pin(p) for p in sources}
receipt={'schema':'returnby.preview-receiver-unit/1','started':started,'finished':time.time(),'child_pid':child.pid,'returncode':code,'before':before,'after':after,'source_preserved':before==after,'stdout':pin(root/'unit.stdout'),'stderr':pin(root/'unit.stderr')}
(root/'unit-receiving.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'returncode':code,'child_pid':child.pid,'source_preserved':before==after,'stderr':(root/'unit.stderr').read_text(),'receipt':pin(root/'unit-receiving.json')}))
raise SystemExit(code or (0 if before==after else 1))
