# Deploy UML2TLA+ with TLC

Use the included Dockerfile to run the frontend, FastAPI, Java 17 and pinned TLC in one service.

## Render

Connect the existing repository and create a Docker Web Service, or deploy the supplied `render.yaml` Blueprint. An existing native Python service may need to be recreated as a Docker service. Use `/api/health` as the health endpoint. The response must show `tlc_available: true` to enable real checker runs.

The image installs TLC at build time with checksum validation. It listens on Render's `PORT` and supports `TLC_TIMEOUT` (20 seconds by default, maximum 120). The JVM heap is limited to 256 MB; the container needs additional memory for Python and JVM overhead.

## Local Docker

```bash
docker build -t uml2tla .
docker run --rm -p 8000:8000 uml2tla
```

Open http://localhost:8000.

## Local development

Install Java 17+, install backend requirements and run `python backend/install_tlc.py`. Start `uvicorn main:app --reload --port 8000` from `backend`, then `npm ci` and `npm run dev` from `frontend`. Open http://localhost:8080.

## Result scope

State-machine TLC checking uses explicit boolean variables, guards, updates and properties. Other diagrams use structural diagnostics. Read README.md for expression syntax, fairness assumptions, resource limits and counterexample reports.
