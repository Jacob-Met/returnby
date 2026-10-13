"""Read-only retained-data receiving of the first held ReturnBy Linux course.
Never imports application/drivers, compiles, runs children, builds, launches browsers,
contacts listeners, installs packages, or writes inside the Runtime product root.
"""
import os, json, hashlib, base64, stat, datetime, traceback
from pathlib import Path, PurePosixPath

ROOT=Path('/home/jacob/hamon-returnby-linux-qtw10pxc-62h26e6o')
SYNTAX=Path('/home/jacob/hamon-returnby-linux-review-qtw10pxc-vhvphrhu')
OUT=Path('/home/jacob/.commander-tp-2/hamon-team-20261013-1bkvjx8k/delivery/RETURNBY-LINUX-PARTIAL-RETAINED-DATA.json')
checks=[]
observed={}
cache={}
def identity(b):
    return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),
            'git_blob':hashlib.sha1(b'blob '+str(len(b)).encode('ascii')+b'\0'+b).hexdigest()}
def read(p):
    p=Path(p)
    if str(p) not in cache:
        s=p.lstat()
        if not stat.S_ISREG(s.st_mode): raise RuntimeError('Expected regular file: '+str(p))
        b=p.read_bytes()
        cache[str(p)]=b
        observed[str(p)]={**identity(b),'mtime_ns':s.st_mtime_ns,'mode':stat.S_IMODE(s.st_mode)}
    return cache[str(p)]
def pin(p):
    return identity(read(p))
def obj(p):
    return json.loads(read(p).decode('utf-8'))
def check(name,condition,detail=None):
    checks.append({'name':name,'passed':bool(condition),'detail':detail})
    if not condition: raise RuntimeError('Retained-data check failed: '+name)
def rel(root,s):
    p=PurePosixPath(s)
    if p.is_absolute() or s!=p.as_posix() or any(x in ('.','..') for x in p.parts):
        raise RuntimeError('Noncanonical input path')
    path=root.joinpath(*p.parts)
    for parent in [root,*list(path.parents)[:len(p.parts)-1],path]:
        if parent.is_symlink(): raise RuntimeError('Unadmitted source link')
    if not path.resolve(strict=True).is_relative_to(root.resolve(strict=True)):
        raise RuntimeError('Input escapes root')
    return path
def simple_pin(p):
    q=pin(p)
    return {k:q[k] for k in ('bytes','sha256')}
receipt={'format':'returnby-linux-delivery-partial-retained-data-v1',
 'scope':'Independent retained-byte review only: accepted source stage/original build and held Python Playwright bootstrap failure; no product rerun.',
 'started_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'runtime_root':str(ROOT),'checks':checks,'accepted':False,
 'product_execution_by_reviewer':False}
try:
    check('owned_expected_native_identity',os.getuid()==1000 and ROOT.is_dir() and not ROOT.is_symlink())
    pins={'INPUT.json':'98a434fe34dd6e175a64d0396d079cadf6f779b7',
          'CONTRACT.json':'6b410f82313611ec9d1a81d0c53a835ac76a03f1',
          'stage_build.py':'d519828d86e84d364e270dcac49c19dfd36f8012',
          'browser_receive.py':'85d200eb1266a942b6d9ae95cd64e1642c419690'}
    for name,want in pins.items(): check('frozen.'+name,pin(ROOT/name)['git_blob']==want,pin(ROOT/name))
    inputs=obj(ROOT/'INPUT.json'); contract=obj(ROOT/'CONTRACT.json')
    staged=obj(ROOT/'STAGED-SOURCE.json'); dep=obj(ROOT/'DEPENDENCIES.json')
    stage=obj(ROOT/'STAGE-ATTEMPT.json'); build=obj(ROOT/'BUILD-original.json')
    browser=obj(ROOT/'browser-original/RECEIVING.json')
    check('partial_browser_receipt_sha',pin(ROOT/'browser-original/RECEIVING.json')['sha256']=='ba9e5895250375013451a31f04a74a0ba6f0dc598278110359149550c3920ce9')
    check('all_stage_receipts_accepted',staged['accepted'] is True and stage['accepted'] is True and dep['accepted'] is True)
    check('staged_intake_bound',staged['input']==pin(ROOT/'INPUT.json') and staged['contract']==pin(ROOT/'CONTRACT.json'))
    check('dependency_manifest_bound',staged['dependencies']=={'path':'DEPENDENCIES.json',**pin(ROOT/'DEPENDENCIES.json')})
    check('stage_final_manifests_bound',stage['staged_manifest']==pin(ROOT/'STAGED-SOURCE.json') and stage['dependencies']==pin(ROOT/'DEPENDENCIES.json'))
    check('dependency_three_way_regular_equal',dep['before']==dep['copied']==dep['source_after'])
    check('dependency_three_way_alias_equal',dep['aliases']['before']==dep['aliases']['copied']==dep['aliases']['source_after']==contract['dependencies']['aliases'])
    check('dependency_closure_counts',len(dep['before'])==735 and sum(x['bytes'] for x in dep['before'])==91349554 and len(dep['packages'])==38)
    copied=ROOT/'node_modules'
    check('dependency_copied_root',dep['copy']==str(copied))
    actual_rows=[]; actual_aliases=[]
    for parent,dirs,files in os.walk(copied,followlinks=False):
        for name in dirs:
            if (Path(parent)/name).is_symlink(): raise RuntimeError('Unadmitted dependency directory link')
        for name in files:
            p=Path(parent)/name; relative=p.relative_to(copied).as_posix()
            if p.is_symlink():
                target=os.readlink(p)
                if not p.resolve(strict=True).is_relative_to(copied): raise RuntimeError('Alias escaped copied root')
                if not p.resolve(strict=True).is_file(): raise RuntimeError('Alias does not resolve to regular file')
                actual_aliases.append({'path':relative,'target':target})
            else:
                row=pin(p)
                actual_rows.append({'path':relative,'bytes':row['bytes'],'sha256':row['sha256'],'mode':stat.S_IMODE(p.stat().st_mode)})
    actual_rows.sort(key=lambda x:x['path']); actual_aliases.sort(key=lambda x:x['path'])
    check('actual735_copied_bytes_modes',actual_rows==dep['copied'],{'files':len(actual_rows),'bytes':sum(x['bytes'] for x in actual_rows)})
    check('actual7_copied_aliases',actual_aliases==contract['dependencies']['aliases'],actual_aliases)
    for variant,count in [('original',27),('candidate',28)]:
        expected={x['path']:x for x in inputs[variant]['files']}
        rows=staged[variant]['files']
        check(variant+'.projection',len(rows)==count and len(expected)==count and {x['path'] for x in rows}==set(expected))
        check(variant+'.source_identity',staged[variant]['commit']==contract[variant]['commit'] and staged[variant]['tree']==contract[variant]['tree'])
        for row in rows:
            path=rel(ROOT/variant,row['path']); expected_row=expected[row['path']]
            encoded=inputs['blobs'][expected_row['git_blob']]
            if encoded['encoding']!='base64': raise RuntimeError('Unexpected source encoding')
            b=base64.b64decode(''.join(encoded['content'].split()),validate=True)
            want=identity(b)
            check(variant+'.source.'+row['path'],want['git_blob']==expected_row['git_blob'] and read(path)==b and all(row[k]==want[k] for k in want) and path.stat().st_mtime_ns==row['mtime_ns'])
    check('build_accepted',build['accepted'] is True and build['source_unchanged'] is True and build['manifests_unchanged'] is True)
    check('build_manifest_binding',build['input']==pin(ROOT/'INPUT.json') and build['staged_manifest']==pin(ROOT/'STAGED-SOURCE.json'))
    check('build_original_identity',build['source_commit']==contract['original']['commit'] and build['source_tree']==contract['original']['tree'])
    check('build_source_byte_mtime_preserved',build['source_before']==build['source_after']==staged['original']['files'])
    check('build_dependency_preservation',all(build['dependencies'][k] is True for k in ('accepted','shared_unchanged','copied_original_files_unchanged','aliases_unchanged')))
    check('build_command_sequence',[x['name'] for x in build['commands']]==['tsc','vite'] and all(x['exit_code']==0 for x in build['commands']))
    for command in build['commands']:
        for stream in ('stdout','stderr'):
            record=command[stream]
            check(command['name']+'.'+stream,pin(rel(ROOT,record['path']))=={k:record[k] for k in ('bytes','sha256','git_blob')})
    actual_dist={}
    for p in sorted((ROOT/'original/dist').rglob('*')):
        if p.is_symlink(): raise RuntimeError('Unadmitted dist link')
        if p.is_file(): actual_dist[p.relative_to(ROOT/'original/dist').as_posix()]=simple_pin(p)
    check('actual_build_outputs',actual_dist==build['dist'] and 'index.html' in actual_dist and 'trip-checklist.html' in actual_dist,{'output_files':len(actual_dist)})
    check('browser_original_build_bound',browser['dist_before']==browser['dist_after']==actual_dist and browser['source_before']==browser['source_after']==staged['original']['files'])
    check('browser_binding_manifests_preserved',browser['manifest_before']==browser['manifest_after'] and all(pin(ROOT/name)==row for name,row in browser['manifest_before'].items()))
    check('no_browser_fixtures_run',browser['completed_cases']==0 and browser['cases']==[] and browser['network']==[] and browser['http']==[])
    check('browser_held',browser['receiver_complete'] is False and browser['product_pass'] is False)
    check('python_bootstrap_symptom',"AttributeError: 'PlaywrightContextManager' object has no attribute '_playwright'" in browser['receiver_error'] and 'sync_playwright().start()' in browser['receiver_error'])
    stderr=read(ROOT/'original-browser.stderr').decode('utf-8')
    check('node_driver_missing_cause',"Cannot find module '/usr/share/nodejs/playwright/cli.js'" in stderr and "code: 'MODULE_NOT_FOUND'" in stderr and 'AttributeError' in stderr)
    failed=[x['name'] for x in browser['checks'] if not x['passed']]
    check('browser_failed_checks_exact',failed==['required_cleanup_completed','browser_exited'],failed)
    check('browser_check_flags_recomputed',all(x['passed']==(x['actual']==x['expected']) for x in browser['checks']) and browser['passed']==5 and browser['failed']==2)
    life=browser['lifecycle']
    check('own_http_resources_closed',all(life[k]=='completed' for k in ('server_shutdown','server_close','server_thread_join','listener_probe_close')) and life['server_thread_stopped'] is True and life['listener_closed'] is True and life['cleanup_errors']==[])
    check('browser_resources_not_created',life['contexts']==[] and all(life[k]=='not-created' for k in ('browser_close','playwright_stop','browser_pidfd_close')) and life['verified'] is False and 'browser' not in life)
    for name,code in [('STAGE-COMMAND.json',0),('ORIGINAL-BUILD-COMMAND.json',0),('ORIGINAL-BROWSER-COMMAND.json',1)]:
        record=obj(ROOT/name);check('command_exit.'+name,record['exit_code']==code)
    for name in ('stage.stdout','stage.stderr','original-build.stdout','original-build.stderr','original-browser.stdout','original-browser.stderr'):
        read(ROOT/name)
    check('candidate_build_browser_absent',all(not os.path.lexists(ROOT/name) for name in ('BUILD-candidate.json','candidate/dist','build-candidate','browser-candidate','CANDIDATE-BUILD-COMMAND.json','CANDIDATE-BROWSER-COMMAND.json')))
    check('new_screenshots_downloads_absent',sorted(p.name for p in (ROOT/'browser-original').iterdir())==['RECEIVING.json','downloads','tmp'] and not any((ROOT/'browser-original/downloads').iterdir()) and not any((ROOT/'browser-original/tmp').iterdir()))
    syntax=obj(SYNTAX/'RECEIVING.json')
    check('syntax_exact_receipt',pin(SYNTAX/'RECEIVING.json')['git_blob']=='baeda79915c1813fcf20c1499cc3cf20f5bcfd59')
    check('syntax55_data_only',syntax['accepted'] is True and syntax['passed_checks']==55 and syntax['failed_checks']==0 and syntax['driver_imports_or_executes']==0 and syntax['product_builds_or_browsers']==0 and len(syntax['source_bodies'])==29)
    check('syntax_record_flags',all(x['passed'] is True for x in syntax['checks']) and len(syntax['checks'])==55)
    for name in ('REVIEW-INPUT.json','review.py','review.stdout','review.stderr'): read(SYNTAX/name)
    changed=[]
    for path,before in observed.items():
        p=Path(path);s=p.lstat()
        after={**identity(p.read_bytes()),'mtime_ns':s.st_mtime_ns,'mode':stat.S_IMODE(s.st_mode)}
        if after!=before: changed.append(path)
    check('all_observed_native_files_preserved',not changed,{'files':len(observed),'changed':changed})
    receipt['accepted']=True
    receipt['finding']={'stage':'accepted27/28 exact source projections',
      'original_build':'direct tsc and Vite accepted;10 exact build outputs',
      'browser':'held before browser launch or fixtures; missing distro Playwright JS CLI, then Python AttributeError',
      'candidate':'staged but neither built nor browser-qualified',
      'screenshots':'no new screenshots; existing public/captures are source assets only',
      'http_cleanup':'own listener/server/thread closed; browser lifecycle qualification remains false',
      'dependencies':'735 copied regular files/91,349,554B and7 aliases verified; shared before/after equality is recorded by stage/build, not rerun by this reviewer'}
except BaseException:
    receipt['review_error']=traceback.format_exc()
finally:
    receipt['files']=observed
    receipt['passed_checks']=sum(x['passed'] for x in checks)
    receipt['failed_checks']=sum(not x['passed'] for x in checks)
    receipt['finished_at']=datetime.datetime.now(datetime.timezone.utc).isoformat()
    data=(json.dumps(receipt,indent=2,ensure_ascii=True)+'\n').encode('ascii')
    with OUT.open('xb') as stream: stream.write(data)
    print(json.dumps({'accepted':receipt['accepted'],'passed_checks':receipt['passed_checks'],
      'failed_checks':receipt['failed_checks'],'files':len(observed),'receipt':str(OUT),**identity(data),
      'error':receipt.get('review_error')}),flush=True)
raise SystemExit(0 if receipt['accepted'] else 1)
