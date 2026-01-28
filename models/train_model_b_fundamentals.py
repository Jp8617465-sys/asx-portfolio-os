"""
ASX Portfolio OS — Model B (Fundamentals) Training Pipeline
------------------------------------------------------------
Trains a fundamental analysis classifier using LightGBM to classify stocks
by fundamental quality. Focuses on valuation, profitability, and financial health.

Model B complements Model A (momentum) to create an ensemble system.
"""

import os
import json
import pandas as pd
import numpy as np
from datetime import datetime
from dateutil.relativedelta import relativedelta
from dotenv import load_dotenv
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import roc_auc_score, classification_report, confusion_matrix
from sklearn.preprocessing import LabelEncoder
import lightgbm as lgb
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
import shap

# ---------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------
load_dotenv(dotenv_path=".env", override=True)
DATABASE_URL = os.environ.get("DATABASE_URL", "")
LOOKBACK_MONTHS = int(os.environ.get("LOOKBACK_MONTHS", "36"))
CV_FOLDS = int(os.environ.get("CV_FOLDS", "5"))
MODEL_VERSION = "v1_0"  # Model B version
MIN_FUNDAMENTAL_COVERAGE = float(os.environ.get("MIN_FUNDAMENTAL_COVERAGE", "0.8"))  # Require 80% of features

# Paths
EXTENDED_PATH = os.environ.get("EXTENDED_FEATURES_PATH", "outputs/featureset_extended_latest.parquet")
OUTPUT_DIR = "models"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Load data
assert os.path.exists(EXTENDED_PATH), f"❌ Missing file: {EXTENDED_PATH}"
print(f"📊 Loading data from {EXTENDED_PATH}...")
df = pd.read_parquet(EXTENDED_PATH)

# Date handling
if "dt" not in df.columns and "date" in df.columns:
    df = df.rename(columns={"date": "dt"})
df["dt"] = pd.to_datetime(df["dt"])
df = df.sort_values(["symbol", "dt"])

# Filter to lookback period
cutoff = df["dt"].max() - relativedelta(months=LOOKBACK_MONTHS)
df = df[df["dt"] >= cutoff]
print(f"✅ Loaded {len(df):,} rows across {df['symbol'].nunique()} symbols.")

# ---------------------------------------------------------------------
# Feature Engineering for Model B
# ---------------------------------------------------------------------
print("\n⚙️ Engineering fundamental features for Model B...")

# Core fundamental features (10 metrics as per plan)
BASE_FEATURES = [
    "pe_ratio",
    "pb_ratio",
    "roe",
    "debt_to_equity",
    "profit_margin",
    "revenue_growth_yoy",
    "current_ratio",
    "quick_ratio",
    "eps_growth",
    "market_cap",
]

# Derived features
DERIVED_FEATURES = [
    "pe_inverse",
    "pe_ratio_zscore",
    "pb_ratio_zscore",
    "financial_health_score",
    "value_score",
    "quality_score_v2",
]

# Optional cross-sectional features
OPTIONAL_FEATURES = [
    "roe_ratio",
    "debt_to_equity_ratio",
    "div_yield",
]

# Combine all features
FEATURES = []
for f in BASE_FEATURES + DERIVED_FEATURES + OPTIONAL_FEATURES:
    if f in df.columns and pd.api.types.is_numeric_dtype(df[f]):
        FEATURES.append(f)

print(f"   Available features: {len(FEATURES)}")
print(f"   Features: {FEATURES}")

# Clean data
df = df.replace([np.inf, -np.inf], np.nan)

# Check feature coverage
feature_coverage = {f: df[f].notna().mean() for f in FEATURES}
print("\n📈 Feature Coverage:")
for f, cov in sorted(feature_coverage.items(), key=lambda x: x[1], reverse=True):
    print(f"   {f}: {cov:.1%}")

# Filter features with sufficient coverage (60% threshold)
FEATURES = [f for f in FEATURES if feature_coverage.get(f, 0) >= 0.6]
if not FEATURES:
    raise ValueError("No features remaining after coverage filter; check data sources.")

print(f"\n✅ Using {len(FEATURES)} features with >60% coverage")

# ---------------------------------------------------------------------
# Target Variable: Quality Classification (A-F quintiles)
# ---------------------------------------------------------------------
print("\n🎯 Creating target variable (fundamental quality grades)...")

# Calculate 6-month forward return
df["return_6m_fwd"] = df.groupby("symbol")["close"].shift(-126) / df["close"] - 1

# Create quality quintiles based on forward returns
df = df.dropna(subset=["return_6m_fwd"])
df["quality_quintile"] = df.groupby("dt")["return_6m_fwd"].transform(
    lambda x: pd.qcut(x, q=5, labels=["F", "D", "C", "B", "A"], duplicates="drop")
)

# Binary target: A/B (top 40%) vs others
df["target_binary"] = (df["quality_quintile"].isin(["A", "B"])).astype(int)

# Filter rows with sufficient fundamental data
df["fundamental_coverage"] = df[FEATURES].notna().sum(axis=1) / len(FEATURES)
df = df[df["fundamental_coverage"] >= MIN_FUNDAMENTAL_COVERAGE]

print(f"   Target distribution:")
print(df["quality_quintile"].value_counts().sort_index())
print(f"   Binary target (A/B vs rest): {df['target_binary'].mean():.1%} positive")
print(f"   Rows after coverage filter: {len(df):,}")

# Drop rows with missing features or target
df = df.dropna(subset=FEATURES + ["target_binary"])
X = df[FEATURES]
y_binary = df["target_binary"]
y_quintile = df["quality_quintile"]

print(f"\n✅ Final dataset: {len(X):,} rows, {len(FEATURES)} features")

# ---------------------------------------------------------------------
# Time Series Cross-Validation Training
# ---------------------------------------------------------------------
print(f"\n⚙️ Starting LightGBM training with {CV_FOLDS} time series folds...")

tscv = TimeSeriesSplit(n_splits=CV_FOLDS)
auc_scores = []
models = []

for fold, (train_idx, val_idx) in enumerate(tscv.split(X), 1):
    X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
    y_train, y_val = y_binary.iloc[train_idx], y_binary.iloc[val_idx]

    # LightGBM Classifier (optimized for fundamentals)
    clf = lgb.LGBMClassifier(
        n_estimators=300,
        learning_rate=0.05,
        num_leaves=32,
        max_depth=6,
        min_child_samples=50,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=0.1,
        random_state=42,
        verbose=-1,
        class_weight='balanced'  # Handle class imbalance
    )

    clf.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        callbacks=[lgb.early_stopping(stopping_rounds=20, verbose=False)]
    )

    val_pred = clf.predict_proba(X_val)[:, 1]
    auc = roc_auc_score(y_val, val_pred)
    auc_scores.append(auc)
    models.append(clf)

    print(f"   Fold {fold}/{CV_FOLDS}: ROC-AUC = {auc:.3f}")

mean_auc = np.mean(auc_scores)
print(f"\n📊 Cross-validation ROC-AUC: {mean_auc:.3f} ± {np.std(auc_scores):.3f}")

# Check success criteria
if mean_auc < 0.62:
    print("⚠️ WARNING: ROC-AUC below target (0.62). Consider feature engineering or more data.")
else:
    print("✅ ROC-AUC meets target (>0.62)")

# ---------------------------------------------------------------------
# Final Model Training (on full dataset)
# ---------------------------------------------------------------------
print("\n⚙️ Training final Model B on full dataset...")

final_clf = lgb.LGBMClassifier(
    n_estimators=400,
    learning_rate=0.05,
    num_leaves=32,
    max_depth=6,
    min_child_samples=50,
    subsample=0.8,
    colsample_bytree=0.8,
    reg_alpha=0.1,
    reg_lambda=0.1,
    random_state=42,
    verbose=-1,
    class_weight='balanced'
)

final_clf.fit(X, y_binary)

# Evaluate on full dataset (for reference)
y_pred_prob = final_clf.predict_proba(X)[:, 1]
y_pred = final_clf.predict(X)
final_auc = roc_auc_score(y_binary, y_pred_prob)

print(f"\n📊 Final Model Performance (full dataset):")
print(f"   ROC-AUC: {final_auc:.3f}")
print("\nClassification Report:")
print(classification_report(y_binary, y_pred, target_names=["Other", "High Quality (A/B)"]))

# Precision on top predictions
top_quintile = y_pred_prob >= np.percentile(y_pred_prob, 80)
precision_top_quintile = y_binary[top_quintile].mean()
print(f"\n✅ Precision on top 20% predictions: {precision_top_quintile:.1%}")

if precision_top_quintile < 0.65:
    print("⚠️ WARNING: Top quintile precision below target (65%)")
else:
    print("✅ Top quintile precision meets target (>65%)")

# ---------------------------------------------------------------------
# Feature Importance (SHAP)
# ---------------------------------------------------------------------
print("\n⚙️ Computing SHAP feature importance...")

# Use a sample for SHAP (faster)
sample_size = min(1000, len(X))
X_sample = X.sample(n=sample_size, random_state=42)

explainer = shap.TreeExplainer(final_clf)
shap_values = explainer.shap_values(X_sample)

# Handle binary classification (SHAP returns list)
if isinstance(shap_values, list):
    shap_values = shap_values[1]  # Positive class

feature_importance = pd.DataFrame({
    'feature': FEATURES,
    'importance': np.abs(shap_values).mean(axis=0)
}).sort_values('importance', ascending=False)

print("\n📊 Top 10 Features by SHAP importance:")
print(feature_importance.head(10).to_string(index=False))

# Save feature importance
feature_importance_path = os.path.join(OUTPUT_DIR, f"model_b_{MODEL_VERSION}_feature_importance.json")
feature_importance_dict = {
    'features': feature_importance['feature'].tolist(),
    'importance': feature_importance['importance'].tolist(),
    'timestamp': datetime.now().isoformat()
}
with open(feature_importance_path, 'w') as f:
    json.dump(feature_importance_dict, f, indent=2)
print(f"✅ Feature importance saved: {feature_importance_path}")

# ---------------------------------------------------------------------
# Save Model and Artifacts
# ---------------------------------------------------------------------
print("\n💾 Saving Model B artifacts...")

# Save classifier
classifier_path = os.path.join(OUTPUT_DIR, f"model_b_{MODEL_VERSION}_classifier.pkl")
joblib.dump(final_clf, classifier_path)
print(f"   ✅ Classifier: {classifier_path}")

# Save feature list
features_path = os.path.join(OUTPUT_DIR, f"model_b_{MODEL_VERSION}_features.json")
with open(features_path, 'w') as f:
    json.dump({
        'features': FEATURES,
        'version': MODEL_VERSION,
        'trained_at': datetime.now().isoformat(),
        'n_samples': len(X),
        'n_symbols': df['symbol'].nunique(),
        'cv_auc_mean': mean_auc,
        'cv_auc_std': np.std(auc_scores),
        'top_quintile_precision': precision_top_quintile
    }, f, indent=2)
print(f"   ✅ Features: {features_path}")

# Save training metrics
metrics_path = os.path.join(OUTPUT_DIR, f"model_b_{MODEL_VERSION}_metrics.json")
with open(metrics_path, 'w') as f:
    json.dump({
        'model': 'Model B (Fundamentals)',
        'version': MODEL_VERSION,
        'trained_at': datetime.now().isoformat(),
        'n_samples': len(X),
        'n_features': len(FEATURES),
        'n_symbols': df['symbol'].nunique(),
        'lookback_months': LOOKBACK_MONTHS,
        'cv_folds': CV_FOLDS,
        'cv_auc_scores': auc_scores,
        'cv_auc_mean': mean_auc,
        'cv_auc_std': float(np.std(auc_scores)),
        'final_auc': final_auc,
        'top_quintile_precision': float(precision_top_quintile),
        'target_positive_rate': float(y_binary.mean()),
        'min_fundamental_coverage': MIN_FUNDAMENTAL_COVERAGE
    }, f, indent=2)
print(f"   ✅ Metrics: {metrics_path}")

# ---------------------------------------------------------------------
# Visualizations
# ---------------------------------------------------------------------
print("\n📊 Generating visualizations...")

# 1. Feature Importance Plot
plt.figure(figsize=(10, 8))
top_features = feature_importance.head(15)
plt.barh(top_features['feature'], top_features['importance'])
plt.xlabel('Mean |SHAP value|')
plt.title('Model B Feature Importance (Top 15)')
plt.gca().invert_yaxis()
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, f"model_b_{MODEL_VERSION}_feature_importance.png"), dpi=150)
plt.close()
print("   ✅ Feature importance plot saved")

# 2. Confusion Matrix
plt.figure(figsize=(8, 6))
cm = confusion_matrix(y_binary, y_pred)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
plt.title('Model B Confusion Matrix')
plt.ylabel('True Label')
plt.xlabel('Predicted Label')
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, f"model_b_{MODEL_VERSION}_confusion_matrix.png"), dpi=150)
plt.close()
print("   ✅ Confusion matrix saved")

# 3. ROC Curve (simple version)
from sklearn.metrics import roc_curve
fpr, tpr, _ = roc_curve(y_binary, y_pred_prob)
plt.figure(figsize=(8, 6))
plt.plot(fpr, tpr, label=f'Model B (AUC = {final_auc:.3f})')
plt.plot([0, 1], [0, 1], 'k--', label='Random')
plt.xlabel('False Positive Rate')
plt.ylabel('True Positive Rate')
plt.title('Model B ROC Curve')
plt.legend()
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, f"model_b_{MODEL_VERSION}_roc_curve.png"), dpi=150)
plt.close()
print("   ✅ ROC curve saved")

print("\n" + "="*70)
print("✅ Model B Training Complete!")
print("="*70)
print(f"\nModel artifacts saved to: {OUTPUT_DIR}/")
print(f"   - Classifier: model_b_{MODEL_VERSION}_classifier.pkl")
print(f"   - Features: model_b_{MODEL_VERSION}_features.json")
print(f"   - Metrics: model_b_{MODEL_VERSION}_metrics.json")
print(f"   - Feature Importance: model_b_{MODEL_VERSION}_feature_importance.json")
print(f"\nPerformance Summary:")
print(f"   CV ROC-AUC: {mean_auc:.3f} ± {np.std(auc_scores):.3f}")
print(f"   Top Quintile Precision: {precision_top_quintile:.1%}")
print(f"   {'✅ Meets' if mean_auc >= 0.62 else '⚠️ Below'} target ROC-AUC (>0.62)")
print(f"   {'✅ Meets' if precision_top_quintile >= 0.65 else '⚠️ Below'} target precision (>65%)")
print("\n🚀 Ready for signal generation! Run: python jobs/generate_signals_model_b.py")
