"""
jobs/property_module_template.py
Collects, cleans, and models Australian property data for valuations, rental yields, and growth forecasts.

Supports:
- Domain API integration (requires DOMAIN_API_KEY)
- CoreLogic integration (requires CORELOGIC_API_KEY)
- Synthetic data generation for development/testing
"""

import os
import json
import argparse
import pandas as pd
import numpy as np
import requests
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv
import lightgbm as lgb
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, r2_score, mean_squared_error

load_dotenv()

# API Keys
CORELOGIC_API_KEY = os.getenv("CORELOGIC_API_KEY", "")
DOMAIN_API_KEY = os.getenv("DOMAIN_API_KEY", "")

# Paths
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(PROJECT_ROOT, "data", "property")
OUTPUT_PATH = os.path.join(PROJECT_ROOT, "outputs")
os.makedirs(DATA_PATH, exist_ok=True)
os.makedirs(OUTPUT_PATH, exist_ok=True)

# Australian region metadata (median prices, yields based on 2024 data)
REGION_METADATA = {
    "Sydney": {"median_price": 1_150_000, "median_yield": 0.028, "growth_5y": 0.42},
    "Melbourne": {"median_price": 850_000, "median_yield": 0.032, "growth_5y": 0.28},
    "Brisbane": {"median_price": 780_000, "median_yield": 0.038, "growth_5y": 0.55},
    "Perth": {"median_price": 620_000, "median_yield": 0.042, "growth_5y": 0.35},
    "Adelaide": {"median_price": 680_000, "median_yield": 0.040, "growth_5y": 0.48},
    "Hobart": {"median_price": 650_000, "median_yield": 0.038, "growth_5y": 0.38},
    "Darwin": {"median_price": 520_000, "median_yield": 0.055, "growth_5y": 0.18},
    "Canberra": {"median_price": 920_000, "median_yield": 0.035, "growth_5y": 0.32},
}


def _generate_synthetic_data(region: str, n_samples: int = 500) -> pd.DataFrame:
    """
    Generate realistic synthetic property data for development/testing.
    Based on Australian property market characteristics.
    """
    np.random.seed(42 + hash(region) % 1000)
    meta = REGION_METADATA.get(region, REGION_METADATA["Sydney"])

    median_price = meta["median_price"]
    median_yield = meta["median_yield"]

    # Property types with different characteristics
    property_types = ["house", "apartment", "townhouse"]
    type_multipliers = {"house": 1.3, "apartment": 0.7, "townhouse": 1.0}

    data = []
    for i in range(n_samples):
        prop_type = np.random.choice(property_types, p=[0.4, 0.35, 0.25])
        multiplier = type_multipliers[prop_type]

        bedrooms = np.random.choice([1, 2, 3, 4, 5], p=[0.05, 0.25, 0.35, 0.25, 0.10])
        bathrooms = min(bedrooms, np.random.choice([1, 2, 3], p=[0.3, 0.5, 0.2]))

        # Land size varies by property type
        if prop_type == "house":
            land_size = np.random.lognormal(np.log(500), 0.4)
        elif prop_type == "townhouse":
            land_size = np.random.lognormal(np.log(200), 0.3)
        else:
            land_size = np.random.uniform(50, 150)

        # Price with realistic variance
        base_price = median_price * multiplier
        bedroom_adj = 1 + (bedrooms - 3) * 0.15
        size_adj = 1 + np.log(land_size / 400) * 0.1
        noise = np.random.lognormal(0, 0.2)
        price = base_price * bedroom_adj * size_adj * noise

        # Rental income from yield with variance
        yield_adj = median_yield * np.random.uniform(0.8, 1.2)
        rental_income = price * yield_adj / 12

        # Distance from CBD affects price
        distance_cbd = np.random.exponential(15)

        # Sale date (last 24 months)
        days_ago = np.random.randint(0, 730)
        sale_date = datetime.now() - timedelta(days=days_ago)

        data.append({
            "property_id": f"{region[:3].upper()}{i:05d}",
            "region": region,
            "property_type": prop_type,
            "bedrooms": int(bedrooms),
            "bathrooms": int(bathrooms),
            "land_size": round(land_size, 1),
            "price": round(price, -3),
            "rental_income": round(rental_income, 0),
            "distance_cbd_km": round(distance_cbd, 1),
            "sale_date": sale_date.strftime("%Y-%m-%d"),
            "days_on_market": np.random.randint(7, 120),
        })

    return pd.DataFrame(data)


def fetch_domain_data(region: str, limit: int = 200) -> Optional[pd.DataFrame]:
    """
    Fetch property listings from Domain API.
    Requires DOMAIN_API_KEY environment variable.
    """
    if not DOMAIN_API_KEY:
        return None

    headers = {"X-Api-Key": DOMAIN_API_KEY}
    url = "https://api.domain.com.au/v1/listings/residential/_search"

    payload = {
        "listingType": "Sale",
        "propertyTypes": ["House", "ApartmentUnitFlat", "Townhouse"],
        "locations": [{"state": "NSW" if region == "Sydney" else "VIC", "region": region}],
        "pageSize": limit,
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        if response.status_code == 200:
            listings = response.json()
            records = []
            for listing in listings:
                prop = listing.get("listing", {})
                records.append({
                    "property_id": prop.get("id"),
                    "region": region,
                    "property_type": prop.get("propertyType", "").lower(),
                    "bedrooms": prop.get("features", {}).get("bedrooms"),
                    "bathrooms": prop.get("features", {}).get("bathrooms"),
                    "land_size": prop.get("features", {}).get("landSize"),
                    "price": prop.get("priceDetails", {}).get("displayPrice"),
                    "address": prop.get("address", {}).get("displayAddress"),
                })
            return pd.DataFrame(records)
    except Exception as e:
        print(f"⚠️ Domain API error: {e}")

    return None


def fetch_property_data(region: str = "Sydney", use_cache: bool = True) -> pd.DataFrame:
    """
    Fetch property data from available sources.
    Priority: Domain API > CoreLogic > Cached file > Synthetic data
    """
    cache_path = os.path.join(DATA_PATH, f"property_data_{region.lower()}.csv")

    # Try cached data first if enabled
    if use_cache and os.path.exists(cache_path):
        cache_age = datetime.now() - datetime.fromtimestamp(os.path.getmtime(cache_path))
        if cache_age < timedelta(days=7):
            print(f"📂 Loading cached data for {region}")
            return pd.read_csv(cache_path, parse_dates=["sale_date"])

    # Try Domain API
    df = fetch_domain_data(region)
    if df is not None and not df.empty:
        print(f"🌐 Fetched {len(df)} properties from Domain API")
        df.to_csv(cache_path, index=False)
        return df

    # Fall back to synthetic data
    print(f"🔧 Generating synthetic data for {region}")
    df = _generate_synthetic_data(region)
    df.to_csv(cache_path, index=False)
    return df


def engineer_property_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Engineer features for property valuation and analysis.
    """
    df = df.copy()

    # Price per sqm (handle edge cases)
    df["land_size_clean"] = df["land_size"].replace(0, np.nan).clip(lower=10)
    df["price_per_sqm"] = df["price"] / df["land_size_clean"]

    # Gross rental yield
    df["rental_income"] = pd.to_numeric(df["rental_income"], errors="coerce")
    df["yield_est"] = (df["rental_income"] * 12) / df["price"]
    df["yield_est"] = df["yield_est"].clip(0.01, 0.15)  # Cap unrealistic yields

    # Property age proxy (from sale date if available)
    if "sale_date" in df.columns:
        df["sale_date"] = pd.to_datetime(df["sale_date"], errors="coerce")
        df["months_since_sale"] = (
            (datetime.now() - df["sale_date"]).dt.days / 30.44
        ).clip(lower=0)

    # Room ratios
    df["bedrooms"] = pd.to_numeric(df["bedrooms"], errors="coerce").fillna(3)
    df["bathrooms"] = pd.to_numeric(df["bathrooms"], errors="coerce").fillna(1)
    df["bed_bath_ratio"] = df["bedrooms"] / df["bathrooms"].clip(lower=1)

    # Size category
    df["size_category"] = pd.cut(
        df["land_size_clean"],
        bins=[0, 100, 300, 600, 1000, float("inf")],
        labels=["tiny", "small", "medium", "large", "estate"],
    )

    # Property type encoding
    if "property_type" in df.columns:
        df["is_house"] = (df["property_type"] == "house").astype(int)
        df["is_apartment"] = (df["property_type"] == "apartment").astype(int)

    # Distance-based features
    if "distance_cbd_km" in df.columns:
        df["distance_cbd_km"] = pd.to_numeric(df["distance_cbd_km"], errors="coerce")
        df["near_cbd"] = (df["distance_cbd_km"] < 10).astype(int)
        df["log_distance"] = np.log1p(df["distance_cbd_km"])

    # Price growth by region (rolling window simulation)
    if "sale_date" in df.columns:
        df = df.sort_values("sale_date")
        df["price_growth_1y"] = df.groupby("region")["price"].pct_change(12)
        df["growth_trend"] = (
            df.groupby("region")["price"]
            .transform(lambda x: x.rolling(6, min_periods=3).mean().pct_change())
        )

    return df


def train_valuation_model(
    df: pd.DataFrame,
    save_model: bool = True,
) -> Dict[str, Any]:
    """
    Train a LightGBM property valuation model with cross-validation.
    Returns model metrics and feature importances.
    """
    feature_cols = [
        "bedrooms", "bathrooms", "land_size_clean", "yield_est",
        "bed_bath_ratio",
    ]

    # Add optional features if present
    optional_cols = ["distance_cbd_km", "log_distance", "is_house", "is_apartment", "near_cbd"]
    feature_cols.extend([c for c in optional_cols if c in df.columns])

    # Filter valid rows
    valid_mask = df[feature_cols + ["price"]].notna().all(axis=1)
    df_train = df.loc[valid_mask].copy()

    if len(df_train) < 50:
        print(f"⚠️ Insufficient data for training: {len(df_train)} rows")
        return {"error": "Insufficient data", "rows": len(df_train)}

    X = df_train[feature_cols]
    y = df_train["price"]

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Model parameters
    model = lgb.LGBMRegressor(
        n_estimators=500,
        learning_rate=0.05,
        max_depth=6,
        num_leaves=31,
        min_child_samples=20,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        verbose=-1,
    )

    # Cross-validation
    cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring="neg_mean_absolute_error")
    cv_mae = -cv_scores.mean()

    # Fit final model
    model.fit(X_train, y_train)
    preds = model.predict(X_test)

    mae = mean_absolute_error(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    r2 = r2_score(y_test, preds)
    mape = np.mean(np.abs((y_test - preds) / y_test)) * 100

    print(f"💰 Valuation Model Performance:")
    print(f"   MAE: ${mae:,.0f} | RMSE: ${rmse:,.0f} | R²: {r2:.3f} | MAPE: {mape:.1f}%")
    print(f"   CV MAE: ${cv_mae:,.0f}")

    # Feature importance
    importances = pd.DataFrame({
        "feature": feature_cols,
        "importance": model.feature_importances_,
    }).sort_values("importance", ascending=False)

    print(f"\n📊 Feature Importance:")
    for _, row in importances.head(5).iterrows():
        print(f"   {row['feature']}: {row['importance']:.0f}")

    if save_model:
        model_path = os.path.join(OUTPUT_PATH, "property_valuation_model.txt")
        model.booster_.save_model(model_path)
        print(f"\n💾 Model saved to {model_path}")

    return {
        "mae": mae,
        "rmse": rmse,
        "r2": r2,
        "mape": mape,
        "cv_mae": cv_mae,
        "n_train": len(X_train),
        "n_test": len(X_test),
        "features": importances.to_dict(orient="records"),
    }


def forecast_property_growth(
    df: pd.DataFrame,
    region: str = None,
    horizon_months: int = 12,
) -> Dict[str, Any]:
    """
    Forecast property price growth using historical trends and region benchmarks.
    """
    if region and region in REGION_METADATA:
        meta = REGION_METADATA[region]
        # Annualized growth from 5-year benchmark
        annual_growth = (1 + meta["growth_5y"]) ** 0.2 - 1
        forecast_multiplier = (1 + annual_growth) ** (horizon_months / 12)

        return {
            "region": region,
            "horizon_months": horizon_months,
            "forecast_multiplier": round(forecast_multiplier, 4),
            "implied_annual_growth": round(annual_growth * 100, 2),
            "source": "historical_benchmark",
        }

    # Calculate from data if available
    if "sale_date" in df.columns and "price" in df.columns:
        df = df.dropna(subset=["sale_date", "price"])
        if len(df) < 24:
            return {"error": "Insufficient historical data", "rows": len(df)}

        df = df.sort_values("sale_date")
        recent = df.tail(24)

        # Simple growth rate calculation
        price_growth = recent["price"].pct_change().dropna()
        monthly_growth = price_growth.mean()

        forecast_multiplier = (1 + monthly_growth) ** horizon_months

        return {
            "region": df["region"].iloc[0] if "region" in df.columns else "unknown",
            "horizon_months": horizon_months,
            "forecast_multiplier": round(forecast_multiplier, 4),
            "implied_annual_growth": round(((1 + monthly_growth) ** 12 - 1) * 100, 2),
            "source": "calculated_from_data",
        }

    return {"error": "Unable to calculate forecast", "forecast_multiplier": 1.0}


def run_full_pipeline(
    region: str = "Sydney",
    train_model: bool = True,
    save_outputs: bool = True,
) -> Dict[str, Any]:
    """
    Run the complete property intelligence pipeline.
    """
    print(f"\n{'='*60}")
    print(f"🏡 Property Intelligence Pipeline - {region}")
    print(f"{'='*60}\n")

    # Fetch data
    df = fetch_property_data(region)
    print(f"📥 Loaded {len(df)} property records")

    # Engineer features
    df = engineer_property_features(df)
    print(f"🔧 Engineered features")

    # Train model
    model_results = None
    if train_model:
        model_results = train_valuation_model(df)

    # Forecast
    forecast = forecast_property_growth(df, region=region)
    print(f"\n📈 Forecast: {forecast['forecast_multiplier']:.2%} over {forecast.get('horizon_months', 12)} months")

    # Save outputs
    if save_outputs:
        features_path = os.path.join(OUTPUT_PATH, f"property_features_{region.lower()}.csv")
        df.to_csv(features_path, index=False)

        summary = {
            "region": region,
            "generated_at": datetime.now().isoformat(),
            "record_count": len(df),
            "avg_price": float(df["price"].mean()),
            "median_price": float(df["price"].median()),
            "avg_yield": float(df["yield_est"].mean()) if "yield_est" in df.columns else None,
            "forecast": forecast,
            "model_metrics": model_results,
        }

        summary_path = os.path.join(OUTPUT_PATH, f"property_summary_{region.lower()}.json")
        with open(summary_path, "w") as f:
            json.dump(summary, f, indent=2, default=str)

        print(f"\n💾 Outputs saved to {OUTPUT_PATH}")

    return {
        "status": "ok",
        "region": region,
        "rows": len(df),
        "avg_price": float(df["price"].mean()),
        "avg_yield": float(df["yield_est"].mean()) if "yield_est" in df.columns else None,
        "forecast": forecast,
        "model_metrics": model_results,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Property Intelligence Pipeline")
    parser.add_argument("--region", default="Sydney", help="Australian region/city")
    parser.add_argument("--all-regions", action="store_true", help="Run for all regions")
    parser.add_argument("--no-train", action="store_true", help="Skip model training")
    parser.add_argument("--horizon", type=int, default=12, help="Forecast horizon in months")

    args = parser.parse_args()

    if args.all_regions:
        for region in REGION_METADATA.keys():
            run_full_pipeline(region, train_model=not args.no_train)
    else:
        run_full_pipeline(args.region, train_model=not args.no_train)

    print("\n✅ Property intelligence pipeline complete.")
