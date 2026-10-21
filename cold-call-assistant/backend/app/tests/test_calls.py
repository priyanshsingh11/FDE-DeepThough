import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import database

H = {"X-Client-Id": "tester-0001"}


@pytest.fixture(autouse=True)
def fresh_repo(monkeypatch):
    repo = database.MemoryRepo()
    monkeypatch.setattr(database, "get_repo", lambda: repo)
    app.dependency_overrides[database.get_repo] = lambda: repo
    # routes import get_repo by name, so override the dependency itself
    from app.routes import calls
    app.dependency_overrides[calls.get_repo] = lambda: repo
    yield
    app.dependency_overrides.clear()


client = TestClient(app)


def start(**body):
    r = client.post("/api/calls", json=body, headers=H)
    assert r.status_code == 201
    return r.json()


def test_health():
    r = client.get("/health")
    assert r.json() == {"status": "ok", "service": "cold-call-assistant-api"}


def test_start_at_stage_one_without_details():
    c = start()
    assert c["current_stage"] == 1 and c["status"] == "in_progress"


def test_requires_client_id():
    assert client.get("/api/calls").status_code == 400


def test_save_is_idempotent_upsert():
    c = start()
    body = {"stage_number": 1, "selected_result": "right_person", "notes": "hi"}
    assert client.post(f"/api/calls/{c['id']}/stages", json=body, headers=H).status_code == 201
    body["notes"] = "edited"
    r = client.post(f"/api/calls/{c['id']}/stages", json=body, headers=H)
    assert r.status_code == 200 and r.json()["notes"] == "edited"
    d = client.get(f"/api/calls/{c['id']}", headers=H).json()
    assert len(d["stage_results"]) == 1


def test_validation():
    c = start()
    url = f"/api/calls/{c['id']}/stages"
    assert client.post(url, json={"stage_number": 9, "selected_result": "x"}, headers=H).status_code == 422
    assert client.post(url, json={"stage_number": 1, "selected_result": "nope"}, headers=H).status_code == 400
    # stage 3 not reached yet
    assert client.post(url, json={"stage_number": 3, "selected_result": "agreed_to_talk"}, headers=H).status_code == 409


def test_advance_cannot_skip_or_go_back():
    c = start()
    assert client.post(f"/api/calls/{c['id']}/advance", json={"stage_number": 3}, headers=H).status_code == 409
    assert client.post(f"/api/calls/{c['id']}/advance", json={"stage_number": 2}, headers=H).json()["current_stage"] == 2
    assert client.post(f"/api/calls/{c['id']}/advance", json={"stage_number": 1}, headers=H).json()["current_stage"] == 2


def test_early_close_keeps_last_stage_and_locks_call():
    c = start()
    client.post(f"/api/calls/{c['id']}/advance", json={"stage_number": 2}, headers=H)
    r = client.post(f"/api/calls/{c['id']}/close", json={"outcome": "not_interested"}, headers=H)
    assert r.status_code == 200
    j = r.json()
    assert j["status"] == "completed" and j["current_stage"] == 2 and j["ended_at"]
    assert client.post(f"/api/calls/{c['id']}/close", json={"outcome": "other"}, headers=H).status_code == 409
    body = {"stage_number": 2, "selected_result": "curious"}
    assert client.post(f"/api/calls/{c['id']}/stages", json=body, headers=H).status_code == 409


def test_invalid_outcome():
    c = start()
    assert client.post(f"/api/calls/{c['id']}/close", json={"outcome": "bogus"}, headers=H).status_code == 400


def test_callers_are_isolated_and_list_newest_first():
    a = start(prospect_name="A")
    b = start(prospect_name="B")
    items = client.get("/api/calls", headers=H).json()["items"]
    assert [i["id"] for i in items] == [b["id"], a["id"]]
    other = {"X-Client-Id": "someone-else-1"}
    assert client.get(f"/api/calls/{a['id']}", headers=other).status_code == 404
    assert client.get("/api/calls", headers=other).json()["items"] == []


def test_unknown_and_malformed_id():
    assert client.get("/api/calls/00000000-0000-0000-0000-000000000000", headers=H).status_code == 404
    assert client.get("/api/calls/not-a-uuid", headers=H).status_code == 404
