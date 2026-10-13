"""Measured structural diagnostics; no temporal proof is claimed."""
from collections import deque
from time import perf_counter
from fastapi import HTTPException
import json

GROUPS = {'state_machine': (('states',), 'transitions'), 'activity': (('actions',), 'flows'), 'sequence': (('lifelines',), 'messages'), 'class': (('classes',), 'relationships'), 'use_case': (('actors', 'use_cases'), 'associations')}


def validate_model(model):
    if model.diagram_type not in GROUPS:
        raise HTTPException(422, 'Unsupported diagram type.')
    groups, edge_group = GROUPS[model.diagram_type]
    nodes = [n for group in groups for n in getattr(model, group)]
    edges = getattr(model, edge_group)
    errors = []
    if not nodes:
        errors.append('Add at least one node.')
    if len(nodes) > 1000 or len(edges) > 5000:
        errors.append('Limit: 1000 nodes and 5000 edges.')
    for collection in (nodes, edges):
        ids = [x.id for x in collection]
        if any(not x.strip() for x in ids) or len(ids) != len(set(ids)):
            errors.append('IDs must be nonempty and unique within each collection.')
    if any(not n.id.isascii() or any(ord(ch) < 32 for ch in n.id) for n in nodes):
        errors.append("Node IDs must use printable ASCII characters; display names can use Unicode.")
    ids = {n.id for n in nodes}
    if any(not n.name.strip() for n in nodes):
        errors.append('Node names cannot be empty.')
    for e in edges:
        if e.source not in ids or e.target not in ids:
            errors.append(f'Edge {e.id} refers to a missing node.')
    if model.diagram_type == 'use_case':
        actors, cases = {n.id for n in model.actors}, {n.id for n in model.use_cases}
        if any(e.source not in actors or e.target not in cases for e in edges):
            errors.append('Associations must connect an actor to a use case.')
    if model.diagram_type == 'sequence':
        orders = [e.order for e in edges]
        if len(orders) != len(set(orders)) or any(o < 0 for o in orders):
            errors.append('Message orders must be unique nonnegative integers.')
    if model.diagram_type in ('state_machine', 'activity'):
        allowed = {'initial', 'state', 'final'} if model.diagram_type == 'state_machine' else {'initial', 'action', 'decision', 'fork', 'join', 'final'}
        types = {n.id: n.type for n in nodes}
        initials = [n for n in nodes if n.type == 'initial']
        if any(n.type not in allowed for n in nodes):
            errors.append('Unsupported node type.')
        if len(initials) > 1:
            errors.append('Only one initial node is supported.')
        if not any(n.type not in ('initial', 'final') for n in nodes):
            errors.append('Add at least one executable node.')
        if any(types.get(e.source) == 'final' or types.get(e.target) == 'initial' for e in edges):
            errors.append('Final nodes cannot have outgoing edges; initial nodes cannot have incoming edges.')
        if initials and sum(e.source == initials[0].id for e in edges) != 1:
            errors.append('The initial node needs exactly one outgoing edge.')
    if errors:
        raise HTTPException(422, errors)
    return nodes, edges


def analyze(model):
    start = perf_counter()
    nodes, edges = validate_model(model)
    warnings = ['Structural checks only. Guards, concurrency, fairness and temporal safety are not verified. TLC has not been run.', 'Generated Python is a prototype and is not proved equivalent to the TLA+ output.']
    trace, reached = [], set()
    props = [{'name': 'References', 'status': 'PASSED', 'description': 'All edge endpoints exist.'}]
    if model.diagram_type in ('state_machine', 'activity'):
        root = next((n for n in nodes if n.type == 'initial'), nodes[0])
        if root.type != 'initial':
            warnings.append('No initial node: traversal starts at the first node.')
        outgoing = {n.id: [] for n in nodes}
        names = {n.id: n.name for n in nodes}
        for e in edges:
            outgoing[e.source].append(e)
        queue = deque([(root.id, [])])
        reached.add(root.id)
        while queue:
            current, path = queue.popleft()
            trace.append({'step': len(trace), 'node_id': current, 'node': names[current], 'path': path, 'action': 'structural_reachability'})
            for e in outgoing[current]:
                if e.target not in reached:
                    reached.add(e.target)
                    queue.append((e.target, path + [e.id]))
        for title, values in [('UnreachableNodes', [n.name for n in nodes if n.id not in reached]), ('NonFinalDeadEnds', [n.name for n in nodes if n.id in reached and n.type != 'final' and not outgoing[n.id]])]:
            props.append({'name': title, 'status': 'WARNING' if values else 'PASSED', 'description': ', '.join(values) if values else 'None found.'})
            if values:
                warnings.append(title + ': ' + ', '.join(values))
        if any(n.type in ('fork', 'join') for n in nodes):
            warnings.append('Fork/join exports topology only; concurrent token semantics are not implemented.')
    else:
        warnings.append('TLA+ output for this diagram is a draft skeleton and requires manual semantic review before checking.')
        for e in sorted(edges, key=lambda e: getattr(e, 'order', 0)):
            trace.append({'step': len(trace), 'edge_id': e.id, 'source': e.source, 'target': e.target, 'label': e.label, 'action': 'structural_inventory'})
    props.append({'name': 'TemporalSafety', 'status': 'NOT_CHECKED', 'description': 'The safety expression requires a formal checker and explicit semantic mapping.'})
    stats = {'nodes': len(nodes), 'edges': len(edges), 'states_explored': len(reached), 'distinct_states': len(reached), 'transitions': len(edges), 'time_taken': f'{perf_counter() - start:.6f} sec', 'result': 'STRUCTURAL_ONLY', 'engine': 'graph traversal', 'complete': False}
    return trace, stats, props, None, warnings


def graph_tla(model, nodes, edges):
    from converter import clean_name
    q = lambda v: json.dumps(v, ensure_ascii=True)
    root = next((n for n in nodes if n.type == 'initial'), nodes[0])
    module = clean_name(model.name, 'Model') + '_Graph'
    actions, mapping = [], []
    for i, e in enumerate(edges):
        op = f'Edge_{i}'
        actions.append(f'{op} == /\\ pc = {q(e.source)}\n           /\\ pc\' = {q(e.target)}')
        mapping.append({'uml_id': e.id, 'kind': 'edge', 'operator': op, 'source': e.source, 'target': e.target, 'label': e.label})
    text = f'---- MODULE {module} ----\nEXTENDS TLC\n\\* Structural abstraction: labels are annotations, not guards.\nVARIABLE pc\nNodes == ' + '{' + ', '.join(q(n.id) for n in nodes) + '}\n' + f'Init == pc = {q(root.id)}\n' + '\n'.join(actions) + '\nNext == ' + (' \\/ '.join(f'Edge_{i}' for i in range(len(edges))) or 'FALSE') + '\nTypeInvariant == pc \\in Nodes\nSpec == Init /\\ [][Next]_pc\n====\n'
    return text, 'SPECIFICATION Spec\nINVARIANT TypeInvariant\nCHECK_DEADLOCK FALSE\n', mapping, module
