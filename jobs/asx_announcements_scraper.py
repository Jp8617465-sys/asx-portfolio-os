"""
jobs/asx_announcements_scraper.py
ASX announcements scraper with NLP sentiment and event tagging.
"""

import os
import re
import time
from datetime import datetime
from typing import Optional

import pandas as pd
import pdfplumber
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from sqlalchemy import create_engine
from transformers import pipeline

load_dotenv(dotenv_path=".env", override=True)

DATABASE_URL = os.getenv("DATABASE_URL")
ASX_FEED_URL = os.getenv("ASX_FEED_URL", "https://www.asx.com.au/asx/v2/statistics/announcements.do")
SAVE_PATH = os.getenv("ASX_ANNOUNCEMENTS_CSV", "data/nlp/asx_announcements.csv")
ANNOUNCEMENT_LIMIT = int(os.getenv("ASX_ANNOUNCEMENTS_LIMIT", "20"))
REQUEST_SLEEP = float(os.getenv("ASX_ANNOUNCEMENTS_SLEEP", "2"))
USER_AGENT = os.getenv(
    "ASX_USER_AGENT",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
)
EODHD_API_KEY = os.getenv("EODHD_API_KEY", "")
NEWS_API_KEY = os.getenv("NEWS_API_KEY", "")
NEWS_TICKERS = os.getenv("MODEL_C_TICKERS", "BHP,CBA,CSL,WES,FMG,WBC")
NEWS_LIMIT_PER_TICKER = int(os.getenv("MODEL_C_NEWS_LIMIT", "4"))
NEWS_QUERY = os.getenv("MODEL_C_NEWS_QUERY", "ASX OR Australia stock")
NEWS_THROTTLE = float(os.getenv("MODEL_C_NEWS_SLEEP", "1.2"))
EODHD_NEWS_PREFIX = os.getenv("EODHD_NEWS_PREFIX", "ASX")

if not DATABASE_URL:
    raise EnvironmentError("DATABASE_URL not set")

engine = create_engine(DATABASE_URL)
_nlp_sentiment = None


def _get_nlp():
    global _nlp_sentiment
    if _nlp_sentiment is None:
        _nlp_sentiment = pipeline("sentiment-analysis", model="yiyanghkust/finbert-tone")
    return _nlp_sentiment


def fetch_announcements() -> pd.DataFrame:
    resp = requests.get(ASX_FEED_URL, timeout=15, headers={"User-Agent": USER_AGENT})
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    rows = soup.find_all("tr")

    records = []
    for row in rows:
        cells = row.find_all("td")
        if len(cells) < 4:
            continue
        try:
            date_str = cells[0].get_text(strip=True)
            headline = cells[1].get_text(strip=True)
            code = cells[2].get_text(strip=True)
            link = cells[1].find("a")
            pdf_link = link["href"] if link and link.has_attr("href") else None
            if pdf_link and not pdf_link.startswith("http"):
                pdf_link = f"https://www.asx.com.au{pdf_link}"
            records.append(
                {
                    "date": date_str,
                    "code": code,
                    "headline": headline,
                    "pdf_link": pdf_link,
                }
            )
        except Exception:
            continue
    return pd.DataFrame(records)


def parse_pdf_text(url: Optional[str]) -> str:
    if not url:
        return ""
    try:
        resp = requests.get(url, timeout=20, headers={"User-Agent": USER_AGENT})
        resp.raise_for_status()
        path = "/tmp/asx_announcement.pdf"
        with open(path, "wb") as f:
            f.write(resp.content)
        text = ""
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
        return re.sub(r"\s+", " ", text).strip()
    except Exception as exc:
        print(f"PDF parse failed for {url}: {exc}")
        return ""


def classify_text(text: str):
    if not text:
        return None, None, None
    model = _get_nlp()
    result = model(text[:512])[0]
    label = result.get("label")
    score = result.get("score")
    lowered = text.lower()
    event = "general"
    if "guidance" in lowered:
        event = "guidance"
    elif "dividend" in lowered:
        event = "dividend"
    elif "acquisition" in lowered:
        event = "acquisition"
    elif "earnings" in lowered or "results" in lowered:
        event = "earnings"
    return label, event, score


def _stance_from_sentiment(label: Optional[str]) -> str:
    if not label:
        return "neutral"
    label = label.lower()
    if label == "positive":
        return "bullish"
    if label == "negative":
        return "bearish"
    return "neutral"


def _relevance_score(text: str, ticker: Optional[str]) -> float:
    if not text:
        return 0.0
    if not ticker:
        return 0.2
    hits = text.lower().count(ticker.lower())
    return min(1.0, 0.2 + 0.2 * hits)


def fetch_eodhd_news(ticker: str) -> list:
    if not EODHD_API_KEY:
        return []
    url = "https://eodhd.com/api/news"
    params = {
        "api_token": EODHD_API_KEY,
        "s": f"{EODHD_NEWS_PREFIX}.{ticker}",
        "limit": NEWS_LIMIT_PER_TICKER,
        "fmt": "json",
    }
    try:
        resp = requests.get(url, params=params, timeout=30, headers={"User-Agent": USER_AGENT})
        if resp.status_code != 200:
            return []
        payload = resp.json()
    except requests.RequestException as exc:
        print(f"⚠️ EODHD news fetch failed for {ticker}: {exc}")
        return []
    if not isinstance(payload, list):
        return []
    rows = []
    for item in payload:
        headline = item.get("title") or ""
        summary = item.get("content") or ""
        url_link = item.get("url")
        published = item.get("date")
        rows.append({
            "dt": published,
            "code": ticker,
            "headline": headline,
            "pdf_link": url_link,
            "text": f"{headline} {summary}".strip(),
            "source": item.get("source") or "eodhd",
        })
    return rows


def fetch_newsapi_articles(query: str) -> list:
    if not NEWS_API_KEY:
        return []
    url = "https://newsapi.org/v2/everything"
    params = {
        "q": query,
        "language": "en",
        "pageSize": 20,
        "sortBy": "publishedAt",
        "apiKey": NEWS_API_KEY,
    }
    resp = requests.get(url, params=params, timeout=30, headers={"User-Agent": USER_AGENT})
    if resp.status_code != 200:
        return []
    payload = resp.json()
    rows = []
    for item in payload.get("articles", [])[:ANNOUNCEMENT_LIMIT]:
        headline = item.get("title") or ""
        summary = item.get("description") or ""
        published = item.get("publishedAt")
        rows.append({
            "dt": published,
            "code": None,
            "headline": headline,
            "pdf_link": item.get("url"),
            "text": f"{headline} {summary}".strip(),
            "source": (item.get("source") or {}).get("name") or "newsapi",
        })
    return rows


def fetch_fallback_news(limit: int) -> pd.DataFrame:
    records = []
    tickers = [t.strip() for t in NEWS_TICKERS.split(",") if t.strip()]
    for ticker in tickers:
        records.extend(fetch_eodhd_news(ticker))
        time.sleep(NEWS_THROTTLE)

    if not records and NEWS_API_KEY:
        records.extend(fetch_newsapi_articles(NEWS_QUERY))

    if not records:
        return pd.DataFrame()

    df = pd.DataFrame(records).head(limit)
    return df


def run_scraper(limit: int = ANNOUNCEMENT_LIMIT) -> pd.DataFrame:
    df = fetch_announcements().head(limit)
    if df.empty:
        print("Warning: No announcements returned from feed. Falling back to news feeds.")
        df = fetch_fallback_news(limit)
        if df.empty:
            print("Warning: No fallback news returned.")
            return df

    results = []
    for _, row in df.iterrows():
        text = row.get("text") or parse_pdf_text(row.get("pdf_link"))
        sentiment, event_type, confidence = classify_text(text)
        stance = _stance_from_sentiment(sentiment)
        relevance = _relevance_score(text, row.get("code"))
        results.append(
            {
                "dt": row.get("date") or row.get("dt"),
                "code": row.get("code"),
                "headline": row.get("headline"),
                "pdf_link": row.get("pdf_link"),
                "sentiment": sentiment,
                "event_type": event_type,
                "confidence": confidence,
                "stance": stance,
                "relevance_score": relevance,
                "source": row.get("source") or "asx",
                "parsed_text": text[:1000],
                "created_at": datetime.utcnow(),
            }
        )
        time.sleep(REQUEST_SLEEP)

    out = pd.DataFrame(results)
    if "dt" in out.columns:
        out["dt"] = pd.to_datetime(out["dt"], errors="coerce").dt.date
    os.makedirs(os.path.dirname(SAVE_PATH), exist_ok=True)
    out.to_csv(SAVE_PATH, index=False)
    out.to_sql("nlp_announcements", con=engine, if_exists="append", index=False)
    return out


if __name__ == "__main__":
    run_scraper()
