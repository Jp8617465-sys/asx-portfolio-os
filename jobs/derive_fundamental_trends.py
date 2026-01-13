"""
jobs/derive_fundamental_trends.py
Derive time-series trend features from fundamentals_history.
"""

import os
from typing import List

import numpy as np
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env", override=True)

DATABASE_URL = os.getenv("DATABASE_URL")
WINDOW = int(os.getenv("FUNDAMENTALS_TREND_WINDOW", "8"))
MIN_POINTS = int(os.getenv("FUNDAMENTALS_TREND_MIN_POINTS", "3"))

if not DATABASE_URL:
    raise SystemExit("DATABASE_URL not set")


def _compute_trend(group: pd.DataFrame) -> dict:
    group = group.sort_values("as_of").tail(WINDOW)
    if len(group) < MIN_POINTS:
        return {}

    values = group["value"].astype(float).values
    x = np.arange(len(values))
    slope = float(np.polyfit(x, values, 1)[0]) if len(values) > 1 else 0.0
    base = values[0]
    pct_change = float(values[-1] / base - 1) if base not in (0, None) else None
    volatility = float(np.std(np.diff(values))) if len(values) > 1 else None

    return {
        "symbol": group["symbol"].iloc[-1],
        "metric": group["metric"].iloc[-1],
        "window_size": len(group),
        "mean_value": float(np.mean(values)),
        "pct_change": pct_change,
        "slope": slope,
        "volatility": volatility,
        "as_of": group["as_of"].iloc[-1],
    }


def main() -> None:
    with psycopg2.connect(DATABASE_URL) as con:
        df = pd.read_sql(
            "select symbol, as_of, metric, value from fundamentals_history",
            con,
        )

    if df.empty:
        print("⚠️ fundamentals_history is empty; nothing to derive.")
        return

    results: List[dict] = []
    for (_, _), group in df.groupby(["symbol", "metric"]):
        row = _compute_trend(group)
        if row:
            results.append(row)

    if not results:
        print("⚠️ No trend rows derived.")
        return

    rows = []
    for r in results:
        rows.append(
            (
                r["symbol"],
                r["metric"],
                int(r["window_size"]),
                r["mean_value"],
                r["pct_change"],
                r["slope"],
                r["volatility"],
                r["as_of"],
            )
        )

    sql = """
    insert into features_fundamental_trends
        (symbol, metric, window_size, mean_value, pct_change, slope, volatility, as_of)
    values %s
    on conflict (symbol, metric, window_size, as_of) do update set
        mean_value = excluded.mean_value,
        pct_change = excluded.pct_change,
        slope = excluded.slope,
        volatility = excluded.volatility
    """

    with psycopg2.connect(DATABASE_URL) as con, con.cursor() as cur:
        execute_values(cur, sql, rows)
        con.commit()

    print(f"✅ Derived fundamental trends: {len(rows)} rows")


if __name__ == "__main__":
    main()
