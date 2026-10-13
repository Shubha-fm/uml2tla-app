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

## Version 4.1: real TLC model checking

State machines now have a separate **Verify with TLC** workflow. The structural conversion workflow remains available for all five diagrams.

### Local installation

Install Java 17 or later. Then install the pinned official TLC v1.7.4 release (TLC 2.19), validated against the publisher's checksum:

```bash
python backend/install_tlc.py
```

Start the backend and frontend using the commands above. `/api/health` reports `tlc_available`. Set `TLC_JAR` to use another local tool path. The Dockerfile installs Java and TLC automatically. `render.yaml` now selects Docker deployment; an existing native Python service may need to be recreated as a Docker service.

### State-machine verification inputs

- Declare up to eight boolean variables with initial values, for example `{"hazard": false}`.
- Enter a guard for each edge, for example `hazard and pc == "slow"`.
- Enter boolean updates for each edge, for example `{"hazard": true}`. Unmentioned variables remain unchanged.
- Enter a safety expression such as `not hazard or pc != "cruise"`.
- Optionally enter a response condition such as `hazard` and choose target ID `stop`. TLC checks `hazard ~> (pc = "stop")`.
- Optionally assume weak fairness for every edge. This is an explicit modeling assumption; it must match the intended system. Without fairness, permitted infinite stuttering can violate progress properties.

Expressions support declared boolean variables, `pc`, quoted existing node IDs, `True`, `False`, `and`, `or`, `not`, `==`, and `!=`. Calls, attribute access and arbitrary TLA+/Python code are rejected. Display labels and the older Safety Property text do not define verification semantics. Explicit verification fields do.

TLC checks the finite model with one worker, a 256 MB Java heap, and a default 20-second timeout (server setting `TLC_TIMEOUT`, capped at 120 seconds). There is one active run per backend process. Final nodes have explicit terminal stuttering; other dead ends are checked. The backend runs generated files in isolated temporary directories without a shell and removes them afterward.

Results are `PASSED`, `VIOLATED`, `ERROR`, or `INCOMPLETE`. A successful run requires TLC's completion message and a successful exit. Timeouts never pass. Reports include tool version, raw log, measured counts, assumptions and counterexample states; edge IDs and lasso loop targets are included when available. Download the TLC report to retain the exact specification/configuration and run evidence. Complete ZIP exports include behavioral files when properties are configured, but exporting does not run TLC.

The default vehicle example may violate its response property because hazard-clearing branches compete with stopping. This is a real model result, not a tool error. Run safety alone by clearing the response condition, or revise the model to encode the intended response guarantee.

TLC verifies the finite boolean abstraction. It does not prove the UML mapping correct, prove generated Python equivalent, or provide a TLAPS deductive proof. Activity, class, sequence and use-case diagrams continue to use structural analysis only.

### Deployment with Java and TLC

```bash
docker build -t uml2tla .
docker run --rm -p 8000:8000 uml2tla
```

Open `http://localhost:8000`. For automated checks, install development dependencies and TLC, then run the regression command above. CI installs Java/TLC and runs the integration tests, including actual passing and violating models.

For a quick demonstration, open the state-machine editor, load the passing or violating TLC example, then click **Verify with TLC**. Equivalent importable JSON examples are in `examples/`. The Docker deployment CI builds the full image and checks health, frontend delivery, and real passing/violating API requests.
