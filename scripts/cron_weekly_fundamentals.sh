#!/bin/bash
set -euo pipefail

ROOT_DIR="/Users/jpcino/Documents/asx-portfolio-os"
cd "$ROOT_DIR"

source .venv/bin/activate
python jobs/load_fundamentals_pipeline.py
python jobs/derive_fundamentals_features.py
