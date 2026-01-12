"""
jobs/ingest_fundamentals_job.py
Wrapper to load fundamentals.
"""

import os
import sys

sys.path.append(os.path.dirname(__file__))

from load_fundamentals import main

if __name__ == "__main__":
    main()
