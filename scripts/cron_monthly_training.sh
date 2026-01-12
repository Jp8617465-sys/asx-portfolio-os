#!/bin/bash
set -euo pipefail

PROJECT_ROOT="/Users/jpcino/Documents/asx-portfolio-os"
VENV_PY="$PROJECT_ROOT/.venv/bin/python"
LOG_FILE="$PROJECT_ROOT/logs/cron_monthly_training.log"

$VENV_PY "$PROJECT_ROOT/models/train_model_a_ml.py" >> "$LOG_FILE" 2>&1
