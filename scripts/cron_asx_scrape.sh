#!/bin/bash
set -euo pipefail

PROJECT_ROOT="/Users/jpcino/Documents/asx-portfolio-os"
VENV_PY="$PROJECT_ROOT/.venv/bin/python"
LOG_FILE="$PROJECT_ROOT/logs/cron_asx_scrape.log"

$VENV_PY "$PROJECT_ROOT/jobs/asx_announcements_scraper.py" >> "$LOG_FILE" 2>&1
