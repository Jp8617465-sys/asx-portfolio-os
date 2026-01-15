"""
scripts/validate_deployment.py

Deployment Validation Script
=============================
Validates a deployed ASX Portfolio OS instance by checking:
- API health and connectivity
- Database integrity
- Endpoint functionality
- Data availability
- Cron job configuration

Usage:
    python scripts/validate_deployment.py --url https://your-app.onrender.com
    python scripts/validate_deployment.py --url http://localhost:8788 --skip-auth
"""

import argparse
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Tuple

import requests
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

# Color codes
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"


def log_test(name: str, passed: bool, details: str = ""):
    """Log a test result."""
    status = f"{GREEN}✅ PASS{RESET}" if passed else f"{RED}❌ FAIL{RESET}"
    print(f"{status} | {name}")
    if details:
        print(f"       {details}")


def test_health_endpoint(base_url: str) -> bool:
    """Test the /health endpoint."""
    try:
        response = requests.get(f"{base_url}/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            log_test("Health Endpoint", True, f"Status: {data.get('status')}")
            return True
        else:
            log_test("Health Endpoint", False, f"HTTP {response.status_code}")
            return False
    except Exception as e:
        log_test("Health Endpoint", False, str(e))
        return False


def test_database_connection() -> bool:
    """Test database connectivity."""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        log_test("Database Connection", False, "DATABASE_URL not set")
        return False

    try:
        conn = psycopg2.connect(db_url)
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
            table_count = cur.fetchone()[0]
        conn.close()
        log_test("Database Connection", True, f"{table_count} tables found")
        return True
    except Exception as e:
        log_test("Database Connection", False, str(e))
        return False


def test_data_availability() -> Tuple[bool, Dict]:
    """Check that key tables have data."""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        return False, {}

    tables_to_check = {
        "universe": 50,
        "prices": 10000,
        "features_technical": 1000,
    }

    results = {}
    all_passed = True

    try:
        conn = psycopg2.connect(db_url)
        for table, min_rows in tables_to_check.items():
            try:
                with conn.cursor() as cur:
                    cur.execute(f"SELECT COUNT(*) FROM {table};")
                    count = cur.fetchone()[0]
                results[table] = count
                passed = count >= min_rows
                if not passed:
                    all_passed = False
                log_test(
                    f"Data: {table}",
                    passed,
                    f"{count:,} rows (min: {min_rows:,})"
                )
            except psycopg2.errors.UndefinedTable:
                results[table] = 0
                all_passed = False
                log_test(f"Data: {table}", False, "Table not found")
                conn.rollback()
        conn.close()
    except Exception as e:
        log_test("Data Availability", False, str(e))
        return False, results

    return all_passed, results


def test_api_endpoints(base_url: str, api_key: str, skip_auth: bool = False) -> Dict[str, bool]:
    """Test key API endpoints."""
    headers = {} if skip_auth else {"x-api-key": api_key}

    endpoints = {
        "/health": (False, 200),  # No auth needed
        "/model/status/summary": (True, 200),
        "/signals/live": (True, 200),
        "/drift/summary": (True, 200),
    }

    results = {}

    for endpoint, (needs_auth, expected_status) in endpoints.items():
        try:
            use_headers = headers if needs_auth else {}
            response = requests.get(f"{base_url}{endpoint}", headers=use_headers, timeout=15)

            passed = response.status_code == expected_status
            if passed:
                # Also check response is valid JSON
                try:
                    data = response.json()
                    if "status" in data:
                        passed = data["status"] in ["ok", "healthy"]
                except:
                    pass

            results[endpoint] = passed
            log_test(
                f"Endpoint: {endpoint}",
                passed,
                f"HTTP {response.status_code}"
            )

        except Exception as e:
            results[endpoint] = False
            log_test(f"Endpoint: {endpoint}", False, str(e))

    return results


def test_model_artifacts() -> bool:
    """Check for trained model files."""
    model_dir = "models"

    if not os.path.exists(model_dir):
        log_test("Model Artifacts", False, f"Directory not found: {model_dir}")
        return False

    pkl_files = [f for f in os.listdir(model_dir) if f.endswith(".pkl")]

    if len(pkl_files) >= 2:  # At least classifier + regressor
        log_test("Model Artifacts", True, f"{len(pkl_files)} model files found")
        return True
    else:
        log_test("Model Artifacts", False, f"Only {len(pkl_files)} models (need >= 2)")
        return False


def test_feature_importance() -> bool:
    """Check for feature importance artifacts."""
    output_dir = "outputs"
    expected_file = os.path.join(output_dir, "feature_importance_latest.json")

    if os.path.exists(expected_file):
        log_test("Feature Importance", True, f"Found: {expected_file}")
        return True
    else:
        log_test("Feature Importance", False, f"Missing: {expected_file}")
        return False


def test_cron_configuration() -> bool:
    """Check if render.yaml has cron jobs configured."""
    render_yaml = "render.yaml"

    if not os.path.exists(render_yaml):
        log_test("Cron Configuration", False, "render.yaml not found")
        return False

    with open(render_yaml, "r") as f:
        content = f.read()

    expected_crons = [
        "asx-daily-prices",
        "asx-daily-announcements",
        "asx-weekly-fundamentals",
        "asx-weekly-features",
        "asx-weekly-drift",
    ]

    found_crons = [cron for cron in expected_crons if cron in content]

    if len(found_crons) == len(expected_crons):
        log_test("Cron Configuration", True, f"{len(found_crons)}/5 jobs configured")
        return True
    else:
        log_test("Cron Configuration", False, f"Only {len(found_crons)}/5 jobs found")
        return False


def main():
    parser = argparse.ArgumentParser(description="Validate deployment")
    parser.add_argument("--url", required=True, help="Base URL of deployed API")
    parser.add_argument("--skip-auth", action="store_true", help="Skip authenticated endpoint tests")

    args = parser.parse_args()

    base_url = args.url.rstrip("/")
    api_key = os.getenv("OS_API_KEY", "")

    print(f"\n{BLUE}{'='*60}")
    print("ASX PORTFOLIO OS - DEPLOYMENT VALIDATION")
    print(f"{'='*60}{RESET}\n")
    print(f"Target: {base_url}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    results = {
        "health": False,
        "database": False,
        "data": False,
        "endpoints": {},
        "models": False,
        "features": False,
        "crons": False,
    }

    # Test 1: Health endpoint
    print(f"\n{BLUE}[1/7] Testing Health Endpoint{RESET}")
    results["health"] = test_health_endpoint(base_url)

    # Test 2: Database connection
    print(f"\n{BLUE}[2/7] Testing Database Connection{RESET}")
    results["database"] = test_database_connection()

    # Test 3: Data availability
    print(f"\n{BLUE}[3/7] Checking Data Availability{RESET}")
    results["data"], data_details = test_data_availability()

    # Test 4: API endpoints
    print(f"\n{BLUE}[4/7] Testing API Endpoints{RESET}")
    if not args.skip_auth and not api_key:
        print(f"{YELLOW}⚠️  OS_API_KEY not set, skipping authenticated endpoints{RESET}")
    else:
        results["endpoints"] = test_api_endpoints(base_url, api_key, args.skip_auth)

    # Test 5: Model artifacts
    print(f"\n{BLUE}[5/7] Checking Model Artifacts{RESET}")
    results["models"] = test_model_artifacts()

    # Test 6: Feature importance
    print(f"\n{BLUE}[6/7] Checking Feature Importance{RESET}")
    results["features"] = test_feature_importance()

    # Test 7: Cron configuration
    print(f"\n{BLUE}[7/7] Checking Cron Configuration{RESET}")
    results["crons"] = test_cron_configuration()

    # Summary
    print(f"\n{BLUE}{'='*60}")
    print("VALIDATION SUMMARY")
    print(f"{'='*60}{RESET}\n")

    passed_tests = sum([
        results["health"],
        results["database"],
        results["data"],
        sum(results["endpoints"].values()) if results["endpoints"] else 0,
        results["models"],
        results["features"],
        results["crons"],
    ])

    total_tests = 7 + len(results["endpoints"])

    if passed_tests == total_tests:
        print(f"{GREEN}✅ ALL TESTS PASSED ({passed_tests}/{total_tests}){RESET}")
        print(f"\n{GREEN}🎉 Deployment is production-ready!{RESET}\n")
        sys.exit(0)
    else:
        print(f"{RED}❌ SOME TESTS FAILED ({passed_tests}/{total_tests}){RESET}")
        print(f"\n{YELLOW}⚠️  Review failures above and address issues.{RESET}\n")

        # Provide specific recommendations
        print("Recommendations:")
        if not results["health"]:
            print("  - Check if API is running and accessible")
        if not results["database"]:
            print("  - Verify DATABASE_URL is correct")
            print("  - Check Supabase project is active")
        if not results["data"]:
            print("  - Run bootstrap script: python scripts/bootstrap_production.py --full")
        if not results["models"]:
            print("  - Train models: python jobs/train_model_a_ml.py")
        if not results["features"]:
            print("  - Export features: python jobs/export_feature_importance.py")
        if not results["crons"]:
            print("  - Check render.yaml is committed and pushed")

        print()
        sys.exit(1)


if __name__ == "__main__":
    main()
