"""
analytics/risk_model.py
Compute basic risk exposure snapshot (volatility + beta vs market proxy).
"""

import json
import os

import numpy as np
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env", override=True)

DATABASE_URL = os.getenv("DATABASE_URL")
LOOKBACK_DAYS = int(os.getenv("RISK_LOOKBACK_DAYS", "252"))

if not DATABASE_URL:
    raise SystemExit("DATABASE_URL not set")


def _load_prices(con) -> pd.DataFrame:
    query = """
        select dt, symbol, close
        from prices
        where dt >= (current_date - (%s * interval '1 day'))
        order by symbol, dt
    """
    return pd.read_sql(query, con, params=(LOOKBACK_DAYS,))


def _load_sector_map(con) -> dict:
    query = """
        select symbol, sector
        from fundamentals
        where updated_at = (select max(updated_at) from fundamentals)
    """
    df = pd.read_sql(query, con)
    return dict(zip(df["symbol"], df["sector"]))


def main() -> None:
    with psycopg2.connect(DATABASE_URL) as con:
        prices = _load_prices(con)
        if prices.empty:
            print("⚠️ No prices found; cannot compute risk snapshot.")
            return

        sector_map = _load_sector_map(con)

        prices["dt"] = pd.to_datetime(prices["dt"])
        prices = prices.sort_values(["symbol", "dt"])
        prices["ret1"] = prices.groupby("symbol")["close"].pct_change()

        recent = prices.groupby("symbol").tail(LOOKBACK_DAYS)
        pivot = recent.pivot(index="dt", columns="symbol", values="ret1").dropna(how="all")
        if pivot.empty:
            print("⚠️ Not enough return history for risk snapshot.")
            return

        market_ret = pivot.mean(axis=1)
        market_var = float(np.var(market_ret))
        as_of = pivot.index.max().date()

        rows = []
        for symbol in pivot.columns:
            series = pivot[symbol].dropna()
            if len(series) < 60 or market_var == 0:
                continue

            aligned = series.align(market_ret, join="inner")[0]
            mkt = market_ret.loc[aligned.index]
            cov = float(np.cov(aligned, mkt)[0, 1])
            beta = cov / market_var if market_var else None
            corr = float(np.corrcoef(aligned, mkt)[0, 1]) if len(aligned) > 1 else None
            vol = float(np.std(aligned))

            rows.append(
                (
                    symbol,
                    as_of,
                    sector_map.get(symbol),
                    vol,
                    beta,
                    json.dumps({"market": corr}),
                )
            )

        if not rows:
            print("⚠️ No risk rows computed.")
            return

        sql = """
        insert into risk_exposure_snapshot (symbol, as_of, sector, factor_vol, beta_market, factor_corr)
        values %s
        on conflict (symbol, as_of) do update set
            sector = excluded.sector,
            factor_vol = excluded.factor_vol,
            beta_market = excluded.beta_market,
            factor_corr = excluded.factor_corr
        """

        with con.cursor() as cur:
            execute_values(cur, sql, rows)
            con.commit()

        print(f"✅ Risk snapshot rows: {len(rows)}")


if __name__ == "__main__":
    main()
