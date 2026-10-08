from pathlib import Path
import json,hashlib,subprocess,datetime,zipfile,sys
root=Path('/home/jacob/returnby-trip-notes-43af6cb1810e');r=root/'docs/receiving/trip-notes-43af6cb1810e';d=Path(str(root)+'.delivery')
def pin(p):
 b=p.read_bytes();return {'path':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def git(*a):return subprocess.check_output(['git','-C',str(root),*a],text=True).strip()
freeze=json.loads((r/'source-freeze.json').read_text());assert git('rev-parse','HEAD')==freeze['source_commit']
review=Path(sys.argv[1]);expected=sys.argv[2];assert review.parent==r and pin(review)['sha256']==expected
reviewobj=json.loads(review.read_text())
pre=(r/'receiving-context.json').read_bytes()
assert hashlib.sha256(pre).hexdigest()==reviewobj['observed_receiving_files']['receiving-context.json']['sha256']
with (r/'receiving-context-before-independent-review.json').open('xb') as f:f.write(pre)
ctx=json.loads(pre)
ctx['reviewed_context_preimage']={'path':'receiving-context-before-independent-review.json','sha256':hashlib.sha256(pre).hexdigest(),'note':'Exact context reviewed independently before adding the final review receipt and explicit font limitation.'}
ctx['qualification']['independent_review']={'path':review.name,'sha256':expected,'scope':'Independent direct source/hash/receipt/two-render review; no reviewer test or browser execution.','decision':'accept'}
ctx['limits'].append('Emoji may use a missing-glyph fallback in this installed browser/font environment; exact DOM and downloaded Unicode text was verified.')
(r/'receiving-context.json').write_text(json.dumps(ctx,indent=2)+'\n')
readme=(r/'README.md').read_text().replace('Independent source review is recorded separately when available.','Independent production source review accepted the exact source, receipts and both renderings; its exact separate receipt is included. It did not rerun tests or the browser. Emoji font fallback is a render-environment limitation; the exact underlying Unicode text is retained.')
(r/'README.md').write_text(readme)
(r/'.gitattributes').write_text('** -text\n')
manifest={'schema':'hamon.returnby-trip-notes.evidence-manifest.v1','created_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source_commit':freeze['source_commit'],'source_tree':freeze['source_tree'],'files':{}}
for p in sorted(r.rglob('*')):
 if p.is_file() and p.name!='evidence-manifest.json':manifest['files'][p.relative_to(r).as_posix()]={'bytes':p.stat().st_size,'sha256':pin(p)['sha256']}
(r/'evidence-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
for p,s in freeze['paths'].items():assert pin(root/p)['sha256']==s['sha256']
subprocess.run(['git','-C',str(root),'add','--',str(r.relative_to(root))],check=True)
staged=git('diff','--cached','--name-only').splitlines();assert all(x.startswith('docs/receiving/trip-notes-43af6cb1810e/') for x in staged)
subprocess.run(['git','-C',str(root),'commit','-m','Preserve native trip-note qualification and independent review'],check=True)
head=git('rev-parse','HEAD');tree=git('rev-parse','HEAD^{tree}')
names=git('ls-tree','-r','--name-only',head).splitlines()
for p in names:
 b=subprocess.check_output(['git','-C',str(root),'show',head+':'+p]);assert (root/p).read_bytes()==b,p
bundle=d/'trip-notes-receiving.bundle'
subprocess.run(['git','-C',str(root),'bundle','create',str(bundle),freeze['base_commit']+'..HEAD'],check=True)
v=subprocess.run(['git','-C',str(root),'bundle','verify',str(bundle)],capture_output=True,text=True)
(d/'bundle-verify.log').write_text(v.stdout+v.stderr);assert v.returncode==0
archive=d/'trip-notes-complete-tracked-tree.zip'
with zipfile.ZipFile(archive,'x',zipfile.ZIP_DEFLATED) as z:
 for p in names:z.writestr(p,subprocess.check_output(['git','-C',str(root),'show',head+':'+p]))
with zipfile.ZipFile(archive) as z:
 assert set(z.namelist())==set(names)
 for p in names:assert z.read(p)==(root/p).read_bytes(),p
seal={'schema':'hamon.returnby-trip-notes.delivery-seal.v1','created_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'repository':'Jacob-Met/returnby','root':str(root),'source_commit':freeze['source_commit'],'source_tree':freeze['source_tree'],'base_commit':freeze['base_commit'],'packet_commit':head,'packet_tree':tree,'bundle_requires_base':freeze['base_commit'],'complete_archive':'Exact full tracked source/evidence tree; no dependency installation or Git ancestry claimed for ZIP.','tracked_leaves':len(names),'source_paths':freeze['paths'],'receiving_context':pin(r/'receiving-context.json'),'independent_review':pin(review),'evidence_manifest':pin(r/'evidence-manifest.json'),'qualification':ctx['qualification'],'limits':ctx['limits'],'delivery_files':{p.name:pin(p) for p in [d/'trip-notes.patch',d/'trip-notes-source.zip',bundle,archive,d/'bundle-verify.log']},'installed':False,'recipient_acceptance':False,'native_goal_or_code_lease':False}
(d/'delivery-seal.json').write_text(json.dumps(seal,indent=2)+'\n')
status=git('status','--porcelain');assert status=='',status
receipt={'state':'sealed_exact_readback','source_commit':seal['source_commit'],'packet_commit':head,'packet_tree':tree,'seal':pin(d/'delivery-seal.json'),'tracked_leaves':len(names),'source_paths':len(freeze['paths']),'evidence_files':len(manifest['files']),'delivery_files':seal['delivery_files'],'git_status':status}
(d/'seal-result.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt))
