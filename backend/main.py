from pathlib import Path
from io import BytesIO
from zipfile import ZipFile, ZIP_DEFLATED
import json
import re

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from models import UMLModel, ConversionResponse
from converter import generate_tla, generate_python
from analysis import analyze, validate_model, graph_tla

app = FastAPI(title="UML2TLA+ Five Diagram Backend", version="4.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"
ASSETS_DIR = FRONTEND_DIST / "assets"


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "UML2TLA+ five diagram backend", "version": app.version, "analysis": "structural", "tlc_available": False}


@app.post("/api/convert", response_model=ConversionResponse)
def convert(model: UMLModel):
    nodes, edges = validate_model(model)
    tla = generate_tla(model)
    cfg, mapping, module = "", [], ""
    if model.diagram_type in ("state_machine", "activity"):
        tla, cfg, mapping, module = graph_tla(model, nodes, edges)
    python_code = generate_python(model)
    trace, statistics, properties, safety, warnings = analyze(model)
    return ConversionResponse(
        diagram_type=model.diagram_type,
        tla=tla,
        python_code=python_code,
        trace=trace,
        statistics=statistics,
        properties=properties,
        safety_satisfied=safety,
        result="Structural analysis completed. Temporal safety has not been checked.",
        verification_kind="structural", cfg=cfg, module_name=module, traceability=mapping,
        warnings=warnings,
    )


@app.post("/api/export")
def export_project(model: UMLModel):
    result = convert(model)
    stem = re.sub(r"[^A-Za-z0-9_-]", "_", model.name).strip("_")[:80] or "Model"
    buffer = BytesIO()
    with ZipFile(buffer, "w", ZIP_DEFLATED) as archive:
        archive.writestr("project.json", json.dumps({"schema_version": 2, "model": model.model_dump()}, indent=2))
        archive.writestr((result.module_name or stem) + ".tla", result.tla)
        archive.writestr(stem + ".py", result.python_code)
        archive.writestr("analysis.json", result.model_dump_json(indent=2))
        archive.writestr("traceability.json", json.dumps(result.traceability, indent=2))
        if result.cfg:
            archive.writestr(result.module_name + ".cfg", result.cfg)
        archive.writestr("README.txt", "UML2TLA+ v4 project export\n\nAnalysis is structural only. TLC has not been run.\nRead analysis.json for warnings and scope.\nGraph modules ignore guard labels and concurrency.\nPython is a prototype, not proved equivalent to TLA+.\nOther diagram TLA+ outputs are draft skeletons.\n")
    return Response(buffer.getvalue(), media_type="application/zip", headers={"Content-Disposition": f'attachment; filename="{stem}_project.zip"'})


if ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")


@app.get("/{full_path:path}")
def serve_frontend(full_path: str):
    index_file = FRONTEND_DIST / "index.html"
    requested_file = (FRONTEND_DIST / full_path).resolve()
    if not requested_file.is_relative_to(FRONTEND_DIST.resolve()) or full_path.startswith("api/"):
        raise HTTPException(404, "File not found")

    if full_path and requested_file.exists() and requested_file.is_file():
        return FileResponse(requested_file)

    if index_file.exists():
        return FileResponse(index_file)

    return {
        "status": "ok",
        "service": "UML2TLA+ five diagram backend",
        "message": "Frontend build not found. Run: cd frontend && npm install && npm run build",
    }
