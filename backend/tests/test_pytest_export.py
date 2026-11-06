"""Regression tests for reviewer-requested pytest project exports."""
import ast
import io
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile

from fastapi.testclient import TestClient
from main import app


EXAMPLES = {
    "state_machine": {
        "states": [
            {"id": "i", "name": "Start", "type": "initial"},
            {"id": "s", "name": "Idle"},
        ],
        "transitions": [{"id": "e", "source": "i", "target": "s"}],
    },
    "use_case": {
        "actors": [{"id": "a", "name": "User"}],
        "use_cases": [{"id": "u", "name": "Login"}],
        "associations": [{"id": "e", "source": "a", "target": "u"}],
    },
    "class": {"classes": [{"id": "c", "name": "Account"}]},
    "sequence": {"lifelines": [{"id": "a", "name": "User"}]},
    "activity": {"actions": [{"id": "a", "name": "Compute"}]},
}


class ExportedPytestTests(unittest.TestCase):
    def test_each_diagram_exports_executable_pytest(self):
        client = TestClient(app)
        for kind, elements in EXAMPLES.items():
            with self.subTest(diagram_type=kind):
                payload = {"name": "ReviewerDemo", "diagram_type": kind, **elements}
                response = client.post("/api/export", json=payload)
                self.assertEqual(response.status_code, 200, response.text)
                with tempfile.TemporaryDirectory() as tmp:
                    root = Path(tmp)
                    with ZipFile(io.BytesIO(response.content)) as zf:
                        self.assertIn("tests/test_generated.py", zf.namelist())
                        self.assertIn("pytest.ini", zf.namelist())
                        self.assertIn("ReviewerDemo.py", zf.namelist())
                        for name in ("tests/test_generated.py", "pytest.ini", "ReviewerDemo.py"):
                            (root / name).parent.mkdir(parents=True, exist_ok=True)
                            (root / name).write_bytes(zf.read(name))
                    ast.parse((root / "tests/test_generated.py").read_text())
                    result = subprocess.run(
                        [sys.executable, "-m", "pytest", "-q"],
                        cwd=root, text=True, capture_output=True, timeout=30,
                    )
                    self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
