# SoftwareX reproducible evaluation: FormiPy v1.0.1

**Frozen software tag:** [v1.0.1](https://github.com/Shubha-fm/uml2tla-app/releases/tag/v1.0.1)  
**Source commit:** `a8d1e8bebd458c4e1414992bd440cf32fc98c0bd`  
**Passed evaluation:** [GitHub Actions run 38610889599](https://github.com/Shubha-fm/uml2tla-app/actions/runs/38610889599)  
**Download input/output evidence:** [FormiPy_Research_Evidence_v1.0.1](https://github.com/Shubha-fm/uml2tla-app/actions/runs/38610889599/artifacts/11917338257)

The dedicated study performed the following checks successfully:
- Four actual TLC verification examples, covering expected safe and violating state-machine/use-case outcomes.
- Five representative structural UML conversion examples (one per diagram type).
- Eighteen **new**, generated structural UML conversion cases. They are **not** the original 18 unpublished manuscript cases.
- Fifty observed structural API latency measurements, ten runs at each model size.
- Thirty-two concurrent structural API requests, all successful.
- Four malformed or unsupported input cases, all rejected.

## Structural conversion latency

Measurements are GitHub runner single-process FastAPI request timings for linear state-machine models and must not be treated as TLC state-space search runtimes.

| Nodes | Edges | Repetitions | Median latency (ms) |
|---:|---:|---:|---:|
| 5 | 4 | 10 | 2.2528 |
| 10 | 9 | 10 | 2.4931 |
| 20 | 19 | 10 | 2.8392 |
| 40 | 39 | 10 | 3.6650 |
| 80 | 79 | 10 | 5.7289 |

The full archive contains raw per-run measurements, input JSON, result JSON, generated TLA+/Python artifacts, TLC stdout, traceability files and a manifest with environment details. GitHub Actions artifact retention is limited: deposit this exact ZIP to Zenodo and link its own DOI once published.

**Scope and limitations:** No full Python/TLA+ equivalence proof, TLC scalability study, comprehensive security audit, or reproduction of previously unavailable historical experiments is claimed.
