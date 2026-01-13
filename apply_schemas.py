import glob
import os
import re

import psycopg2
import requests
from dotenv import load_dotenv

# === 1️⃣ Load environment variables ===
load_dotenv(dotenv_path=".env", override=True)
DATABASE_URL = os.getenv("DATABASE_URL")
MODEL_A_API = os.getenv("MODEL_A_API", "https://asx-portfolio-os.onrender.com")
OS_API_KEY = os.getenv("OS_API_KEY")

if not DATABASE_URL:
    raise EnvironmentError("❌ DATABASE_URL not set. Please configure it in Render.")

print(f"🔌 Connecting to DB: {DATABASE_URL.split('@')[-1]} ...")

FALLBACK_SCHEMAS = {
    "fundamentals": """
create table if not exists fundamentals (
    id bigserial primary key,
    symbol text not null,
    pe_ratio numeric,
    pb_ratio numeric,
    eps numeric,
    roe numeric,
    debt_to_equity numeric,
    market_cap numeric,
    period_end date,
    updated_at timestamptz not null default now()
);
""",
    "etf_data": """
create table if not exists etf_data (
    id bigserial primary key,
    symbol text not null,
    etf_name text,
    sector text,
    nav numeric,
    return_1w numeric,
    return_1m numeric,
    sector_flow_1w numeric,
    sector_flow_1m numeric,
    flow_1w numeric,
    flow_1m numeric,
    updated_at timestamptz not null default now()
);
""",
    "sentiment": """
create table if not exists sentiment (
    id bigserial primary key,
    symbol text,
    dt date not null,
    finbert_mean numeric,
    news_polarity numeric,
    sentiment_score numeric,
    source text,
    updated_at timestamptz not null default now()
);
""",
    "macro_data": """
create table if not exists macro_data (
    id bigserial primary key,
    dt date not null,
    rba_cash_rate numeric,
    cpi numeric,
    unemployment numeric,
    yield_2y numeric,
    yield_10y numeric,
    yield_curve_slope numeric,
    updated_at timestamptz not null default now(),
    unique (dt)
);
""",
    "model_registry": """
create table if not exists model_registry (
    id bigserial primary key,
    model_name text not null,
    version text,
    run_id text,
    metrics jsonb,
    features jsonb,
    artifacts jsonb,
    created_at timestamptz not null default now()
);
""",
    "model_a_ml_signals": """
create table if not exists model_a_ml_signals (
    id bigserial primary key,
    as_of date not null,
    model text not null,
    symbol text not null,
    rank integer,
    score numeric,
    ml_prob numeric,
    ml_expected_return numeric,
    created_at timestamptz not null default now(),
    unique (as_of, model, symbol)
);
""",
    "model_a_drift_audit": """
create table if not exists model_a_drift_audit (
    id bigserial primary key,
    model text not null,
    baseline_label text not null,
    current_label text not null,
    metrics jsonb not null,
    created_at timestamptz not null default now()
);
""",
    "model_a_backtests": """
create table if not exists model_a_backtests (
    id bigserial primary key,
    as_of date not null,
    sharpe numeric,
    cagr numeric,
    max_drawdown numeric,
    created_at timestamptz not null default now()
);
""",
    "model_a_features_extended": """
create table if not exists model_a_features_extended (
    id bigserial primary key,
    as_of date not null,
    symbol text not null,
    features jsonb not null,
    created_at timestamptz not null default now(),
    unique (as_of, symbol)
);
""",
    "model_a_predictions": """
create table if not exists model_a_predictions (
    id bigserial primary key,
    as_of date not null,
    model text not null,
    version text,
    symbol text not null,
    score numeric,
    ml_prob numeric,
    ml_expected_return numeric,
    created_at timestamptz not null default now(),
    unique (as_of, model, symbol)
);
""",
    "property_assets": """
create table if not exists property_assets (
    id bigserial primary key,
    region text not null,
    avg_price numeric,
    avg_yield numeric,
    sample_count integer,
    created_at timestamptz not null default now()
);
""",
    "loan_accounts": """
create table if not exists loan_accounts (
    id bigserial primary key,
    principal numeric not null,
    annual_rate numeric not null,
    years integer not null,
    extra_payment numeric,
    monthly_payment numeric,
    total_interest numeric,
    created_at timestamptz not null default now()
);
""",
    "nlp_announcements": """
create table if not exists nlp_announcements (
    id bigserial primary key,
    dt date not null,
    code text,
    headline text,
    pdf_link text,
    sentiment text,
    event_type text,
    confidence numeric,
    stance text,
    relevance_score numeric,
    source text,
    parsed_text text,
    created_at timestamptz not null default now()
);
""",
    "fundamentals_history": """
create table if not exists fundamentals_history (
    id bigserial primary key,
    symbol text not null,
    as_of date not null,
    metric text not null,
    value numeric,
    source text default 'eodhd',
    created_at timestamptz not null default now()
);
create unique index if not exists fundamentals_history_symbol_asof_metric_uidx
    on fundamentals_history (symbol, as_of, metric);
""",
    "features_fundamental_trends": """
create table if not exists features_fundamental_trends (
    id bigserial primary key,
    symbol text not null,
    metric text not null,
    window_size integer not null,
    mean_value numeric,
    pct_change numeric,
    slope numeric,
    volatility numeric,
    as_of date not null,
    created_at timestamptz not null default now()
);
create unique index if not exists features_fundamental_trends_uidx
    on features_fundamental_trends (symbol, metric, window_size, as_of);
""",
    "risk_exposure_snapshot": """
create table if not exists risk_exposure_snapshot (
    id bigserial primary key,
    symbol text not null,
    as_of date not null,
    sector text,
    factor_vol numeric,
    beta_market numeric,
    factor_corr jsonb,
    created_at timestamptz not null default now()
);
create unique index if not exists risk_exposure_snapshot_uidx
    on risk_exposure_snapshot (symbol, as_of);
""",
    "portfolio_attribution": """
create table if not exists portfolio_attribution (
    id bigserial primary key,
    model text not null,
    as_of date not null,
    symbol text not null,
    weight numeric,
    return_1d numeric,
    contribution numeric,
    created_at timestamptz not null default now()
);
create index if not exists portfolio_attribution_model_asof_idx
    on portfolio_attribution (model, as_of);
""",
    "portfolio_performance": """
create table if not exists portfolio_performance (
    id bigserial primary key,
    model text not null,
    as_of date not null,
    portfolio_return numeric,
    volatility numeric,
    sharpe numeric,
    created_at timestamptz not null default now()
);
create unique index if not exists portfolio_performance_model_asof_uidx
    on portfolio_performance (model, as_of);
""",
    "model_feature_importance": """
create table if not exists model_feature_importance (
    id bigserial primary key,
    model_name text not null,
    model_version text not null,
    feature text not null,
    importance numeric,
    created_at timestamptz not null default now()
);
create unique index if not exists model_feature_importance_uidx
    on model_feature_importance (model_name, model_version, feature);
""",
}


def _extract_tables(sql_text: str) -> set:
    return set(re.findall(r"create\s+table\s+if\s+not\s+exists\s+([a-zA-Z0-9_]+)", sql_text, re.IGNORECASE))


# === 2️⃣ Apply all schema SQL files ===
def apply_schemas():
    sql_files = sorted(glob.glob("schemas/*.sql"))
    if not sql_files:
        print("⚠️ No SQL schema files found in /schemas. Skipping schema creation.")
        return set()

    expected_tables = set()

    with psycopg2.connect(DATABASE_URL) as conn:
        conn.autocommit = True
        cur = conn.cursor()

        for sql_file in sql_files:
            with open(sql_file, "r") as f:
                sql = f.read()
            expected_tables.update(_extract_tables(sql))
            try:
                cur.execute(sql)
                print(f"✅ Applied schema: {os.path.basename(sql_file)}")
            except Exception as e:
                conn.rollback()
                print(f"⚠️ Skipped {os.path.basename(sql_file)} (likely exists): {e}")

    print("🎯 All schema files processed successfully.")
    return expected_tables


def _fetch_existing_tables(conn) -> set:
    with conn.cursor() as cur:
        cur.execute(
            """
            select table_name
            from information_schema.tables
            where table_schema = 'public'
            """
        )
        return {row[0] for row in cur.fetchall()}


def _apply_fallbacks(expected_tables: set):
    with psycopg2.connect(DATABASE_URL) as conn:
        conn.autocommit = True
        existing = _fetch_existing_tables(conn)
        missing = (expected_tables | set(FALLBACK_SCHEMAS.keys())) - existing

        if not missing:
            print("✅ No missing tables detected.")
            return

        for table in sorted(missing):
            fallback_sql = FALLBACK_SCHEMAS.get(table)
            if not fallback_sql:
                print(f"⚠️ Missing table '{table}' with no fallback schema.")
                continue
            with conn.cursor() as cur:
                try:
                    cur.execute(fallback_sql)
                    print(f"✅ Created missing table '{table}' via fallback schema.")
                except Exception as e:
                    conn.rollback()
                    print(f"⚠️ Failed to create fallback table '{table}': {e}")


# === 3️⃣ Validate backend DB connectivity ===
def check_backend_db():
    print("\n🔍 Checking backend DB connection via API...")
    try:
        resp = requests.get(
            f"{MODEL_A_API}/model/status/summary",
            headers={"x-api-key": OS_API_KEY} if OS_API_KEY else None,
            timeout=15,
        )
        if resp.status_code == 200:
            print(f"✅ API connected successfully:\n{resp.text}")
        elif resp.status_code == 500:
            print("❌ API returned 500 — DB unreachable or not initialized.")
        else:
            print(f"⚠️ API responded with {resp.status_code}: {resp.text}")
    except requests.RequestException as e:
        print(f"❌ Failed to reach API: {e}")


# === 4️⃣ Execute ===
if __name__ == "__main__":
    print("🚀 Starting schema application + API DB check...\n")
    tables = apply_schemas()
    _apply_fallbacks(tables)
    check_backend_db()
    print("\n✅ Process complete. Ready to re-run persistence if DB check passes.")
