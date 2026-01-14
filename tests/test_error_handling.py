from fastapi.testclient import TestClient

import app.main as main


def test_run_model_invalid_as_of_returns_400():
    main.OS_API_KEY = "test-key"
    client = TestClient(main.app)
    response = client.post(
        "/run/model_a_v1_1",
        headers={"x-api-key": "test-key"},
        json={"as_of": "bad-date"},
    )
    assert response.status_code == 400
    assert "Invalid as_of format" in response.json().get("detail", "")


def test_run_model_persist_invalid_as_of_returns_400():
    main.OS_API_KEY = "test-key"
    client = TestClient(main.app)
    response = client.post(
        "/run/model_a_v1_1_persist",
        headers={"x-api-key": "test-key"},
        json={"as_of": "2024-99-99"},
    )
    assert response.status_code == 400
    assert "Invalid as_of format" in response.json().get("detail", "")
