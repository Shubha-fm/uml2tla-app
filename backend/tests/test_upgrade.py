import ast
import unittest
from fastapi.testclient import TestClient
from main import app
from models import UMLModel
from converter import generate_python

class UpgradeTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.model = {'name':'Safety', 'diagram_type':'state_machine', 'states':[{'id':'i','name':'start','type':'initial'},{'id':'a','name':'Cruise'},{'id':'b','name':'Stop'},{'id':'z','name':'end','type':'final'},{'id':'u','name':'Unreachable'}], 'transitions':[{'id':'e0','source':'i','target':'a'},{'id':'e1','source':'a','target':'b','label':'hazard_detected'},{'id':'e2','source':'b','target':'z'}]}
    def test_measured_graph_and_export(self):
        r=self.client.post('/api/convert',json=self.model)
        self.assertEqual(r.status_code,200,r.text)
        data=r.json()
        self.assertIsNone(data['safety_satisfied'])
        self.assertEqual(data['statistics']['states_explored'],4)
        self.assertEqual(data['statistics']['result'],'STRUCTURAL_ONLY')
        self.assertEqual(data['properties'][-1]['status'],'NOT_CHECKED')
        self.assertIn('UnreachableNodes: Unreachable',data['warnings'])
        self.assertIn('pc\' = "z"',data['tla'])
        self.assertEqual(len(data['traceability']),3)
        self.assertIn('INVARIANT TypeInvariant',data['cfg'])
        self.assertEqual(data['trace'][3]['path'],['e0','e1','e2'])
    def test_invalid_references(self):
        self.model['transitions'][0]['target']='missing'
        self.assertEqual(self.client.post('/api/convert',json=self.model).status_code,422)
    def test_duplicate_ids(self):
        self.model['states'][1]['id']='i'
        self.assertEqual(self.client.post('/api/convert',json=self.model).status_code,422)
    def test_unknown_diagram_and_empty(self):
        for payload in [{'diagram_type':'invalid'}, {'diagram_type':'state_machine'}]:
            self.assertEqual(self.client.post('/api/convert',json=payload).status_code,422)
    def test_sequence_order_validation(self):
        payload={'diagram_type':'sequence','lifelines':[{'id':'a','name':'Actor'}], 'messages':[{'id':'e1','source':'a','target':'a','order':0},{'id':'e2','source':'a','target':'a','order':0}]}
        self.assertEqual(self.client.post('/api/convert',json=payload).status_code,422)
    def test_all_diagrams_and_python_escaping(self):
        for kind,collection in [('class','classes'),('sequence','lifelines'),('use_case','actors'),('activity','actions')]:
            payload={'name':'Demo','diagram_type':kind,collection:[{'id':'a','name':'Line\n"Quoted"\\Name'}]}
            r=self.client.post('/api/convert',json=payload)
            self.assertEqual(r.status_code,200,r.text)
            ast.parse(r.json()['python_code'])
    def test_api_unknown_does_not_return_html(self):
        self.assertEqual(self.client.get('/api/missing').status_code,404)
    def test_dead_end(self):
        self.model['transitions']=self.model['transitions'][:2]
        data=self.client.post('/api/convert',json=self.model).json()
        self.assertIn('NonFinalDeadEnds: Stop',data['warnings'])

if __name__=='__main__': unittest.main()
