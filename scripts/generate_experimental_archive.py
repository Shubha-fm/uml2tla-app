#!/usr/bin/env python3
"""Reproduce a small fixed-version evidence archive; fail closed on mismatch."""
import csv
import json
import os
from pathlib import Path
import platform
import subprocess
import sys
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from main import app

ROOT = Path(os.environ.get("ARCHIVE_OUTPUT", "FormiPy_Experimental_Archive_v1.0.1"))
EXAMPLES = Path(os.environ.get("EXAMPLES_DIR", "examples"))
ROOT.mkdir(parents=True, exist_ok=True)
client = TestClient(app)
def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")
def run(endpoint, input_data):
    r = client.post(endpoint, json=input_data)
    if r.status_code != 200:
        raise RuntimeError(f"{endpoint} returned {r.status_code}: {r.text[:1000]}")
    return r.json()
def snapshot(name, group, payload, result):
    folder = ROOT / group / name
    save(folder / "input.json", payload)
    save(folder / "result.json", result)
    for field, suffix in [("tla", ".tla"), ("cfg", ".cfg"), ("python_code", ".py"), ("tlc_output", ".log")]:
        if result.get(field):
            module = result.get("module_name") or name
            (folder / (module + suffix)).write_text(result[field])
    save(folder / "traceability.json", result.get("traceability", []))
    save(folder / "trace.json", result.get("trace", []))
    return {"name":name,"group":group,"diagram_type":payload["diagram_type"],
            "result":result.get("statistics",{}).get("result"),
            "verification_kind":result.get("verification_kind"),
            "states_generated":result.get("statistics",{}).get("states_generated"),
            "distinct_states":result.get("statistics",{}).get("distinct_states"),
            "time_taken":result.get("statistics",{}).get("time_taken")}
def conversion(kind):
    b={"name":"Archive_"+kind,"diagram_type":kind}
    variants={
        "state_machine":{"states":[{"id":"a","name":"Idle"},{"id":"b","name":"Stop"}],"transitions":[{"id":"e1","source":"a","target":"b"}]},
        "activity":{"actions":[{"id":"a","name":"Start"},{"id":"b","name":"Done"}],"flows":[{"id":"e1","source":"a","target":"b"}]},
        "class":{"classes":[{"id":"a","name":"Client"},{"id":"b","name":"Server"}],"relationships":[{"id":"e1","source":"a","target":"b"}]},
        "sequence":{"lifelines":[{"id":"a","name":"Client"},{"id":"b","name":"Server"}],"messages":[{"id":"e1","source":"a","target":"b","order":1}]},
        "use_case":{"actors":[{"id":"a","name":"User"}],"use_cases":[{"id":"b","name":"Login"}],"associations":[{"id":"e1","source":"a","target":"b"}]}
    }
    return dict(b,**variants[kind])
expected={"tlc_safe":"PASSED","tlc_unsafe":"VIOLATED","tlc_usecase_safe":"PASSED","tlc_usecase_unsafe":"VIOLATED"}
health=client.get("/api/health").json()
if not health.get("tlc_available"):
    raise RuntimeError("TLC unavailable; archive generation stopped.")
records=[]
for name, want in expected.items():
    payload=json.loads((EXAMPLES/(name+".json")).read_text())
    output=run("/api/verify",payload)
    got=output.get("statistics",{}).get("result")
    if got != want or output.get("verification_kind")!="tlc":
        raise RuntimeError(f"{name}: expected TLC {want}, received {got}")
    records.append(snapshot(name,"01_TLC_Verification",payload,output))
for kind in ["use_case","class","sequence","activity","state_machine"]:
    payload=conversion(kind)
    output=run("/api/convert",payload)
    if output.get("verification_kind")!="structural" or not output.get("tla") or not output.get("python_code"):
        raise RuntimeError(f"{kind}: conversion evidence incomplete")
    records.append(snapshot(kind,"02_UML_Conversion",payload,output))
with (ROOT/"results.csv").open("w",newline="") as f:
    writer=csv.DictWriter(f,fieldnames=list(records[0]))
    writer.writeheader();writer.writerows(records)
sha=os.environ.get("RELEASE_SHA","")
if len(sha)!=40: raise RuntimeError("RELEASE_SHA must be the exact 40-character release commit SHA")
save(ROOT/"manifest.json",{"release":"v1.0.1","source_commit":sha,"created_at":datetime.now(timezone.utc).isoformat(),
    "python":sys.version,"platform":platform.platform(),"health":health,
    "tlc_records":4,"uml_conversion_records":5,"results":records,
    "limitations":["Representative cases are not the manuscript's original 18-case corpus.",
                   "UML conversions are structural analyses, not TLC proofs.",
                   "Generated Python is not proved semantically equivalent to TLA+."]})
(ROOT/"README.md").write_text("""# FormiPy versioned experimental evidence
This archive was generated from the immutable GitHub `v1.0.1` commit indicated by manifest.json.
Four checked TLC outcomes and five representative UML conversion requests are archived.
Raw verifier output is stored as .log files; result.json preserves the complete API response.
Results are valid for the finite examples and assumptions only.
These nine examples do not reproduce the original manuscript's separate 18 scenarios,
nor prove Python/TLA+ equivalence or general scalability.
Do not edit results without recording a new run and SHA.
""")
print(f"ARCHIVE_SUCCESS {len(records)} records in {ROOT}")
