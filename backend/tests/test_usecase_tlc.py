import unittest
from fastapi.testclient import TestClient
from main import app
from tlc import available


def model():
    return {'name':'Login','diagram_type':'use_case','actors':[{'id':'user','name':'User'},{'id':'admin','name':'Admin'}],'use_cases':[{'id':'login','name':'Login'},{'id':'manage','name':'ManageUsers'}],'associations':[{'id':'e1','source':'user','target':'login'},{'id':'e2','source':'admin','target':'manage'}],'forbidden_requests':[{'source':'user','target':'manage'}],'verify_completion':True,'weak_fairness':True}

class UseCaseExportTests(unittest.TestCase):
    def test_validated_spec_export(self):
        r=TestClient(app).post('/api/convert',json=model())
        self.assertEqual(r.status_code,200,r.text)
        self.assertIn('CompletionInvariant',r.json()['tla'])
        self.assertIn('PROPERTY Response',r.json()['cfg'])
        self.assertFalse(any('draft skeleton' in w for w in r.json()['warnings']))
    def test_invalid_contract(self):
        m=model();m['forbidden_requests'][0]['target']='missing'
        self.assertEqual(TestClient(app).post('/api/verify',json=m).status_code,422)

@unittest.skipUnless(available(),'Java and TLC required')
class UseCaseTLCIntegrationTests(unittest.TestCase):
    def test_permissions_and_completion_pass(self):
        r=TestClient(app).post('/api/verify',json=model())
        self.assertEqual(r.status_code,200,r.text)
        d=r.json();self.assertEqual(d['result'],'TLC: PASSED',d['tlc_output'])
        self.assertTrue(d['safety_satisfied']);self.assertEqual(d['statistics']['distinct_states'],9)
        self.assertFalse(any('TLC has not been run' in w or 'draft skeleton' in w for w in d['warnings']))
    def test_forbidden_request_counterexample(self):
        m=model();m['associations'].append({'id':'bad','source':'user','target':'manage'})
        d=TestClient(app).post('/api/verify',json=m).json()
        self.assertEqual(d['result'],'TLC: VIOLATED',d['tlc_output'])
        self.assertFalse(d['safety_satisfied']);self.assertTrue(d['trace'])
    def test_no_fairness_can_fail_completion(self):
        m=model();m['weak_fairness']=False
        d=TestClient(app).post('/api/verify',json=m).json()
        self.assertEqual(d['result'],'TLC: VIOLATED',d['tlc_output'])
    def test_safety_only_without_fairness(self):
        m=model();m['weak_fairness']=False;m['verify_completion']=False
        d=TestClient(app).post('/api/verify',json=m).json()
        self.assertEqual(d['result'],'TLC: PASSED',d['tlc_output'])
