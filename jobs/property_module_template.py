"""
jobs/property_module_template.py
Collects, cleans, and models property data for valuations, rental yields, and growth forecasts.
"""

import os
import pandas as pd
import numpy as np
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

load_dotenv()

# Optional external property API keys
CORELOGIC_API_KEY = os.getenv("CORELOGIC_API_KEY", "")
DOMAIN_API_KEY = os.getenv("DOMAIN_API_KEY", "")

DATA_PATH = "data/property/"
os.makedirs(DATA_PATH, exist_ok=True)

def fetch_property_data(region: str = "Sydney"):
    """
    Mock API call to property dataset. Replace with actual API (CoreLogic/Domain).
    """
    url = f"https://api.sampleapis.com/property/data?region={region}"
    try:
        r = requests.get(url, timeout=30)
        if r.status_code == 200:
            df = pd.DataFrame(r.json())
        else:
            raise ValueError(f"API error {r.status_code}")
    except Exception as e:
        print("⚠️ Property API fetch failed, using local mock:", e)
        df = pd.read_csv("data/property/mock_property_data.csv")
    df["region"] = region
    return df

def engineer_property_features(df: pd.DataFrame):
    df["price_per_sqm"] = df["price"] / df["land_size"].replace(0, np.nan)
    df["yield_est"] = df["rental_income"] * 12 / df["price"]
    df["price_growth_1y"] = df.groupby("region")["price"].pct_change(12)
    df["growth_trend"] = df["price"].rolling(6).mean().pct_change()
    return df

def train_valuation_model(df: pd.DataFrame):
    df = df.dropna(subset=["price", "bedrooms", "bathrooms", "land_size", "yield_est"])
    X = df[["bedrooms", "bathrooms", "land_size", "yield_est"]]
    y = df["price"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = lgb.LGBMRegressor(n_estimators=500, learning_rate=0.05, max_depth=6)
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    print(f"💰 Valuation MAE: {mean_absolute_error(y_test, preds):,.0f}, R²: {r2_score(y_test, preds):.3f}")
    model.booster_.save_model("outputs/property_valuation_model.txt")
    return model

def forecast_property_growth(df: pd.DataFrame, horizon_months=12):
    recent = df.groupby("region")["price"].tail(24)
    growth_rate = recent.pct_change().mean()
    forecast = (1 + growth_rate) ** (horizon_months / 12)
    return forecast

if __name__ == "__main__":
    df = fetch_property_data("Sydney")
    df = engineer_property_features(df)
    model = train_valuation_model(df)
    forecast = forecast_property_growth(df)
    print(f"🏡 Forecast 12-month growth multiplier: {forecast:.3f}")
    df.to_csv("outputs/property_features_latest.csv", index=False)
    print("✅ Property dataset and model saved.")
