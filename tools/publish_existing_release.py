#!/usr/bin/env python3
import argparse,pathlib,json,hashlib,subprocess,zipfile
p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('tag');p.add_argument('directory');p.add_argument('--gh',default='/usr/bin/gh',help='Established GitHub CLI executable; uses its existing authorization');a=p.parse_args()
out=pathlib.Path(a.directory)
manifest=json.loads((out/'manifest.json').read_text())
actual=a.source
if manifest['source']!=actual or manifest['tag']!=a.tag:raise RuntimeError('Manifest source/tag mismatch')
archive=out/pathlib.Path(manifest['archive']).name
notes=out/'RELEASE_NOTES.md'
digest=hashlib.sha256(archive.read_bytes()).hexdigest()
if digest!=manifest['sha256']:raise RuntimeError('Transferred package checksum mismatch')
with zipfile.ZipFile(archive) as z:
 readme=z.read(next(n for n in z.namelist() if n.endswith('/READ_ME_FIRST.txt'))).decode()
 if actual not in readme:raise RuntimeError('Package source provenance mismatch')
def run(args,cwd=None):
 r=subprocess.run(args,cwd=cwd,text=True,capture_output=True)
 if r.returncode:raise RuntimeError('Command failed: '+str(args[:3])+'\n'+r.stdout+'\n'+r.stderr)
 return r.stdout
endpoint='repos/Jacob-Met/returnby/releases/tags/'+a.tag
existing=subprocess.run([a.gh,'api',endpoint],text=True,capture_output=True)
if existing.returncode==0:
 release=json.loads(existing.stdout)
 if release['target_commitish']!=actual:raise RuntimeError('Existing tag targets different source; no mutation')
else:
 if 'HTTP 404' not in existing.stderr:raise RuntimeError('Release absence not established: '+existing.stderr)
 request=out/'release-request.json'
 request.write_text(json.dumps({'tag_name':a.tag,'target_commitish':actual,'name':'ReturnBy — mobile desk and refund follow-through','body':notes.read_text(),'draft':False,'prerelease':True}))
 created=subprocess.run([a.gh,'release','create',a.tag,'--repo','Jacob-Met/returnby','--target',actual,'--title','ReturnBy — mobile desk and refund follow-through','--prerelease','--notes-file',str(notes)],text=True,capture_output=True)
 if created.returncode:
  observed=subprocess.run([a.gh,'api',endpoint],text=True,capture_output=True)
  if observed.returncode:raise RuntimeError('Creation did not return success; exact destination read also failed. Original error: '+created.stderr+' Observation: '+observed.stderr)
  release=json.loads(observed.stdout)
 else:release=json.loads(run([a.gh,'api',endpoint]))
 if release['target_commitish']!=actual:raise RuntimeError('Destination source mismatch')
assets=release.get('assets',[])
if not any(x['name']==archive.name for x in assets):
 uploaded=subprocess.run([a.gh,'release','upload',a.tag,str(archive),str(out/'SHA256SUMS'),'--repo','Jacob-Met/returnby'],text=True,capture_output=True)
 release=json.loads(run([a.gh,'api',endpoint]))
 if uploaded.returncode and not any(x['name']==archive.name for x in release.get('assets',[])):raise RuntimeError('Asset upload not observed: '+uploaded.stderr)
else:release=json.loads(run([a.gh,'api',endpoint]))
asset=next(x for x in release['assets'] if x['name']==archive.name)
received=out/'downloaded.zip'
with received.open('wb') as f:
 r=subprocess.run([a.gh,'api','repos/Jacob-Met/returnby/releases/assets/'+str(asset['id']),'-H','Accept: application/octet-stream'],stdout=f,stderr=subprocess.PIPE)
 if r.returncode:raise RuntimeError('Published asset download failed: '+r.stderr.decode())
if hashlib.sha256(received.read_bytes()).hexdigest()!=digest:raise RuntimeError('Published asset checksum mismatch')
print(json.dumps({'url':release['html_url'],'asset_id':asset['id'],'download_verified':True,'sha256':digest}),flush=True)
