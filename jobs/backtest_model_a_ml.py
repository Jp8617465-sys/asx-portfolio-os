"""
jobs/backtest_model_a_ml.py
Rolling backtest for Model A ML signals with performance & drift hooks.
"""

import os
import pandas as pd
import numpy as np
import psycopg2
from dotenv import load_dotenv
from datetime import datetime
from sklearn.metrics import mean_squared_error, roc_auc_score

# --- Load environment ---
load_dotenv(dotenv_path=".env", override=True)
SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL")
if not SUPABASE_DB_URL or SUPABASE_DB_URL.strip() in ["...", ""]:
    raise ValueError("SUPABASE_DB_URL/DATABASE_URL not set in .env — please fix before running.")

# --- Utility: connect to DB ---
def db():
    return psycopg2.connect(SUPABASE_DB_URL)

# --- Load ML signals + returns ---
def load_ml_signals():
    # Latest exported predictions
    ml_signals = pd.read_csv("outputs/model_a_ml_signals_latest.csv")
    if "as_of" in ml_signals.columns:
        ml_signals["as_of"] = pd.to_datetime(ml_signals["as_of"])
    elif "dt" in ml_signals.columns:
        ml_signals["as_of"] = pd.to_datetime(ml_signals["dt"])
    else:
        raise ValueError("Expected 'as_of' or 'dt' column in ML signals.")
    ml_signals["as_of_date"] = ml_signals["as_of"].dt.date
    return ml_signals

def load_returns(min_date=None, max_date=None):
    with db() as con:
        query = """
        select symbol, dt, close
        from prices
        where dt >= %s and dt <= %s
        """
        df = pd.read_sql(query, con, params=(min_date, max_date))
    df["dt"] = pd.to_datetime(df["dt"])
    df = df.sort_values(["symbol", "dt"])
    df["daily_return"] = df.groupby("symbol")["close"].pct_change()
    df["dt_date"] = df["dt"].dt.date
    return df.dropna(subset=["daily_return"])

# --- Core backtest ---
def backtest_ml(signals, returns, rebalance_freq="W", top_n=50, capital=1_000_000):
    score_col = "ml_prob" if "ml_prob" in signals.columns else "ml_expected_return"
    signals = signals.sort_values(["as_of_date", score_col], ascending=[True, False])
    signals["rank"] = signals.groupby("as_of_date")[score_col].rank(ascending=False, method="first")

    signal_dates = set(signals["as_of_date"].unique())
    return_dates = set(returns["dt_date"].unique())
    matched_dates = sorted(signal_dates & return_dates)
    print(f"Signals: {len(signals):,} rows, {len(signal_dates)} dates")
    print(f"Returns: {len(returns):,} rows, {len(return_dates)} dates")
    print(f"Matched dates: {len(matched_dates)}")
    if signal_dates:
        print(f"Signal date range: {min(signal_dates)} to {max(signal_dates)}")
    if return_dates:
        print(f"Return date range: {min(return_dates)} to {max(return_dates)}")

    portfolio = []
    equity_curve = []

    for date, day_signals in signals.groupby("as_of_date"):
        day_returns = returns[returns["dt_date"] == date]
        top_signals = day_signals[day_signals["rank"] <= top_n]

        if len(top_signals) == 0:
            continue

        # Equal weight
        weight = capital / len(top_signals)
        day_pnl = 0
        matched = 0

        for _, row in top_signals.iterrows():
            r = day_returns[day_returns["symbol"] == row["symbol"]]["daily_return"]
            if not r.empty:
                day_pnl += weight * (1 + float(r.iloc[0]))
                matched += 1

        if matched == 0:
            continue
        capital = day_pnl
        equity_curve.append({"date": date, "equity": capital, "n_matched": matched, "n_top": len(top_signals)})

    if not equity_curve:
        return pd.DataFrame()
    equity_df = pd.DataFrame(equity_curve).sort_values("date")
    equity_df["return"] = equity_df["equity"].pct_change().fillna(0)
    return equity_df

# --- Performance metrics ---
def performance_stats(equity_df):
    ret = equity_df["return"]
    ret_std = float(ret.std()) if len(ret) else 0.0
    sharpe = (ret.mean() / ret_std) * np.sqrt(252) if ret_std > 0 else 0.0
    cagr = (1 + ret).prod() ** (252 / len(ret)) - 1
    max_dd = (equity_df["equity"].cummax() - equity_df["equity"]).max()
    return {"sharpe": sharpe, "cagr": cagr, "max_drawdown": max_dd}

# --- Optional: drift detection stub ---
def detect_feature_drift(current_signals, prev_signals):
    merged = current_signals.merge(prev_signals, on="symbol", suffixes=("_cur", "_prev"))
    diffs = (merged["score_cur"] - merged["score_prev"]).abs().mean()
    return {"mean_score_drift": float(diffs)}

# --- Run ---
if __name__ == "__main__":
    print("🚀 Starting ML backtest...")
    signals = load_ml_signals()
    min_dt = signals["as_of_date"].min()
    max_dt = signals["as_of_date"].max()
    returns = load_returns(min_dt, max_dt)
    eq = backtest_ml(signals, returns)
    if eq.empty:
        raise SystemExit("Backtest produced no equity curve (check signals/returns alignment).")
    stats = performance_stats(eq)

    print(f"✅ Backtest complete | Sharpe: {stats['sharpe']:.2f}, CAGR: {stats['cagr']:.2%}, Max DD: {stats['max_drawdown']:.2f}")

    eq.to_csv("outputs/model_a_ml_equity_curve.csv", index=False)

    # Persist results
    as_of_max = signals["as_of"].max()
    if hasattr(as_of_max, "to_pydatetime"):
        as_of_max = as_of_max.to_pydatetime().date()
    try:
        with db() as con, con.cursor() as cur:
            cur.execute("""
                insert into model_a_backtests (as_of, sharpe, cagr, max_drawdown, created_at)
                values (%s, %s, %s, %s, now())
            """, (as_of_max, float(stats["sharpe"]), float(stats["cagr"]), float(stats["max_drawdown"])))
            con.commit()
    except psycopg2.errors.UndefinedTable:
        print("⚠️ model_a_backtests table not found; skipping DB insert.")
