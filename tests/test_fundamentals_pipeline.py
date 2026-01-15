"""
tests/test_fundamentals_pipeline.py
Unit tests for fundamentals pipeline functions.
"""

import pandas as pd
import pytest


def test_parse_fundamentals_extracts_fields():
    """Test that _parse_fundamentals correctly extracts data from EODHD payload."""
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    from jobs.load_fundamentals_pipeline import _parse_fundamentals

    payload = {
        "General": {
            "Sector": "Materials",
            "Industry": "Mining",
            "MostRecentQuarter": "2024-01-31",
        },
        "Highlights": {
            "MarketCapitalization": 150000000000,
            "EarningsShare": 5.25,
            "DividendYield": 0.045,
        },
        "Valuation": {
            "TrailingPE": 12.5,
            "PriceBookMRQ": 2.3,
        },
        "Financials": {
            "Ratios": {
                "ReturnOnEquityTTM": 0.18,
                "TotalDebtEquityTTM": 0.45,
            }
        },
    }

    df = _parse_fundamentals("BHP", payload)

    assert len(df) == 1
    row = df.iloc[0]
    assert row["symbol"] == "BHP.AU"
    assert row["sector"] == "Materials"
    assert row["industry"] == "Mining"
    assert row["market_cap"] == 150000000000
    assert row["pe_ratio"] == 12.5
    assert row["pb_ratio"] == 2.3
    assert row["eps"] == 5.25
    assert row["roe"] == 0.18
    assert row["debt_to_equity"] == 0.45
    assert row["div_yield"] == 0.045


def test_parse_fundamentals_handles_missing_fields():
    """Test that _parse_fundamentals handles missing fields gracefully."""
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    from jobs.load_fundamentals_pipeline import _parse_fundamentals

    payload = {
        "General": {"Sector": "Tech"},
        "Highlights": {},
        "Valuation": {},
        "Financials": {},
    }

    df = _parse_fundamentals("XYZ", payload)

    assert len(df) == 1
    row = df.iloc[0]
    assert row["symbol"] == "XYZ.AU"
    assert row["sector"] == "Tech"
    assert row["pe_ratio"] is None
    assert row["market_cap"] is None


def test_normalize_ticker_strips_suffix():
    """Test that _normalize_ticker correctly strips .AU suffix."""
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    from jobs.load_fundamentals_pipeline import _normalize_ticker

    assert _normalize_ticker("BHP.AU") == "BHP"
    assert _normalize_ticker("BHP") == "BHP"
    assert _normalize_ticker("  cba.au  ") == "CBA"
    assert _normalize_ticker("abc") == "ABC"


def test_get_ticker_list_sample_mode():
    """Test that get_ticker_list returns env tickers in sample mode."""
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    os.environ["FUNDAMENTALS_TICKERS"] = "AAA,BBB,CCC"
    os.environ["FUNDAMENTALS_MODE"] = "sample"
    os.environ["FUNDAMENTALS_SOURCE"] = "env"

    from jobs.load_fundamentals_pipeline import get_ticker_list

    tickers = get_ticker_list(mode="sample", source="env")

    assert "AAA" in tickers
    assert "BBB" in tickers
    assert "CCC" in tickers


def test_get_ticker_list_respects_max_tickers():
    """Test that get_ticker_list respects max_tickers limit."""
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    os.environ["FUNDAMENTALS_TICKERS"] = "A,B,C,D,E,F"
    os.environ["FUNDAMENTALS_MODE"] = "sample"
    os.environ["FUNDAMENTALS_SOURCE"] = "env"

    from jobs.load_fundamentals_pipeline import get_ticker_list

    tickers = get_ticker_list(mode="sample", source="env", max_tickers=3)

    assert len(tickers) == 3
