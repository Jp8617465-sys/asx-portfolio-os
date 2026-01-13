"""
jobs/export_feature_importance.py
Export latest training summary feature importance to JSON for API consumption.
"""

import json
import os
import glob
from datetime import datetime

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "outputs")
MODEL_VERSION = os.getenv("MODEL_VERSION", "v1_2")


def _load_latest_summary():
    summary_paths = sorted(glob.glob(os.path.join(PROJECT_ROOT, "models", "model_a_training_summary_*.txt")))
    if not summary_paths:
        raise FileNotFoundError("No training summaries found in models/")
    return summary_paths[-1]


def _parse_summary(path: str):
    features = []
    started = False
    with open(path, "r") as f:
        for line in f:
            if line.strip().startswith("Top Features"):
                started = True
                continue
            if not started:
                continue
            if not line.strip():
                continue
            if "feature" in line and "importance" in line:
                continue
            parts = line.strip().split()
            if len(parts) < 2:
                continue
            importance = parts[-1]
            feature = " ".join(parts[:-1])
            try:
                features.append({"feature": feature, "importance": float(importance)})
            except ValueError:
                continue
    return features


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    summary_path = _load_latest_summary()
    features = _parse_summary(summary_path)
    if not features:
        raise RuntimeError("No features parsed from training summary.")

    payload = {
        "model_version": MODEL_VERSION,
        "generated_at": datetime.utcnow().isoformat(),
        "source": summary_path,
        "features": features,
    }

    version_path = os.path.join(OUTPUT_DIR, f"feature_importance_{MODEL_VERSION}.json")
    latest_path = os.path.join(OUTPUT_DIR, "feature_importance_latest.json")

    with open(version_path, "w") as f:
        json.dump(payload, f, indent=2)
    with open(latest_path, "w") as f:
        json.dump(payload, f, indent=2)

    print(f"✅ Wrote {version_path}")
    print(f"✅ Wrote {latest_path}")


if __name__ == "__main__":
    main()
