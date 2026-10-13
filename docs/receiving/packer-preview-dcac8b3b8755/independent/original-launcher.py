import json,hashlib,os,subprocess,sys,time
from pathlib import Path
root=Path(r'D:\hamon-dcac8b3b8755-preview-format-z01m1aeq')
packet=json.loads((root/'source-packet.json').read_bytes())
for item in packet['files']:
    data=item['content'].encode('utf-8')
    actual=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
    if actual!=item['git_blob']: raise ValueError('staging identity mismatch')
    with (root/item['path']).open('xb') as stream: stream.write(data)
(root/'tmp').mkdir()
env=dict(os.environ,TEMP=str(root/'tmp'),TMP=str(root/'tmp'),PYTHONDONTWRITEBYTECODE='1')
argv=[sys.executable,'-I','-B',str(root/'receive_compatibility.py'),'--root',str(root),'--phase','original','--receiver',str(root/'original-receiver.py'),'--receiver-git','2d30a8a10014f8d21e5d34febc1f446e36fceba3']
started=time.time()
with (root/'original-course.stdout').open('xb') as stdout,(root/'original-course.stderr').open('xb') as stderr:
    p=subprocess.Popen(argv,cwd=root,env=env,stdout=stdout,stderr=stderr)
    rc=p.wait(timeout=90)
result={'argv':argv,'pid':p.pid,'returncode':rc,'started_unix':started,'finished_unix':time.time()}
(root/'original-launch.json').write_bytes((json.dumps(result,indent=2)+'\n').encode())
print(json.dumps(result))
print((root/'original-course.stdout').read_text())
raise SystemExit(rc)
