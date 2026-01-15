"""
scripts/train_production_models.py

Production Model Training Wrapper
==================================
Enhanced wrapper around the core training script with:
- CLI arguments for production deployment
- Hyperparameter tuning with Optuna (optional)
- Model comparison and selection
- Automatic artifact deployment

Usage:
    # Standard training
    python scripts/train_production_models.py

    # With hyperparameter tuning
    python scripts/train_production_models.py --tune-hyperparams --n-trials 50

    # Quick test (fewer folds)
    python scripts/train_production_models.py --cv 3

    # Specify model version
    python scripts/train_production_models.py --version v1_3
"""

import os
import sys
import argparse
import subprocess
from datetime import datetime

# Add project root to path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(PROJECT_ROOT)

# Color codes
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"


def log_info(msg: str):
    print(f"{BLUE}ℹ️  {msg}{RESET}")


def log_success(msg: str):
    print(f"{GREEN}✅ {msg}{RESET}")


def log_error(msg: str):
    print(f"{RED}❌ {msg}{RESET}")


def log_step(step: int, total: int, msg: str):
    print(f"\n{BLUE}{'='*60}")
    print(f"STEP {step}/{total}: {msg}")
    print(f"{'='*60}{RESET}\n")


def check_prerequisites() -> bool:
    """Check that required files and environment variables exist."""
    required_files = [
        "models/train_model_a_ml.py",
        ".env",
    ]

    optional_files = [
        "outputs/model_a_training_dataset.csv",
        "outputs/featureset_extended_latest.parquet",
    ]

    log_info("Checking prerequisites...")

    all_ok = True
    for file in required_files:
        if os.path.exists(file):
            log_success(f"Found: {file}")
        else:
            log_error(f"Missing: {file}")
            all_ok = False

    # Check for at least one data file
    has_data = any(os.path.exists(f) for f in optional_files)
    if has_data:
        log_success("Training data available")
    else:
        log_error("No training data found (need dataset or extended features)")
        all_ok = False

    # Check environment variables
    required_env = ["DATABASE_URL"]
    optional_env = ["OS_API_KEY", "MODEL_A_API"]

    for var in required_env:
        if os.getenv(var):
            log_success(f"Environment: {var}")
        else:
            log_error(f"Missing env var: {var}")
            all_ok = False

    for var in optional_env:
        if os.getenv(var):
            log_success(f"Environment: {var}")
        else:
            log_error(f"Optional env var not set: {var} (some features disabled)")

    return all_ok


def run_training_script(version: str, cv_folds: int, lookback_months: int) -> bool:
    """Run the core training script."""
    log_info(f"Starting training: version={version}, cv_folds={cv_folds}, lookback={lookback_months}mo")

    env = os.environ.copy()
    env["MODEL_VERSION"] = version
    env["CV_FOLDS"] = str(cv_folds)
    env["LOOKBACK_MONTHS"] = str(lookback_months)

    try:
        result = subprocess.run(
            ["python", "models/train_model_a_ml.py"],
            env=env,
            capture_output=False,  # Show output in real-time
            text=True,
        )

        if result.returncode == 0:
            log_success("Training completed successfully")
            return True
        else:
            log_error(f"Training failed with exit code {result.returncode}")
            return False

    except Exception as e:
        log_error(f"Training error: {e}")
        return False


def run_hyperparameter_tuning(n_trials: int = 50) -> dict:
    """
    Run Optuna hyperparameter tuning.
    Returns best hyperparameters.
    """
    try:
        import optuna
        from optuna.samplers import TPESampler
        import pandas as pd
        import numpy as np
        from sklearn.model_selection import TimeSeriesSplit
        from sklearn.metrics import roc_auc_score, mean_squared_error
        import lightgbm as lgb
        from dotenv import load_dotenv

        load_dotenv()

        log_info(f"Running Optuna hyperparameter tuning ({n_trials} trials)...")

        # Load data
        extended_path = "outputs/featureset_extended_latest.parquet"
        if os.path.exists(extended_path):
            df = pd.read_parquet(extended_path)
        else:
            df = pd.read_csv("outputs/model_a_training_dataset.csv", parse_dates=["dt"])

        # Prepare features (simplified version)
        feature_cols = [c for c in df.columns if c not in ["dt", "symbol", "return_1m_fwd", "return_1m_fwd_sign"]]
        feature_cols = [c for c in feature_cols if pd.api.types.is_numeric_dtype(df[c])]

        df = df.dropna(subset=feature_cols + ["return_1m_fwd_sign"])
        X = df[feature_cols]
        y = df["return_1m_fwd_sign"]

        # Define objective function
        def objective(trial):
            params = {
                "n_estimators": trial.suggest_int("n_estimators", 200, 1000, step=100),
                "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.1, log=True),
                "num_leaves": trial.suggest_int("num_leaves", 24, 128, step=8),
                "max_depth": trial.suggest_int("max_depth", 3, 12),
                "subsample": trial.suggest_float("subsample", 0.6, 1.0),
                "colsample_bytree": trial.suggest_float("colsample_bytree", 0.6, 1.0),
                "reg_alpha": trial.suggest_float("reg_alpha", 0.0, 1.0),
                "reg_lambda": trial.suggest_float("reg_lambda", 0.0, 1.0),
            }

            # Time series cross-validation
            tscv = TimeSeriesSplit(n_splits=5)
            scores = []

            for train_idx, val_idx in tscv.split(X):
                X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
                y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

                clf = lgb.LGBMClassifier(**params, random_state=42, verbose=-1)
                clf.fit(X_train, y_train)
                pred = clf.predict_proba(X_val)[:, 1]
                auc = roc_auc_score(y_val, pred)
                scores.append(auc)

            return np.mean(scores)

        # Run optimization
        study = optuna.create_study(
            direction="maximize",
            sampler=TPESampler(seed=42),
        )
        study.optimize(objective, n_trials=n_trials, show_progress_bar=True)

        log_success(f"Best ROC-AUC: {study.best_value:.4f}")
        log_info("Best hyperparameters:")
        for param, value in study.best_params.items():
            print(f"  {param}: {value}")

        # Save best params
        import json
        params_path = "outputs/best_hyperparameters.json"
        with open(params_path, "w") as f:
            json.dump(study.best_params, f, indent=2)
        log_success(f"Saved best hyperparameters to {params_path}")

        return study.best_params

    except ImportError:
        log_error("Optuna not installed. Install with: pip install optuna")
        return {}
    except Exception as e:
        log_error(f"Hyperparameter tuning failed: {e}")
        return {}


def deploy_artifacts() -> bool:
    """Deploy model artifacts to expected locations."""
    log_info("Deploying model artifacts...")

    # Ensure outputs directory exists
    os.makedirs("outputs", exist_ok=True)

    # Copy latest feature importance to standard location
    import glob
    feature_files = glob.glob("outputs/feature_importance_v*.json")
    if feature_files:
        latest = max(feature_files, key=os.path.getmtime)
        target = "outputs/feature_importance_latest.json"
        import shutil
        shutil.copy(latest, target)
        log_success(f"Deployed: {latest} → {target}")
    else:
        log_error("No feature importance files found")
        return False

    return True


def main():
    parser = argparse.ArgumentParser(description="Production model training pipeline")
    parser.add_argument("--version", default="v1_2", help="Model version tag")
    parser.add_argument("--cv", type=int, default=12, help="Number of CV folds")
    parser.add_argument("--lookback", type=int, default=36, help="Lookback months for training data")
    parser.add_argument("--tune-hyperparams", action="store_true", help="Run hyperparameter tuning first")
    parser.add_argument("--n-trials", type=int, default=50, help="Optuna trials for hyperparameter tuning")
    parser.add_argument("--skip-prerequisites", action="store_true", help="Skip prerequisite checks")
    parser.add_argument("--skip-deploy", action="store_true", help="Skip artifact deployment")

    args = parser.parse_args()

    print(f"\n{BLUE}{'='*60}")
    print("ASX PORTFOLIO OS - PRODUCTION MODEL TRAINING")
    print(f"{'='*60}{RESET}\n")
    print(f"Version: {args.version}")
    print(f"CV Folds: {args.cv}")
    print(f"Lookback: {args.lookback} months")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    # Step 1: Check prerequisites
    if not args.skip_prerequisites:
        log_step(1, 4, "Check Prerequisites")
        if not check_prerequisites():
            log_error("Prerequisites check failed. Fix issues and retry.")
            sys.exit(1)
    else:
        log_info("Skipping prerequisites check (--skip-prerequisites)")

    # Step 2: Hyperparameter tuning (optional)
    if args.tune_hyperparams:
        log_step(2, 4, "Hyperparameter Tuning")
        best_params = run_hyperparameter_tuning(args.n_trials)
        if best_params:
            log_success("Hyperparameter tuning complete")
            log_info("Apply these parameters by editing models/train_model_a_ml.py")
        else:
            log_error("Hyperparameter tuning failed (continuing with default params)")

    # Step 3: Train models
    step_num = 3 if args.tune_hyperparams else 2
    log_step(step_num, 4, "Train Models")
    if not run_training_script(args.version, args.cv, args.lookback):
        log_error("Model training failed")
        sys.exit(1)

    # Step 4: Deploy artifacts
    if not args.skip_deploy:
        step_num += 1
        log_step(step_num, 4, "Deploy Artifacts")
        if not deploy_artifacts():
            log_error("Artifact deployment failed (non-critical)")

    # Summary
    print(f"\n{GREEN}{'='*60}")
    print("✅ PRODUCTION TRAINING COMPLETE")
    print(f"{'='*60}{RESET}\n")

    print("Artifacts created:")
    print(f"  - models/model_a_classifier_{args.version}.pkl")
    print(f"  - models/model_a_regressor_{args.version}.pkl")
    print(f"  - outputs/feature_importance_{args.version}.json")
    print(f"  - outputs/model_a_ml_signals_latest.csv")
    print()

    print("Next steps:")
    print("1. Validate models: python jobs/backtest_model_a_ml.py")
    print("2. Deploy to production: git commit && git push")
    print("3. Test API: python scripts/validate_deployment.py --url https://your-app.onrender.com")
    print()


if __name__ == "__main__":
    main()
