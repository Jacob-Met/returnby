import hashlib,json,os,shutil,subprocess,time
from pathlib import Path
root=Path('/tmp/returnby-undo-6e5752b49b6f-production')
manifest=json.loads((root/'receiving-undo/mac-transfer-manifest.json').read_text())
def digest(path):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''): h.update(b)
    return h.hexdigest()
def verify():
    for name,entry in manifest['files'].items():
        p=root/name
        assert p.stat().st_size==entry['bytes'] and digest(p)==entry['sha256'],name
    return True
assert shutil.disk_usage(root).free>96*1024*1024
verify()
playwright='/Users/me/hamon-work-longwater-delivery-c945953fdeb7/node_modules/playwright/index.mjs'
chrome='/Users/me/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell'
runtime={p:digest(p) for p in [playwright,chrome,str(Path(shutil.which('node')).resolve())]}
temporary=root/'browser-tmp';temporary.mkdir(exist_ok=True)
output=root/'receiving-undo/browser-r1'
env=dict(os.environ,TMPDIR=str(temporary),RETURNBY_PLAYWRIGHT=playwright,RETURNBY_CHROME=chrome,RETURNBY_BUILD=str(root/'dist'),RETURNBY_UNDO_OUTPUT=str(output),RETURNBY_SOURCE_HEAD=manifest['source_head'])
started=time.monotonic()
p=subprocess.run(['node',str(root/'tools/check_removal_undo_browser.mjs')],cwd=root,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=120)
(root/'receiving-undo/browser-r1.log').write_bytes(p.stdout)
verify()
assert runtime=={path:digest(path) for path in runtime}
report={'source_head':manifest['source_head'],'application_head':manifest['executed_application_head'],'command':['node',str(root/'tools/check_removal_undo_browser.mjs')],'node':subprocess.check_output(['node','--version'],text=True).strip(),'exit_code':p.returncode,'elapsed_s':time.monotonic()-started,'runtime_paths_and_hashes':runtime,'runtime_unchanged':True,'verified_source_and_build_files_before_after':len(manifest['files']),'log_sha256':hashlib.sha256(p.stdout).hexdigest(),'log_bytes':len(p.stdout),'free_after':shutil.disk_usage(root).free,'temporary_entries_after':[p.name for p in temporary.iterdir()]}
(root/'receiving-undo/mac-browser-r1.json').write_text(json.dumps(report,indent=2)+'\n')
print(p.stdout.decode())
print(json.dumps(report))
raise SystemExit(p.returncode)
