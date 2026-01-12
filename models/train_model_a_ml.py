"""
ASX Portfolio OS — ML Training Pipeline (Audited & Optimized)
-------------------------------------------------------------
Builds features, trains classification & regression models, evaluates, visualizes,
and saves the results. Drop-in ready for Codex in VS Code.
"""

import os
import json
import pandas as pd
import numpy as np
from datetime import datetime
from dateutil.relativedelta import relativedelta
from dotenv import load_dotenv
import requests
import psycopg2
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import roc_auc_score, mean_squared_error, classification_report
import lightgbm as lgb
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
import shap

# ---------------------------------------------------------------------
# 1️⃣ Load data
# ---------------------------------------------------------------------
load_dotenv(dotenv_path=".env", override=True)
MODEL_A_API = os.environ.get("MODEL_A_API", "http://127.0.0.1:8790")
OS_API_KEY = os.environ.get("OS_API_KEY", "")
DATABASE_URL = os.environ.get("DATABASE_URL", "")
LOOKBACK_MONTHS = int(os.environ.get("LOOKBACK_MONTHS", "36"))
CV_FOLDS = int(os.environ.get("CV_FOLDS", "12"))
MODEL_VERSION = os.environ.get("MODEL_VERSION", "v1_2")

EXTENDED_PATH = os.environ.get("EXTENDED_FEATURES_PATH", "outputs/featureset_extended_latest.parquet")
DATA_PATH = os.environ.get("TRAINING_DATA_PATH")
USE_EXTENDED = os.environ.get("USE_EXTENDED_FEATURES", "")

if not DATA_PATH:
    if (USE_EXTENDED == "1" or (USE_EXTENDED == "" and os.path.exists(EXTENDED_PATH))):
        DATA_PATH = EXTENDED_PATH
    else:
        DATA_PATH = "outputs/model_a_training_dataset.csv"

assert os.path.exists(DATA_PATH), f"❌ Missing file: {DATA_PATH}"

if DATA_PATH.endswith(".parquet"):
    df = pd.read_parquet(DATA_PATH)
else:
    df = pd.read_csv(DATA_PATH, parse_dates=["dt"])

if "dt" not in df.columns and "date" in df.columns:
    df = df.rename(columns={"date": "dt"})
df["dt"] = pd.to_datetime(df["dt"])
df = df.sort_values(["symbol", "dt"])
cutoff = df["dt"].max() - relativedelta(months=LOOKBACK_MONTHS)
df = df[df["dt"] >= cutoff]
print(f"✅ Loaded {len(df):,} rows across {df['symbol'].nunique()} symbols.")

# ---------------------------------------------------------------------
# 2️⃣ Feature engineering upgrades
# ---------------------------------------------------------------------
if "mom_3" not in df.columns:
    df["mom_3"] = df.groupby("symbol")["close"].pct_change(63)
if "mom_9" not in df.columns:
    df["mom_9"] = df.groupby("symbol")["close"].pct_change(189)
if "vol_30" not in df.columns:
    df["vol_30"] = df.groupby("symbol")["close"].pct_change().rolling(30).std().reset_index(0, drop=True)
if "vol_ratio_30_90" not in df.columns and "vol_90" in df.columns:
    df["vol_ratio_30_90"] = df["vol_30"] / df["vol_90"]
if "adv_ratio_20_60" not in df.columns and "adv_20_median" in df.columns:
    df["adv_ratio_20_60"] = df["adv_20_median"] / df.groupby("symbol")["adv_20_median"].transform(lambda x: x.rolling(60).median())
if "return_1m_fwd_sign" not in df.columns and "return_1m_fwd" in df.columns:
    df["return_1m_fwd_sign"] = (df["return_1m_fwd"] > 0).astype(int)
if "trend_strength" not in df.columns and "sma200_slope" in df.columns:
    df["trend_strength"] = np.where(df["trend_200"], 1, -1) * np.log1p(abs(df["sma200_slope"]))
if "return_1m_fwd" not in df.columns and "close" in df.columns:
    df["return_1m_fwd"] = df.groupby("symbol")["close"].shift(-21) / df["close"] - 1
if "return_1m_fwd_sign" not in df.columns and "return_1m_fwd" in df.columns:
    df["return_1m_fwd_sign"] = (df["return_1m_fwd"] > 0).astype(int)

# Clean
df = df.replace([np.inf, -np.inf], np.nan).dropna()

# ---------------------------------------------------------------------
# 3️⃣ Feature set + target
# ---------------------------------------------------------------------
BASE_FEATURES = [
    "mom_12_1", "mom_9", "mom_6", "mom_3",
    "vol_30", "vol_90", "vol_ratio_30_90",
    "adv_20_median", "adv_ratio_20_60",
    "trend_200", "sma200_slope_pos", "trend_strength"
]
OPTIONAL_FEATURES = [
    "pe_ratio", "pb_ratio", "eps", "roe", "debt_to_equity", "market_cap",
    "pe_ratio_zscore", "pb_ratio_zscore", "roe_ratio", "debt_to_equity_ratio",
    "atr_pct", "adv_zscore", "volume_skew_60",
    "rba_cash_rate", "cpi", "unemployment", "yield_curve_slope", "yield_10y", "yield_2y",
    "delta_cpi", "delta_yield_curve_slope", "delta_rba_rate",
    "sentiment_score", "sentiment_composite",
    "sector", "sector_spread_1m",
]
FEATURES = [f for f in BASE_FEATURES if f in df.columns] + [f for f in OPTIONAL_FEATURES if f in df.columns]
FEATURES = [f for f in FEATURES if pd.api.types.is_numeric_dtype(df[f])]
if not FEATURES:
    raise ValueError("No features available after filtering; check input dataset columns.")
TARGET_CLASS = "return_1m_fwd_sign"
TARGET_REG = "return_1m_fwd"

X = df[FEATURES]
y_class = df[TARGET_CLASS]
y_reg = df[TARGET_REG]

# ---------------------------------------------------------------------
# 4️⃣ TimeSeries split & training
# ---------------------------------------------------------------------
tscv = TimeSeriesSplit(n_splits=CV_FOLDS)
auc_scores, rmse_scores = [], []

print("⚙️ Starting LightGBM training across time splits...")
for fold, (train_idx, val_idx) in enumerate(tscv.split(X), 1):
    X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
    y_train, y_val = y_class.iloc[train_idx], y_class.iloc[val_idx]

    clf = lgb.LGBMClassifier(
        n_estimators=600, learning_rate=0.03, num_leaves=64,
        subsample=0.8, colsample_bytree=0.8,
        reg_alpha=0.2, reg_lambda=0.4,
        random_state=fold
    )
    clf.fit(X_train, y_train)
    val_pred = clf.predict_proba(X_val)[:, 1]
    auc = roc_auc_score(y_val, val_pred)
    auc_scores.append(auc)
    print(f"Fold {fold}: ROC-AUC = {auc:.3f}")

    reg = lgb.LGBMRegressor(
        n_estimators=400, learning_rate=0.05, num_leaves=48,
        subsample=0.8, colsample_bytree=0.8,
        random_state=fold
    )
    reg.fit(X_train, y_reg.iloc[train_idx])
    val_reg = reg.predict(X_val)
    rmse = np.sqrt(mean_squared_error(y_reg.iloc[val_idx], val_reg))
    rmse_scores.append(rmse)
    print(f"Fold {fold}: RMSE = {rmse:.4f}")

print(f"\n✅ Mean ROC-AUC: {np.mean(auc_scores):.3f} ± {np.std(auc_scores):.3f}")
print(f"✅ Mean RMSE: {np.mean(rmse_scores):.4f} ± {np.std(rmse_scores):.4f}")

# ---------------------------------------------------------------------
# 5️⃣ Final fit on full dataset
# ---------------------------------------------------------------------
clf_final = lgb.LGBMClassifier(
    n_estimators=800, learning_rate=0.03, num_leaves=64,
    subsample=0.8, colsample_bytree=0.8,
    reg_alpha=0.2, reg_lambda=0.4,
    random_state=42
)
clf_final.fit(X, y_class)

reg_final = lgb.LGBMRegressor(
    n_estimators=600, learning_rate=0.05, num_leaves=48,
    subsample=0.8, colsample_bytree=0.8,
    random_state=42
)
reg_final.fit(X, y_reg)

# ---------------------------------------------------------------------
# 6️⃣ Feature importance visualization
# ---------------------------------------------------------------------
imp_df = pd.DataFrame({
    "feature": FEATURES,
    "importance": clf_final.feature_importances_
}).sort_values("importance", ascending=False)

plt.figure(figsize=(8, 5))
sns.barplot(x="importance", y="feature", data=imp_df, hue="feature", palette="viridis", legend=False)
plt.title("Feature Importance (Classifier)")
plt.tight_layout()
plt.show()

# ---------------------------------------------------------------------
# 7️⃣ Save models + metadata
# ---------------------------------------------------------------------
os.makedirs("models", exist_ok=True)
timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
clf_path = f"models/model_a_classifier_{MODEL_VERSION}.pkl"
reg_path = f"models/model_a_regressor_{MODEL_VERSION}.pkl"
meta_path = f"models/model_a_training_summary_{MODEL_VERSION}.txt"
clf_path_ts = f"models/model_a_classifier_{timestamp}.pkl"
reg_path_ts = f"models/model_a_regressor_{timestamp}.pkl"
meta_path_ts = f"models/model_a_training_summary_{timestamp}.txt"

joblib.dump(clf_final, clf_path)
joblib.dump(reg_final, reg_path)
joblib.dump(clf_final, clf_path_ts)
joblib.dump(reg_final, reg_path_ts)

with open(meta_path, "w") as f:
    f.write(f"ROC-AUC Mean: {np.mean(auc_scores):.4f}\n")
    f.write(f"RMSE Mean: {np.mean(rmse_scores):.4f}\n")
    f.write("Top Features:\n")
    f.write(imp_df.head(10).to_string(index=False))

with open(meta_path_ts, "w") as f:
    f.write(f"ROC-AUC Mean: {np.mean(auc_scores):.4f}\n")
    f.write(f"RMSE Mean: {np.mean(rmse_scores):.4f}\n")
    f.write("Top Features:\n")
    f.write(imp_df.head(10).to_string(index=False))

feature_json_path = f"outputs/feature_importance_{MODEL_VERSION}.json"
os.makedirs("outputs", exist_ok=True)
with open(feature_json_path, "w") as f:
    json.dump(imp_df.to_dict(orient="records"), f, indent=2)

metrics_path = f"outputs/model_a_training_metrics_{MODEL_VERSION}.json"
with open(metrics_path, "w") as f:
    json.dump(
        {
            "roc_auc_mean": float(np.mean(auc_scores)),
            "roc_auc_std": float(np.std(auc_scores)),
            "rmse_mean": float(np.mean(rmse_scores)),
            "rmse_std": float(np.std(rmse_scores)),
            "n_rows": int(len(df)),
            "n_features": int(len(FEATURES)),
            "lookback_months": LOOKBACK_MONTHS,
        },
        f,
        indent=2,
    )

print(f"\n💾 Saved models →\n  {clf_path}\n  {reg_path}\n📘 Summary → {meta_path}")
print(f"📈 Feature importance → {feature_json_path}")
print("\nTop features:")
print(imp_df.head(10).to_string(index=False))

# ---------------------------------------------------------------------
# 8️⃣ Optional signal export for early watchlist
# ---------------------------------------------------------------------
df["ml_prob"] = clf_final.predict_proba(X)[:, 1]
df["ml_expected_return"] = reg_final.predict(X)
df_latest = df.sort_values(["symbol", "dt"]).groupby("symbol").tail(1)
df_latest = df_latest.sort_values("ml_prob", ascending=False)

out_path = "outputs/model_a_ml_signals_latest.csv"
df_latest.to_csv(out_path, index=False)
print(f"📊 Latest ML signals exported → {out_path}")

def _post_json(path: str, payload: dict):
    if not OS_API_KEY:
        print("⚠️ OS_API_KEY missing; skipping API persistence.")
        return None
    try:
        r = requests.post(
            f"{MODEL_A_API}{path}",
            headers={"x-api-key": OS_API_KEY, "Content-Type": "application/json"},
            json=payload,
            timeout=30,
        )
        if r.status_code != 200:
            print(f"⚠️ API error {r.status_code} for {path}: {r.text[:200]}")
            return None
        return r.json()
    except Exception as e:
        print(f"⚠️ API call failed for {path}: {e}")
        return None


# Persist model registry entry
registry_payload = {
    "model_name": "model_a_ml",
    "version": MODEL_VERSION,
    "run_id": timestamp,
    "metrics": {
        "roc_auc_mean": float(np.mean(auc_scores)),
        "roc_auc_std": float(np.std(auc_scores)),
        "rmse_mean": float(np.mean(rmse_scores)),
        "rmse_std": float(np.std(rmse_scores)),
        "drift_kl_divergence": None,
        "population_stability_index": None,
        "mean_confidence_gap": float(abs(df_latest["ml_prob"] - 0.5).mean()),
    },
    "features": FEATURES,
    "artifacts": {
        "classifier": clf_path,
        "regressor": reg_path,
        "summary": meta_path,
        "feature_importance": feature_json_path,
        "metrics": metrics_path,
    },
}
_post_json("/registry/model_run", registry_payload)

# Persist ML signals
as_of = df_latest["dt"].max().date().isoformat()
signals_payload = {
    "model": "model_a_ml",
    "as_of": as_of,
    "signals": [
        {
            "symbol": r["symbol"],
            "rank": int(i + 1),
            "score": float(r["ml_prob"]),
            "ml_prob": float(r["ml_prob"]),
            "ml_expected_return": float(r["ml_expected_return"]),
        }
        for i, r in df_latest.reset_index(drop=True).iterrows()
    ],
}
_post_json("/persist/ml_signals", signals_payload)

def _verify_persistence(as_of_value: str):
    if not DATABASE_URL or "..." in DATABASE_URL:
        print("⚠️ DATABASE_URL missing/placeholder; skipping DB verification.")
        return
    try:
        con = psycopg2.connect(DATABASE_URL)
        cur = con.cursor()
        cur.execute(
            """
            select id, model_name, version, created_at
            from model_registry
            where model_name = %s
            order by created_at desc
            limit 1
            """,
            ("model_a_ml",),
        )
        row = cur.fetchone()
        cur.execute(
            "select count(*) from model_a_ml_signals where model = %s and as_of = %s;",
            ("model_a_ml", as_of_value),
        )
        n_signals = cur.fetchone()[0]
        cur.close()
        con.close()
        if row:
            print(f"✅ Registry persisted: id={row[0]} version={row[2]} created_at={row[3]}")
        print(f"✅ Signals persisted for {as_of_value}: {int(n_signals)} rows")
    except Exception as e:
        print(f"⚠️ DB verification failed: {e}")

_verify_persistence(as_of)

# ---------------------------------------------------------------------
# 9️⃣ SHAP export (classifier)
# ---------------------------------------------------------------------
try:
    shap_sample = X.sample(n=min(2000, len(X)), random_state=42)
    explainer = shap.TreeExplainer(clf_final)
    shap_values = explainer.shap_values(shap_sample)
    shap_path = f"outputs/model_a_shap_summary_{MODEL_VERSION}.png"
    shap.summary_plot(shap_values, shap_sample, show=False)
    plt.tight_layout()
    plt.savefig(shap_path, dpi=150)
    plt.close()
    print(f"📈 SHAP summary saved → {shap_path}")
except Exception as e:
    print(f"⚠️ SHAP export failed: {e}")

print("\n🏁 Training complete — models and early-watchlist signals ready.")
