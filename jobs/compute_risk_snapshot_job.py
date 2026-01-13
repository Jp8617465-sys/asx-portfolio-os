"""
jobs/compute_risk_snapshot_job.py
Wrapper to compute risk exposure snapshot.
"""

import os
import sys

ROOT = os.path.dirname(os.path.dirname(__file__))
sys.path.append(ROOT)

from analytics.risk_model import main

if __name__ == "__main__":
    main()
