# UML2TLA+ Five Diagram Converter

This version supports conversion for all five UML diagram sections shown in the interface:

1. Use Case Diagram
2. Class Diagram
3. Sequence Diagram
4. Activity Diagram
5. State Machine Diagram

It generates:

- TLA+ specification
- Python code
- Structural analysis result
- Execution trace
- Downloadable `.tla`, `.py`, and project JSON files

## Run Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Test backend:

```text
http://localhost:8000
```

## Run Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:8080
```

## Important

The analysis module reports measured graph diagnostics. It does not invoke TLC or prove safety. See the version 4 interpretation below.


## One-link deployment

This package has been updated for deployment as a single public web app. See `DEPLOYMENT_GUIDE.md`. The frontend now uses the relative endpoint `/api/convert`, and FastAPI serves the frontend build from `frontend/dist`.

## Version 4 upgrade

- Measured structural traversal replaces simulated verification reports and fabricated counts.
- Detects unreachable nodes and reachable nonfinal dead ends. Traversal paths list UML edge IDs.
- Rejects dangling references, duplicate IDs, empty models, unsupported diagrams, invalid initial/final edges, and ambiguous sequence orders.
- State-machine and activity exports now use a finite topology abstraction, with unique edge operators, string node IDs, a matching `.cfg`, and traceability JSON. Download the `.tla` using its module filename and the matching config.
- Safe project import, recoverable local saving, undo/redo (Ctrl/Cmd+Z and Shift+Z), conversion timeout, server error reporting, and stale result protection.
- Development API proxy, mobile layout improvements, path containment for static files, and CI checks.
- Complete project ZIP download with source model, generated code, analysis report, config and traceability.

### Interpretation of results

`STRUCTURAL_ONLY` means the graph has been inspected. It does **not** mean that the system is safe or the TLA+ module has been model checked. `safety_satisfied` is null and temporal safety is `NOT_CHECKED`. Reachable graph nodes are counted by breadth-first traversal; the trace is a graph discovery record, not an execution under guards.

The state-machine/activity TLA+ export represents edges as nondeterministic moves. Labels are annotations, not executable guards. Fork/join token semantics, fairness, data updates, and the project safety expression require explicit formal modeling. The config checks graph node membership only and disables deadlock checking because final nodes are intentional terminals. TLC is not bundled or invoked by the API. Other diagram TLA+ exports remain draft skeletons needing manual review. Python exports remain prototypes and are not proved equivalent to the graph abstraction.

### Run regression checks

```bash
pip install -r backend/requirements-dev.txt
PYTHONPATH=backend python -m unittest discover -s backend/tests -v
cd frontend
npm install
npm run build
```
