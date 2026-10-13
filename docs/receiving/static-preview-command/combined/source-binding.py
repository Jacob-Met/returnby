from pathlib import Path
import json,zipfile,hashlib
base=Path('/private/var/tmp/hamon-dcac8b3b8755-returnby-intake-v1')
root=Path('/private/var/tmp/hamon-dcac8b3b8755-returnby-receiver-v1')
archive=Path('/private/var/tmp/hamon-dcac8b3b8755-returnby-combined-delivery-v1/returnby-intake-and-long-cards-6eef8ae0-v1.zip')
def pin(b):return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'git_blob':hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()}
with zipfile.ZipFile(archive) as z:
 expected=json.loads(z.read('evidence/combined-expected.json'))
 if expected!=json.loads((base/'combined-expected.json').read_text()):raise ValueError('source manifest differs')
 files={r['path']:r for r in expected['files']}
 selected=[]
 for n in z.namelist():
  if n.startswith('source-selected/'):
   p=n[len('source-selected/'):]
   if pin(z.read(n))['git_blob']!=files[p]['sha']:raise ValueError(p)
   selected.append(p)
 names=[n for n in z.namelist() if n.startswith('preview/')]
 actual={p.relative_to(base/'combined/dist').as_posix() for p in (base/'combined/dist').rglob('*') if p.is_file()}
 if actual!={n[len('preview/'):] for n in names}:raise ValueError('dist membership')
 for n in names:
  if z.read(n)!=(base/'combined/dist'/n[len('preview/'):]).read_bytes():raise ValueError(n)
 expected_receipt={'bytes':69976,'sha256':'58a0538880ee2f60eb96a30bfbc0d41074d226579059fc9b94520abb7101c6a0','git_blob':'c92ee011ea155e598dead8f4406317f006f4bc54'}
 if pin(z.read('evidence/combined/receiving.json'))!=expected_receipt:raise ValueError('raw browser receipt')
 out={'passed':True,'source_commit':expected['commit'],'source_tree':expected['tree'],'source_files':len(files),'selected':selected,'dist_files':len(names),'raw_combined_receipt':expected_receipt,'archive':pin(archive.read_bytes()),'scope':'Read-only source and retained-built-asset binding; no product replay.'}
 b=(json.dumps(out,indent=2)+'\n').encode();(root/'combined-source-binding.json').write_bytes(b)
 print(json.dumps({'passed':True,'selected':len(selected),'dist':len(names),'receipt':pin(b)}))
