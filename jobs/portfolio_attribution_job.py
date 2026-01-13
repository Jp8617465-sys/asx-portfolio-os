"""
jobs/portfolio_attribution_job.py
Compute simple portfolio attribution from signals and prices.
"""

import os
from typing import Optional

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env", override=True)

DATABASE_URL = os.getenv("DATABASE_URL")
DEFAULT_MODEL = os.getenv("PORTFOLIO_MODEL", "model_a_v1_1")
DEFAULT_AS_OF = os.getenv("AS_OF")

if not DATABASE_URL:
    raise SystemExit("DATABASE_URL not set")


def _resolve_as_of(cur, model: str, as_of: Optional[str]) -> Optional[str]:
    if as_of:
        return as_of
    cur.execute(
        """
        select max(as_of)
        from signals
        where model = %s
        """,
        (model,),
    )
    row = cur.fetchone()
    return row[0].isoformat() if row and row[0] else None


def main(model: Optional[str] = None, as_of: Optional[str] = None) -> None:
    resolved_model = model or DEFAULT_MODEL
    resolved_as_of = as_of or DEFAULT_AS_OF

    with psycopg2.connect(DATABASE_URL) as con, con.cursor() as cur:
        as_of_value = _resolve_as_of(cur, resolved_model, resolved_as_of)
        if not as_of_value:
            print("⚠️ No signals found to compute attribution.")
            return

        sig = pd.read_sql(
            """
            select symbol, target_weight
            from signals
            where model = %s and as_of = %s
            """,
            con,
            params=(resolved_model, as_of_value),
        )
        if sig.empty:
            print("⚠️ No signals rows to compute attribution.")
            return

        px = pd.read_sql(
            """
            select dt, symbol, close
            from prices
            where symbol = any(%s) and dt <= %s
            order by symbol, dt
            """,
            con,
            params=(sig["symbol"].tolist(), as_of_value),
        )
        if px.empty:
            print("⚠️ No price data for attribution.")
            return

        px["dt"] = pd.to_datetime(px["dt"])
        px = px.sort_values(["symbol", "dt"])
        px["ret1"] = px.groupby("symbol")["close"].pct_change()
        latest = px.groupby("symbol").tail(1)
        latest = latest[latest["dt"].dt.date == pd.to_datetime(as_of_value).date()]

        merged = sig.merge(latest[["symbol", "ret1"]], on="symbol", how="left")
        merged["return_1d"] = merged["ret1"].fillna(0.0)
        merged["contribution"] = merged["target_weight"].fillna(0.0) * merged["return_1d"]

        rows = []
        for r in merged.itertuples(index=False):
            rows.append(
                (
                    resolved_model,
                    as_of_value,
                    r.symbol,
                    float(r.target_weight) if r.target_weight is not None else None,
                    float(r.return_1d) if r.return_1d is not None else None,
                    float(r.contribution) if r.contribution is not None else None,
                )
            )

        execute_values(
            cur,
            """
            insert into portfolio_attribution (model, as_of, symbol, weight, return_1d, contribution)
            values %s
            """,
            rows,
        )

        portfolio_return = float(merged["contribution"].sum())
        cur.execute(
            """
            insert into portfolio_performance (model, as_of, portfolio_return)
            values (%s, %s, %s)
            on conflict (model, as_of) do update set
                portfolio_return = excluded.portfolio_return
            """,
            (resolved_model, as_of_value, portfolio_return),
        )

        con.commit()

    print(f"✅ Attribution computed for {resolved_model} on {as_of_value}")


if __name__ == "__main__":
    main()
