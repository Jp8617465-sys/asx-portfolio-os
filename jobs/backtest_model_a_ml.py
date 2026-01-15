"""
jobs/backtest_model_a_ml.py
Rolling walk-forward backtest for Model A ML signals with performance & drift tracking.

Supports:
- Walk-forward validation (train on N months, test on 1 month, roll forward)
- Rolling window analysis
- Out-of-sample performance tracking
- Drift detection between periods
"""

import os
import json
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from typing import Optional, List, Dict, Any

import pandas as pd
import numpy as np
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env", override=True)

DATABASE_URL = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL")
TRAIN_MONTHS = int(os.getenv("BACKTEST_TRAIN_MONTHS", "12"))
TEST_MONTHS = int(os.getenv("BACKTEST_TEST_MONTHS", "1"))
TOP_N = int(os.getenv("BACKTEST_TOP_N", "50"))
INITIAL_CAPITAL = float(os.getenv("BACKTEST_INITIAL_CAPITAL", "1000000"))

if not DATABASE_URL or DATABASE_URL.strip() in ["...", ""]:
    raise ValueError("DATABASE_URL not set in .env")


def db():
    """Create database connection."""
    return psycopg2.connect(DATABASE_URL)


def load_prices(start_date, end_date) -> pd.DataFrame:
    """Load price data from database."""
    with db() as con:
        df = pd.read_sql(
            """
            SELECT symbol, dt, close, volume
            FROM prices
            WHERE dt >= %s AND dt <= %s
            ORDER BY symbol, dt
            """,
            con,
            params=(start_date, end_date),
        )
    if df.empty:
        return df
    df["dt"] = pd.to_datetime(df["dt"])
    df = df.sort_values(["symbol", "dt"])
    df["daily_return"] = df.groupby("symbol")["close"].pct_change()
    df["fwd_return_1d"] = df.groupby("symbol")["daily_return"].shift(-1)
    df["fwd_return_5d"] = df.groupby("symbol")["close"].pct_change(5).shift(-5)
    df["fwd_return_21d"] = df.groupby("symbol")["close"].pct_change(21).shift(-21)
    return df


def load_signals_from_db(start_date, end_date) -> pd.DataFrame:
    """Load ML signals from database."""
    with db() as con:
        df = pd.read_sql(
            """
            SELECT as_of, symbol, model, rank, score, ml_prob, ml_expected_return
            FROM model_a_ml_signals
            WHERE as_of >= %s AND as_of <= %s
            ORDER BY as_of, rank
            """,
            con,
            params=(start_date, end_date),
        )
    if not df.empty:
        df["as_of"] = pd.to_datetime(df["as_of"])
    return df


def load_signals_from_csv(path: str = "outputs/model_a_ml_signals_latest.csv") -> pd.DataFrame:
    """Load ML signals from CSV file."""
    if not os.path.exists(path):
        return pd.DataFrame()
    df = pd.read_csv(path)
    if "as_of" in df.columns:
        df["as_of"] = pd.to_datetime(df["as_of"])
    elif "dt" in df.columns:
        df["as_of"] = pd.to_datetime(df["dt"])
    return df


def compute_technical_signals(prices: pd.DataFrame, as_of_date) -> pd.DataFrame:
    """Compute momentum signals for a given date (used when ML signals unavailable)."""
    px = prices[prices["dt"] <= pd.Timestamp(as_of_date)].copy()
    if px.empty:
        return pd.DataFrame()

    latest = px.groupby("symbol").tail(1).copy()

    # Compute momentum features
    for symbol in latest["symbol"].unique():
        sym_data = px[px["symbol"] == symbol].tail(252)
        if len(sym_data) < 126:
            continue
        close = sym_data["close"].values
        mom_6 = (close[-1] / close[-126] - 1) if len(close) >= 126 else np.nan
        mom_12_1 = (close[-21] / close[-252] - 1) if len(close) >= 252 else np.nan
        vol_90 = sym_data["daily_return"].tail(90).std() if len(sym_data) >= 90 else np.nan

        latest.loc[latest["symbol"] == symbol, "mom_6"] = mom_6
        latest.loc[latest["symbol"] == symbol, "mom_12_1"] = mom_12_1
        latest.loc[latest["symbol"] == symbol, "vol_90"] = vol_90

    # Score and rank
    latest = latest.dropna(subset=["mom_6", "mom_12_1"])
    if latest.empty:
        return pd.DataFrame()

    latest["score"] = 0.75 * _zscore(latest["mom_12_1"]) + 0.25 * _zscore(latest["mom_6"])
    latest = latest.sort_values("score", ascending=False)
    latest["rank"] = range(1, len(latest) + 1)
    latest["as_of"] = pd.Timestamp(as_of_date)
    return latest[["as_of", "symbol", "rank", "score", "mom_6", "mom_12_1", "vol_90"]]


def _zscore(s: pd.Series) -> pd.Series:
    """Compute z-score of a series."""
    return (s - s.mean()) / (s.std(ddof=0) + 1e-12)


def run_single_period_backtest(
    signals: pd.DataFrame,
    prices: pd.DataFrame,
    start_date,
    end_date,
    top_n: int = TOP_N,
    initial_capital: float = INITIAL_CAPITAL,
) -> Dict[str, Any]:
    """Run backtest for a single period."""
    signals = signals.copy()
    prices = prices.copy()

    # Filter to period
    signals = signals[(signals["as_of"] >= pd.Timestamp(start_date)) & (signals["as_of"] <= pd.Timestamp(end_date))]
    prices = prices[(prices["dt"] >= pd.Timestamp(start_date)) & (prices["dt"] <= pd.Timestamp(end_date))]

    if signals.empty or prices.empty:
        return {"equity_curve": [], "stats": None, "error": "No data for period"}

    # Determine score column
    score_col = "ml_prob" if "ml_prob" in signals.columns and signals["ml_prob"].notna().any() else "score"

    equity_curve = []
    capital = initial_capital
    daily_returns = []

    # Get unique signal dates
    signal_dates = sorted(signals["as_of"].dt.date.unique())

    for sig_date in signal_dates:
        day_signals = signals[signals["as_of"].dt.date == sig_date]
        day_signals = day_signals.sort_values(score_col, ascending=False).head(top_n)

        if day_signals.empty:
            continue

        # Get next day returns
        next_day = pd.Timestamp(sig_date) + timedelta(days=1)
        while next_day.weekday() >= 5:  # Skip weekends
            next_day += timedelta(days=1)

        day_prices = prices[prices["dt"].dt.date == next_day.date()]
        if day_prices.empty:
            continue

        # Calculate portfolio return (equal weight)
        n_positions = len(day_signals)
        weight = 1.0 / n_positions
        port_return = 0.0
        matched = 0

        for _, sig in day_signals.iterrows():
            sym_price = day_prices[day_prices["symbol"] == sig["symbol"]]
            if not sym_price.empty and "daily_return" in sym_price.columns:
                ret = sym_price["daily_return"].iloc[0]
                if pd.notna(ret):
                    port_return += weight * ret
                    matched += 1

        if matched > 0:
            capital *= (1 + port_return)
            daily_returns.append(port_return)
            equity_curve.append({
                "date": sig_date,
                "equity": capital,
                "return": port_return,
                "n_positions": matched,
            })

    if not equity_curve:
        return {"equity_curve": [], "stats": None, "error": "No matched positions"}

    # Compute stats
    returns = np.array(daily_returns)
    stats = {
        "start_date": str(start_date),
        "end_date": str(end_date),
        "n_days": len(returns),
        "total_return": float(capital / initial_capital - 1),
        "mean_daily_return": float(np.mean(returns)) if len(returns) > 0 else 0.0,
        "std_daily_return": float(np.std(returns)) if len(returns) > 0 else 0.0,
        "sharpe": float(np.mean(returns) / (np.std(returns) + 1e-12) * np.sqrt(252)),
        "max_drawdown": float(_compute_max_drawdown(equity_curve)),
        "win_rate": float(np.sum(returns > 0) / len(returns)) if len(returns) > 0 else 0.0,
    }

    return {"equity_curve": equity_curve, "stats": stats, "error": None}


def _compute_max_drawdown(equity_curve: List[Dict]) -> float:
    """Compute maximum drawdown from equity curve."""
    if not equity_curve:
        return 0.0
    equities = [e["equity"] for e in equity_curve]
    peak = equities[0]
    max_dd = 0.0
    for eq in equities:
        if eq > peak:
            peak = eq
        dd = (peak - eq) / peak
        if dd > max_dd:
            max_dd = dd
    return max_dd


def run_walk_forward_backtest(
    start_date,
    end_date,
    train_months: int = TRAIN_MONTHS,
    test_months: int = TEST_MONTHS,
    top_n: int = TOP_N,
    use_db_signals: bool = True,
) -> Dict[str, Any]:
    """
    Run walk-forward validation backtest.

    Args:
        start_date: Start of backtest period
        end_date: End of backtest period
        train_months: Number of months for training window
        test_months: Number of months for test window
        top_n: Number of top stocks to hold
        use_db_signals: Whether to load signals from DB (vs compute from prices)

    Returns:
        Dictionary with results for each fold and aggregate stats
    """
    print(f"🚀 Starting walk-forward backtest from {start_date} to {end_date}")
    print(f"   Train window: {train_months} months, Test window: {test_months} months")

    # Load all price data
    prices = load_prices(start_date, end_date)
    if prices.empty:
        return {"error": "No price data available", "folds": [], "aggregate": None}

    print(f"   Loaded {len(prices):,} price rows")

    # Load or generate signals
    if use_db_signals:
        signals = load_signals_from_db(start_date, end_date)
        if signals.empty:
            signals = load_signals_from_csv()
    else:
        signals = pd.DataFrame()

    # Generate rolling windows
    current_start = pd.Timestamp(start_date)
    end_ts = pd.Timestamp(end_date)
    folds = []

    while current_start + relativedelta(months=train_months + test_months) <= end_ts:
        train_end = current_start + relativedelta(months=train_months)
        test_start = train_end
        test_end = test_start + relativedelta(months=test_months)

        fold = {
            "fold_id": len(folds) + 1,
            "train_start": current_start.date(),
            "train_end": train_end.date(),
            "test_start": test_start.date(),
            "test_end": test_end.date(),
        }

        # If no signals available, compute technical signals
        if signals.empty:
            fold_signals = compute_technical_signals(prices, train_end)
        else:
            fold_signals = signals[
                (signals["as_of"] >= pd.Timestamp(test_start)) &
                (signals["as_of"] < pd.Timestamp(test_end))
            ]

        # Run test period backtest
        result = run_single_period_backtest(
            fold_signals if not fold_signals.empty else signals,
            prices,
            test_start,
            test_end,
            top_n=top_n,
        )

        fold["result"] = result
        fold["stats"] = result.get("stats")
        fold["error"] = result.get("error")
        folds.append(fold)

        print(f"   Fold {fold['fold_id']}: {test_start.date()} to {test_end.date()} | "
              f"Sharpe: {fold['stats']['sharpe']:.2f}" if fold["stats"] else f"   Fold {fold['fold_id']}: Error")

        # Roll forward
        current_start += relativedelta(months=test_months)

    if not folds:
        return {"error": "No valid folds generated", "folds": [], "aggregate": None}

    # Aggregate statistics across folds
    valid_folds = [f for f in folds if f.get("stats")]
    if valid_folds:
        aggregate = {
            "n_folds": len(valid_folds),
            "mean_sharpe": float(np.mean([f["stats"]["sharpe"] for f in valid_folds])),
            "std_sharpe": float(np.std([f["stats"]["sharpe"] for f in valid_folds])),
            "mean_return": float(np.mean([f["stats"]["total_return"] for f in valid_folds])),
            "mean_max_dd": float(np.mean([f["stats"]["max_drawdown"] for f in valid_folds])),
            "mean_win_rate": float(np.mean([f["stats"]["win_rate"] for f in valid_folds])),
        }
    else:
        aggregate = None

    return {"folds": folds, "aggregate": aggregate, "error": None}


def persist_backtest_results(results: Dict[str, Any], model: str = "model_a_ml"):
    """Persist backtest results to database."""
    if results.get("error") or not results.get("aggregate"):
        print("⚠️ No valid results to persist")
        return

    agg = results["aggregate"]
    as_of = datetime.utcnow().date()

    try:
        with db() as con, con.cursor() as cur:
            cur.execute(
                """
                INSERT INTO model_a_backtests (
                    as_of, model, n_folds, sharpe, sharpe_std,
                    mean_return, mean_max_dd, mean_win_rate, details, created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, NOW())
                ON CONFLICT (as_of, model) DO UPDATE SET
                    n_folds = EXCLUDED.n_folds,
                    sharpe = EXCLUDED.sharpe,
                    sharpe_std = EXCLUDED.sharpe_std,
                    mean_return = EXCLUDED.mean_return,
                    mean_max_dd = EXCLUDED.mean_max_dd,
                    mean_win_rate = EXCLUDED.mean_win_rate,
                    details = EXCLUDED.details,
                    created_at = NOW()
                """,
                (
                    as_of,
                    model,
                    agg["n_folds"],
                    agg["mean_sharpe"],
                    agg["std_sharpe"],
                    agg["mean_return"],
                    agg["mean_max_dd"],
                    agg["mean_win_rate"],
                    json.dumps({"folds": [{"fold_id": f["fold_id"], "stats": f["stats"]} for f in results["folds"]]}),
                ),
            )
            con.commit()
            print(f"✅ Persisted backtest results for {model} as of {as_of}")
    except psycopg2.errors.UndefinedTable:
        print("⚠️ model_a_backtests table not found; creating it...")
        _create_backtests_table()
        persist_backtest_results(results, model)
    except Exception as e:
        print(f"❌ Failed to persist backtest results: {e}")


def _create_backtests_table():
    """Create backtests table if it doesn't exist."""
    with db() as con, con.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS model_a_backtests (
                id SERIAL PRIMARY KEY,
                as_of DATE NOT NULL,
                model VARCHAR(50) NOT NULL DEFAULT 'model_a_ml',
                n_folds INTEGER,
                sharpe NUMERIC,
                sharpe_std NUMERIC,
                mean_return NUMERIC,
                mean_max_dd NUMERIC,
                mean_win_rate NUMERIC,
                details JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(as_of, model)
            )
        """)
        con.commit()


def main(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    train_months: int = TRAIN_MONTHS,
    test_months: int = TEST_MONTHS,
    top_n: int = TOP_N,
    persist: bool = True,
):
    """Main entry point for backtest."""
    # Default to last 3 years
    if not end_date:
        end_date = datetime.utcnow().date()
    else:
        end_date = pd.Timestamp(end_date).date()

    if not start_date:
        start_date = end_date - relativedelta(years=3)
    else:
        start_date = pd.Timestamp(start_date).date()

    results = run_walk_forward_backtest(
        start_date=start_date,
        end_date=end_date,
        train_months=train_months,
        test_months=test_months,
        top_n=top_n,
    )

    if results.get("error"):
        print(f"❌ Backtest failed: {results['error']}")
        return results

    agg = results.get("aggregate")
    if agg:
        print(f"\n📊 Aggregate Results ({agg['n_folds']} folds):")
        print(f"   Mean Sharpe: {agg['mean_sharpe']:.2f} ± {agg['std_sharpe']:.2f}")
        print(f"   Mean Return: {agg['mean_return']:.2%}")
        print(f"   Mean Max DD: {agg['mean_max_dd']:.2%}")
        print(f"   Mean Win Rate: {agg['mean_win_rate']:.1%}")

    # Save results
    os.makedirs("outputs", exist_ok=True)
    output_path = f"outputs/backtest_walk_forward_{datetime.utcnow().strftime('%Y%m%d')}.json"
    with open(output_path, "w") as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\n📁 Results saved to {output_path}")

    if persist:
        persist_backtest_results(results)

    return results


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Run walk-forward backtest for Model A ML")
    parser.add_argument("--start", type=str, help="Start date (YYYY-MM-DD)")
    parser.add_argument("--end", type=str, help="End date (YYYY-MM-DD)")
    parser.add_argument("--train-months", type=int, default=TRAIN_MONTHS, help="Training window in months")
    parser.add_argument("--test-months", type=int, default=TEST_MONTHS, help="Test window in months")
    parser.add_argument("--top-n", type=int, default=TOP_N, help="Number of top stocks to hold")
    parser.add_argument("--no-persist", action="store_true", help="Don't persist results to DB")

    args = parser.parse_args()

    main(
        start_date=args.start,
        end_date=args.end,
        train_months=args.train_months,
        test_months=args.test_months,
        top_n=args.top_n,
        persist=not args.no_persist,
    )
