import datetime,hashlib,json,os,pathlib,platform,subprocess,time
root=pathlib.Path(__file__).resolve().parent
bundle=json.loads((root/'source-bundle.json').read_text(encoding='utf-8'))
def blob(data):
 return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
(root/'tmp').mkdir()
receipt={'schema':'returnby.timestamp_browser_build.v1','started_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'original_commit':bundle['original_commit'],'candidate_commit':bundle['candidate_commit'],'stage':str(root),'platform':platform.platform(),'uid':os.getuid(),'node':subprocess.check_output(['node','--version'],text=True).strip(),'npm':subprocess.check_output(['npm','--version'],text=True).strip(),'browser':subprocess.check_output(['/snap/bin/chromium','--version'],text=True).strip(),'builds':[]}
dependency=pathlib.Path('/var/tmp/returnby-iso-timestamp-719c8e1b4e10-se79dh4x/baseline/node_modules')
receipt['dependencies']={'source':str(dependency),'vite':json.loads((dependency/'vite/package.json').read_text())['version'],'typescript':json.loads((dependency/'typescript/package.json').read_text())['version'],'note':'Reuses only the previously installed own-stage dependencies from the unchanged npm lock. No package install or machine-wide setting change.'}
for variant in ('original','candidate'):
 destination=root/variant
 destination.mkdir(mode=0o700)
 source_manifest=[]
 for item in bundle['files']:
  raw=item['content'].encode('utf-8')
  assert blob(raw)==item['sha'],item['path']
  if variant=='candidate' and item['path']=='src/parse.ts':
   raw=bundle['candidate_parse']['content'].encode('utf-8')
   assert blob(raw)==bundle['candidate_parse']['sha']
  target=destination/item['path']
  target.parent.mkdir(parents=True,exist_ok=True)
  with target.open('xb') as output: output.write(raw)
  source_manifest.append({'path':item['path'],'git_blob':blob(raw),'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)})
 (destination/'node_modules').symlink_to(dependency,target_is_directory=True)
 t=time.monotonic()
 completed=subprocess.run(['npm','run','build'],cwd=destination,env=dict(os.environ,TZ='UTC',TMPDIR=str(root/'tmp')),capture_output=True,timeout=90)
 build={'variant':variant,'command':['npm','run','build'],'exit':completed.returncode,'seconds':round(time.monotonic()-t,3),'stdout':completed.stdout.decode('utf-8',errors='replace'),'stderr':completed.stderr.decode('utf-8',errors='replace'),'source_manifest':source_manifest,'source_unchanged':all(blob((destination/item['path']).read_bytes())==item['git_blob'] for item in source_manifest),'outputs':[]}
 if (destination/'dist').is_dir():
  for p in sorted((destination/'dist').rglob('*')):
   if p.is_file():
    raw=p.read_bytes()
    build['outputs'].append({'path':str(p.relative_to(destination/'dist')),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
 receipt['builds'].append(build)
 print(json.dumps({'variant':variant,'exit':build['exit'],'seconds':build['seconds'],'source_unchanged':build['source_unchanged'],'outputs':len(build['outputs'])}),flush=True)
receipt['completed_at']=datetime.datetime.now(datetime.timezone.utc).isoformat()
receipt['accepted']=all(x['exit']==0 and x['source_unchanged'] for x in receipt['builds'])
raw=(json.dumps(receipt,indent=2)+'\n').encode('utf-8')
(root/'build-receipt.json').write_bytes(raw)
print(json.dumps({'accepted':receipt['accepted'],'receipt_sha256':hashlib.sha256(raw).hexdigest(),'receipt_git_blob':blob(raw),'bytes':len(raw)}),flush=True)
raise SystemExit(0 if receipt['accepted'] else 1)
