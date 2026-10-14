# SoftwareX release and reproducibility guidance

Public application: https://uml2tla-app.onrender.com/  
Source repository: https://github.com/Shubha-fm/uml2tla-app

## Scope of implemented results
The `/api/convert` endpoint provides generated artifacts and structural analysis, **not** a TLC safety proof. The separate `/api/verify` endpoint runs TLC when Java and the TLC JAR are available. According to the current backend implementation, TLC verification covers **state-machine** and **use-case** diagrams; other diagram exports are not automatically model-checked. The generated Python is a prototype and is not formally proven equivalent to the TLA+ output. Record the exact model, configuration, version, environment, and complete output for any paper claim.

## Prepare a fixed research release
1. Confirm a suitable software license with all rights holders and dependencies; add a root `LICENSE` file. No license is selected by this documentation.
2. On a clean clone, install dependencies and run the automated checks listed below.
3. Test both a structural conversion and a TLC verification model. Confirm `/api/health` reports `tlc_available: true` for the TLC run.
4. Export input JSON, generated TLA+ and CFG files, Python output, and actual verifier logs. Include failing runs and limitations.
5. Record the exact commit SHA; create a release tag only after all checks pass. Consider archiving the release using Zenodo.
6. Point the SoftwareX manuscript to the immutable release URL, source repository, and live application.

## Regression checks
From the repository root:

```bash
python -m pip install -r backend/requirements-dev.txt
PYTHONPATH=backend python -m unittest discover -s backend/tests -v
cd frontend
npm ci
npm run build
```

For local TLC support (requires Java 17 or newer):

```bash
python backend/install_tlc.py
```

Do not report a result as independently reproduced until the relevant commands and model inputs were actually executed and their outputs archived.

## Paper evidence
The prior manuscript mentioned 18 validation scenarios and other measurements. These are **not verified by this document**. Include raw inputs, run logs, seeds where applicable, software versions, hardware details, and result-extraction scripts before making numerical claims.
