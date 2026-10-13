"""Exercise the documented read-only packet verifier in an isolated copied evidence layout."""
import os, json, hashlib, tempfile, subprocess, datetime, traceback
from pathlib import Path
OWN=Path('/home/jacob/.commander-tp-2/hamon-team-20261013-1bkvjx8k/delivery')
NATIVE=Path('/home/jacob/hamon-returnby-linux-qtw10pxc-62h26e6o')
OUT=OWN/'RETURNBY-LINUX-PORTABLE-DECODER-RECEIVING.json'
checks=[]; originals={}
def identity(b):return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'git_blob':hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()}
def read(p):
    b=p.read_bytes();originals[str(p)]={**identity(b),'mtime_ns':str(p.stat().st_mtime_ns)}
    return b
def check(name,condition):
    checks.append({'name':name,'passed':bool(condition)})
    if not condition:raise RuntimeError(name)
receipt={'format':'returnby-portable-decoder-receiving-v1','accepted':False,'checks':checks,
 'scope':'Single execution of the inspected read-only packet decoder only; no product, application tests, build or browser execution.',
 'started_at':datetime.datetime.now(datetime.timezone.utc).isoformat()}
try:
    index_bytes=read(NATIVE/'transport-packets/TRANSPORT-INDEX.json')
    check('frozen_transport_index',identity(index_bytes)['git_blob']=='9cce8ecdf3d69934330c7f47a29481cc0a040823')
    index=json.loads(index_bytes)
    verifier=read(OWN/'RETURNBY-PORTABLE-VERIFY-PACKETS.py')
    check('frozen_portable_verifier',identity(verifier)['git_blob']=='ff14a9e9287c2a5def795f299b6fcf106360188c')
    root=Path(tempfile.mkdtemp(prefix='returnby-packet-portable-',dir=OWN))
    receipt['directory']=str(root);mapping={'verify_packets.py':verifier,'evidence/TRANSPORT-INDEX.json':index_bytes,
      'evidence/INDEX.json':read(NATIVE/'evidence-packets/INDEX.json')}
    for row in index['wrappers']:
        data=read(NATIVE/'transport-packets'/row['name'])
        check('source_wrapper.'+row['name'],identity(data)=={k:row[k] for k in ('bytes','sha256','git_blob')})
        mapping['evidence/transport/'+row['name']]=data
    before={}
    for name,data in mapping.items():
        p=root/name;p.parent.mkdir(parents=True,exist_ok=True)
        with p.open('xb') as stream:stream.write(data)
        check('exact_copy.'+name,p.read_bytes()==data)
        before[name]={**identity(data),'mtime_ns':str(p.stat().st_mtime_ns)}
    argv=['/usr/bin/python3','-B','verify_packets.py'];receipt['argv']=argv
    result=subprocess.run(argv,cwd=root,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=30,check=False)
    receipt['exit_code']=result.returncode
    for name,data in [('stdout.txt',result.stdout),('stderr.txt',result.stderr)]:
        with (root/name).open('xb') as stream:stream.write(data)
    check('portable_exit_zero',result.returncode==0)
    check('portable_exact_output',result.stdout==b'Verified nine wrappers and 80 exact native members; no files written.\n' and result.stderr==b'')
    after={name:{**identity((root/name).read_bytes()),'mtime_ns':str((root/name).stat().st_mtime_ns)} for name in mapping}
    check('all_copied_evidence_unchanged',before==after)
    expected=set(mapping)|{'stdout.txt','stderr.txt'}
    actual={p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()}
    check('no_decoder_written_files',actual==expected)
    check('native_originals_unchanged',all({**identity(Path(p).read_bytes()),'mtime_ns':str(Path(p).stat().st_mtime_ns)}==row for p,row in originals.items()))
    receipt['accepted']=True
    receipt['copied_files']=before
    receipt['stdout']={'path':str(root/'stdout.txt'),**identity(result.stdout)}
    receipt['stderr']={'path':str(root/'stderr.txt'),**identity(result.stderr)}
    receipt['observed_statement']=result.stdout.decode('ascii').strip()
except BaseException:
    receipt['error']=traceback.format_exc()
finally:
    receipt['originals']=originals;receipt['passed_checks']=sum(x['passed'] for x in checks);receipt['failed_checks']=sum(not x['passed'] for x in checks)
    receipt['finished_at']=datetime.datetime.now(datetime.timezone.utc).isoformat()
    data=(json.dumps(receipt,indent=2,ensure_ascii=True)+'\n').encode('ascii')
    with OUT.open('xb') as stream:stream.write(data)
    print(json.dumps({'accepted':receipt['accepted'],'passed_checks':receipt['passed_checks'],'failed_checks':receipt['failed_checks'],'receipt':str(OUT),**identity(data),'error':receipt.get('error')}),flush=True)
raise SystemExit(0 if receipt['accepted'] else 1)
