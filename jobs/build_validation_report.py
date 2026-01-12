"""
jobs/build_validation_report.py
Generate model_a_validation_report.md from latest artifacts.
"""

import glob
import json
import os
from datetime import datetime

import pandas as pd

REPORT_PATH = "outputs/model_a_validation_report.md"
METRICS_PATH = os.getenv("METRICS_PATH", "outputs/model_a_training_metrics_v1_2.json")
DATASET_PATH = os.getenv("DATASET_PATH", "outputs/model_a_training_dataset_36m.csv")
DRIFT_GLOB = os.getenv("DRIFT_GLOB", "outputs/feature_drift_psi_*.csv")

lines = ["# Model A Validation Report", "", f"Generated: {datetime.utcnow().isoformat()}", ""]

# Training metrics
if os.path.exists(METRICS_PATH):
    with open(METRICS_PATH, "r") as f:
        metrics = json.load(f)
    lines.append("## Training Metrics")
    for key, value in metrics.items():
        lines.append(f"- {key}: {value}")
    lines.append("")
else:
    lines.append("## Training Metrics")
    lines.append(f"- Missing metrics file: {METRICS_PATH}")
    lines.append("")

# Dataset coverage
if os.path.exists(DATASET_PATH):
    df = pd.read_csv(DATASET_PATH, usecols=["symbol", "dt"], parse_dates=["dt"])
    lines.append("## Dataset Coverage")
    lines.append(f"- Rows: {len(df):,}")
    lines.append(f"- Symbols: {df['symbol'].nunique()}")
    lines.append(f"- Date range: {df['dt'].min().date()} to {df['dt'].max().date()}")
    lines.append("")
else:
    lines.append("## Dataset Coverage")
    lines.append(f"- Missing dataset file: {DATASET_PATH}")
    lines.append("")

# Drift summary
drift_files = sorted(glob.glob(DRIFT_GLOB))
if drift_files:
    drift_path = drift_files[-1]
    drift_df = pd.read_csv(drift_path)
    lines.append("## Drift Summary")
    lines.append(f"- Drift file: {drift_path}")
    if "psi" in drift_df.columns:
        lines.append(f"- PSI mean: {drift_df['psi'].mean():.4f}")
        lines.append(f"- PSI max: {drift_df['psi'].max():.4f}")
    lines.append("")
else:
    lines.append("## Drift Summary")
    lines.append("- No drift CSV found")
    lines.append("")

os.makedirs("outputs", exist_ok=True)
with open(REPORT_PATH, "w") as f:
    f.write("\n".join(lines))

print(f"✅ Validation report written: {REPORT_PATH}")
