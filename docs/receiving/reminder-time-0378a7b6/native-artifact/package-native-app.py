from pathlib import Path
import hashlib,json,zipfile,datetime
proof=Path(r'D:\Hamon\worktrees\returnby-reminder-timing-0378a7b6-proof')
app=proof/'native-app'
manifest=json.loads((app/'manifest.json').read_text(encoding='utf-8'))
dest=proof/'returnby-reminder-time-9585fc2.zip'
assert not dest.exists()
with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED) as out:
    for row in manifest['files']:
        out.write(app/row['path'],row['path'])
    out.write(app/'manifest.json','manifest.json')
expected={row['path']:row for row in manifest['files']}
expected['manifest.json']={'bytes':(app/'manifest.json').stat().st_size,'sha256':hashlib.sha256((app/'manifest.json').read_bytes()).hexdigest()}
with zipfile.ZipFile(dest) as archive:
    assert sorted(archive.namelist())==sorted(expected)
    for name,row in expected.items():
        raw=archive.read(name)
        assert len(raw)==row['bytes']
        assert hashlib.sha256(raw).hexdigest()==row['sha256']
receipt={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':manifest['source'],'tree':manifest['tree'],'zip':str(dest),'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'entries':len(expected),'allZipEntriesReadBackExact':True,'nativeAppManifestSha256':expected['manifest.json']['sha256']}
(proof/'native-artifact-seal.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps(receipt))
