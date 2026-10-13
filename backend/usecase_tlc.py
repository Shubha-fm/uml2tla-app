"""Finite request/completion abstraction for actor-use-case associations."""
import json
from fastapi import HTTPException
from analysis import validate_model
from converter import clean_name


def build_usecase(model):
    validate_model(model)
    actors, cases = {a.id for a in model.actors}, {u.id for u in model.use_cases}
    if not actors or not cases:
        raise HTTPException(422, 'Use-case verification needs at least one actor and one use case.')
    pairs = list(dict.fromkeys((e.source, e.target) for e in model.associations))
    if len(pairs) > 10 or len(actors) > 20 or len(cases) > 20:
        raise HTTPException(422, 'Use-case TLC limit: 10 distinct associations, 20 actors, 20 use cases.')
    forbidden = [(p.source, p.target) for p in model.forbidden_requests]
    if any(a not in actors or u not in cases for a, u in forbidden):
        raise HTTPException(422, 'Forbidden requests must name existing actor and use-case IDs.')
    q = lambda x: json.dumps(x, ensure_ascii=True)
    pair = lambda p: '<<' + q(p[0]) + ', ' + q(p[1]) + '>>'
    set_of = lambda values: '{' + ', '.join(values) + '}'
    module = 'Model_' + clean_name(model.name, 'Model') + '_UseCaseBehavior'
    defs, ops, mapping = [], [], []
    for index, p in enumerate(pairs):
        request, complete = f'Request_{index}', f'Complete_{index}'
        value = pair(p)
        defs += [f'{request} == /\\ {value} \\notin requested\n              /\\ requested\' = requested \\cup {{{value}}}\n              /\\ UNCHANGED completed', f'{complete} == /\\ {value} \\in requested /\\ {value} \\notin completed\n               /\\ completed\' = completed \\cup {{{value}}}\n               /\\ UNCHANGED requested']
        ops += [request, complete]
        for e in model.associations:
            if (e.source, e.target) == p:
                mapping.append({'uml_id': e.id, 'operator': request, 'completion_operator': complete, 'source': e.source, 'target': e.target})
    defs.append('Terminal == /\\ completed = Allowed\n            /\\ UNCHANGED vars')
    ops.append('Terminal')
    fairness = ''.join(f' /\\ WF_vars(Complete_{i})' for i in range(len(pairs))) if model.weak_fairness else ''
    text = f'---- MODULE {module} ----\nEXTENDS TLC\nVARIABLES requested, completed\nvars == <<requested, completed>>\nActors == ' + set_of(q(a.id) for a in model.actors) + '\nUseCases == ' + set_of(q(u.id) for u in model.use_cases) + '\nAllowed == ' + set_of(pair(p) for p in pairs) + '\nForbidden == ' + set_of(pair(p) for p in forbidden) + '\nInit == /\\ requested = {}\n        /\\ completed = {}\n' + '\n'.join(defs) + '\nNext == ' + ' \\/ '.join(ops) + '\nTypeInvariant == /\\ requested \\subseteq (Actors \\X UseCases)\n                 /\\ completed \\subseteq (Actors \\X UseCases)\nPermissionInvariant == requested \\subseteq Allowed\nCompletionInvariant == completed \\subseteq requested\nSafety == requested \\cap Forbidden = {}\nSpec == Init /\\ [][Next]_vars' + fairness + '\n'
    cfg = 'SPECIFICATION Spec\nINVARIANT TypeInvariant\nINVARIANT PermissionInvariant\nINVARIANT CompletionInvariant\nINVARIANT Safety\n'
    props = ['TypeInvariant', 'PermissionInvariant', 'CompletionInvariant', 'Safety']
    if model.verify_completion:
        text += 'Response == ' + (' /\\ '.join(f'(({pair(p)} \\in requested) ~> ({pair(p)} \\in completed))' for p in pairs) or 'TRUE') + '\n'
        cfg += 'PROPERTY Response\n';props.append('Response')
    text += '====\n'
    return text, cfg, mapping, module, props
