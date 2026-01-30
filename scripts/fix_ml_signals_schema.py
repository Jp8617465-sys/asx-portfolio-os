#!/usr/bin/env python3
"""
Fix model_a_ml_signals table schema - add missing columns
"""

import psycopg2

DATABASE_URL = "postgresql://postgres:HugoRalph2026_DB_Pass_01@db.gxjqezqndltaelmyctnl.supabase.co:5432/postgres"

def fix_schema():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        print("🔧 Adding missing columns to model_a_ml_signals...")

        # Add signal_label column (derived from score/rank)
        print("\n1. Adding 'signal_label' column...")
        cur.execute("""
            ALTER TABLE model_a_ml_signals
            ADD COLUMN IF NOT EXISTS signal_label TEXT;
        """)

        # Add confidence column (alias for ml_prob)
        print("2. Adding 'confidence' column...")
        cur.execute("""
            ALTER TABLE model_a_ml_signals
            ADD COLUMN IF NOT EXISTS confidence NUMERIC;
        """)

        # Populate signal_label based on rank
        print("3. Populating signal_label based on rank...")
        cur.execute("""
            UPDATE model_a_ml_signals
            SET signal_label = CASE
                WHEN rank <= 5 THEN 'STRONG_BUY'
                WHEN rank <= 15 THEN 'BUY'
                WHEN rank <= 30 THEN 'HOLD'
                ELSE 'NEUTRAL'
            END
            WHERE signal_label IS NULL;
        """)

        # Populate confidence from ml_prob
        print("4. Populating confidence from ml_prob...")
        cur.execute("""
            UPDATE model_a_ml_signals
            SET confidence = ml_prob
            WHERE confidence IS NULL;
        """)

        conn.commit()
        print("\n✅ Schema fixed successfully!")
        print("   - Added signal_label column")
        print("   - Added confidence column")
        print("   - Populated values for existing records")

        # Show sample data
        cur.execute("""
            SELECT symbol, signal_label, confidence, rank, score
            FROM model_a_ml_signals
            ORDER BY as_of DESC, rank ASC
            LIMIT 10;
        """)

        print("\n📊 Sample data:")
        for row in cur.fetchall():
            print(f"   {row[0]:10} {row[1]:15} conf={row[2]:.2f if row[2] else 0:.2f} rank={row[3]:3} score={row[4]:.2f if row[4] else 0:.2f}")

        cur.close()
        conn.close()
        return True

    except Exception as e:
        print(f"\n❌ Error: {e}")
        if 'conn' in locals():
            conn.rollback()
        return False

if __name__ == "__main__":
    fix_schema()
