import base64, gzip, hashlib, json
from pathlib import Path

def verify(raw, expected):
    actual = {
        "bytes": len(raw),
        "sha256": hashlib.sha256(raw).hexdigest(),
        "git_blob": hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest(),
    }
    if any(actual[k] != expected[k] for k in actual):
        raise ValueError("Evidence identity mismatch")
    return actual

root = Path("evidence")
native_raw = (root / "INDEX.json").read_bytes()
if verify(native_raw, {
    "bytes": 8742,
    "sha256": "829a7f7282fd3a35ae6209fedc838e5735d5fa4d926b239a24e8e4a39ad6f998",
    "git_blob": "bdcf1373f6001ab31617773b90cea15c9909105a",
})["git_blob"] != "bdcf1373f6001ab31617773b90cea15c9909105a":
    raise ValueError("Native index mismatch")
native = json.loads(native_raw)
transport_raw = (root / "TRANSPORT-INDEX.json").read_bytes()
if hashlib.sha1(b"blob " + str(len(transport_raw)).encode() + b"\0" + transport_raw).hexdigest() != "9cce8ecdf3d69934330c7f47a29481cc0a040823":
    raise ValueError("Transport index mismatch")
transport = json.loads(transport_raw)
packets = {p["name"]: p for p in native["packets"]}
count = 0
for entry in transport["wrappers"]:
    raw = (root / "transport" / entry["name"]).read_bytes()
    verify(raw, entry)
    wrapper = json.loads(raw)
    if wrapper["encoding"] != "gzip+base64" or wrapper["original"] != entry["original"]:
        raise ValueError("Wrapper binding mismatch")
    decoded = gzip.decompress(base64.b64decode(wrapper["content"], validate=True))
    verify(decoded, wrapper["original"])
    packet = packets.pop(wrapper["original"]["name"])
    verify(decoded, packet)
    envelope = json.loads(decoded)
    if len(envelope["files"]) != packet["files"] or [m["name"] for m in envelope["files"]] != packet["members"]:
        raise ValueError("Member list mismatch")
    for member in envelope["files"]:
        if member["encoding"] != "base64":
            raise ValueError("Unexpected member encoding")
        verify(base64.b64decode(member["content"], validate=True), member)
        count += 1
if packets or count != native["selected_file_count"] or count != 80:
    raise ValueError("Incomplete evidence")
print("Verified nine wrappers and 80 exact native members; no files written.")
