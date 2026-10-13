#!/usr/bin/env python3
"""Run the frozen date-priority corpus through the exact parser in Node."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess

ORACLE_SHA256 = "3e0f4ac466bd67d8dd4f085a07bc3be1c26a1a4dc56bbbd653c9831952a077f2"
DRIVER = """import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const parser = await import(pathToFileURL(process.argv[2]).href);
const cases = JSON.parse(readFileSync(process.argv[3], 'utf8')).cases;
const rows = cases.map(c => {
  const before = JSON.stringify(c);
  const actual = parser.parse(c.text, c.knownMerchants);
  const actualDates = parser.findDates(c.text);
  return {name:c.name,actual,actualDates,inputUnchanged:JSON.stringify(c)===before};
});
process.stdout.write(JSON.stringify({node:process.version,rows})+'\\n');
"""

def sha(data):
    return hashlib.sha256(data).hexdigest()

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--source", required=True, type=Path)
    ap.add_argument("--expected-sha256", required=True)
    ap.add_argument("--oracle", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--node", default="node")
    args = ap.parse_args()
    source, oracle, out = (getattr(args,n).resolve() for n in ("source","oracle","out"))
    source_bytes, oracle_bytes = source.read_bytes(), oracle.read_bytes()
    if sha(source_bytes) != args.expected_sha256 or sha(oracle_bytes) != ORACLE_SHA256:
        raise RuntimeError("Source or frozen oracle identity mismatch")
    cases = json.loads(oracle_bytes)["cases"]
    out.mkdir(parents=True, exist_ok=False)
    local_source = out / "received-parser.mts"
    local_source.write_bytes(source_bytes)
    driver = out / "receive.mjs"
    driver.write_text(DRIVER, encoding="utf-8", newline="\n")
    cmd = [args.node, str(driver), str(local_source), str(oracle)]
    result = subprocess.run(cmd, cwd=out, capture_output=True, timeout=25)
    (out / "node.stdout").write_bytes(result.stdout)
    (out / "node.stderr").write_bytes(result.stderr)
    if result.returncode:
        raise RuntimeError("Node course failed; raw streams retained")
    actual = json.loads(result.stdout)
    if len(actual["rows"]) != len(cases):
        raise RuntimeError("Incomplete course")
    rows = []
    for expected, received in zip(cases,actual["rows"]):
        errors = []
        if received["name"] != expected["name"]:
            errors.append("case identity differs")
        if received["actual"] != expected["expected"]:
            errors.append("complete parsed record differs")
        if received["actualDates"] != expected["expectedDates"]:
            errors.append("original-text date hits differ")
        if not received["inputUnchanged"]:
            errors.append("input mutated")
        rows.append({"case":expected["name"],"accepted":not errors,"errors":errors,
                     "expected":expected["expected"],"actual":received["actual"],
                     "expectedDates":expected["expectedDates"],"actualDates":received["actualDates"]})
    unchanged = source.read_bytes()==source_bytes and oracle.read_bytes()==oracle_bytes and local_source.read_bytes()==source_bytes
    report = {"schema":"hamon.returnby.date-priority.receiving.v1","created_at_utc":datetime.now(timezone.utc).isoformat(),
              "source":str(source),"source_sha256":sha(source_bytes),"oracle_sha256":sha(oracle_bytes),
              "receiver_sha256":sha(Path(__file__).read_bytes()),"driver_sha256":sha(driver.read_bytes()),
              "node":actual["node"],"command":cmd,"returncode":result.returncode,"stderr_empty":not result.stderr,
              "stdout_sha256":sha(result.stdout),"stderr_sha256":sha(result.stderr),
              "source_oracle_and_loaded_copy_unchanged":unchanged,"cases":rows,
              "passed":sum(r["accepted"] for r in rows),"total":len(rows),
              "accepted":all(r["accepted"] for r in rows) and unchanged and not result.stderr,
              "scope":"Original authored synthetic order text; actual Node24 loads exact parser bytes through a .mts copy. No candidate/donor test oracle, browser/build, network, mail or live data."}
    (out / "receipt.json").write_text(json.dumps(report,sort_keys=True,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"accepted":report["accepted"],"passed":report["passed"],"total":report["total"],
                      "failures":[r["case"] for r in rows if not r["accepted"]],"receipt":str(out/"receipt.json")}))
    return 0 if report["accepted"] else 1

if __name__ == "__main__":
    raise SystemExit(main())
