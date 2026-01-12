"""
api_clients/news_client.py
News sentiment client using NewsAPI + simple lexicon scoring.
"""

import os
import json
import re
import time
from datetime import datetime
from typing import List, Optional

import pandas as pd
import requests

NEWS_API_URL = "https://newsapi.org/v2/everything"

POSITIVE_WORDS = {
    "beat", "growth", "surge", "upgrade", "record", "profit", "bull", "outperform", "strong"
}
NEGATIVE_WORDS = {
    "miss", "downgrade", "loss", "bear", "weak", "drop", "fall", "slump", "cut"
}


def _score_text(text: str) -> float:
    tokens = re.findall(r"[A-Za-z]+", text.lower())
    pos = sum(1 for t in tokens if t in POSITIVE_WORDS)
    neg = sum(1 for t in tokens if t in NEGATIVE_WORDS)
    if pos + neg == 0:
        return 0.0
    return (pos - neg) / max(pos + neg, 1)


def _cache_path(query: str, from_date: Optional[str], to_date: Optional[str], cache_dir: str) -> str:
    safe_query = re.sub(r"[^A-Za-z0-9]+", "_", query).strip("_")
    return os.path.join(cache_dir, f"news_{safe_query}_{from_date}_{to_date}.json")


def fetch_news_sentiment(
    api_key: str,
    query: str,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    page_size: int = 100,
    throttle_s: float = 1.2,
    cache_dir: str = "data/cache",
) -> pd.DataFrame:
    if not api_key:
        raise ValueError("NEWS_API_KEY is required.")

    params = {
        "q": query,
        "language": "en",
        "pageSize": page_size,
        "sortBy": "publishedAt",
        "apiKey": api_key,
    }
    if from_date:
        params["from"] = from_date
    if to_date:
        params["to"] = to_date

    os.makedirs(cache_dir, exist_ok=True)
    cache_file = _cache_path(query, from_date, to_date, cache_dir)
    if os.path.exists(cache_file):
        with open(cache_file, "r") as f:
            payload = json.load(f)
    else:
        res = requests.get(NEWS_API_URL, params=params, timeout=30)
        res.raise_for_status()
        payload = res.json()
        with open(cache_file, "w") as f:
            json.dump(payload, f)
        time.sleep(throttle_s)

    articles: List[dict] = payload.get("articles", [])
    if not articles:
        return pd.DataFrame()

    rows = []
    for item in articles:
        title = item.get("title") or ""
        description = item.get("description") or ""
        text = f"{title} {description}".strip()
        score = _score_text(text)
        published_at = item.get("publishedAt")
        dt = None
        if published_at:
            dt = datetime.fromisoformat(published_at.replace("Z", "+00:00")).date()
        rows.append({
            "dt": dt,
            "headline": title,
            "sentiment_score": score,
            "source": (item.get("source") or {}).get("name"),
        })

    df = pd.DataFrame(rows)
    df = df.dropna(subset=["dt"])
    df["updated_at"] = datetime.utcnow()
    return df
