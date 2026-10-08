import base64,hashlib,io,json,tarfile,subprocess,shutil
from pathlib import Path
root=Path('/tmp/returnby-undo-6e5752b49b6f-production')
raw=base64.b64decode((root/'transfer.b64').read_text(),validate=True)
assert hashlib.sha256(raw).hexdigest()=='ffadf93db288f275a6a376a68dc5d6cf90bf7c72743d9cd3ccdd6939efebe94b'
assert len(raw)==29355
with tarfile.open(fileobj=io.BytesIO(raw),mode='r:gz') as tar:
    members=tar.getmembers()
    assert len(members)==12 and sum(m.size for m in members)<1024*1024
    for m in members:
        rel=Path(m.name)
        assert m.isfile() and not rel.is_absolute() and '..' not in rel.parts
        target=root/rel
        assert not target.exists()
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(tar.extractfile(m).read())
manifest=json.loads((root/'receiving-undo/mac-transfer-manifest.json').read_text())
assert manifest['source_head']=='28eecc07a6552a9d16da7feebd352db06ab7fcc8'
for name,record in manifest['files'].items():
    content=(root/name).read_bytes()
    assert len(content)==record['bytes'] and hashlib.sha256(content).hexdigest()==record['sha256'],name
report={'accepted':True,'source_head':manifest['source_head'],'application_head':manifest['executed_application_head'],'archive_sha256':'ffadf93db288f275a6a376a68dc5d6cf90bf7c72743d9cd3ccdd6939efebe94b','verified_files':len(manifest['files']),'build':str(root/'dist'),'free_tmp':shutil.disk_usage(root).free,'node':subprocess.check_output(['node','--version'],text=True).strip()}
(root/'receiving-undo/mac-admission.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
