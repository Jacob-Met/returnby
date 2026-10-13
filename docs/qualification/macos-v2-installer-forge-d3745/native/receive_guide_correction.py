import hashlib,importlib.util,json,pathlib,shlex,stat
stage=pathlib.Path(__file__).parent
source=stage/"final"
prior=json.loads((stage/"final-installer-receipt.json").read_text())
def snapshot():
    return {name:{"bytes":len((source/name).read_bytes()),"sha256":hashlib.sha256((source/name).read_bytes()).hexdigest(),"mode":stat.S_IMODE((source/name).stat().st_mode)} for name in prior["after"]}
before=snapshot()
if before!=prior["after"]: raise SystemExit("Source changed after native receipt")
change=json.loads((stage/"final-guide-correction.json").read_text())
target=source/change["path"]
if hashlib.sha256(target.read_bytes()).hexdigest()!=change["oldSha256"]: raise SystemExit("Unexpected earlier guide")
data=change["content"].encode()
if hashlib.sha256(data).hexdigest()!=change["sha256"]: raise SystemExit("Corrected guide hash mismatch")
target.write_bytes(data)
after=snapshot()
unchanged={key:value for key,value in before.items() if key!=change["path"]}=={key:value for key,value in after.items() if key!=change["path"]}
spec=importlib.util.spec_from_file_location("published_v2_install",source/"tools/received_preview/install_macos.py")
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
commands=[]
for name,document in (("README",data.decode()),("generated MAC_GUIDE",module.MAC_GUIDE)):
    lines=document.splitlines()
    start=next(i for i,line in enumerate(lines) if "python3 recovery/install_macos.py --archive" in line)
    command=lines[start].strip()+"\n"+lines[start+1].strip()
    argv=shlex.split(command.replace("\\\n",""))
    expected=["python3","recovery/install_macos.py","--archive","recovery/received-build.zip","--destination"]
    if argv[:5]!=expected or len(argv)!=6: raise SystemExit("Recovery command malformed: "+name)
    commands.append({"source":name,"command":command,"argv":argv,"accepted":True})
receipt={"scope":"Two-byte README-only review correction after final runtime tests; no product/test change and no rerun claim","before":before,"after":after,"otherSourceUnchanged":unchanged,"recoveryCommands":commands}
(stage/"final-guide-receipt.json").write_text(json.dumps(receipt,indent=2)+"\n")
print(json.dumps(receipt,indent=2))
raise SystemExit(0 if unchanged else 1)
