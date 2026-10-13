"""Finite boolean state-machine semantics and isolated TLC execution."""
import ast
import json
import os
import re
import shutil
import subprocess
import tempfile
import threading
from pathlib import Path
from time import perf_counter
from fastapi import HTTPException
from analysis import validate_model
from converter import clean_name

RUN_SLOT = threading.BoundedSemaphore(1)
DEFAULT_JAR = Path(__file__).resolve().parent / 'tools' / 'tla2tools.jar'


def jar_path():
    return Path(os.environ.get('TLC_JAR', str(DEFAULT_JAR))).resolve()


def available():
    return jar_path().is_file() and shutil.which('java') is not None


def expression(text, variables, ids):
    """Parse a small typed expression language without evaluating client code."""
    if len(text) > 2000:
        raise ValueError('Expression is too long.')
    tree = ast.parse(text or 'True', mode='eval')
    def emit(node):
        if isinstance(node, ast.Constant):
            if isinstance(node.value, bool): return ('TRUE' if node.value else 'FALSE'), 'bool'
            if isinstance(node.value, str) and node.value in ids: return json.dumps(node.value), 'state'
        if isinstance(node, ast.Name):
            if node.id in variables: return node.id, 'bool'
            if node.id == 'pc': return 'pc', 'state'
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.Not):
            value, kind = emit(node.operand)
            if kind == 'bool': return f'~({value})', 'bool'
        if isinstance(node, ast.BoolOp):
            values = [emit(v) for v in node.values]
            if all(t == 'bool' for _, t in values):
                op = ' /\\ ' if isinstance(node.op, ast.And) else ' \\/ '
                return '(' + op.join(v for v, _ in values) + ')', 'bool'
        if isinstance(node, ast.Compare) and len(node.ops) == 1 and isinstance(node.ops[0], (ast.Eq, ast.NotEq)):
            left, lt = emit(node.left); right, rt = emit(node.comparators[0])
            if lt == rt:
                op = '=' if isinstance(node.ops[0], ast.Eq) else '#'
                return f'({left} {op} {right})', 'bool'
        raise ValueError('Use boolean variables, pc, state IDs in quotes, True/False, and/or/not, == and != only.')
    result, kind = emit(tree.body)
    if kind != 'bool': raise ValueError('Expression must be boolean.')
    return result


def build_spec(model):
    nodes, edges = validate_model(model)
    if model.diagram_type != 'state_machine':
        raise HTTPException(422, 'TLC behavioral verification currently supports state machines only.')
    if not model.verification_safety.strip() and not model.response_condition.strip():
        raise HTTPException(422, 'Enter a safety invariant or response condition before TLC verification.')
    variables = model.verification_variables
    if len(variables) > 8 or len(nodes) > 100 or len(edges) > 500:
        raise HTTPException(422, 'TLC limit: 8 boolean variables, 100 nodes, 500 transitions.')
    if any(not re.fullmatch(r'[a-z][A-Za-z0-9_]*', name) or name in {'pc', 'vars', 'Init', 'Next', 'Spec', 'TRUE', 'FALSE'} for name in variables):
        raise HTTPException(422, 'Boolean variable names must start with a lowercase letter and cannot be reserved.')
    ids = {n.id for n in nodes}
    root = next((n for n in nodes if n.type == 'initial'), nodes[0])
    module = 'Model_' + clean_name(model.name, 'Model') + '_Behavior'
    all_vars = ['pc'] + list(variables)
    tuple_vars = '<<' + ', '.join(all_vars) + '>>'
    defs, mapping = [], []
    try:
        safety = expression(model.verification_safety, variables, ids) if model.verification_safety.strip() else None
        condition = expression(model.response_condition, variables, ids) if model.response_condition.strip() else None
        if condition and model.response_target not in ids:
            raise ValueError('Response target must be an existing state ID.')
        for index, edge in enumerate(edges):
            if any(name not in variables for name in edge.updates):
                raise ValueError(f'Transition {edge.id} updates an undeclared boolean variable.')
            guard = expression(edge.guard, variables, ids)
            clauses = [f'pc = {json.dumps(edge.source)}', guard, f"pc' = {json.dumps(edge.target)}"]
            clauses += [f"{name}' = {'TRUE' if edge.updates[name] else 'FALSE'}" if name in edge.updates else f"{name}' = {name}" for name in variables]
            op = f'Edge_{index}'
            defs.append(op + ' ==\n    /\\ ' + '\n    /\\ '.join(clauses))
            mapping.append({'uml_id': edge.id, 'operator': op, 'guard': edge.guard, 'updates': edge.updates, 'source': edge.source, 'target': edge.target})
    except (ValueError, SyntaxError, RecursionError) as exc:
        raise HTTPException(422, str(exc)) from exc
    finals = [n.id for n in nodes if n.type == 'final']
    if finals:
        defs.append('Terminal == /\\ pc \\in {' + ', '.join(json.dumps(x) for x in finals) + '}\n            /\\ UNCHANGED vars')
    ops = [m['operator'] for m in mapping] + (['Terminal'] if finals else [])
    init = [f'pc = {json.dumps(root.id)}'] + [f"{name} = {'TRUE' if value else 'FALSE'}" for name, value in variables.items()]
    type_checks = ['pc \\in Nodes'] + [f'{name} \\in BOOLEAN' for name in variables]
    fairness = ''.join(f' /\\ WF_vars({m["operator"]})' for m in mapping) if model.weak_fairness else ''
    text = f'---- MODULE {module} ----\nEXTENDS TLC\nVARIABLES ' + ', '.join(all_vars) + '\nvars == ' + tuple_vars + '\nNodes == {' + ', '.join(json.dumps(n.id) for n in nodes) + '}\nInit == /\\ ' + '\n        /\\ '.join(init) + '\n' + '\n'.join(defs) + '\nNext == ' + (' \\/ '.join(ops) or 'FALSE') + '\nTypeInvariant == /\\ ' + '\n                 /\\ '.join(type_checks) + '\nSpec == Init /\\ [][Next]_vars' + fairness + '\n'
    cfg = 'SPECIFICATION Spec\nINVARIANT TypeInvariant\n'
    props = ['TypeInvariant']
    if safety:
        text += 'Safety == ' + safety + '\n'; cfg += 'INVARIANT Safety\n'; props.append('Safety')
    if condition:
        text += f'Response == {condition} ~> (pc = {json.dumps(model.response_target)})\n'; cfg += 'PROPERTY Response\n'; props.append('Response')
    text += '====\n'
    return text, cfg, mapping, module, props


def parse_output(output, code, timed_out=False):
    if timed_out: status = 'INCOMPLETE'
    elif re.search(r'Invariant .+ is violated|Temporal properties were violated|Deadlock reached', output): status = 'VIOLATED'
    elif code == 0 and 'Model checking completed. No error has been found.' in output: status = 'PASSED'
    else: status = 'ERROR'
    counts = re.search(r'([\d,]+) states generated, ([\d,]+) distinct states found, ([\d,]+) states left on queue', output)
    stats = {'result': status, 'complete': status == 'PASSED', 'engine': 'TLC'}
    if counts:
        stats.update(states_generated=int(counts[1].replace(',', '')), distinct_states=int(counts[2].replace(',', '')), states_left=int(counts[3].replace(',', '')))
    trace = []
    for match in re.finditer(r'^State (\d+): ([^\n]*)\n(.*?)(?=^State \d+:|^\d[\d,]* states generated|^Finished|\Z)', output, re.M | re.S):
        assignments = dict(re.findall(r'^/\\ (\w+) = ([^\n]+)', match[3], re.M))
        trace.append({'step': int(match[1]), 'action': match[2], 'values': assignments})
    return status, stats, trace


def verify(model):
    tla, cfg, mapping, module, prop_names = build_spec(model)
    if not available():
        raise HTTPException(503, 'TLC unavailable. Install Java and run python backend/install_tlc.py, or set TLC_JAR.')
    if not RUN_SLOT.acquire(blocking=False):
        raise HTTPException(429, 'A TLC run is already active. Please retry shortly.')
    start = perf_counter()
    limit = min(max(int(os.environ.get('TLC_TIMEOUT', '20')), 1), 120)
    timed_out = False
    try:
        with tempfile.TemporaryDirectory(prefix='uml2tla-tlc-') as work:
            Path(work, module + '.tla').write_text(tla)
            Path(work, module + '.cfg').write_text(cfg)
            with tempfile.TemporaryFile(mode='w+b') as log:
                proc = subprocess.Popen(['java', '-Xmx256m', '-XX:+UseParallelGC', '-jar', str(jar_path()), '-workers', '1', '-config', module + '.cfg', module + '.tla'], cwd=work, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
                try:
                    code = proc.wait(timeout=limit)
                except subprocess.TimeoutExpired:
                    timed_out = True; proc.kill(); code = proc.wait()
                log.seek(0); output = log.read(2_000_000).decode('utf-8', errors='replace')
    except OSError as exc:
        raise HTTPException(503, 'Unable to start Java/TLC.') from exc
    finally:
        RUN_SLOT.release()
    status, stats, trace = parse_output(output, code, timed_out)
    for row in trace:
        edge = next((m for m in mapping if re.search(r'\b' + re.escape(m['operator']) + r'\b', row['action'])), None)
        if edge: row['uml_id'] = edge['uml_id']
    loop = re.search(r'Back to state (\d+)', output)
    if loop: trace.append({'action': 'lasso_loop', 'loop_to_step': int(loop[1])})
    stats.update(time_taken=f'{perf_counter() - start:.3f} sec', timeout_seconds=limit, memory_mb=256, exit_code=code)
    violated = re.search(r'Invariant (\w+) is violated', output)
    props = [{'name': name, 'status': 'PASSED' if status == 'PASSED' else 'VIOLATED' if (violated and violated[1] == name) or (name == 'Response' and 'Temporal properties were violated' in output) else 'NOT_COMPLETED'} for name in prop_names]
    warnings = ['Results apply to this finite boolean state-machine model, not to the generated Python implementation.', 'Labels are annotations. Only explicit guards and boolean updates affect behavior.', 'Weak fairness is assumed for every transition.' if model.weak_fairness else 'No fairness is assumed. Infinite stuttering may violate response properties.']
    if not any(node.type == 'initial' for node in model.states):
        warnings.append('No initial node: the first listed state is the initial control location.')
    return {'diagram_type': model.diagram_type, 'tla': tla, 'cfg': cfg, 'module_name': module, 'traceability': mapping, 'trace': trace, 'statistics': stats, 'properties': props, 'safety_satisfied': True if status == 'PASSED' and model.verification_safety.strip() else False if violated and violated[1] == 'Safety' else None, 'result': f'TLC: {status}', 'verification_kind': 'tlc', 'warnings': warnings, 'tlc_output': output, 'tlc_version': next((line for line in output.splitlines() if line.startswith('TLC')), ''), 'python_code': ''}
