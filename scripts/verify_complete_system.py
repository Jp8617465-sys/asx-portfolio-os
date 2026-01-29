#!/usr/bin/env python3
"""
Complete system verification script.
Verifies all components of the V1 & V2 implementation.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core import db_context, logger


def verify_database_tables():
    """Verify all required database tables exist."""
    print("\n" + "=" * 70)
    print("1. DATABASE TABLES VERIFICATION")
    print("=" * 70)

    required_tables = {
        "User Management": ["user_accounts", "user_preferences", "user_settings"],
        "Notifications": ["notifications", "alert_preferences"],
        "Portfolio": ["user_portfolios", "user_holdings", "portfolio_rebalancing_suggestions", "portfolio_risk_metrics"],
        "V1 (Model A)": ["model_a_ml_signals", "model_a_runs", "model_a_drift_audit"],
        "V2 (Model B)": ["model_b_ml_signals", "ensemble_signals", "fundamentals"],
        "Core Data": ["prices", "universe", "signals"]
    }

    all_passed = True

    with db_context() as conn:
        cur = conn.cursor()

        for category, tables in required_tables.items():
            print(f"\n{category}:")
            for table in tables:
                cur.execute(
                    """
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_schema = 'public' AND table_name = %s
                    )
                    """,
                    (table,)
                )
                exists = cur.fetchone()[0]

                status = "✅" if exists else "❌"
                print(f"  {status} {table}")

                if not exists:
                    all_passed = False

    return all_passed


def verify_stored_procedures():
    """Verify all required stored procedures exist."""
    print("\n" + "=" * 70)
    print("2. STORED PROCEDURES VERIFICATION")
    print("=" * 70)

    required_functions = [
        "sync_holding_prices",
        "update_portfolio_totals",
        "sync_portfolio_prices",
        "sync_all_portfolio_prices",
        "update_updated_at_column",
        "auto_expire_notifications"
    ]

    all_passed = True

    with db_context() as conn:
        cur = conn.cursor()

        print()
        for func in required_functions:
            cur.execute(
                """
                SELECT EXISTS (
                    SELECT FROM pg_proc
                    WHERE proname = %s
                )
                """,
                (func,)
            )
            exists = cur.fetchone()[0]

            status = "✅" if exists else "❌"
            print(f"  {status} {func}()")

            if not exists:
                all_passed = False

    return all_passed


def verify_demo_data():
    """Verify demo users and sample data exist."""
    print("\n" + "=" * 70)
    print("3. DEMO DATA VERIFICATION")
    print("=" * 70)

    all_passed = True

    with db_context() as conn:
        cur = conn.cursor()

        # Check demo users
        print("\nDemo Users:")
        cur.execute("SELECT username, email FROM user_accounts WHERE username IN ('demo_user', 'test_user')")
        users = cur.fetchall()

        if len(users) >= 2:
            print(f"  ✅ {len(users)} demo users created")
            for username, email in users:
                print(f"      - {username} ({email})")
        else:
            print(f"  ❌ Only {len(users)} demo users found (expected 2)")
            all_passed = False

        # Check demo portfolio
        print("\nDemo Portfolio:")
        cur.execute("""
            SELECT p.name, COUNT(h.id) as holding_count
            FROM user_portfolios p
            LEFT JOIN user_holdings h ON h.portfolio_id = p.id
            JOIN user_accounts u ON p.user_id = u.user_id
            WHERE u.username = 'demo_user'
            GROUP BY p.id, p.name
        """)
        portfolio = cur.fetchone()

        if portfolio:
            print(f"  ✅ Portfolio: {portfolio[0]} ({portfolio[1]} holdings)")
        else:
            print(f"  ❌ No demo portfolio found")
            all_passed = False

        # Check sample notifications
        print("\nSample Notifications:")
        cur.execute("""
            SELECT COUNT(*)
            FROM notifications n
            JOIN user_accounts u ON n.user_id = u.user_id
            WHERE u.username = 'demo_user'
        """)
        notif_count = cur.fetchone()[0]
        print(f"  ✅ {notif_count} sample notifications created")

    return all_passed


def verify_api_imports():
    """Verify all API route modules can be imported."""
    print("\n" + "=" * 70)
    print("4. API ROUTE IMPORTS VERIFICATION")
    print("=" * 70)

    modules = [
        ("app.routes.auth_routes", "Authentication Routes"),
        ("app.routes.user_routes", "User Management Routes"),
        ("app.routes.notification_routes", "Notification Routes"),
        ("app.routes.portfolio_management", "Portfolio Management"),
        ("app.routes.fundamentals", "V2: Fundamentals"),
        ("app.routes.ensemble", "V2: Ensemble"),
        ("app.routes.model", "V1: Model A"),
        ("app.routes.signals", "V1: Signals"),
    ]

    all_passed = True

    print()
    for module_name, description in modules:
        try:
            __import__(module_name)
            print(f"  ✅ {description}")
        except Exception as e:
            print(f"  ❌ {description} - Error: {e}")
            all_passed = False

    return all_passed


def verify_authentication():
    """Verify authentication system works."""
    print("\n" + "=" * 70)
    print("5. AUTHENTICATION SYSTEM VERIFICATION")
    print("=" * 70)

    try:
        from app.auth import (
            create_access_token,
            decode_access_token,
            get_password_hash,
            verify_password,
            authenticate_user
        )

        print("\n  Testing password hashing...")
        password = "testpassword123"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True
        print("    ✅ Password hashing works")

        print("\n  Testing JWT tokens...")
        token = create_access_token({"sub": "123"})
        decoded = decode_access_token(token)
        assert decoded["sub"] == "123"
        print("    ✅ JWT token creation/validation works")

        print("\n  Testing user authentication...")
        user = authenticate_user("demo_user", "testpass123")
        assert user is not None
        assert user["username"] == "demo_user"
        print("    ✅ User authentication works")

        return True

    except Exception as e:
        print(f"\n  ❌ Authentication verification failed: {e}")
        return False


def verify_file_structure():
    """Verify all expected files exist."""
    print("\n" + "=" * 70)
    print("6. FILE STRUCTURE VERIFICATION")
    print("=" * 70)

    required_files = {
        "Schemas": [
            "schemas/user_accounts.sql",
            "schemas/notifications.sql",
            "schemas/portfolio_management.sql",
        ],
        "Scripts": [
            "scripts/apply_user_schema.py",
            "scripts/apply_notification_schema.py",
            "scripts/apply_portfolio_schema.py",
            "scripts/test_auth_flow.py",
        ],
        "Tests": [
            "tests/test_auth_system.py",
            "tests/test_e2e_auth_flow.py",
            "tests/test_e2e_portfolio_flow.py",
            "tests/test_e2e_notifications.py",
            "tests/test_e2e_signal_pipeline.py",
            "tests/test_e2e_integration.py",
        ],
        "Documentation": [
            "DEPLOYMENT.md",
            "DEVELOPMENT.md",
            "MANUAL_TESTING_CHECKLIST.md",
            "COMPLETION_SUMMARY.md",
            "docker-compose.yml",
        ],
        "Backend Routes": [
            "app/auth.py",
            "app/routes/auth_routes.py",
            "app/routes/user_routes.py",
            "app/routes/notification_routes.py",
        ]
    }

    all_passed = True
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    for category, files in required_files.items():
        print(f"\n{category}:")
        for file_path in files:
            full_path = os.path.join(project_root, file_path)
            exists = os.path.exists(full_path)

            status = "✅" if exists else "❌"
            print(f"  {status} {file_path}")

            if not exists:
                all_passed = False

    return all_passed


def main():
    """Run all verification checks."""
    print("\n" + "=" * 70)
    print("ASX PORTFOLIO OS - COMPLETE SYSTEM VERIFICATION")
    print("=" * 70)
    print("Verifying V1 & V2 implementation completion...")

    results = {}

    # Run all checks
    results["Database Tables"] = verify_database_tables()
    results["Stored Procedures"] = verify_stored_procedures()
    results["Demo Data"] = verify_demo_data()
    results["API Imports"] = verify_api_imports()
    results["Authentication"] = verify_authentication()
    results["File Structure"] = verify_file_structure()

    # Summary
    print("\n" + "=" * 70)
    print("VERIFICATION SUMMARY")
    print("=" * 70)

    all_passed = True
    for check, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"\n{check}: {status}")
        if not passed:
            all_passed = False

    print("\n" + "=" * 70)

    if all_passed:
        print("✅ ALL VERIFICATIONS PASSED")
        print("=" * 70)
        print("\n🎉 System is ready for production!")
        print("\nNext steps:")
        print("  1. Run: docker-compose up -d")
        print("  2. Visit: http://localhost:3000")
        print("  3. Login with: demo_user / testpass123")
        print("  4. Upload portfolio and explore features")
        print()
        return 0
    else:
        print("❌ SOME VERIFICATIONS FAILED")
        print("=" * 70)
        print("\n⚠️  Please review failed checks above")
        print()
        return 1


if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except Exception as e:
        print(f"\n❌ Verification script error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
