from fastapi.testclient import TestClient

from app.main import app


def test_health_ok():
    assert TestClient(app).get("/health").status_code == 200
