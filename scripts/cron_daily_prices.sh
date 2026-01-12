#!/bin/bash
set -euo pipefail

PROJECT_ROOT="/Users/jpcino/Documents/asx-portfolio-os"
VENV_PY="$PROJECT_ROOT/.venv/bin/python"
LOG_FILE="$PROJECT_ROOT/logs/cron_daily_prices.log"

$VENV_PY "$PROJECT_ROOT/jobs/sync_live_prices_job.py" >> "$LOG_FILE" 2>&1
