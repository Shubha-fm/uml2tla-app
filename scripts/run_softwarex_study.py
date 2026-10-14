"""Research evaluation of the immutable v1.0.1 release.
Supplemental to generate_experimental_archive.py. Does not assert semantic equivalence.
"""
import ast, csv, json, os, platform, runpy, statistics, sys, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from fastapi.testclient import TestClient
from main import app
OUT=Path(os.environ.get("ARCHIVE_OUTPUT","FormiPy_Research_Evidence_v1.0.1"))
OUT.mkdir(parents=True,exist_ok=True)
# First collect the four real TLC experiments and five primary UML conversions.
runpy.run_path(str(Path(__file__).with_name("generate_experimental_archive.py")),run_name="__main__")
client=TestClient(app)
def get(payload):
    r=client.post("/api/convert",json=payload)
    if r.status_code!=200: raise RuntimeError(f"convert HTTP {r.status_code}: {r.text[:600]}")
    obj=r.json()
    if obj["verification_kind"]!="structural" or not obj.get("tla") or not obj.get("python_code"):
        raise AssertionError("Missing structural result or code")
    ast.parse(obj["python_code"])
    return obj
def m(kind, count=2, variant=0):
    p={"name":f"{kind}_{count}_{variant}","diagram_type":kind}
    ids=[str(i) for i in range(count)]
    if kind=="state_machine":
        p.update(states=[{"id":i,"name":"S"+i} for i in ids],transitions=[{"id":"e"+str(i),"source":ids[i],"target":ids[i+1]} for i in range(count-1)])
    elif kind=="activity":
        p.update(actions=[{"id":i,"name":"A"+i} for i in ids],flows=[{"id":"e"+str(i),"source":ids[i],"target":ids[i+1]} for i in range(count-1)])
    elif kind=="class":
        p.update(classes=[{"id":i,"name":"C"+i} for i in ids],relationships=[{"id":"e"+str(i),"source":ids[i],"target":ids[i+1]} for i in range(count-1)])
    elif kind=="sequence":
        p.update(lifelines=[{"id":i,"name":"L"+i} for i in ids],messages=[{"id":"e"+str(i),"source":ids[i],"target":ids[i+1],"order":i+1} for i in range(count-1)])
    elif kind=="use_case":
        p.update(actors=[{"id":"actor","name":"User"}],use_cases=[{"id":i,"name":"U"+i} for i in ids],associations=[{"id":"e"+str(i),"source":"actor","target":str(i)} for i in range(count)])
    return p
# Eighteen NEW structural scenarios, not the manuscript's historical corpus.
scenarios=[m(kind,n,j) for kind in ("state_machine","activity","class","sequence","use_case") for j,n in enumerate((2,3,5))]
scenarios += [m("state_machine",n,100) for n in (8,12,20)]
assert len(scenarios)==18
scenario_rows=[]
for i,p in enumerate(scenarios,1):
    result=get(p)
    path=OUT/"03_Eighteen_New_Conversions"/f"case_{i:02d}"
    path.mkdir(parents=True,exist_ok=True)
    (path/"input.json").write_text(json.dumps(p,indent=2))
    (path/"result.json").write_text(json.dumps(result,indent=2))
    (path/"generated.tla").write_text(result["tla"])
    (path/"generated.py").write_text(result["python_code"])
    if result.get("cfg"): (path/"generated.cfg").write_text(result["cfg"])
    scenario_rows.append({"case":i,"diagram":p["diagram_type"],"elements":next((len(p[x]) for x in ("states","actions","classes","lifelines","use_cases") if x in p),0),"outcome":"PASS"})
(OUT/"conversion_summary.csv").write_text("case,diagram,elements,outcome\n"+"".join(f'{r["case"]},{r["diagram"]},{r["elements"]},{r["outcome"]}\n' for r in scenario_rows))
# Real repeated wall-clock API-request observations, no TLC scaling claim.
timings=[]
for n in (5,10,20,40,80):
    p=m("state_machine",n,200)
    for repeat in range(10):
        t0=time.perf_counter()
        obj=get(p)
        elapsed=(time.perf_counter()-t0)*1000
        if obj["statistics"].get("states_explored")!=n: raise AssertionError(f"expected {n} reachable nodes")
        timings.append({"nodes":n,"edges":n-1,"repeat":repeat+1,"elapsed_ms":round(elapsed,4)})
with (OUT/"structural_runtime_raw.csv").open("w",newline="") as f:
    w=csv.DictWriter(f,fieldnames=["nodes","edges","repeat","elapsed_ms"]);w.writeheader();w.writerows(timings)
summary=[{"nodes":n,"n":10,"median_ms":round(statistics.median(x["elapsed_ms"] for x in timings if x["nodes"]==n),4),
          "min_ms":round(min(x["elapsed_ms"] for x in timings if x["nodes"]==n),4),
          "max_ms":round(max(x["elapsed_ms"] for x in timings if x["nodes"]==n),4)} for n in (5,10,20,40,80)]
(OUT/"structural_runtime_summary.json").write_text(json.dumps(summary,indent=2))
# Concurrent structural API requests, not TLC concurrency.
payload=m("state_machine",20,300)
def call(_):
    r=client.post("/api/convert",json=payload)
    return r.status_code==200 and r.json().get("statistics",{}).get("states_explored")==20
with ThreadPoolExecutor(max_workers=8) as pool: concurrent=list(pool.map(call,range(32)))
if not all(concurrent): raise AssertionError(f"concurrency failures: {concurrent.count(False)}")
# Negative cases, not a penetration test.
invalid=[{"diagram_type":"invalid"},
 {"diagram_type":"state_machine","states":[{"id":"a","name":"A"}],"transitions":[{"id":"e","source":"a","target":"bad"}]},
 {"diagram_type":"class","classes":[{"id":"a","name":"A"},{"id":"a","name":"B"}]},
 {"diagram_type":"sequence","lifelines":[{"id":"a","name":"A"}],"messages":[{"id":"x","source":"a","target":"a","order":0},{"id":"y","source":"a","target":"a","order":0}]}]
for p in invalid:
    if client.post("/api/convert",json=p).status_code!=422: raise AssertionError("invalid payload accepted")
sha=os.environ["RELEASE_SHA"]
metadata={"release":"v1.0.1","source_commit":sha,"new_conversion_scenarios":18,
          "structural_runtime_repetitions":50,"concurrent_requests":32,"concurrent_successes":sum(concurrent),
          "invalid_input_rejections":4,"runtime_summary":summary,
          "limitations":["New 18 scenarios, not original manuscript cases","Timing is FastAPI structural conversion, not TLC state-space model checking","No full Python/TLA+ semantic equivalence proof","Not comprehensive security, stress or concurrency model verification"],
          "python":sys.version,"platform":platform.platform()}
(OUT/"study_manifest.json").write_text(json.dumps(metadata,indent=2))
(OUT/"STUDY_README.md").write_text("# FormiPy v1.0.1 reproducibility study\n\nThis package includes four real TLC examples, five standard UML conversion cases, 18 new structural cases, raw timings (10 repeats each across five sizes), concurrent structural requests and negative-input tests. It is pinned to the recorded commit. It does not reproduce historical unprovided cases or prove full semantic equivalence.\n")
print("STUDY_SUMMARY_JSON="+json.dumps(metadata))
print("STUDY_SUCCESS")
