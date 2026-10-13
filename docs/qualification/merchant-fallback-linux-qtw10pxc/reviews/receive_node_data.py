"""Read-only retained-data receiving of completed original/candidate Node courses.
Never imports application/drivers, compiles, runs children, builds, launches browsers,
contacts listeners, installs packages, or writes inside the Runtime product root.
"""
import os, json, hashlib, base64, stat, datetime, traceback
from pathlib import Path, PurePosixPath

ROOT=Path('/home/jacob/hamon-returnby-linux-qtw10pxc-62h26e6o')
SYNTAX=Path('/home/jacob/hamon-returnby-linux-review-qtw10pxc-vhvphrhu')
OUT=Path('/home/jacob/.commander-tp-2/hamon-team-20261013-1bkvjx8k/delivery/RETURNBY-LINUX-NODE-RETAINED-DATA.json')
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
EXPECTED=json.loads("{\"check_names\":{\"original\":[\"embedded-alias.initial_saved_storage\",\"embedded-alias.preview.merchant\",\"embedded-alias.preview.orderDate\",\"embedded-alias.preview.orderNo\",\"embedded-alias.preview.total\",\"embedded-alias.preview.days\",\"embedded-alias.preview.source\",\"embedded-alias.preview.highlighted\",\"embedded-alias.preview_does_not_save\",\"embedded-alias.source_label\",\"embedded-alias.one_saved_order\",\"embedded-alias.approved_keys\",\"embedded-alias.saved.merchant\",\"embedded-alias.saved.windowDays\",\"embedded-alias.saved.windowSource\",\"embedded-alias.saved.orderDate\",\"embedded-alias.saved.orderNo\",\"embedded-alias.saved.total\",\"embedded-alias.paste_not_persisted\",\"embedded-alias.paste_cleared\",\"embedded-alias.card_merchant\",\"embedded-alias.card_due\",\"embedded-alias.reload_exact_storage\",\"embedded-alias.reload_card_due\",\"embedded-alias.calendar.UID\",\"embedded-alias.calendar.DTSTART;VALUE=DATE\",\"embedded-alias.calendar.DTEND;VALUE=DATE\",\"embedded-alias.calendar.SUMMARY\",\"embedded-alias.calendar.DESCRIPTION\",\"embedded-alias.calendar.TRIGGER\",\"embedded-alias.calendar_one_event\",\"embedded-alias.calendar_crlf_only\",\"embedded-alias.download_preserves_storage\",\"complete-alias.initial_saved_storage\",\"complete-alias.preview.merchant\",\"complete-alias.preview.orderDate\",\"complete-alias.preview.orderNo\",\"complete-alias.preview.total\",\"complete-alias.preview.days\",\"complete-alias.preview.source\",\"complete-alias.preview.highlighted\",\"complete-alias.preview_does_not_save\",\"complete-alias.source_label\",\"complete-alias.one_saved_order\",\"complete-alias.approved_keys\",\"complete-alias.saved.merchant\",\"complete-alias.saved.windowDays\",\"complete-alias.saved.windowSource\",\"complete-alias.saved.orderDate\",\"complete-alias.saved.orderNo\",\"complete-alias.saved.total\",\"complete-alias.paste_not_persisted\",\"complete-alias.paste_cleared\",\"complete-alias.card_merchant\",\"complete-alias.card_due\",\"complete-alias.reload_exact_storage\",\"complete-alias.reload_card_due\",\"from-priority.initial_saved_storage\",\"from-priority.preview.merchant\",\"from-priority.preview.orderDate\",\"from-priority.preview.orderNo\",\"from-priority.preview.total\",\"from-priority.preview.days\",\"from-priority.preview.source\",\"from-priority.preview.highlighted\",\"from-priority.preview_does_not_save\",\"from-priority.source_label\",\"from-priority.one_saved_order\",\"from-priority.approved_keys\",\"from-priority.saved.merchant\",\"from-priority.saved.windowDays\",\"from-priority.saved.windowSource\",\"from-priority.saved.orderDate\",\"from-priority.saved.orderNo\",\"from-priority.saved.total\",\"from-priority.paste_not_persisted\",\"from-priority.paste_cleared\",\"from-priority.card_merchant\",\"from-priority.card_due\",\"from-priority.reload_exact_storage\",\"from-priority.reload_card_due\",\"no_foreign_page_requests\",\"no_page_exceptions\",\"no_console_errors\",\"required_cleanup_completed\",\"http_listener_closed\",\"websocket_listener_closed\",\"http_sockets_closed\",\"staged_source_unchanged\",\"built_assets_unchanged\",\"binding_manifests_unchanged\",\"node_toolchain_unchanged\"],\"candidate\":[\"embedded-alias.initial_saved_storage\",\"embedded-alias.preview.merchant\",\"embedded-alias.preview.orderDate\",\"embedded-alias.preview.orderNo\",\"embedded-alias.preview.total\",\"embedded-alias.preview.days\",\"embedded-alias.preview.source\",\"embedded-alias.preview.highlighted\",\"embedded-alias.preview_does_not_save\",\"embedded-alias.source_label\",\"embedded-alias.one_saved_order\",\"embedded-alias.approved_keys\",\"embedded-alias.saved.merchant\",\"embedded-alias.saved.windowDays\",\"embedded-alias.saved.windowSource\",\"embedded-alias.saved.orderDate\",\"embedded-alias.saved.orderNo\",\"embedded-alias.saved.total\",\"embedded-alias.paste_not_persisted\",\"embedded-alias.paste_cleared\",\"embedded-alias.card_merchant\",\"embedded-alias.card_due\",\"embedded-alias.reload_exact_storage\",\"embedded-alias.reload_card_due\",\"embedded-alias.calendar.UID\",\"embedded-alias.calendar.DTSTART;VALUE=DATE\",\"embedded-alias.calendar.DTEND;VALUE=DATE\",\"embedded-alias.calendar.SUMMARY\",\"embedded-alias.calendar.DESCRIPTION\",\"embedded-alias.calendar.TRIGGER\",\"embedded-alias.calendar_one_event\",\"embedded-alias.calendar_crlf_only\",\"embedded-alias.download_preserves_storage\",\"complete-alias.initial_saved_storage\",\"complete-alias.preview.merchant\",\"complete-alias.preview.orderDate\",\"complete-alias.preview.orderNo\",\"complete-alias.preview.total\",\"complete-alias.preview.days\",\"complete-alias.preview.source\",\"complete-alias.preview.highlighted\",\"complete-alias.preview_does_not_save\",\"complete-alias.source_label\",\"complete-alias.one_saved_order\",\"complete-alias.approved_keys\",\"complete-alias.saved.merchant\",\"complete-alias.saved.windowDays\",\"complete-alias.saved.windowSource\",\"complete-alias.saved.orderDate\",\"complete-alias.saved.orderNo\",\"complete-alias.saved.total\",\"complete-alias.paste_not_persisted\",\"complete-alias.paste_cleared\",\"complete-alias.card_merchant\",\"complete-alias.card_due\",\"complete-alias.reload_exact_storage\",\"complete-alias.reload_card_due\",\"from-priority.initial_saved_storage\",\"from-priority.preview.merchant\",\"from-priority.preview.orderDate\",\"from-priority.preview.orderNo\",\"from-priority.preview.total\",\"from-priority.preview.days\",\"from-priority.preview.source\",\"from-priority.preview.highlighted\",\"from-priority.preview_does_not_save\",\"from-priority.source_label\",\"from-priority.one_saved_order\",\"from-priority.approved_keys\",\"from-priority.saved.merchant\",\"from-priority.saved.windowDays\",\"from-priority.saved.windowSource\",\"from-priority.saved.orderDate\",\"from-priority.saved.orderNo\",\"from-priority.saved.total\",\"from-priority.paste_not_persisted\",\"from-priority.paste_cleared\",\"from-priority.card_merchant\",\"from-priority.card_due\",\"from-priority.reload_exact_storage\",\"from-priority.reload_card_due\",\"no_foreign_page_requests\",\"no_page_exceptions\",\"no_console_errors\",\"required_cleanup_completed\",\"http_listener_closed\",\"websocket_listener_closed\",\"http_sockets_closed\",\"staged_source_unchanged\",\"built_assets_unchanged\",\"binding_manifests_unchanged\",\"node_toolchain_unchanged\",\"embedded-alias.narrow_no_horizontal_overflow\"]},\"original_failures\":[\"embedded-alias.preview.merchant\",\"embedded-alias.preview.days\",\"embedded-alias.preview.source\",\"embedded-alias.preview.highlighted\",\"embedded-alias.source_label\",\"embedded-alias.saved.windowDays\",\"embedded-alias.saved.windowSource\",\"embedded-alias.card_due\",\"embedded-alias.reload_card_due\",\"embedded-alias.calendar.DTSTART;VALUE=DATE\",\"embedded-alias.calendar.DTEND;VALUE=DATE\"],\"visual_observations\":[{\"variant\":\"original\",\"path\":\"browser-node-original/original-embedded-preview-desktop.png\",\"pin\":{\"bytes\":190934,\"sha256\":\"42b3e2c253d65af48d074bdecf87490d060093d4f7336e6c05c57dac5e119be5\",\"git_blob\":\"f92e70b7d43c5a035abed27f176f54835eb6f7a5\"},\"observed\":true,\"findings\":[\"The screenshot visibly contains the fictional Contosocial paste.\",\"Review reports4of4 fields recognized and STORE MATCH, but Store is contoso with15-day window.\",\"The merchant field is not shown as missing, confirming the false positive is visible to a person.\",\"No saved orders are displayed at this preview checkpoint.\"]},{\"variant\":\"candidate\",\"path\":\"browser-node-candidate/candidate-embedded-preview-desktop.png\",\"pin\":{\"bytes\":189976,\"sha256\":\"e5ece62e62c4c74686b6eacb27f9190c13c14c9ff9adac5805c86c2cd9789472\",\"git_blob\":\"fcdb52d29030a6eb6d0fd45b9e5b44b6f2bdcf22\"},\"observed\":true,\"findings\":[\"The same fictional Contosocial paste is visible.\",\"Review reports3of4 fields recognized and30-DAY FALLBACK.\",\"Store is blank with an amber outline; order date, order number and total remain populated.\",\"Return window is30 and the no-store-match fallback explanation appears.\"]},{\"variant\":\"candidate\",\"path\":\"browser-node-candidate/candidate-embedded-saved-narrow.png\",\"pin\":{\"bytes\":142088,\"sha256\":\"a8b8d984e1d8136f0d8b074b823b11a0b10a9b6761e9f022c36a387bc3be18a5\",\"git_blob\":\"f84de478f9e6251c28802d1954dfb2d6b46588f2\"},\"observed\":true,\"findings\":[\"At the recorded390px viewport the content is stacked vertically and the saved card/buttons remain within the page.\",\"The paste field is empty after save.\",\"One Contosocial #RB1001 card shows30-DAY FALLBACK and RETURN BY2026-11-09.\",\"Calendar and Remove controls are visible; this visual observation does not establish accessibility or broader device qualification.\"]}]}")
receipt={'format':'returnby-linux-delivery-node-retained-data-v1',
 'scope':'Independent native retained-byte receiving of completed original and candidate courses; no application, build, browser, test or package execution.',
 'started_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'runtime_root':str(ROOT),
 'checks':checks,'accepted':False,'product_execution_by_reviewer':False,
 'visual_observations':EXPECTED['visual_observations']}
try:
    check('native_owner_and_root',os.getuid()==1000 and ROOT.is_dir() and not ROOT.is_symlink())
    expected_pins={'INPUT.json':'98a434fe34dd6e175a64d0396d079cadf6f779b7',
      'CONTRACT.json':'6b410f82313611ec9d1a81d0c53a835ac76a03f1',
      'stage_build.py':'d519828d86e84d364e270dcac49c19dfd36f8012',
      'browser_receive.py':'85d200eb1266a942b6d9ae95cd64e1642c419690',
      'NODE-BROWSER-PROFILE.json':'e23bb4224084ca8612fe52c8fc757e8bfa2b03e9',
      'NODE-TOOLCHAIN-READONLY.json':'a5f2f1554773ac4da0927117277f38b63d43e9d4',
      'copy_node_driver.py':'56eecba28925ecd02611d64d4400eeda5e723fab',
      'browser_node_receive_v2.mjs':'18e4f9adb26f1c89b7cecfdf142077a17d93418b',
      'browser-original/RECEIVING.json':'63d567971b2ed16ee705f46708385aa08fc605ca',
      'browser-node-original/RECEIVING.json':'4fe7a5f25e0137e238beb2dfc6404c83f7344518',
      'browser-node-candidate/RECEIVING.json':'dd44a456bcacd901cd848bc19d1991c1ca9cdf14'}
    for name,want in expected_pins.items():check('pin.'+name,pin(ROOT/name)['git_blob']==want,pin(ROOT/name))
    inputs=obj(ROOT/'INPUT.json');contract=obj(ROOT/'CONTRACT.json');profile=obj(ROOT/'NODE-BROWSER-PROFILE.json')
    inventory=obj(ROOT/'NODE-TOOLCHAIN-READONLY.json');copy=obj(ROOT/'NODE-DRIVER-COPY.json')
    staged=obj(ROOT/'STAGED-SOURCE.json');deps=obj(ROOT/'DEPENDENCIES.json');gate=obj(ROOT/'ORIGINAL-NODE-GATE.json')
    check('same_frozen_functional_fixtures',profile['fixtures']==contract['fixtures'] and profile['browser']['expected_original_only_mismatch_names']==EXPECTED['original_failures'])
    check('stage_accepted_and_bound',staged['accepted'] is True and staged['input']==pin(ROOT/'INPUT.json') and staged['contract']==pin(ROOT/'CONTRACT.json'))
    check('app_dependency_manifest_bound',staged['dependencies']=={'path':'DEPENDENCIES.json',**pin(ROOT/'DEPENDENCIES.json')})
    check('app_dependency_record_three_way',deps['accepted'] is True and deps['before']==deps['copied']==deps['source_after'] and len(deps['before'])==735 and sum(x['bytes'] for x in deps['before'])==91349554)
    check('app_alias_record_three_way',deps['aliases']['before']==deps['aliases']['copied']==deps['aliases']['source_after']==contract['dependencies']['aliases'])
    check('node_copy_accepted',copy['accepted'] is True and copy['shared_unchanged'] is True and copy['preserved_unchanged'] is True)
    check('node_copy_bound',copy['profile']==pin(ROOT/'NODE-BROWSER-PROFILE.json') and copy['inventory']==pin(ROOT/'NODE-TOOLCHAIN-READONLY.json'))
    check('node_copy_three_way',copy['before']==copy['copied']==copy['source_after']==inventory['regular_files'] and copy['metadata_before']==copy['metadata_after'] and copy['preserved_before']==copy['preserved_after'])
    copied_root=ROOT/'node-browser-driver/node_modules'
    check('node_copy_location',copy['copy']==str(copied_root) and copy['source']==profile['toolchain']['source'])
    actual_nodes=[]
    for parent,dirs,files in os.walk(copied_root,followlinks=False):
        for name in dirs:
            if (Path(parent)/name).is_symlink():raise RuntimeError('Node directory redirect')
        for name in files:
            p=Path(parent)/name;row=pin(p)
            actual_nodes.append({'path':p.relative_to(copied_root).as_posix(),'bytes':row['bytes'],'sha256':row['sha256'],'mode':stat.S_IMODE(p.stat().st_mode)})
    actual_nodes.sort(key=lambda x:x['path'])
    check('actual455_node_files_bytes_modes',actual_nodes==copy['copied'] and len(actual_nodes)==455 and sum(x['bytes'] for x in actual_nodes)==12133249,{'files':len(actual_nodes),'bytes':sum(x['bytes'] for x in actual_nodes)})
    old_preservation={}
    for name,want in copy['preserved_before'].items():
        p=rel(ROOT,name)
        old_preservation[name]={**pin(p),'mtime_ns':str(p.stat().st_mtime_ns)}
    check('earlier_source_build_python_records_preserved',old_preservation==copy['preserved_before'],{'files':len(old_preservation)})
    syntax=obj(ROOT/'NODE-ADAPTER-SYNTAX.json')
    check('node_syntax15_receipt',syntax['accepted'] is True and len(syntax['checks'])==15 and all(x['passed'] is True for x in syntax['checks']))
    check('node_syntax_inputs_preserved',syntax['before']==syntax['after'])
    for name in ('node_adapter_syntax.py','node-syntax.stdout','node-syntax.stderr','node-mtime.stdout','node-mtime.stderr','node-adapter-review.stdout','node-adapter-review.stderr','NODE-COPY-COMMAND.json','node-copy.stdout','node-copy.stderr'):read(ROOT/name)
    check('node_copy_command_exit',obj(ROOT/'NODE-COPY-COMMAND.json')['exit_code']==0)
    summaries={}
    for variant,count,total in [('original',27,92),('candidate',28,93)]:
        build=obj(ROOT/('BUILD-'+variant+'.json'))
        result=obj(ROOT/('browser-node-'+variant)/'RECEIVING.json')
        check(variant+'.source_build_identity',build['source_commit']==contract[variant]['commit'] and build['source_tree']==contract[variant]['tree'] and result['source']==contract[variant])
        check(variant+'.build_accepted',build['accepted'] is True and build['source_unchanged'] is True and build['manifests_unchanged'] is True)
        check(variant+'.build_bindings',build['input']==pin(ROOT/'INPUT.json') and build['staged_manifest']==pin(ROOT/'STAGED-SOURCE.json') and build['dependencies']['manifest']=={'path':'DEPENDENCIES.json',**pin(ROOT/'DEPENDENCIES.json')})
        check(variant+'.build_dependencies',all(build['dependencies'][k] is True for k in ('accepted','shared_unchanged','copied_original_files_unchanged','aliases_unchanged')))
        check(variant+'.direct_tsc_vite',[x['name'] for x in build['commands']]==['tsc','vite'] and all(x['exit_code']==0 and x['argv'][0]=='/usr/bin/node' for x in build['commands']))
        for command in build['commands']:
            for stream in ('stdout','stderr'):
                want=command[stream]
                check(variant+'.'+command['name']+'.'+stream,pin(rel(ROOT,want['path']))=={k:want[k] for k in ('bytes','sha256','git_blob')})
        expected_rows={x['path']:x for x in inputs[variant]['files']}
        check(variant+'.source_count',len(staged[variant]['files'])==len(expected_rows)==count)
        actual_source=[]
        for row in staged[variant]['files']:
            p=rel(ROOT/variant,row['path']);encoded=inputs['blobs'][expected_rows[row['path']]['git_blob']]
            b=base64.b64decode(''.join(encoded['content'].split()),validate=True);want=identity(b)
            check(variant+'.source.'+row['path'],read(p)==b and want['git_blob']==expected_rows[row['path']]['git_blob'] and all(row[k]==want[k] for k in want) and p.stat().st_mtime_ns==row['mtime_ns'])
            actual_source.append({'path':row['path'],**want,'mtime_ns':str(row['mtime_ns'])})
        check(variant+'.build_source_preserved',build['source_before']==build['source_after']==staged[variant]['files'])
        actual_dist={}
        for p in sorted((ROOT/variant/'dist').rglob('*')):
            if p.is_symlink():raise RuntimeError('Dist redirect')
            if p.is_file():actual_dist[p.relative_to(ROOT/variant/'dist').as_posix()]=simple_pin(p)
        check(variant+'.actual_dist',actual_dist==build['dist'] and all(x in actual_dist for x in ('index.html','trip-checklist.html')),{'files':len(actual_dist)})
        check(variant+'.native_before_after_source',result['before']['source']==result['after']['source']==actual_source)
        check(variant+'.native_before_after_dist',result['before']['dist']==result['after']['dist']==actual_dist)
        check(variant+'.native_before_after_manifests',result['before']['manifests']==result['after']['manifests'] and all(pin(ROOT/name)==want for name,want in result['before']['manifests'].items()))
        check(variant+'.native_node_toolchain',result['before']['node_toolchain']==result['after']['node_toolchain'] and result['before']['node_toolchain']['owned']==result['before']['node_toolchain']['shared']==actual_nodes)
        rows=result['checks'];names=[x['name'] for x in rows];failed=[x['name'] for x in rows if not x['passed']]
        check(variant+'.exact_frozen_check_names',len(names)==len(set(names))==total and sorted(names)==sorted(EXPECTED['check_names'][variant]))
        check(variant+'.native_check_flags',all(x['passed']==(x['actual']==x['expected']) for x in rows))
        check(variant+'.exact_result_counts',result['failed']==len(failed) and result['passed']==total-len(failed) and failed==(EXPECTED['original_failures'] if variant=='original' else []))
        check(variant+'.complete_cases',result['receiver_complete'] is True and result['completed_cases']==len(result['cases'])==3 and not result.get('receiver_error') and not result.get('postflight_error'))
        check(variant+'.product_attribution',result['product_pass']==(variant=='candidate'))
        check(variant+'.network_and_errors',not result['page_errors'] and not any(x['type']=='error' for x in result['console']) and all(x['allowed'] is True and x['url'].startswith(result['origin']+'/') for x in result['network']))
        life=result['lifecycle'];required=('browser_client_close','browser_server_close','owned_child_exit','http_server_close','http_listener_probe','websocket_listener_probe')
        check(variant+'.all_lifecycle_complete',life['verified'] is True and not life['cleanup_errors'] and all(life[x]=='completed' for x in required) and life['http_listener_closed'] is True and life['websocket_listener_closed'] is True and life['http_active_sockets']==0 and len(life['contexts'])==3 and all(x['status']=='completed' for x in life['contexts']))
        check(variant+'.owned_process_identity_exit',life['browser']['pid']==life['browser']['cdp_pid'] and life['browser']['uid']==1000 and life['child_exit']=={'code':0,'signal':None} and str(life['browser']['start_ticks']).isdigit())
        check(variant+'.actual_argv_sandbox',not any(x.split('=',1)[0] in ('--no-sandbox','--disable-setuid-sandbox') for x in life['browser']['argv']) and any(x.startswith('--user-data-dir='+str(ROOT/('browser-node-'+variant)/'tmp')+'/') for x in life['browser']['argv']))
        check(variant+'.websocket_loopback',life['websocket']['host']=='127.0.0.1' and isinstance(life['websocket']['port'],int))
        by_name={x['name']:x for x in rows}
        for fixture,item in zip(contract['fixtures'],result['cases']):
            key=fixture['id'];case_root=ROOT/('browser-node-'+variant)
            check(variant+'.'+key+'.exact_case_record',item['id']==key and item['input']==fixture['text'] and item['manual_merchant']==fixture['manual_merchant'] and obj(case_root/(key+'.json'))==item)
            expected_preview=dict(fixture['preview']);expected_saved={**fixture['saved'],'orderDate':fixture['preview']['orderDate'],'orderNo':fixture['preview']['orderNo'],'total':fixture['preview']['total']}
            if variant=='original' and key=='embedded-alias':
                defect=fixture['original_known_defect'];expected_preview.update(merchant=defect['preview_merchant'],days=defect['days'],source=defect['source'],highlighted=defect['highlighted']);expected_saved.update(windowDays=defect['days'],windowSource=defect['source'])
            check(variant+'.'+key+'.observed_preview',item['preview']==expected_preview)
            orders=json.loads(item['saved_raw'])
            check(variant+'.'+key+'.one_approved_saved_order',len(orders)==1 and set(orders[0])=={'id','merchant','orderNo','total','orderDate','windowDays','windowSource','createdAt'} and all(orders[0][k]==v for k,v in expected_saved.items()) and fixture['text'] not in item['saved_raw'])
            saved=orders[0];observed_due=(datetime.date.fromisoformat(saved['orderDate'])+datetime.timedelta(days=saved['windowDays'])).isoformat()
            check(variant+'.'+key+'.observed_due_and_reload',by_name[key+'.card_due']['actual']==by_name[key+'.reload_card_due']['actual']=='RETURN BY '+observed_due and by_name[key+'.reload_exact_storage']['actual']==item['saved_raw'])
            if fixture['calendar_download']:
                download=item['download'];p=rel(ROOT,str(Path(download['path']).relative_to(ROOT)))
                b=read(p);text=b.decode('utf-8');lines=text.replace('\r\n ','').split('\r\n')
                check(variant+'.calendar_bytes',pin(p)=={k:download[k] for k in ('bytes','sha256','git_blob')} and text==download['text'] and b'\n' not in b.replace(b'\r\n',b''))
                fields={x.split(':',1)[0]:x.split(':',1)[1] for x in lines if ':' in x}
                date=datetime.date.fromisoformat(observed_due);title='Return deadline: '+saved['merchant']+' #'+saved['orderNo']
                check(variant+'.calendar_semantics',lines.count('BEGIN:VEVENT')==1 and fields['UID']==saved['id']+'@returnby' and fields['DTSTART;VALUE=DATE']==date.strftime('%Y%m%d') and fields['DTEND;VALUE=DATE']==(date+datetime.timedelta(days=1)).strftime('%Y%m%d') and fields['SUMMARY']==fields['DESCRIPTION']==title and fields['TRIGGER']=='-P3D',{'actual_start':fields['DTSTART;VALUE=DATE'],'actual_end':fields['DTEND;VALUE=DATE']})
                shot=case_root/(variant+'-embedded-preview-desktop.png')
                check(variant+'.desktop_screenshot_exact',pin(shot)==item['preview_screenshot'])
                if variant=='candidate':
                    check('candidate.narrow_screenshot_exact',pin(case_root/'candidate-embedded-saved-narrow.png')==item['narrow_screenshot'] and item['narrow_geometry']=={'width':390,'scrollWidth':390})
        for prefix,code in [(variant+'-build',0),(variant+'-node-browser',0 if variant=='candidate' else 1)]:
            read(ROOT/(prefix+'.stdout'));read(ROOT/(prefix+'.stderr'))
        build_command=obj(ROOT/(variant.upper()+'-BUILD-COMMAND.json'))
        browser_command=obj(ROOT/(variant.upper()+'-NODE-BROWSER-COMMAND.json'))
        check(variant+'.native_command_exits',build_command['exit_code']==0 and browser_command['exit_code']==(0 if variant=='candidate' else 1))
        summaries[variant]={'passed':result['passed'],'failed':result['failed'],'cases':result['completed_cases'],'receipt':pin(ROOT/('browser-node-'+variant)/'RECEIVING.json'),'browser_pid':life['browser']['pid'],'child_exit':life['child_exit']}
    original=obj(ROOT/'browser-node-original/RECEIVING.json')
    check('original_gate_exact_receipt',gate['accepted'] is True and gate['original_receipt']==pin(ROOT/'browser-node-original/RECEIVING.json') and gate['exact_expected_mismatches']==[x for x in original['checks'] if not x['passed']] and gate['lifecycle']==original['lifecycle'] and gate['controls']=={'complete-alias':{'checks':24,'failures':0},'from-priority':{'checks':24,'failures':0}})
    check('original_gate_precedes_candidate',gate['at']<obj(ROOT/'BUILD-candidate.json')['started_at'])
    for visual in EXPECTED['visual_observations']:check('visual_pin.'+visual['path'],pin(ROOT/visual['path'])==visual['pin'])
    partial=Path('/home/jacob/.commander-tp-2/hamon-team-20261013-1bkvjx8k/delivery/RETURNBY-LINUX-PARTIAL-RETAINED-DATA.json')
    check('earlier_partial_observer_preserved',pin(partial)['git_blob']=='9d8018390c8e3a4b470ec2104d24e5537a092d09')
    changed=[]
    for p,before in observed.items():
        path=Path(p);s=path.lstat();after={**identity(path.read_bytes()),'mtime_ns':s.st_mtime_ns,'mode':stat.S_IMODE(s.st_mode)}
        if after!=before:changed.append(p)
    check('all_observed_native_files_unchanged',not changed,{'files':len(observed),'changed':changed})
    receipt['accepted']=True;receipt['courses']=summaries
    receipt['limits']=['Observer only; no product rerun.','Original failures are expected observed negatives; candidate qualifies only the offered f2ad8039 against7a271cf on this Linux environment.','Earlier Python bootstrap failure remains held; Windows and current main are not qualified.','No deployment, merge, source change or installed-consumer acceptance.','App dependency735-file copies were independently byte-received in the earlier partial course; this course verifies bound records and actual455-file Node copy, sources/builds/UI evidence.','Visual observations apply to three retained screenshots only and do not establish accessibility or general device support.']
except BaseException:
    receipt['review_error']=traceback.format_exc()
finally:
    receipt['files']=observed;receipt['passed_checks']=sum(x['passed'] for x in checks);receipt['failed_checks']=sum(not x['passed'] for x in checks)
    receipt['finished_at']=datetime.datetime.now(datetime.timezone.utc).isoformat()
    data=(json.dumps(receipt,indent=2,ensure_ascii=True)+'\n').encode('ascii')
    with OUT.open('xb') as stream:stream.write(data)
    print(json.dumps({'accepted':receipt['accepted'],'passed_checks':receipt['passed_checks'],'failed_checks':receipt['failed_checks'],'files':len(observed),'receipt':str(OUT),**identity(data),'error':receipt.get('review_error')}),flush=True)
raise SystemExit(0 if receipt['accepted'] else 1)
