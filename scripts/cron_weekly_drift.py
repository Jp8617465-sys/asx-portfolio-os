"""
scripts/cron_weekly_drift.py
Render worker entrypoint for weekly drift audit.
"""

from jobs.audit_drift_job import main

if __name__ == "__main__":
    main()
