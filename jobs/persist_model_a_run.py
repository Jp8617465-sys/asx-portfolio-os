import json
import os
from datetime import datetime

import requests
from requests.adapters import HTTPAdapter, Retry
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env", override=True)

MODEL_A_API = os.getenv("MODEL_A_API")
API_KEY = os.getenv("OS_API_KEY")

if not MODEL_A_API or not API_KEY:
    raise SystemExit("MODEL_A_API or OS_API_KEY missing")

metrics_path = "outputs/model_a_training_metrics_v1_2.json"
feature_path = "outputs/feature_importance_v1_2.json"
summary_path = "models/model_a_training_summary_v1_2.txt"

if not os.path.exists(metrics_path):
    raise SystemExit(f"Missing metrics file: {metrics_path}")
if not os.path.exists(feature_path):
    raise SystemExit(f"Missing feature importance file: {feature_path}")

with open(metrics_path, "r") as f:
    metrics = json.load(f)
with open(feature_path, "r") as f:
    features = json.load(f)

feature_names = [row.get("feature") for row in features if row.get("feature")]

payload = {
    "model_name": "model_a_ml",
    "version": "v1_2",
    "run_id": datetime.utcnow().strftime("%Y%m%d_%H%M%S"),
    "metrics": {
        "roc_auc_mean": metrics.get("roc_auc_mean"),
        "roc_auc_std": metrics.get("roc_auc_std"),
        "rmse_mean": metrics.get("rmse_mean"),
        "rmse_std": metrics.get("rmse_std"),
        "drift_kl_divergence": None,
        "population_stability_index": None,
        "mean_confidence_gap": metrics.get("mean_confidence_gap"),
    },
    "features": feature_names[:50],
    "artifacts": {
        "classifier": "models/model_a_classifier_v1_2.pkl",
        "regressor": "models/model_a_regressor_v1_2.pkl",
        "summary": summary_path,
        "feature_importance": feature_path,
        "metrics": metrics_path,
        "shap": "outputs/model_a_shap_summary_v1_2.png",
    },
}

session = requests.Session()
retries = Retry(total=3, backoff_factor=1.0, status_forcelist=[429, 502, 503, 504])
session.mount("https://", HTTPAdapter(max_retries=retries))

resp = session.post(
    f"{MODEL_A_API}/registry/model_run",
    headers={"x-api-key": API_KEY, "Content-Type": "application/json"},
    json=payload,
    timeout=120,
)
print("Registry response:", resp.status_code, resp.text[:500])
