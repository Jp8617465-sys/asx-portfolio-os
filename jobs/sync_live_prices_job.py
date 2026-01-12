"""
jobs/sync_live_prices_job.py
Sync latest prices from live endpoint (EODHD bulk last day).
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env", override=True)
BASE_URL = os.getenv("MODEL_A_API", "http://127.0.0.1:8790")
API_KEY = os.getenv("OS_API_KEY", "")

if not API_KEY:
    raise SystemExit("OS_API_KEY not set")

for path in ("/refresh/prices/live", "/refresh/prices/last_day"):
    try:
        res = requests.post(
            f"{BASE_URL}{path}",
            headers={"x-api-key": API_KEY},
            timeout=300,
        )
        if res.status_code == 200:
            print(f"✅ Price sync ok via {path}: {res.json()}")
            raise SystemExit(0)
        print(f"⚠️ Price sync failed via {path}: {res.status_code} {res.text[:200]}")
    except requests.exceptions.RequestException as exc:
        print(f"⚠️ Price sync error via {path}: {exc}")

raise SystemExit("All price sync attempts failed")
