import json,hashlib,os,subprocess,sys,time
from pathlib import Path
root=Path(r'D:\hamon-dcac8b3b8755-preview-format-z01m1aeq')
packet=json.loads((root/'candidate-packet.json').read_bytes())
data=packet['content'].encode()
if hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()!=packet['git_blob'] or hashlib.sha256(data).hexdigest()!=packet['sha256']:
    raise ValueError('candidate identity mismatch')
with (root/'candidate-receiver.py').open('xb') as stream: stream.write(data)
env=dict(os.environ,TEMP=str(root/'tmp'),TMP=str(root/'tmp'),PYTHONDONTWRITEBYTECODE='1')
argv=[sys.executable,'-I','-B',str(root/'receive_compatibility.py'),'--root',str(root),'--phase','candidate','--receiver',str(root/'candidate-receiver.py'),'--receiver-git',packet['git_blob']]
started=time.time()
with (root/'candidate-course.stdout').open('xb') as stdout,(root/'candidate-course.stderr').open('xb') as stderr:
    p=subprocess.Popen(argv,cwd=root,env=env,stdout=stdout,stderr=stderr)
    rc=p.wait(timeout=90)
result={'argv':argv,'pid':p.pid,'returncode':rc,'started_unix':started,'finished_unix':time.time()}
(root/'candidate-launch.json').write_bytes((json.dumps(result,indent=2)+'\n').encode())
print(json.dumps(result))
print((root/'candidate-course.stdout').read_text())
raise SystemExit(rc)
