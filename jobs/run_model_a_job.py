#!/usr/bin/env python3
import os
import requests
import subprocess
import time
from datetime import date
from urllib.parse import urlparse
from dotenv import load_dotenv
import psycopg2

# Load .env so we have OS_API_KEY etc.
load_dotenv(dotenv_path=".env", override=True)

BASE_URL = os.getenv("MODEL_A_API", "http://127.0.0.1:8790")
API_KEY = os.getenv("OS_API_KEY")
DB_URL = os.getenv("DATABASE_URL", "")
TARGET_DATE = os.getenv("TARGET_DATE", date.today().isoformat())

payload = {
    "as_of": TARGET_DATE,
    "adv_floor": float(os.getenv("ADV_FLOOR", "5000000")),
    "min_price": float(os.getenv("MIN_PRICE", "1.0")),
    "n_holdings": int(os.getenv("N_HOLDINGS", "80")),
}

fallback_payload = {
    **payload,
    "adv_floor": float(os.getenv("FALLBACK_ADV_FLOOR", "10000000")),
    "min_price": float(os.getenv("FALLBACK_MIN_PRICE", "2.0")),
}

def _mask_db_url(db_url: str) -> str:
    if not db_url:
        return ""
    if "@" not in db_url:
        return db_url
    prefix, rest = db_url.split("@", 1)
    if "://" in prefix:
        scheme, _ = prefix.split("://", 1)
        return f"{scheme}://***@{rest}"
    return f"***@{rest}"


print(f"Using API: {BASE_URL}")
if DB_URL:
    print(f"Using DB: {_mask_db_url(DB_URL)}")

if not API_KEY:
    raise SystemExit("Missing OS_API_KEY env var")

def _ensure_api():
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=5)
        if r.status_code == 200:
            return
    except requests.exceptions.RequestException:
        pass

    if os.getenv("AUTO_START_API", "1") != "1":
        raise SystemExit(f"API not reachable at {BASE_URL}")

    parsed = urlparse(BASE_URL)
    port = parsed.port or 8790
    print("API not reachable. Starting uvicorn in the background...")
    proc = subprocess.Popen(
        ["uvicorn", "app.main:app", "--port", str(port)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    deadline = time.time() + 30
    while time.time() < deadline:
        try:
            r = requests.get(f"{BASE_URL}/health", timeout=5)
            if r.status_code == 200:
                return
        except requests.exceptions.RequestException:
            time.sleep(1)
    proc.terminate()
    raise SystemExit(f"Failed to start API at {BASE_URL}")

def _refresh_last_day():
    print("Refreshing last-day prices from EODHD...")
    r = requests.post(
        f"{BASE_URL}/refresh/prices/last_day",
        headers={"x-api-key": API_KEY},
        timeout=300,
    )
    if r.status_code != 200:
        raise SystemExit(f"Price refresh failed: {r.status_code} {r.text[:300]}")
    data = r.json()
    return data.get("date"), data.get("rows")


def _backfill_prices(from_date: str, to_date: str):
    print(f"Backfilling prices from {from_date} to {to_date}...")
    r = requests.post(
        f"{BASE_URL}/backfill/prices",
        headers={"x-api-key": API_KEY, "Content-Type": "application/json"},
        json={"from_date": from_date, "to_date": to_date},
        timeout=600,
    )
    if r.status_code != 200:
        raise SystemExit(f"Backfill failed: {r.status_code} {r.text[:300]}")
    return r.json()


def _get_latest_date():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Missing DATABASE_URL env var; skipping DB latest-date check.")
        return None
    if "..." in db_url:
        print("DATABASE_URL looks like a placeholder; skipping DB latest-date check.")
        return None
    con = psycopg2.connect(db_url)
    try:
        with con.cursor() as cur:
            cur.execute("select max(dt) from prices;")
            latest = cur.fetchone()[0]
    finally:
        con.close()
    if latest is None:
        return None
    if isinstance(latest, date):
        return latest.isoformat()
    return str(latest)


def _ensure_latest_prices():
    latest = _get_latest_date()
    if not latest:
        print("No prices found. Refreshing last-day data...")
        latest, _ = _refresh_last_day()
        return latest

    latest_dt = date.fromisoformat(str(latest))
    target_dt = date.fromisoformat(TARGET_DATE)
    if latest_dt < target_dt:
        print(f"Latest price date {latest_dt} is older than target {target_dt}.")
        latest, _ = _refresh_last_day()
        if latest and date.fromisoformat(str(latest)) >= target_dt:
            return latest

        backfill_from = os.getenv("BACKFILL_FROM")
        if backfill_from:
            _backfill_prices(backfill_from, TARGET_DATE)
            latest = _get_latest_date()
    return latest


def _run_persist(as_of: str):
    print(f"🚀 Running Model A v1.1 persist for {as_of}")
    payload["as_of"] = as_of
    fallback_payload["as_of"] = as_of
    r = requests.post(
        f"{BASE_URL}/run/model_a_v1_1_persist",
        headers={"x-api-key": API_KEY, "Content-Type": "application/json"},
        json=payload,
        timeout=600,
    )
    return r


try:
    _ensure_api()
    AS_OF = _ensure_latest_prices() or TARGET_DATE
    print(f"Using latest available date: {AS_OF}")
    res = _run_persist(AS_OF)
except requests.exceptions.ConnectionError:
    _ensure_api()
    res = _run_persist(AS_OF)

print(f"Response code: {res.status_code}")
print(res.text[:400])

if res.status_code == 400 and "\"total\":0" in res.text:
    last_date, rows = _refresh_last_day()
    if last_date:
        print(f"Prices refreshed for {last_date} ({rows} rows). Retrying...")
        AS_OF = last_date
        res = _run_persist(AS_OF)
        print(f"Response code: {res.status_code}")
        print(res.text[:400])

if res.status_code == 400 and "No symbols passed gates" in res.text:
    print("No symbols passed gates, retrying with relaxed filters...")
    res = requests.post(
        f"{BASE_URL}/run/model_a_v1_1_persist",
        headers={"x-api-key": API_KEY, "Content-Type": "application/json"},
        json=fallback_payload,
        timeout=600,
    )
    print(f"Fallback response code: {res.status_code}")
    print(res.text[:400])

if res.status_code == 200:
    print("✅ Model run persisted successfully")
else:
    print("❌ Model run failed, see logs above")
