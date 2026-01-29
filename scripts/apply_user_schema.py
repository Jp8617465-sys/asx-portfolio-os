#!/usr/bin/env python3
"""
Apply user accounts schema to database.
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core import db_context, logger

def apply_schema():
    """Apply user accounts schema."""
    schema_file = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "schemas",
        "user_accounts.sql"
    )

    with open(schema_file, "r") as f:
        sql = f.read()

    try:
        with db_context() as conn:
            cur = conn.cursor()
            cur.execute(sql)
            conn.commit()
            logger.info("✅ User accounts schema applied successfully")
            print("✅ User accounts schema applied successfully")
    except Exception as e:
        logger.error(f"❌ Failed to apply schema: {e}")
        print(f"❌ Failed to apply schema: {e}")
        raise

if __name__ == "__main__":
    apply_schema()
