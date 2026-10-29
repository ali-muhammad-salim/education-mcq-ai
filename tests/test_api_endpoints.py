from fastapi.testclient import TestClient
from services.api.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "admin-dashboard-api"}

def test_get_documents():
    response = client.get("/api/documents/")
    assert response.status_code == 200
    assert len(response.json()) > 0

def test_get_mcqs():
    response = client.get("/api/mcqs/")
    assert response.status_code == 200
    assert len(response.json()) > 0

def test_review_reject_without_reason():
    response = client.post("/api/review/mcq-1", json={"action": "REJECT", "reason": ""})
    assert response.status_code == 400

def test_review_approve():
    response = client.post("/api/review/mcq-1", json={"action": "APPROVE"})
    assert response.status_code == 200
    assert response.json()["action_taken"] == "APPROVE"

def test_get_training_data():
    response = client.get("/api/training/approved-data")
    assert response.status_code == 200
    assert len(response.json()) > 0

def test_start_training_mock():
    config = {"baseModel": "Qwen3-7B"}
    response = client.post("/api/training/start", json=config)
    assert response.status_code == 200
    assert "disabled in MVP" in response.json()["message"]
