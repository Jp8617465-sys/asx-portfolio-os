#!/usr/bin/env python3
"""
scripts/seed_initial_data.py
Initialize the database with live data from EODHD.

This script populates the database with initial data required for the app to function:
1. ASX stock universe (all symbols)
2. Latest prices (last trading day)
3. Fundamentals data for major stocks
4. Initial ML signals (if models are available)

Usage:
    python scripts/seed_initial_data.py
    python scripts/seed_initial_data.py --skip-signals  # Skip ML signal generation
    python scripts/seed_initial_data.py --skip-fundamentals  # Skip fundamentals fetch
"""

import argparse
import os
import sys
import subprocess
import time
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv(dotenv_path=".env", override=True)

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


def validate_env():
    """Validate required environment variables."""
    required = ["DATABASE_URL", "EODHD_API_KEY"]
    missing = [var for var in required if not os.getenv(var)]
    
    if missing:
        log_error(f"Missing required environment variables: {', '.join(missing)}")
        log_info("Please set these in your .env file:")
        for var in missing:
            print(f"  {var}=your_value_here")
        return False
    
    log_success("Environment variables validated")
    return True


def run_job(script_path: str, description: str, timeout: int = 600) -> bool:
    """Run a Python job script."""
    log_info(f"Running: {description}")
    start = time.time()
    
    try:
        result = subprocess.run(
            [sys.executable, script_path],
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )
        
        elapsed = time.time() - start
        
        if result.returncode == 0:
            log_success(f"Completed in {elapsed:.1f}s: {description}")
            if result.stdout:
                # Print last few lines of output
                lines = result.stdout.strip().split('\n')
                for line in lines[-5:]:
                    print(f"  {line}")
            return True
        else:
            log_error(f"Failed: {description}")
            if result.stderr:
                print(result.stderr[-500:])
            if result.stdout:
                print(result.stdout[-500:])
            return False
            
    except subprocess.TimeoutExpired:
        log_error(f"Timeout after {timeout}s: {description}")
        return False
    except Exception as e:
        log_error(f"Error running {description}: {e}")
        return False


def check_database_tables():
    """Check which tables exist and their row counts."""
    import psycopg2
    
    db_url = os.getenv("DATABASE_URL")
    tables = ["universe", "prices", "fundamentals", "model_a_ml_signals", "user_watchlist"]
    
    log_info("Checking database tables...")
    
    try:
        with psycopg2.connect(db_url) as conn, conn.cursor() as cur:
            for table in tables:
                try:
                    cur.execute(f"SELECT COUNT(*) FROM {table}")
                    count = cur.fetchone()[0]
                    status = "✓" if count > 0 else "○"
                    print(f"  {status} {table}: {count:,} rows")
                except psycopg2.errors.UndefinedTable:
                    print(f"  ✗ {table}: table does not exist")
                    conn.rollback()
    except Exception as e:
        log_error(f"Database check failed: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="Initialize database with live EODHD data"
    )
    parser.add_argument(
        "--skip-fundamentals",
        action="store_true",
        help="Skip fetching fundamentals data"
    )
    parser.add_argument(
        "--skip-signals",
        action="store_true",
        help="Skip generating ML signals"
    )
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Only check current database state, don't seed data"
    )
    
    args = parser.parse_args()
    
    print(f"\n{BLUE}{'='*60}")
    print("ASX PORTFOLIO OS - INITIAL DATA SEEDING")
    print(f"{'='*60}{RESET}\n")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    if not validate_env():
        sys.exit(1)
    
    if args.check_only:
        check_database_tables()
        sys.exit(0)
    
    # Calculate total steps
    total_steps = 3  # Always: universe, prices, check
    if not args.skip_fundamentals:
        total_steps += 1
    if not args.skip_signals:
        total_steps += 1
    
    current_step = 0
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Step 1: Refresh Universe
    current_step += 1
    log_step(current_step, total_steps, "Refresh ASX Universe")
    if not run_job(
        os.path.join(project_root, "jobs/refresh_universe_job.py"),
        "ASX Universe refresh from EODHD",
        timeout=120
    ):
        log_error("Universe refresh failed. Cannot continue without universe data.")
        sys.exit(1)
    
    # Step 2: Sync Latest Prices
    current_step += 1
    log_step(current_step, total_steps, "Sync Latest Prices")
    if not run_job(
        os.path.join(project_root, "jobs/sync_prices_direct_job.py"),
        "Price sync from EODHD bulk endpoint",
        timeout=300
    ):
        log_warning("Price sync failed. App will work but won't show current prices.")
    
    # Step 3: Fetch Fundamentals (optional)
    if not args.skip_fundamentals:
        current_step += 1
        log_step(current_step, total_steps, "Fetch Fundamentals Data")
        
        # Set environment for sample mode (faster for initial seed)
        env = os.environ.copy()
        env["FUNDAMENTALS_MODE"] = "sample"
        env["FUNDAMENTALS_TICKERS"] = "BHP,CBA,CSL,WES,FMG,WBC,NAB,ANZ,MQG,RIO,WOW,TLS,WPL,NCM,STO"
        
        try:
            result = subprocess.run(
                [sys.executable, os.path.join(project_root, "jobs/load_fundamentals_pipeline.py")],
                capture_output=True,
                text=True,
                timeout=600,
                env=env,
                cwd=project_root
            )
            if result.returncode == 0:
                log_success("Fundamentals loaded for major stocks")
            else:
                log_warning("Fundamentals fetch had issues (non-critical)")
                if result.stderr:
                    print(result.stderr[-300:])
        except Exception as e:
            log_warning(f"Fundamentals fetch failed (non-critical): {e}")
    
    # Step 4: Generate ML Signals (optional)
    if not args.skip_signals:
        current_step += 1
        log_step(current_step, total_steps, "Generate ML Signals")
        
        # Check if models exist
        model_path = os.path.join(project_root, "models/model_a_v1_4_classifier.pkl")
        if os.path.exists(model_path):
            if not run_job(
                os.path.join(project_root, "jobs/generate_signals.py"),
                "ML signal generation",
                timeout=600
            ):
                log_warning("Signal generation failed. App will work without signals.")
        else:
            log_warning("ML models not found. Skipping signal generation.")
            log_info("Train models with: python models/train_model_a_ml.py")
    
    # Final Step: Check Database State
    current_step += 1
    log_step(current_step, total_steps, "Verify Data Integrity")
    check_database_tables()
    
    # Summary
    print(f"\n{GREEN}{'='*60}")
    print("✅ INITIAL DATA SEEDING COMPLETE")
    print(f"{'='*60}{RESET}\n")
    
    print("Your app should now have:")
    print("  • ASX stock universe (searchable stocks)")
    print("  • Latest price data")
    if not args.skip_fundamentals:
        print("  • Fundamentals for major stocks")
    if not args.skip_signals:
        print("  • ML signals (if models were available)")
    
    print("\nNext steps:")
    print("  1. Start the API: uvicorn app.main:app --host 0.0.0.0 --port 8790")
    print("  2. Start the frontend: cd frontend && npm run dev")
    print("  3. Set up cron jobs for continuous data updates (see render.yaml)")
    print()


if __name__ == "__main__":
    main()
