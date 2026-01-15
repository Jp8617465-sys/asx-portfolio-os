"""
scripts/bootstrap_production.py

Production Bootstrap Script
===========================
Executes the critical path for initial deployment:
1. Validates environment variables
2. Creates database schemas
3. Populates initial data (universe, prices, fundamentals)
4. Runs feature engineering
5. Validates data integrity

Usage:
    python scripts/bootstrap_production.py --full
    python scripts/bootstrap_production.py --skip-backfill  # Skip historical prices
    python scripts/bootstrap_production.py --validate-only  # Check env only
"""

import os
import sys
import argparse
import subprocess
from datetime import datetime, timedelta
from typing import List, Tuple, Optional

import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Color codes for terminal output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"


def log_info(msg: str):
    print(f"{BLUE}ℹ️  {msg}{RESET}")


def log_success(msg: str):
    print(f"{GREEN}✅ {msg}{RESET}")


def log_warning(msg: str):
    print(f"{YELLOW}⚠️  {msg}{RESET}")


def log_error(msg: str):
    print(f"{RED}❌ {msg}{RESET}")


def log_step(step: int, total: int, msg: str):
    print(f"\n{BLUE}{'='*60}")
    print(f"STEP {step}/{total}: {msg}")
    print(f"{'='*60}{RESET}\n")


def validate_env_vars() -> Tuple[bool, List[str]]:
    """Validate required environment variables."""
    required_vars = {
        "DATABASE_URL": "PostgreSQL connection string",
        "EODHD_API_KEY": "EODHD API key for market data",
        "OS_API_KEY": "Internal API key for authentication",
    }

    optional_vars = {
        "NEWS_API_KEY": "NewsAPI key for Model C (announcements)",
        "OPENAI_API_KEY": "OpenAI API key for assistant (paused)",
        "FRED_API_KEY": "FRED API key for macro data",
        "MODEL_C_TICKERS": "Comma-separated list of tickers for NLP",
        "MODEL_C_NEWS_LIMIT": "Max news articles per ticker",
    }

    missing = []
    warnings = []

    log_info("Validating environment variables...")

    for var, desc in required_vars.items():
        value = os.getenv(var)
        if not value:
            missing.append(f"{var} ({desc})")
            log_error(f"Missing required: {var}")
        else:
            # Mask sensitive values in logs
            masked = value[:8] + "..." if len(value) > 8 else "***"
            log_success(f"{var}: {masked}")

    for var, desc in optional_vars.items():
        value = os.getenv(var)
        if not value:
            warnings.append(f"{var} ({desc})")
            log_warning(f"Optional not set: {var} - {desc}")
        else:
            masked = value[:8] + "..." if len(value) > 8 else "***"
            log_success(f"{var}: {masked}")

    if missing:
        log_error(f"\n❌ Missing {len(missing)} required environment variables:")
        for var in missing:
            print(f"   - {var}")
        return False, missing

    if warnings:
        log_warning(f"\n⚠️  {len(warnings)} optional variables not set (some features disabled):")
        for var in warnings:
            print(f"   - {var}")

    return True, []


def validate_database_connection() -> bool:
    """Test database connectivity."""
    log_info("Testing database connection...")
    db_url = os.getenv("DATABASE_URL")

    try:
        conn = psycopg2.connect(db_url)
        with conn.cursor() as cur:
            cur.execute("SELECT version();")
            version = cur.fetchone()[0]
            log_success(f"Database connected: {version.split(',')[0]}")
        conn.close()
        return True
    except Exception as e:
        log_error(f"Database connection failed: {e}")
        return False


def apply_schemas() -> bool:
    """Apply database schemas."""
    log_info("Checking database schemas...")

    schema_dir = "schemas"
    if not os.path.exists(schema_dir):
        log_error(f"Schema directory not found: {schema_dir}")
        return False

    schema_files = [f for f in os.listdir(schema_dir) if f.endswith(".sql")]
    log_info(f"Found {len(schema_files)} schema files")

    db_url = os.getenv("DATABASE_URL")
    conn = psycopg2.connect(db_url)

    for schema_file in sorted(schema_files):
        try:
            with open(os.path.join(schema_dir, schema_file), "r") as f:
                sql = f.read()
            with conn.cursor() as cur:
                cur.execute(sql)
            conn.commit()
            log_success(f"Applied: {schema_file}")
        except psycopg2.errors.DuplicateTable:
            log_info(f"Already exists: {schema_file}")
            conn.rollback()
        except Exception as e:
            log_error(f"Failed to apply {schema_file}: {e}")
            conn.rollback()
            return False

    conn.close()
    log_success("All schemas applied")
    return True


def run_job(script_path: str, timeout: int = 600) -> bool:
    """Run a data ingestion job."""
    log_info(f"Running: {script_path}")

    try:
        result = subprocess.run(
            ["python", script_path],
            capture_output=True,
            text=True,
            timeout=timeout,
        )

        if result.returncode == 0:
            log_success(f"Completed: {script_path}")
            if result.stdout:
                print(result.stdout)
            return True
        else:
            log_error(f"Failed: {script_path} (exit code {result.returncode})")
            if result.stderr:
                print(result.stderr)
            return False

    except subprocess.TimeoutExpired:
        log_error(f"Timeout: {script_path} exceeded {timeout}s")
        return False
    except Exception as e:
        log_error(f"Error running {script_path}: {e}")
        return False


def validate_data_integrity() -> bool:
    """Check that key tables have data."""
    log_info("Validating data integrity...")

    db_url = os.getenv("DATABASE_URL")
    conn = psycopg2.connect(db_url)

    checks = [
        ("universe", "Universe table (ASX tickers)", 50),
        ("prices", "Price data", 10000),
        ("features_technical", "Technical features", 1000),
    ]

    all_passed = True

    for table, desc, min_rows in checks:
        try:
            with conn.cursor() as cur:
                cur.execute(f"SELECT COUNT(*) FROM {table};")
                count = cur.fetchone()[0]

            if count >= min_rows:
                log_success(f"{desc}: {count:,} rows ✓")
            else:
                log_warning(f"{desc}: {count:,} rows (expected >= {min_rows:,})")
                all_passed = False

        except psycopg2.errors.UndefinedTable:
            log_error(f"{desc}: Table not found")
            all_passed = False
            conn.rollback()
        except Exception as e:
            log_error(f"{desc}: Check failed - {e}")
            all_passed = False
            conn.rollback()

    conn.close()
    return all_passed


def main():
    parser = argparse.ArgumentParser(description="Bootstrap production environment")
    parser.add_argument("--full", action="store_true", help="Run full bootstrap")
    parser.add_argument("--validate-only", action="store_true", help="Only validate environment")
    parser.add_argument("--skip-backfill", action="store_true", help="Skip historical price backfill")
    parser.add_argument("--backfill-days", type=int, default=730, help="Days of historical prices")

    args = parser.parse_args()

    print(f"\n{BLUE}{'='*60}")
    print("ASX PORTFOLIO OS - PRODUCTION BOOTSTRAP")
    print(f"{'='*60}{RESET}\n")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    # Step 1: Validate environment
    log_step(1, 7, "Validate Environment Variables")
    valid, missing = validate_env_vars()
    if not valid:
        log_error("Environment validation failed. Set missing variables and retry.")
        sys.exit(1)

    log_step(2, 7, "Test Database Connection")
    if not validate_database_connection():
        log_error("Database connection failed. Check DATABASE_URL.")
        sys.exit(1)

    if args.validate_only:
        log_success("\n✅ Environment validation passed!")
        sys.exit(0)

    # Step 3: Apply schemas
    log_step(3, 7, "Apply Database Schemas")
    if not apply_schemas():
        log_error("Schema application failed.")
        sys.exit(1)

    # Step 4: Populate universe
    log_step(4, 7, "Populate Universe (ASX Tickers)")
    if not run_job("jobs/refresh_universe.py", timeout=300):
        log_error("Universe population failed.")
        sys.exit(1)

    # Step 5: Backfill prices (optional)
    if not args.skip_backfill:
        log_step(5, 7, f"Backfill Historical Prices ({args.backfill_days} days)")
        log_warning(f"This may take 20-30 minutes for {args.backfill_days} days of data...")
        if not run_job("jobs/backfill_prices.py", timeout=3600):
            log_error("Price backfill failed.")
            sys.exit(1)
    else:
        log_warning("Skipping price backfill (--skip-backfill flag)")

    # Step 6: Load fundamentals
    log_step(6, 7, "Load Fundamentals & Features")
    jobs = [
        ("scripts/cron_weekly_fundamentals.py", 600, "Fundamentals ingestion"),
        ("scripts/cron_weekly_features.py", 600, "Feature engineering"),
    ]

    for job_path, timeout, desc in jobs:
        log_info(f"Running: {desc}")
        if not run_job(job_path, timeout=timeout):
            log_warning(f"{desc} failed (non-critical, continuing...)")

    # Step 7: Validate data
    log_step(7, 7, "Validate Data Integrity")
    if validate_data_integrity():
        log_success("Data integrity checks passed")
    else:
        log_warning("Some data integrity checks failed (review warnings above)")

    # Final summary
    print(f"\n{GREEN}{'='*60}")
    print("✅ BOOTSTRAP COMPLETE")
    print(f"{'='*60}{RESET}\n")

    print("Next steps:")
    print("1. Train models: python jobs/train_model_a_ml.py")
    print("2. Run backtest: python jobs/backtest_model_a_ml.py")
    print("3. Validate API: python scripts/validate_deployment.py")
    print()


if __name__ == "__main__":
    main()
