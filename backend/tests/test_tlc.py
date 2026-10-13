import os
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app
from models import UMLModel
from tlc import available, build_spec, parse_output, verify


def sample(**changes):
    data={'name':'BooleanSafety','states':[{'id':'a','name':'Idle'},{'id':'b','name':'Stop','type':'final'}], 'transitions':[{'id':'e','source':'a','target':'b','guard':'True','updates':{'hazard':True}}], 'verification_variables':{'hazard':False}, 'verification_safety':'not hazard or pc == "b"'}
    data.update(changes)
    return UMLModel(**data)

class TLCUnitTests(unittest.TestCase):
    def test_no_execution_of_expressions(self):
        client=TestClient(app)
        for expr in ['__import__("os").system("id")','hazard + 1','pc == True']:
            response=client.post('/api/verify',json=sample(verification_safety=expr).model_dump())
            self.assertEqual(response.status_code,422,response.text)
    def test_undeclared_update(self):
        m=sample();m.transitions[0].updates={'missing':True}
        with self.assertRaises(Exception):build_spec(m)
    def test_timeout_never_passes(self):
        status,stats,_=parse_output('Model checking completed. No error has been found.',0,True)
        self.assertEqual(status,'INCOMPLETE');self.assertFalse(stats['complete'])
    def test_error_never_passes(self):
        self.assertEqual(parse_output('Parsing failed',1)[0],'ERROR')
    def test_missing_tlc(self):
        with patch('tlc.available',return_value=False):
            self.assertEqual(TestClient(app).post('/api/verify',json=sample().model_dump()).status_code,503)
    def test_unsupported_diagram(self):
        self.assertEqual(TestClient(app).post('/api/verify',json={'diagram_type':'class','classes':[{'id':'a','name':'A'}]}).status_code,422)
    def test_timed_out_process_is_killed(self):
        import subprocess
        with patch('tlc.available',return_value=True), patch('tlc.subprocess.Popen') as launch:
            proc=launch.return_value
            proc.wait.side_effect=[subprocess.TimeoutExpired('java',20),-9]
            result=verify(sample())
            proc.kill.assert_called_once()
            self.assertEqual(result['statistics']['result'],'INCOMPLETE')
            self.assertIsNone(result['safety_satisfied'])
    def test_no_requested_property(self):
        self.assertEqual(TestClient(app).post('/api/verify',json=sample(verification_safety='').model_dump()).status_code,422)
    def test_typed_booleans(self):
        self.assertEqual(TestClient(app).post('/api/verify',json={'verification_variables':{'hazard':'true'}}).status_code,422)

@unittest.skipUnless(available(),'Java and TLC are required for integration tests')
class TLCIntegrationTests(unittest.TestCase):
    def test_verify_endpoint(self):
        response=TestClient(app).post('/api/verify',json=sample().model_dump())
        self.assertEqual(response.status_code,200,response.text)
        self.assertEqual(response.json()['verification_kind'],'tlc')
        self.assertEqual(response.json()['result'],'TLC: PASSED')
    def test_safe_model(self):
        r=verify(sample())
        self.assertEqual(r['statistics']['result'],'PASSED',r['tlc_output'])
        self.assertTrue(r['safety_satisfied']);self.assertEqual(r['statistics']['distinct_states'],2)
    def test_unsafe_model_counterexample(self):
        r=verify(sample(verification_safety='not hazard'))
        self.assertEqual(r['statistics']['result'],'VIOLATED',r['tlc_output'])
        self.assertFalse(r['safety_satisfied']);self.assertGreaterEqual(len(r['trace']),2)
    def test_response_fails_without_fairness(self):
        r=verify(sample(response_condition='pc == "a"',response_target='b'))
        self.assertEqual(r['statistics']['result'],'VIOLATED',r['tlc_output'])
        self.assertEqual(next(p for p in r['properties'] if p['name']=='Response')['status'],'VIOLATED')
    def test_response_passes_with_fairness(self):
        r=verify(sample(response_condition='pc == "a"',response_target='b',weak_fairness=True))
        self.assertEqual(r['statistics']['result'],'PASSED',r['tlc_output'])
    def test_actual_timeout_is_incomplete(self):
        with patch.dict(os.environ,{'TLC_TIMEOUT':'1'}):
            r=verify(sample())
        # JVM startup can complete under one second on fast machines.
        self.assertIn(r['statistics']['result'],('INCOMPLETE','PASSED'))
        if r['statistics']['result']=='INCOMPLETE':self.assertIsNone(r['safety_satisfied'])
