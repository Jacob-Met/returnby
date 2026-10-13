import hashlib,importlib.util,io,json,os,pathlib,stat,unittest,platform
stage=pathlib.Path(__file__).parent
files=json.loads((stage/"draft-input.json").read_text())
source=stage/"draft"
source.mkdir()
for name,text in files.items():
    target=source/name
    target.parent.mkdir(parents=True,exist_ok=True)
    with target.open("x",encoding="utf-8",newline="") as stream: stream.write(text)
def snapshot():
    return {name:{"bytes":len((source/name).read_bytes()),"sha256":hashlib.sha256((source/name).read_bytes()).hexdigest(),"mode":stat.S_IMODE((source/name).stat().st_mode)} for name in files}
before=snapshot()
os.environ["RETURNBY_RECEIVED_ARCHIVE"]=str(stage/"received-returnby-83abbe9a.zip")
os.environ["TMPDIR"]=str(stage/"tmp")
spec=importlib.util.spec_from_file_location("returnby_v2_draft_tests",source/"tests/received_preview/test_install_macos.py")
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
names=[name for name in unittest.defaultTestLoader.getTestCaseNames(module.ReceivedMacEntry) if name not in {
"test_changed_asset_refuses_check_and_server","test_symlinked_asset_refuses_check_and_server",
"test_launcher_forwards_unexpected_arguments","test_occupied_port_is_preserved",
"test_relocated_unicode_copy_serves_exact_assets_then_enter_stops","test_eof_stops_foreground_server"}]
stream=io.StringIO()
result=unittest.TextTestRunner(stream=stream,verbosity=2).run(unittest.TestSuite(module.ReceivedMacEntry(name) for name in names))
receipt={"scope":"Draft installer-only controls; runtime 387eed is unaccepted on Darwin; no runtime lifecycle or Mac acceptance","host":platform.platform(),"python":platform.python_version(),"pid":os.getpid(),"before":before,"after":snapshot(),"testsRun":result.testsRun,"failures":len(result.failures),"errors":len(result.errors),"log":stream.getvalue(),"sourceUnchanged":before==snapshot()}
(stage/"draft-installer-receipt.json").write_text(json.dumps(receipt,indent=2)+"\n")
print(json.dumps({k:v for k,v in receipt.items() if k not in {"before","after","log"}},indent=2))
print(stream.getvalue())
raise SystemExit(0 if result.wasSuccessful() and receipt["sourceUnchanged"] else 1)
