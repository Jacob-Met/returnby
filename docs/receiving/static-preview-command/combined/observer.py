from pathlib import Path
import hashlib,json,subprocess,sys,time
root=Path('/private/var/tmp/hamon-dcac8b3b8755-returnby-receiver-v1')
tool=root/'tools/receive_static_preview.py'
packet=Path('/private/var/tmp/hamon-dcac8b3b8755-returnby-combined-delivery-v1/returnby-intake-and-long-cards-6eef8ae0-v1.zip')
out=root/'combined-receiving'
def pin(p):
 b=p.read_bytes();s=p.stat()
 return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'git_blob':hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest(),'mtime_ns':s.st_mtime_ns,'mode':s.st_mode,'inode':s.st_ino}
before={'tool':pin(tool),'packet':pin(packet)}
argv=[sys.executable,'-I','-B',str(tool),'--archive',str(packet),'--sha256','d73df74c588e9387bab391b2cf2c731056a7b1e01feb4bc89bde79a2a829f06f','--output',str(out),'--port','8799']
started=time.time()
with (root/'combined.stdout').open('wb') as stdout,(root/'combined.stderr').open('wb') as stderr:
 child=subprocess.Popen(argv,stdout=stdout,stderr=stderr)
 code=child.wait(timeout=30)
after={'tool':pin(tool),'packet':pin(packet)}
receipt={'schema':'returnby.preview-receiver-actual-command/1','started':started,'finished':time.time(),'argv':argv,'child_pid':child.pid,'returncode':code,'before':before,'after':after,'inputs_preserved':before==after,'stdout':pin(root/'combined.stdout'),'stderr':pin(root/'combined.stderr')}
(root/'combined-command.json').write_text(json.dumps(receipt,indent=2)+'\n')
r=json.loads((out/'receiving.json').read_text()) if (out/'receiving.json').exists() else {}
print(json.dumps({'returncode':code,'child_pid':child.pid,'inputs_preserved':before==after,'stdout':(root/'combined.stdout').read_text(),'stderr':(root/'combined.stderr').read_text(),'receipt':pin(root/'combined-command.json'),'receiving':pin(out/'receiving.json') if r else None,'http_count':len(r.get('http',[])),'server_returncode':r.get('server',{}).get('returncode')}))
raise SystemExit(code or (0 if before==after else 1))
