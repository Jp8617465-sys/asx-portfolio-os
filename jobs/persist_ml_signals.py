import os
import pandas as pd
import requests
from requests.adapters import HTTPAdapter, Retry
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env", override=True)

MODEL_A_API = os.getenv("MODEL_A_API")
API_KEY = os.getenv("OS_API_KEY")

if not MODEL_A_API or not API_KEY:
    raise SystemExit("MODEL_A_API or OS_API_KEY missing")

path = "outputs/model_a_ml_signals_latest.csv"
if not os.path.exists(path):
    raise SystemExit(f"Missing signals file: {path}")

df = pd.read_csv(path)
if "ml_prob" not in df.columns:
    raise SystemExit("Expected ml_prob in signals CSV")

if "as_of" in df.columns:
    df["as_of"] = pd.to_datetime(df["as_of"]).dt.date
    as_of = df["as_of"].max()
elif "dt" in df.columns:
    df["dt"] = pd.to_datetime(df["dt"]).dt.date
    as_of = df["dt"].max()
else:
    raise SystemExit("Expected as_of or dt column in signals CSV")

score_col = "ml_prob"
if "ml_expected_return" in df.columns and df["ml_expected_return"].notna().any():
    score_col = "ml_expected_return"

ranked = df.sort_values(score_col, ascending=False).reset_index(drop=True)
ranked["rank"] = ranked.index + 1

signals = []
for _, row in ranked.iterrows():
    signals.append({
        "symbol": row.get("symbol"),
        "rank": int(row.get("rank")),
        "score": float(row.get("ml_prob")) if row.get("ml_prob") is not None else None,
        "ml_prob": float(row.get("ml_prob")) if row.get("ml_prob") is not None else None,
        "ml_expected_return": float(row.get("ml_expected_return")) if row.get("ml_expected_return") is not None else None,
    })

session = requests.Session()
retries = Retry(total=3, backoff_factor=1.0, status_forcelist=[429, 502, 503, 504])
session.mount("https://", HTTPAdapter(max_retries=retries))

batch_size = 500
total = len(signals)
for idx in range(0, total, batch_size):
    batch = signals[idx : idx + batch_size]
    payload = {
        "model": "model_a_ml",
        "as_of": str(as_of),
        "signals": batch,
    }
    resp = session.post(
        f"{MODEL_A_API}/persist/ml_signals",
        headers={"x-api-key": API_KEY, "Content-Type": "application/json"},
        json=payload,
        timeout=120,
    )
    print(f"Signals batch {idx // batch_size + 1}: {resp.status_code} {resp.text[:200]}")
