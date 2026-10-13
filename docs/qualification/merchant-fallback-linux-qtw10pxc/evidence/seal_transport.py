"""Transport-only wrapper creation; exact sealed native envelopes remain unchanged."""
import base64,gzip,hashlib,json,stat
from pathlib import Path
ROOT=Path(__file__).resolve().parent
NATIVE=ROOT/'evidence-packets'
OUT=ROOT/'transport-packets'
def pin(b):return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'git_blob':hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()}
indexraw=(NATIVE/'INDEX.json').read_bytes()
if pin(indexraw)['git_blob']!='bdcf1373f6001ab31617773b90cea15c9909105a':raise RuntimeError('native index drift')
index=json.loads(indexraw)
if OUT.exists():raise RuntimeError('create-only transport directory exists')
OUT.mkdir()
trans={'format':'returnby-gzip-transport-index-v1','native_index':{'name':'INDEX.json',**pin(indexraw)},'scope':'Deterministic gzip+Base64 wrappers around unchanged native file envelopes; original source/build/browser receipts and all80 exact native members retain their identities. No product execution.','decode':'base64.b64decode(content, validate=True), then gzip.decompress; require decompressed bytes/SHA256/Git match original. Native file envelope files[].content then decode with base64.b64decode(...,validate=True).','transport_history':pin((ROOT/'TRANSPORT-HISTORY.json').read_bytes()),'wrappers':[]}
for p in index['packets']:
 raw=(NATIVE/p['name']).read_bytes()
 if pin(raw)!={k:p[k] for k in ('bytes','sha256','git_blob')}:raise RuntimeError('native envelope changed')
 packed=gzip.compress(raw,compresslevel=9,mtime=0)
 wrapper={'format':'returnby.native-envelope.gzip-transport.v1','original':{'name':p['name'],**pin(raw),'files':p['files']},'encoding':'gzip+base64','content':base64.b64encode(packed).decode('ascii')}
 name=p['name'].removesuffix('.json')+'.transport.json'
 body=(json.dumps(wrapper,indent=2,ensure_ascii=True)+'\n').encode('ascii')
 with (OUT/name).open('xb') as f:f.write(body)
 saved=json.loads((OUT/name).read_bytes())
 restored=gzip.decompress(base64.b64decode(saved['content'],validate=True))
 if restored!=raw or pin(restored)!={k:saved['original'][k] for k in ('bytes','sha256','git_blob')}:raise RuntimeError('transport byte roundtrip')
 trans['wrappers'].append({'name':name,'path':str(OUT/name),**pin(body),'original':wrapper['original'],'decompression_roundtrip_verified':True})
body=(json.dumps(trans,indent=2,ensure_ascii=True)+'\n').encode('ascii')
with (OUT/'TRANSPORT-INDEX.json').open('xb') as f:f.write(body)
print(json.dumps({'index':str(OUT/'TRANSPORT-INDEX.json'),'pin':pin(body),'wrappers':trans['wrappers']}),flush=True)
