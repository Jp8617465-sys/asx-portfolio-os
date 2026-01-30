#!/usr/bin/env python3
"""
Check and fix database schema issues
"""

import sys
import psycopg2
from psycopg2 import sql

# Database URL from .env
DATABASE_URL = "postgresql://postgres:HugoRalph2026_DB_Pass_01@db.gxjqezqndltaelmyctnl.supabase.co:5432/postgres"

def check_universe_table():
    """Check if universe table exists and has correct schema"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        # Check if table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'universe'
            );
        """)
        table_exists = cur.fetchone()[0]

        if not table_exists:
            print("❌ Table 'universe' does not exist")
            return False

        print("✅ Table 'universe' exists")

        # Check columns
        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'universe'
            ORDER BY ordinal_position;
        """)

        columns = cur.fetchall()
        print("\nCurrent columns:")
        for col_name, col_type in columns:
            print(f"  - {col_name}: {col_type}")

        # Check for required columns
        col_names = [col[0] for col in columns]
        required = ['symbol', 'name', 'sector', 'market_cap']
        missing = [col for col in required if col not in col_names]

        if missing:
            print(f"\n❌ Missing columns: {', '.join(missing)}")
            return False
        else:
            print("\n✅ All required columns present")
            return True

    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

def add_missing_columns():
    """Add missing columns to universe table"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        # Check what columns are missing
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'universe';
        """)
        existing_cols = [row[0] for row in cur.fetchall()]

        # Add sector column if missing
        if 'sector' not in existing_cols:
            print("Adding 'sector' column...")
            cur.execute("ALTER TABLE universe ADD COLUMN sector TEXT;")
            print("✅ Added 'sector' column")

        # Add market_cap column if missing
        if 'market_cap' not in existing_cols:
            print("Adding 'market_cap' column...")
            cur.execute("ALTER TABLE universe ADD COLUMN market_cap NUMERIC;")
            print("✅ Added 'market_cap' column")

        conn.commit()
        print("\n✅ Database schema updated successfully!")
        return True

    except Exception as e:
        print(f"❌ Error updating schema: {e}")
        if 'conn' in locals():
            conn.rollback()
        return False
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

def main():
    print("🔍 Checking database schema...\n")

    if check_universe_table():
        print("\n✅ Database schema is correct!")
        return 0
    else:
        print("\n🔧 Fixing database schema...\n")
        if add_missing_columns():
            print("\n✅ Schema fixed! Try stock search again.")
            return 0
        else:
            print("\n❌ Failed to fix schema")
            return 1

if __name__ == "__main__":
    sys.exit(main())
