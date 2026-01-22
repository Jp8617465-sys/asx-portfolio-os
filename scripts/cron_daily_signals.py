"""
Cron wrapper for daily ML signal generation.
Calls generate_ml_signals.py and persist_ml_signals.py in sequence.

This is the CORE V1 feature - daily ML buy/sell signals.
Without this job, signals become stale after first generation.
"""
import sys
import subprocess
from datetime import datetime


def main():
    print(f"[{datetime.utcnow()}] Starting daily ML signals generation")

    # Step 1: Generate signals
    print("\n[Step 1/2] Generating ML signals...")
    result1 = subprocess.run(
        ["python", "jobs/generate_ml_signals.py"],
        capture_output=True,
        text=True
    )
    print(result1.stdout)
    if result1.stderr:
        print(f"STDERR: {result1.stderr}", file=sys.stderr)

    if result1.returncode != 0:
        print(f"ERROR: generate_ml_signals failed with return code {result1.returncode}", file=sys.stderr)
        sys.exit(1)

    # Step 2: Persist signals to database
    print("\n[Step 2/2] Persisting ML signals to database...")
    result2 = subprocess.run(
        ["python", "jobs/persist_ml_signals.py"],
        capture_output=True,
        text=True
    )
    print(result2.stdout)
    if result2.stderr:
        print(f"STDERR: {result2.stderr}", file=sys.stderr)

    if result2.returncode != 0:
        print(f"ERROR: persist_ml_signals failed with return code {result2.returncode}", file=sys.stderr)
        sys.exit(1)

    print(f"\n[{datetime.utcnow()}] ✅ Daily ML signals completed successfully")


if __name__ == "__main__":
    main()
