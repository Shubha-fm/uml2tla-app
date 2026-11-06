"""Generate executable pytest checks for exported Python prototypes.

These are implementation smoke/contract tests, not a proof of semantic
equivalence to TLA+ or a substitute for TLC model checking.
"""
from converter import clean_name


def generate_pytest(model, stem):
    kind = model.diagram_type
    base = clean_name(model.name, "GeneratedModel")
    class_name = {
        "use_case": base + "UseCase",
        "class": base + "ClassModel",
        "sequence": base + "Sequence",
        "activity": base + "Activity",
        "state_machine": base,
    }[kind]

    header = f'''"""Generated FormiPy implementation checks.

Run: python -m pytest -q
These tests exercise Python behavior only; they do not establish
equivalence with TLA+ or replace independent TLC verification.
"""
import importlib.util
from pathlib import Path
import pytest

SOURCE = Path(__file__).resolve().parents[1] / {stem + ".py"!r}
spec = importlib.util.spec_from_file_location("formipy_generated", SOURCE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
GeneratedModel = getattr(module, {class_name!r})


def test_construct_and_report_state():
    instance = GeneratedModel()
    assert isinstance(instance.state(), dict)
'''

    if kind == "state_machine":
        return header + '''

def test_default_state_is_safe():
    instance = GeneratedModel()
    assert instance.check_safety() is True
    assert instance.timer == 0


def test_step_increments_timer():
    instance = GeneratedModel()
    instance.step()
    assert instance.timer == 1


def test_unsafe_cruise_is_detected_when_reached():
    instance = GeneratedModel()
    instance.mode = "Cruise"
    instance.hazard = True
    assert instance.check_safety() is False
'''

    if kind == "use_case":
        assoc = [(a.source, a.target) for a in model.associations]
        actors = {a.id: a.name for a in model.actors}
        cases = {u.id: u.name for u in model.use_cases}
        allowed = next(((actors[x], cases[y]) for x, y in assoc
                        if x in actors and y in cases), None)
        body = '''

def test_completion_requires_prior_request():
    instance = GeneratedModel()
    with pytest.raises(ValueError):
        instance.complete("__unknown_actor__", "__unknown_use_case__")


def test_unauthorized_request_is_rejected():
    instance = GeneratedModel()
    with pytest.raises(ValueError):
        instance.request("__unknown_actor__", "__unknown_use_case__")
'''
        if allowed:
            body += f'''

def test_allowed_request_then_completion():
    instance = GeneratedModel()
    pair = {allowed!r}
    instance.request(*pair)
    instance.complete(*pair)
    assert pair in instance.requested
    assert pair in instance.completed
    assert instance.check_safety() is True
'''
        return header + body

    if kind == "class":
        return header + '''

def test_unknown_class_is_rejected():
    instance = GeneratedModel()
    with pytest.raises(ValueError):
        instance.create_object("object_1", "__nonexistent_class__")


def test_relation_requires_existing_objects():
    instance = GeneratedModel()
    with pytest.raises(ValueError):
        instance.add_relation("missing_1", "missing_2")
'''

    if kind == "sequence":
        return header + '''

def test_message_sequence_matches_declared_order():
    instance = GeneratedModel()
    expected = list(instance.messages)
    assert instance.run() == expected
    assert instance.check_order() is True
    assert instance.next_message() is None
'''

    return header + '''

def test_activity_starts_with_no_completed_actions():
    instance = GeneratedModel()
    assert not instance.completed
    assert "pc" in instance.state()


def test_unmatched_decision_does_not_corrupt_state():
    instance = GeneratedModel()
    before = instance.pc
    instance.step(decision="__no_such_decision__")
    assert isinstance(instance.pc, str)
'''
