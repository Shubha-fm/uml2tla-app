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
- Verification-style result
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

The verification module is a lightweight bounded verification engine for the web prototype.
To connect real TLC, replace `verify_model()` in `backend/converter.py` with a TLC subprocess call.


## One-link deployment

This package has been updated for deployment as a single public web app. See `DEPLOYMENT_GUIDE.md`. The frontend now uses the relative endpoint `/api/convert`, and FastAPI serves the frontend build from `frontend/dist`.
