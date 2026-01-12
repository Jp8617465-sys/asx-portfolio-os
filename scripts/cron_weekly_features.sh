#!/bin/bash
set -euo pipefail

PROJECT_ROOT="/Users/jpcino/Documents/asx-portfolio-os"
VENV_PY="$PROJECT_ROOT/.venv/bin/python"
LOG_FILE="$PROJECT_ROOT/logs/cron_weekly_features.log"

$VENV_PY "$PROJECT_ROOT/jobs/build_extended_feature_set.py" >> "$LOG_FILE" 2>&1
