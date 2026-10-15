"""Alternative source-tree entry point for the FormiPy FastAPI application.

Usage from the repository root (after installing backend dependencies):
    uvicorn src.app:app --host 0.0.0.0 --port 8000

This compatibility entry point imports the existing, canonical backend
implementation without copying or changing its behavior. Production builds
continue using the existing backend/main.py entry point.
"""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from main import app  # noqa: E402,F401
