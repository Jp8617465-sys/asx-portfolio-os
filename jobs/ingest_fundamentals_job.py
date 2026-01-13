"""
jobs/ingest_fundamentals_job.py
Wrapper to run the EODHD fundamentals pipeline (full or sample).
"""

import os
import sys

sys.path.append(os.path.dirname(__file__))

from load_fundamentals_pipeline import fundamentals_pipeline, get_ticker_list

if __name__ == "__main__":
    fundamentals_pipeline(get_ticker_list())
