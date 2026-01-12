"""
jobs/ingest_macro_job.py
Wrapper to load macro data.
"""

import os
import sys

sys.path.append(os.path.dirname(__file__))

from load_macro import main

if __name__ == "__main__":
    main()
