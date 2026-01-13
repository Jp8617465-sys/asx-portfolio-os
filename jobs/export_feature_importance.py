"""
jobs/export_feature_importance.py
Export latest training summary feature importance to JSON for API consumption.
"""

import json
import os
import glob
from datetime import datetime

import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env", override=True)

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "outputs")
MODEL_VERSION = os.getenv("MODEL_VERSION", "v1_2")
MODEL_NAME = os.getenv("MODEL_NAME", "model_a_ml")
DATABASE_URL = os.getenv("DATABASE_URL")


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
    models_dir = os.path.join(PROJECT_ROOT, "models")
    os.makedirs(models_dir, exist_ok=True)
    version_models_path = os.path.join(models_dir, f"feature_importance_{MODEL_VERSION}.json")
    latest_models_path = os.path.join(models_dir, "feature_importance_latest.json")

    with open(version_path, "w") as f:
        json.dump(payload, f, indent=2)
    with open(latest_path, "w") as f:
        json.dump(payload, f, indent=2)
    with open(version_models_path, "w") as f:
        json.dump(payload, f, indent=2)
    with open(latest_models_path, "w") as f:
        json.dump(payload, f, indent=2)

    print(f"✅ Wrote {version_path}")
    print(f"✅ Wrote {latest_path}")
    print(f"✅ Wrote {version_models_path}")
    print(f"✅ Wrote {latest_models_path}")

    if DATABASE_URL:
        rows = [
            (MODEL_NAME, MODEL_VERSION, item["feature"], item["importance"])
            for item in features
        ]
        sql = """
        insert into model_feature_importance (model_name, model_version, feature, importance)
        values %s
        on conflict (model_name, model_version, feature) do update set
            importance = excluded.importance
        """
        with psycopg2.connect(DATABASE_URL) as con, con.cursor() as cur:
            execute_values(cur, sql, rows)
            con.commit()
        print(f"✅ Persisted {len(rows)} features to model_feature_importance")


if __name__ == "__main__":
    main()
