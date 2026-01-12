import os

import pytest
import requests


def _base_url() -> str:
    return os.environ.get("BASE_URL", "http://127.0.0.1:8790")


def _api_key() -> str:
    return os.environ.get("OS_API_KEY", "")


def _as_of() -> str:
    return os.environ.get("AS_OF", "")


def _require_env():
    if not _api_key() or not _as_of():
        pytest.skip("Set OS_API_KEY and AS_OF to run smoke tests.")


def test_health_smoke():
    r = requests.get(f"{_base_url()}/health", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert data.get("ok") is True


def test_model_a_persist_smoke():
    _require_env()
    r = requests.post(
        f"{_base_url()}/run/model_a_v1_1_persist",
        headers={"x-api-key": _api_key()},
        json={"as_of": _as_of()},
        timeout=300,
    )
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "ok"
