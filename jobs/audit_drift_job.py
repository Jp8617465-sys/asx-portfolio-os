"""
jobs/audit_drift_job.py
Compute PSI feature drift between a baseline and current dataset.
"""

import os
import numpy as np
import pandas as pd
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env", override=True)

BASELINE_PATH = os.getenv("DRIFT_BASELINE_PATH", "outputs/model_a_training_dataset.csv")
CURRENT_PATH = os.getenv("DRIFT_CURRENT_PATH", "outputs/model_a_ml_signals_latest.csv")
OUT_PATH = os.getenv("DRIFT_OUT_PATH", "")
MODEL_A_API = os.getenv("MODEL_A_API", "http://127.0.0.1:8790")
OS_API_KEY = os.getenv("OS_API_KEY", "")
DRIFT_MODEL = os.getenv("DRIFT_MODEL", "model_a_ml")
BASELINE_LABEL = os.getenv("DRIFT_BASELINE_LABEL", "training_baseline")
CURRENT_LABEL = os.getenv("DRIFT_CURRENT_LABEL", "latest_signals")

def psi_for_feature(base: pd.Series, curr: pd.Series, bins: int = 10) -> float:
    base = pd.to_numeric(base, errors="coerce").dropna()
    curr = pd.to_numeric(curr, errors="coerce").dropna()
    if base.empty or curr.empty:
        return 0.0

    quantiles = np.linspace(0, 1, bins + 1)
    cuts = base.quantile(quantiles).values
    cuts = np.unique(cuts)
    if len(cuts) < 2:
        return 0.0

    base_bins = pd.cut(base, bins=cuts, include_lowest=True)
    curr_bins = pd.cut(curr, bins=cuts, include_lowest=True)

    base_dist = base_bins.value_counts(normalize=True).sort_index()
    curr_dist = curr_bins.value_counts(normalize=True).sort_index()

    aligned = pd.concat([base_dist, curr_dist], axis=1).fillna(0.0)
    aligned.columns = ["base", "current"]

    eps = 1e-6
    psi = ((aligned["current"] + eps) - (aligned["base"] + eps)) * np.log((aligned["current"] + eps) / (aligned["base"] + eps))
    return float(psi.sum())


def main():
    if not os.path.exists(BASELINE_PATH) or not os.path.exists(CURRENT_PATH):
        raise SystemExit("Missing baseline or current dataset. Set DRIFT_BASELINE_PATH/DRIFT_CURRENT_PATH.")

    baseline = pd.read_csv(BASELINE_PATH)
    current = pd.read_csv(CURRENT_PATH)

    numeric_cols = [
        c for c in baseline.columns
        if c in current.columns
        and pd.api.types.is_numeric_dtype(baseline[c])
        and not pd.api.types.is_bool_dtype(baseline[c])
    ]
    if not numeric_cols:
        raise SystemExit("No shared numeric columns to compare.")

    results = []
    for col in numeric_cols:
        psi = psi_for_feature(baseline[col], current[col])
        results.append({"feature": col, "psi": psi})

    out = pd.DataFrame(results).sort_values("psi", ascending=False)
    out_path = OUT_PATH
    if not out_path:
        ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        out_path = f"outputs/feature_drift_psi_{ts}.csv"
    out.to_csv(out_path, index=False)
    print(f"✅ PSI drift saved: {out_path}")

    if OS_API_KEY:
        payload = {
            "model": DRIFT_MODEL,
            "baseline_label": BASELINE_LABEL,
            "current_label": CURRENT_LABEL,
            "metrics": {
                "n_features": int(len(out)),
                "psi_mean": float(out["psi"].mean()),
                "psi_max": float(out["psi"].max()),
                "top_features": out.head(10).to_dict(orient="records"),
                "output_path": out_path,
            },
        }
        try:
            r = requests.post(
                f"{MODEL_A_API}/drift/audit",
                headers={"x-api-key": OS_API_KEY, "Content-Type": "application/json"},
                json=payload,
                timeout=30,
            )
            if r.status_code != 200:
                print(f"⚠️ Drift audit persistence failed: {r.status_code} {r.text[:200]}")
            else:
                print("✅ Drift audit persisted to API.")
        except Exception as e:
            print(f"⚠️ Drift audit API call failed: {e}")
    else:
        print("⚠️ OS_API_KEY missing; skipping drift audit persistence.")


if __name__ == "__main__":
    main()
