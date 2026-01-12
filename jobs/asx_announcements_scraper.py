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
    resp = requests.get(ASX_FEED_URL, timeout=15)
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
        resp = requests.get(url, timeout=20)
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


def run_scraper(limit: int = ANNOUNCEMENT_LIMIT) -> pd.DataFrame:
    df = fetch_announcements().head(limit)
    if df.empty:
        return df

    results = []
    for _, row in df.iterrows():
        text = parse_pdf_text(row.get("pdf_link"))
        sentiment, event_type, confidence = classify_text(text)
        results.append(
            {
                "dt": row.get("date"),
                "code": row.get("code"),
                "headline": row.get("headline"),
                "pdf_link": row.get("pdf_link"),
                "sentiment": sentiment,
                "event_type": event_type,
                "confidence": confidence,
                "parsed_text": text[:1000],
                "created_at": datetime.utcnow(),
            }
        )
        time.sleep(REQUEST_SLEEP)

    out = pd.DataFrame(results)
    os.makedirs(os.path.dirname(SAVE_PATH), exist_ok=True)
    out.to_csv(SAVE_PATH, index=False)
    out.to_sql("nlp_announcements", con=engine, if_exists="append", index=False)
    return out


if __name__ == "__main__":
    run_scraper()
