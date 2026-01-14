from fastapi.testclient import TestClient

import app.main as main


class DummyCursor:
    def __init__(self, executed, fetchone_values=None):
        self.executed = executed
        self.fetchone_values = fetchone_values or []

    def execute(self, sql, params=None):
        self.executed.append((sql, params))

    def fetchone(self):
        if self.fetchone_values:
            return self.fetchone_values.pop(0)
        return [123]

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


class DummyConn:
    def __init__(self, executed, fetchone_values=None):
        self.executed = executed
        self.fetchone_values = fetchone_values or []

    def cursor(self):
        return DummyCursor(self.executed, self.fetchone_values)

    def commit(self):
        return None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


def test_model_a_persist_maps_ranked_fields(monkeypatch, tmp_path):
    main.OS_API_KEY = "test-key"
    monkeypatch.setattr(main, "OUTPUT_DIR", str(tmp_path))

    fake_data = {
        "status": "ok",
        "as_of": "2024-01-31",
        "n_holdings": 1,
        "n_replacements": 0,
        "turnover_pct": None,
        "portfolio_vol": 0.12,
        "drawdown": None,
        "risk_regime": "neutral",
        "ranked": [
            {
                "rank": 1,
                "symbol": "AAA.AU",
                "mom_12_1": 0.1,
                "mom_6": 0.2,
                "adv_20_median": 100.0,
                "vol_90": 0.3,
                "score": 1.1,
            }
        ],
        "targets": [
            {
                "symbol": "AAA.AU",
                "target_weight": 0.05,
                "score": 1.1,
                "rank": 1,
                "mom_12_1": 0.1,
                "mom_6": 0.2,
                "trend_200": True,
                "sma200_slope_pos": True,
                "adv_20_median": 100.0,
                "vol_90": 0.3,
                "price": 10.0,
            }
        ],
        "summary": {"warnings": [], "cash_weight": 0.0, "scale": 1.0},
    }

    def fake_run_model_a_v1_1(req, x_api_key=None):
        return fake_data

    monkeypatch.setattr(main, "run_model_a_v1_1", fake_run_model_a_v1_1)

    executed = []
    calls = {"count": 0}

    def fake_db():
        calls["count"] += 1
        fetchone_values = [[123]] if calls["count"] == 1 else []
        return DummyConn(executed, fetchone_values)

    monkeypatch.setattr(main, "db", fake_db)

    signal_rows = []

    def fake_execute_values(cur, sql, rows):
        signal_rows.extend(rows)

    monkeypatch.setattr(main, "execute_values", fake_execute_values)

    client = TestClient(main.app)
    response = client.post(
        "/run/model_a_v1_1_persist",
        headers={"x-api-key": "test-key"},
        json={"as_of": "2024-01-31"},
    )
    assert response.status_code == 200

    ranked_insert = next(
        (item for item in executed if "insert into model_a_ranked" in item[0].lower()),
        None,
    )
    assert ranked_insert is not None
    sql, params = ranked_insert
    assert "momentum_12_1" in sql
    assert params[3] == 0.1
    assert params[4] == 0.2
    assert params[5] == 100.0
    assert params[6] == 0.3
    assert params[7] == 0.05

    assert signal_rows
    assert signal_rows[0][5] == 0.05
    assert signal_rows[0][12] == 10.0
