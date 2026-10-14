# FormiPy experiment and evidence archive

This directory is intentionally a **scaffold**, not a claim that experiments have run.

For each experiment, retain:

- The exact UML model request (`input.json`).
- Generated `*.tla`, `*.cfg`, `*.py` and traceability data.
- Unedited structural-analysis JSON or TLC stdout/stderr (as applicable).
- Tool versions, command used, commit SHA, and machine details.
- A short description of the property tested and the expected versus observed result.

Keep structural exploration and TLC verification results distinct. For TLC, use `/api/verify` with a supported state-machine or use-case input and confirm tool availability via `/api/health`.

Suggested names: `experiments/<case-id>/input.json`, `metadata.json`, `generated/`, `logs/`, `results.json`.

No numerical results or synthetic TLC logs have been added here. Populate this directory with real runs before manuscript submission.
