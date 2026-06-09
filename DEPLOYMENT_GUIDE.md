# Deploy UML2TLA+ as a Shareable One-Link Web App

This package is ready for a single public URL deployment. The React frontend calls `/api/convert`, and the FastAPI backend serves both the API and the built frontend.

## Option A: Render, easiest single-link deployment

1. Create a new GitHub repository.
2. Upload all files from this folder to the repository.
3. Go to Render and create a new **Web Service** from that GitHub repository.
4. Render should detect `render.yaml`. If not, use these settings manually:

   Build command:

   ```bash
   cd frontend && npm install && npm run build
   cd ../backend && pip install -r requirements.txt
   ```

   Start command:

   ```bash
   cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

5. After deployment, Render will give a public URL like:

   ```text
   https://your-app-name.onrender.com
   ```

Share that URL with anyone.

## Option B: Run locally before deployment

Terminal 1:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Terminal 2:

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:8080
```

## Notes

- The app currently uses a lightweight built-in verification function.
- For real TLC verification, connect `verify_model()` in `backend/converter.py` to a TLC subprocess.
- The public link will work as long as the hosting service keeps the web service active.
