import sys,json,hashlib,base64,io,tarfile,zipfile,termios,time,signal,struct,traceback
term=termios.tcgetattr(sys.stdin.fileno());term[3]&=~termios.ECHO;termios.tcsetattr(sys.stdin.fileno(),termios.TCSANOW,term)
mem=int(next(x.split()[1] for x in open("/proc/meminfo") if x.startswith("MemAvailable:")))*1024
if mem<2*1024**3:raise RuntimeError("Below 2 GiB available-memory floor")
print(json.dumps({"ready":True,"available_memory":mem,"disk_writes":0}),flush=True)
chunks={};sizes={};total=0
checks=0
def check(ok,msg):
 global checks
 checks+=1
 if not ok:raise AssertionError(msg)
def sha(b):return hashlib.sha256(b).hexdigest()
def git(b):return hashlib.sha1(("blob "+str(len(b))+"\0").encode()+b).hexdigest()
def pin(b,n,s,g=None):
 check(len(b)==n,"byte count mismatch");check(sha(b)==s,"SHA256 mismatch")
 if g:check(git(b)==g,"Git blob mismatch")
def verify(t):
 global checks
 start=time.monotonic()
 manifest=json.loads(t["author-manifest"])
 carrier=t["author-carrier"].encode()
 pin(carrier,175200,"84e356d4a00fbc2dc81ae6bffe2d717df2acf71454de609bc68870d37efaa9fc","2fc7ae3c17eae2159fc96a637ed45f2348b386ef")
 pin(t["author-manifest"].encode(),8626,"a84baa548813fce51227208a28cb6935941ac5ebeceb218695f2a618ce60f951","35787df92c8675b270276d00a0f5041b182fa3f5")
 archive=base64.b64decode(carrier,validate=True)
 pin(archive,131400,"c91f01a115f30136ae55df47077a52878ac3fcf4560826a3e1616857f2a0b244","3e92a009374f4783183b05f2e239616a306b4ec8")
 payloads={}
 with tarfile.open(fileobj=io.BytesIO(archive),mode="r:gz") as tar:
  members=tar.getmembers()
  check(len(members)==len(manifest["files"])==43,"archive member count")
  check({m.name for m in members}==set(manifest["files"]),"archive member names")
  for m in members:
   check(m.isfile() and not m.name.startswith("/") and ".." not in m.name.split("/"),"archive member type/path")
   spec=manifest["files"][m.name]
   b=tar.extractfile(m).read()
   pin(b,spec["bytes"],spec["sha256"])
   check(oct(m.mode)==spec["mode"],"archive member mode")
   payloads[m.name]=b
 for name in ("install.py","serve.py","launch.command","README.md"):
  check(payloads["source/"+name]==t[name].encode(),"source and archive disagree: "+name)
 receipt=json.loads(t["receipt"])
 pin(t["receipt"].encode(),79039,"e99becf87cb5a04fa61be0b7f25da5976872ac9bc6ed89d1d0b2b027e609bb93","73cac7aa468d122b0ba4821a95e48858b58eb1c1")
 check(receipt["installed_before"]==receipt["installed_after"],"installed before/after mismatch")
 check(len(receipt["installed_before"])==19,"installed membership")
 check(sum(x["bytes"] for x in receipt["installed_before"].values())==126449,"installed total bytes")
 check(receipt["terminal"]["passed"] is True,"native terminal did not pass")
 check([x["id"] for x in receipt["groups"]]==["R1","R2","R3","R4","R5"],"native groups differ")
 check(all(x["passed"] is True for x in receipt["groups"]),"native group failed")
 check(all(x["exit_code"]==0 and x["signal"] is None for x in receipt["processes"]),"native child closure")
 check(len(receipt["processes"])==4,"child count")
 check(not receipt["exceptions"] and not receipt["cleanup"],"native application/closure errors")
 check(all(x["url"].startswith(receipt["origin"]+"/") or x["url"].startswith("data:image/svg+xml;base64,") for x in receipt["requests"]),"off-origin network request")
 z=payloads["qualified-preview.zip"]
 pin(z,26444,"45d5f732879ab0101295648c59c1955b5f8ec190aa4c44a42b46bc24a9b464e4")
 with zipfile.ZipFile(io.BytesIO(z)) as zip:
  check(len(zip.infolist())==10,"original ZIP member count")
  build_bytes=zip.read("BUILD-MANIFEST.json")
  pin(build_bytes,2734,"384deec2a8587f210f7a1d74e067f79dea42ca0f6141130a577e82fa6f9e3feb")
  build=json.loads(build_bytes)
  check(len(build["files"])==9,"original app file count")
  for name,spec in build["files"].items():
   b=zip.read(name)
   pin(b,spec["bytes"],spec["sha256"],spec["gitBlob"])
   p=receipt["installed_before"]["site/"+name]
   check(p["bytes"]==len(b) and p["sha256"]==sha(b),"installed app differs from original offer")
  check(build["sourceCommit"]=="d153659d1f561e1c316a1f9278b3d0b32c222c2f","source commit")
 backup=t["backup"].encode()
 pin(backup,411,"05cc665c726316c971b8260ca3e592a00f1ad91a57197abc2dfb72e8657b8582","7e20bd0ca4ce5b0453ebf25db113192fe95f7c9d")
 bd=json.loads(backup)
 check(bd["orders"]==[receipt["saved_order"]],"physical backup record")
 check(receipt["backup"]["document"]==bd,"receipt backup document mismatch")
 shots=json.loads(t["screenshots"])
 screen_pins={}
 for path,spec in shots["files"].items():
  b=base64.b64decode(spec["base64"],validate=True)
  pin(b,spec["bytes"],spec["sha256"],spec["gitBlob"])
  check(receipt["files"][path.removeprefix("run-v1/")]["sha256"]==sha(b),"screen receipt identity")
  check(b[:8]==b"\x89PNG\r\n\x1a\n","PNG signature")
  screen_pins[path]={"bytes":len(b),"sha256":sha(b),"git_blob":git(b),"dimensions":struct.unpack(">II",b[16:24])}
 picture=base64.b64decode(t["research-figure"].strip(),validate=True)
 pin(picture,110930,"a6b26d6e2eea8bb263ae8f0d97e03c95c75775128a79210a1a56d2a3e22dac04","8faaa50c0907fb74ce91c0848bcbc79c02cbac95")
 aq=json.loads(payloads["author-qualification/RESULT.json"])
 ie=json.loads(payloads["installation-execution.json"])
 return {"schema":"estate.c945953fdeb7.root-artifact-receiving.v1","state":"accepted","checks":checks,"seconds":time.monotonic()-start,"author_archive_members":43,"installed_files":19,"installed_bytes":126449,"app_assets_exact":9,"all_native_groups_pass":True,"all_native_children_exit_zero":True,"application_requests":len(receipt["requests"]),"application_exceptions":receipt["exceptions"],"saved_order":receipt["saved_order"],"physical_backup_bytes":len(backup),"physical_backup_sha256":sha(backup),"screenshot_pins":screen_pins,"research_figure_sha256":sha(picture),"author_qualification":aq,"installation_execution":ie,"limits":["Read-only in-memory artifact verification; no installer, browser or scientific model rerun.","Native headless/private-profile --no-open outcome only; does not add Finder/default-browser/LA7 qualification."]}
try:
 for line in sys.stdin:
  x=json.loads(line)
  if x["op"]=="part":
   name=x["name"];part=x["data"]
   check(x["offset"]==sizes.get(name,0),"chunk offset mismatch")
   chunks.setdefault(name,[]).append(part);sizes[name]=sizes.get(name,0)+len(part);total+=len(part.encode())
   check(total<=16*1024**2,"input budget exceeded")
  elif x["op"]=="ack":print(json.dumps({"ack":True,"bytes":total,"files":len(chunks)}),flush=True)
  elif x["op"]=="run":
   signal.alarm(60)
   out=verify({k:"".join(v) for k,v in chunks.items()})
   print(json.dumps(out,sort_keys=True),flush=True);sys.exit(0)
  else:raise ValueError("unknown operation")
except Exception as e:
 print(json.dumps({"state":"refused","error":str(e),"traceback":traceback.format_exc(),"checks":checks}),flush=True);sys.exit(2)
