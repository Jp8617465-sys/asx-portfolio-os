from fastapi.testclient import TestClient

import app.main as main


class DummyResponse:
    def __init__(self, status_code=200, text=""):
        self.status_code = status_code
        self.text = text


class DummyCursor:
    def __init__(self, rows=None):
        self._rows = rows or []

    def execute(self, *args, **kwargs):
        return None

    def fetchall(self):
        return self._rows

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


class DummyConn:
    def __init__(self, rows=None):
        self._rows = rows or []

    def cursor(self):
        return DummyCursor(self._rows)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


def test_refresh_universe_empty_payload_skips_delete(monkeypatch):
    main.OS_API_KEY = "test-key"

    monkeypatch.setattr(main.requests, "get", lambda *args, **kwargs: DummyResponse(200, ""))

    def fail_db():
        raise AssertionError("db should not be called for empty payload")

    monkeypatch.setattr(main, "db", fail_db)

    client = TestClient(main.app)
    response = client.post("/refresh/universe", headers={"x-api-key": "test-key"})
    assert response.status_code == 502


def test_refresh_prices_last_day_empty_payload_skips_delete(monkeypatch):
    main.OS_API_KEY = "test-key"

    monkeypatch.setattr(main.requests, "get", lambda *args, **kwargs: DummyResponse(200, ""))

    def fail_db():
        raise AssertionError("db should not be called for empty payload")

    monkeypatch.setattr(main, "db", fail_db)

    client = TestClient(main.app)
    response = client.post("/refresh/prices/last_day", headers={"x-api-key": "test-key"})
    assert response.status_code == 502


def test_refresh_prices_last_day_empty_universe_skips_delete(monkeypatch):
    main.OS_API_KEY = "test-key"

    csv_text = "Date,Code,Open,High,Low,Close,Volume\n2024-01-02,AAA,1,1,1,1,100\n"
    monkeypatch.setattr(main.requests, "get", lambda *args, **kwargs: DummyResponse(200, csv_text))

    calls = {"count": 0}

    def fake_db():
        calls["count"] += 1
        if calls["count"] > 1:
            raise AssertionError("db write should not occur when universe is empty")
        return DummyConn([])

    monkeypatch.setattr(main, "db", fake_db)

    client = TestClient(main.app)
    response = client.post("/refresh/prices/last_day", headers={"x-api-key": "test-key"})
    assert response.status_code == 409
