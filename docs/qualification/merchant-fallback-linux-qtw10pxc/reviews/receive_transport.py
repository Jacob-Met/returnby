"""Machine-specific retained evidence custody only; no product execution.
Read immutable transport wrappers, decode bounded gzip/Base64 in memory, and compare
each exact native member. No member is extracted or written to its recorded path.
"""
import os, stat, json, hashlib, base64, gzip, io, datetime, traceback
from pathlib import Path, PurePosixPath
ROOT=Path('/home/jacob/hamon-returnby-linux-qtw10pxc-62h26e6o')
OWN=Path('/home/jacob/.commander-tp-2/hamon-team-20261013-1bkvjx8k/delivery')
SYNTAX=Path('/home/jacob/hamon-returnby-linux-review-qtw10pxc-vhvphrhu')
OUT=OWN/'RETURNBY-LINUX-TRANSPORT-CUSTODY.json'
checks=[]; observed={}; cache={}
def identity(b):
    return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),
            'git_blob':hashlib.sha1(b'blob '+str(len(b)).encode('ascii')+b'\0'+b).hexdigest()}
def read(p):
    p=Path(p)
    if str(p) not in cache:
        s=p.lstat()
        if not stat.S_ISREG(s.st_mode):raise RuntimeError('Expected regular file: '+str(p))
        for parent in p.parents:
            if parent.is_symlink():raise RuntimeError('Redirected native parent')
        b=p.read_bytes();cache[str(p)]=b
        observed[str(p)]={**identity(b),'mtime_ns':str(s.st_mtime_ns),'mode':stat.S_IMODE(s.st_mode)}
    return cache[str(p)]
def pin(p):return identity(read(p))
def obj(p):return json.loads(read(p).decode('utf-8'))
def check(name,condition,detail=None):
    checks.append({'name':name,'passed':bool(condition),'detail':detail})
    if not condition:raise RuntimeError('Custody check failed: '+name)
def native_member_path(name):
    p=PurePosixPath(name)
    if p.is_absolute() or name!=p.as_posix() or any(x in ('..','.') for x in p.parts):raise RuntimeError('Noncanonical member name')
    if p.parts[0]=='syntax-review':return SYNTAX.joinpath(*p.parts[1:])
    if p.parts[0]=='independent-partial':return OWN.joinpath(*p.parts[1:])
    return ROOT.joinpath(*p.parts)
receipt={'format':'returnby-linux-delivery-transport-custody-v1','accepted':False,
 'scope':'Remote-wrapper Git identities checked in controller, followed by native wrapper/decompressed-envelope/member bytes and metadata verification only. No product or original receiver rerun.',
 'started_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':checks,
 'controller_remote_wrapper_validation':{'wrappers':9,'bytes':3396422,'algorithm':'SHA-1 over exact ASCII Git blob header+full fetched body','self_controls':['abc SHA1 a9993e364706816aba3e25717850c26c9cd0d89d','empty Git blob e69de29bb2d1d6434b8b29ae775ad8c2e48c5391']},
 'product_execution':False}
try:
    transport_path=ROOT/'transport-packets/TRANSPORT-INDEX.json'
    native_index_path=ROOT/'evidence-packets/INDEX.json'
    check('transport_index_pin',pin(transport_path)['git_blob']=='9cce8ecdf3d69934330c7f47a29481cc0a040823')
    check('native_index_pin',pin(native_index_path)['git_blob']=='bdcf1373f6001ab31617773b90cea15c9909105a')
    transport=obj(transport_path);index=obj(native_index_path)
    check('transport_native_link',{k:transport['native_index'][k] for k in ('bytes','sha256','git_blob')}==pin(native_index_path))
    check('nine_wrappers',len(transport['wrappers'])==len(index['packets'])==9)
    packets={x['name']:x for x in index['packets']}
    declared=[name for row in index['packets'] for name in row['members']]
    check('unique80_authorized_members',len(declared)==len(set(declared))==index['selected_file_count']==80)
    seen=[];wrapper_rows=[];member_rows=[]
    for row in transport['wrappers']:
        wrapper_path=ROOT/'transport-packets'/row['name']
        check('wrapper_path.'+row['name'],str(wrapper_path)==row['path'] and Path(row['name']).name==row['name'])
        wrapper_bytes=read(wrapper_path)
        check('wrapper_full_identity.'+row['name'],identity(wrapper_bytes)=={k:row[k] for k in ('bytes','sha256','git_blob')})
        wrapper=json.loads(wrapper_bytes.decode('ascii'));original=row['original']
        check('wrapper_schema.'+row['name'],wrapper['format']=='returnby.native-envelope.gzip-transport.v1' and wrapper['encoding']=='gzip+base64' and wrapper['original']==original)
        compressed=base64.b64decode(wrapper['content'],validate=True)
        with gzip.GzipFile(fileobj=io.BytesIO(compressed),mode='rb') as stream:
            decoded=stream.read(original['bytes']+1)
        check('decoded_identity.'+row['name'],identity(decoded)=={k:original[k] for k in ('bytes','sha256','git_blob')})
        check('deterministic_gzip_timestamp.'+row['name'],compressed[:2]==b'\x1f\x8b' and compressed[4:8]==b'\x00\x00\x00\x00')
        expected=packets[original['name']]
        check('envelope_native_identity.'+row['name'],read(ROOT/'evidence-packets'/original['name'])==decoded and {k:expected[k] for k in ('bytes','sha256','git_blob','files')}=={k:original[k] for k in ('bytes','sha256','git_blob','files')})
        envelope=json.loads(decoded.decode('utf-8'))
        check('envelope_member_names.'+row['name'],[x['name'] for x in envelope['files']]==expected['members'] and len(envelope['files'])==original['files'])
        for member in envelope['files']:
            name=member['name'];p=native_member_path(name)
            check('member_path.'+name,member['original_path']==str(p) and member['encoding']=='base64')
            b=base64.b64decode(member['content'],validate=True)
            check('member_bytes.'+name,identity(b)=={k:member[k] for k in ('bytes','sha256','git_blob')} and read(p)==b)
            actual=observed[str(p)]
            check('member_native_metadata.'+name,str(member['mtime_ns'])==actual['mtime_ns'] and member['mode']==actual['mode'])
            seen.append(name);member_rows.append({'name':name,'original_path':str(p),**identity(b)})
        wrapper_rows.append({'name':row['name'],**identity(wrapper_bytes),'compressed_bytes':len(compressed),'decompressed':identity(decoded),'members':len(envelope['files'])})
    check('all80_members_received',seen==declared and len(set(seen))==80)
    history_path=ROOT/'TRANSPORT-HISTORY.json'
    check('transport_history_pin',pin(history_path)==transport['transport_history'])
    history=obj(history_path)
    receipt['transport_history']=history
    # The already-completed paired observer is separate from Runtime's80-member seal.
    check('paired_observer_receipt',pin(OWN/'RETURNBY-LINUX-NODE-RETAINED-DATA.json')['git_blob']=='17696a56bc5c0b58bae8134a5c974e68f492c852')
    check('paired_observer_executed_driver',pin(OWN/'receive_returnby_linux_node_data_20261013.py')['git_blob']=='ade7430003269c7b744b35db7e95332475f40bf0')
    changed=[]
    for name,before in observed.items():
        p=Path(name);s=p.lstat();after={**identity(p.read_bytes()),'mtime_ns':str(s.st_mtime_ns),'mode':stat.S_IMODE(s.st_mode)}
        if after!=before:changed.append(name)
    check('all_read_files_preserved',not changed,{'files':len(observed),'changed':changed})
    receipt['accepted']=True;receipt['wrappers']=wrapper_rows;receipt['members']=member_rows
    receipt['limits']=['This is byte custody, not new application qualification.','The driver uses admitted native paths and is not a portable general extraction tool.','Remote Git identity and native full identity jointly bind exact wrapper bytes; decompressed native envelopes are compared directly.','No recorded original_path is written or extracted.','Previous Python failure, original semantic negatives and transport timeout history are preserved.']
except BaseException:
    receipt['review_error']=traceback.format_exc()
finally:
    receipt['files']=observed;receipt['passed_checks']=sum(x['passed'] for x in checks);receipt['failed_checks']=sum(not x['passed'] for x in checks)
    receipt['finished_at']=datetime.datetime.now(datetime.timezone.utc).isoformat()
    data=(json.dumps(receipt,indent=2,ensure_ascii=True)+'\n').encode('ascii')
    with OUT.open('xb') as stream:stream.write(data)
    print(json.dumps({'accepted':receipt['accepted'],'passed_checks':receipt['passed_checks'],'failed_checks':receipt['failed_checks'],'files':len(observed),'receipt':str(OUT),**identity(data),'error':receipt.get('review_error')}),flush=True)
raise SystemExit(0 if receipt['accepted'] else 1)
