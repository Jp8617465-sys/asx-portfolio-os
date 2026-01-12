"""
jobs/ingest_sentiment_job.py
Wrapper to load sentiment data.
"""

import os
import sys

sys.path.append(os.path.dirname(__file__))

from load_sentiment import main

if __name__ == "__main__":
    main()
