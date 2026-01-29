#!/usr/bin/env python3
"""
Development seed script for creating test users.
DO NOT RUN IN PRODUCTION.

Creates demo users with known passwords for local testing only.
"""

import sys
from app.core import db_context
from app.auth import get_password_hash

def seed_dev_users():
    """Create development test users."""

    # Test users (password: "testpass123")
    test_users = [
        {
            'username': 'demo_user',
            'email': 'demo@asxportfolio.com',
            'password': 'testpass123',
            'full_name': 'Demo User'
        },
        {
            'username': 'test_user',
            'email': 'test@asxportfolio.com',
            'password': 'testpass123',
            'full_name': 'Test User'
        }
    ]

    with db_context() as conn:
        cur = conn.cursor()

        for user in test_users:
            # Hash password
            password_hash = get_password_hash(user['password'])

            # Insert user
            cur.execute(
                """
                INSERT INTO user_accounts (username, email, password_hash, full_name, is_active, is_verified)
                VALUES (%s, %s, %s, %s, TRUE, TRUE)
                ON CONFLICT (username) DO UPDATE SET
                    email = EXCLUDED.email,
                    password_hash = EXCLUDED.password_hash,
                    full_name = EXCLUDED.full_name
                RETURNING user_id
                """,
                (user['username'], user['email'], password_hash, user['full_name'])
            )
            user_id = cur.fetchone()[0]

            # Create default settings
            cur.execute(
                """
                INSERT INTO user_settings (user_id, settings)
                VALUES (%s, %s)
                ON CONFLICT (user_id) DO NOTHING
                """,
                (user_id, {
                    "theme": "dark",
                    "notifications_enabled": True,
                    "default_portfolio": None,
                    "risk_tolerance": "moderate"
                })
            )

            print(f"✅ Created/updated user: {user['username']} (ID: {user_id})")

        conn.commit()
        print(f"\n✅ Seeded {len(test_users)} development users")
        print("⚠️  WARNING: These are test accounts with known passwords.")
        print("   DO NOT use this script in production!")

if __name__ == "__main__":
    if "--confirm" not in sys.argv:
        print("⚠️  WARNING: This script creates test users with KNOWN PASSWORDS.")
        print("   Only run this in development environments.")
        print("\n   To proceed, run: python scripts/seed_dev_users.py --confirm")
        sys.exit(1)

    seed_dev_users()
