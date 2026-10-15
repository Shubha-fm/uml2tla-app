# FormiPy source directory

This directory provides a **non-breaking source entry point** for the
FormiPy/ UML2TLA+ web application.

## Source layout

- `src/app.py` — importable FastAPI application entry point.
- `../backend/` — canonical FastAPI API, diagram conversion, graph
  analysis, TLA+ generation, TLC verification, and Python generation source.
- `../frontend/` — canonical React application source.
- `../scripts/` — evaluation and reproducibility tools.
- `../examples/` — input models.
- `../docs/` — accompanying documentation.

The implementation remains in `backend/` and `frontend/` to preserve
existing Docker, Render, browser, CI, and evaluation workflows. This new
directory **does not claim to contain a full relocated copy of the code**.

## Run via src/

From the repository root, create the Python environment following
`README.md`, then run:

```sh
PYTHONPATH=backend python -m uvicorn src.app:app --reload --port 8000
```

The frontend still runs from `frontend/` as described in `README.md`.
TLC checks require Java and the official TLC jar as documented there.

## Release provenance

The frozen `v1.0.1` tag and Zenodo release archive remain unchanged.
This entry point belongs to a later commit. A new release and updated
permanent archive are needed if a SoftwareX submission requires
the source tree and license to exist in the **cited release** itself.
