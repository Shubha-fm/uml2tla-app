from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from models import UMLModel, ConversionResponse
from converter import generate_tla, generate_python, verify_model

app = FastAPI(title="UML2TLA+ Five Diagram Backend", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"
ASSETS_DIR = FRONTEND_DIST / "assets"


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "UML2TLA+ five diagram backend"}


@app.post("/api/convert", response_model=ConversionResponse)
def convert(model: UMLModel):
    tla = generate_tla(model)
    python_code = generate_python(model)
    trace, statistics, properties, safety, warnings = verify_model(model)
    return ConversionResponse(
        diagram_type=model.diagram_type,
        tla=tla,
        python_code=python_code,
        trace=trace,
        statistics=statistics,
        properties=properties,
        safety_satisfied=safety,
        result="The specification is valid." if safety else "The specification violates a checked property.",
        warnings=warnings,
    )


if ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")


@app.get("/{full_path:path}")
def serve_frontend(full_path: str):
    index_file = FRONTEND_DIST / "index.html"
    requested_file = FRONTEND_DIST / full_path

    if full_path and requested_file.exists() and requested_file.is_file():
        return FileResponse(requested_file)

    if index_file.exists():
        return FileResponse(index_file)

    return {
        "status": "ok",
        "service": "UML2TLA+ five diagram backend",
        "message": "Frontend build not found. Run: cd frontend && npm install && npm run build",
    }
