from pathlib import Path
import hashlib,json,os,subprocess,sys
root=Path('/Users/me/hamon/receiving/root-d3745-returnby-install/restart-repair')
source=root/'tools/received_preview/serve_returnby.py'
test=root/'tests/received_preview/test_linux_server_restart.py'
env=os.environ.copy()
env.update(PYTHONDONTWRITEBYTECODE='1',TMPDIR=str(root/'tmp'),RETURNBY_RECEIVED_DIRECTORY='/Users/me/Applications/ReturnBy-Completion-d3745-83abbe9a',RETURNBY_SERVER_SOURCE=str(source))
receipt={'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'test_sha256':hashlib.sha256(test.read_bytes()).hexdigest(),'scope':'Candidate-only added child optimization propagation and both loopback/wildcard existing listener hosts; all client traffic stays loopback and ports are private ephemeral tests. Earlier original/candidate receipt preserved separately.','courses':[]}
for optimized in (False,True):
 command=[sys.executable,'-B']+(['-O'] if optimized else [])+[str(test)]
 r=subprocess.run(command,cwd=root,env=env,capture_output=True,text=True,timeout=40)
 row={'optimized_server_children':optimized,'command':command,'exit_code':r.returncode,'stdout':r.stdout,'stderr':r.stderr}
 receipt['courses'].append(row);print(json.dumps(row),flush=True)
receipt['source_unchanged']=receipt['source_sha256']==hashlib.sha256(source.read_bytes()).hexdigest() and receipt['test_sha256']==hashlib.sha256(test.read_bytes()).hexdigest()
receipt['passed']=receipt['source_unchanged'] and all(x['exit_code']==0 for x in receipt['courses'])
(root/'expanded-restart-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'passed':receipt['passed'],'source_unchanged':receipt['source_unchanged']}))
raise SystemExit(0 if receipt['passed'] else 1)
