"""Additional reproducible SoftwareX-focused tests. These are NEW scenarios,
not a reproduction of the 18 scenarios claimed in an earlier manuscript."""
import ast
import concurrent.futures
import json
import statistics
import time
import unittest
from fastapi.testclient import TestClient
from main import app

CLIENT = TestClient(app)

def chain(n):
    return {
        "name": "Chain" + str(n), "diagram_type": "state_machine",
        "states": [{"id": "s"+str(i), "name": "S"+str(i)} for i in range(n)],
        "transitions": [{"id": "e"+str(i), "source": "s"+str(i),
                         "target": "s"+str(i+1)} for i in range(n-1)],
    }

def model(kind):
    base = {"name": "ResearchDemo", "diagram_type": kind}
    data = {
        "state_machine": {"states":[{"id":"a","name":"Start"},{"id":"b","name":"Done"}],
                         "transitions":[{"id":"t","source":"a","target":"b"}]},
        "activity": {"actions":[{"id":"a","name":"Start"},{"id":"b","name":"Done"}],
                     "flows":[{"id":"t","source":"a","target":"b"}]},
        "class": {"classes":[{"id":"a","name":"Client"},{"id":"b","name":"Server"}],
                  "relationships":[{"id":"t","source":"a","target":"b"}]},
        "sequence": {"lifelines":[{"id":"a","name":"Client"},{"id":"b","name":"Server"}],
                     "messages":[{"id":"t","source":"a","target":"b","order":1}]},
        "use_case": {"actors":[{"id":"a","name":"User"}],
                     "use_cases":[{"id":"b","name":"Login"}],
                     "associations":[{"id":"t","source":"a","target":"b"}]},
    }
    return dict(base, **data[kind])

class SoftwareXExpandedTests(unittest.TestCase):
    def test_18_new_conversion_scenarios(self):
        kinds = ["state_machine", "activity", "class", "sequence", "use_case"]
        cases = []
        for kind in kinds:
            cases.append((kind, model(kind)))
            m = model(kind); m["name"] = "Special_Unicode_\\_quote"; cases.append((kind,m))
            m = model(kind); m["name"] = "ExtraModel123"; cases.append((kind,m))
        for n in (2, 4, 8):
            cases.append(("state_machine",chain(n)))
        assert len(cases) == 18
        for i,(kind,payload) in enumerate(cases):
            with self.subTest(case=i+1,diagram=kind):
                r=CLIENT.post("/api/convert",json=payload)
                self.assertEqual(r.status_code,200,r.text)
                result=r.json()
                self.assertEqual(result["diagram_type"],kind)
                self.assertTrue(result["tla"])
                self.assertTrue(result["python_code"])
                ast.parse(result["python_code"])
                self.assertEqual(result["verification_kind"],"structural")
                self.assertIsNone(result["safety_satisfied"])
        print("NEW_SCENARIOS_PASSED=18 (not original manuscript dataset)")

    def test_scaling_repeated_structural_conversion(self):
        rows=[]
        for n in (5, 10, 20, 40, 80):
            payload=chain(n); samples=[]
            for repeat in range(3):
                tic=time.perf_counter()
                r=CLIENT.post("/api/convert",json=payload)
                ms=(time.perf_counter()-tic)*1000
                self.assertEqual(r.status_code,200,r.text)
                self.assertEqual(r.json()["statistics"]["states_explored"],n)
                samples.append(round(ms,3))
            rows.append({"nodes":n,"edges":n-1,"ms_median":round(statistics.median(samples),3),"ms_samples":samples})
        print("STRUCTURAL_SCALING_JSON="+json.dumps(rows))
        # This is structural conversion, not TLC state-space scalability.
    
    def test_concurrent_api_requests(self):
        payload=chain(20)
        def call(i):
            r=CLIENT.post("/api/convert",json=payload)
            return r.status_code, r.json().get("statistics",{}).get("states_explored")
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            res=list(pool.map(call,range(32)))
        self.assertTrue(all(code==200 and count==20 for code,count in res),res)
        print("CONCURRENT_STRUCTURAL_REQUESTS_PASSED=32")

    def test_security_rejects_bad_structures(self):
        bad=[
            {"diagram_type":"unknown"},
            {"diagram_type":"state_machine","states":[{"id":"a","name":"A"}],
             "transitions":[{"id":"x","source":"a","target":"missing"}]},
            {"diagram_type":"class","classes":[{"id":"a","name":"A"},{"id":"a","name":"B"}]},
            {"diagram_type":"sequence","lifelines":[{"id":"a","name":"A"}],
             "messages":[{"id":"x","source":"a","target":"a","order":0},
                         {"id":"y","source":"a","target":"a","order":0}]},
        ]
        for i,payload in enumerate(bad):
            with self.subTest(case=i):
                r=CLIENT.post("/api/convert",json=payload)
                self.assertEqual(r.status_code,422,r.text)
        self.assertEqual(CLIENT.get("/api/nonexistent").status_code,404)
        print("INVALID_INPUT_TESTS_PASSED=5")

    def test_deterministic_generation(self):
        for kind in ["state_machine","activity","class","sequence","use_case"]:
            payload=model(kind)
            results=[CLIENT.post("/api/convert",json=payload).json() for _ in range(3)]
            for key in ("tla","python_code","cfg","traceability"):
                self.assertEqual(results[0][key],results[1][key])
                self.assertEqual(results[1][key],results[2][key])
        print("DETERMINISTIC_REGENERATIONS_PASSED=15")

if __name__=="__main__": unittest.main()
