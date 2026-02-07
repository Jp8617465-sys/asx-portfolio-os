"""
app/contracts/types.py
Shared Pydantic v2 models and type aliases for cross-feature contracts.

These types define the API request/response shapes that both backend services
and frontend clients code against. All parallel work packages import from here
to prevent integration conflicts.
"""

from datetime import date, datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Shared Literals (re-exported from plugins/base.py where needed)
# ---------------------------------------------------------------------------

SignalType = Literal["STRONG_BUY", "BUY", "HOLD", "SELL", "STRONG_SELL"]
QualityGrade = Literal["A", "B", "C", "D", "F"]
AlertType = Literal["PRICE_ABOVE", "PRICE_BELOW", "SIGNAL_CHANGE", "VOLUME_SPIKE"]
AlertStatus = Literal["active", "triggered", "disabled", "expired"]


# ---------------------------------------------------------------------------
# Ensemble API Contracts
# ---------------------------------------------------------------------------

class EnsembleSignalResponse(BaseModel):
    """Single ensemble signal in API response."""
    symbol: str
    signal: str
    ensemble_score: Optional[float] = None
    confidence: Optional[float] = None
    model_a_signal: Optional[str] = None
    model_b_signal: Optional[str] = None
    model_a_confidence: Optional[float] = None
    model_b_confidence: Optional[float] = None
    conflict: bool = False
    conflict_reason: Optional[str] = None
    signals_agree: bool = True
    rank: Optional[int] = None
    as_of: Optional[str] = None


class EnsembleListResponse(BaseModel):
    """Response for GET /api/signals/ensemble/latest."""
    status: str = "ok"
    count: int
    as_of: Optional[str] = None
    statistics: Optional[Dict[str, Any]] = None
    signals: List[EnsembleSignalResponse]


class EnsembleGenerateRequest(BaseModel):
    """Request for POST /api/signals/ensemble/generate."""
    symbols: Optional[List[str]] = None
    as_of: Optional[str] = None


class EnsembleGenerateResponse(BaseModel):
    """Response for POST /api/signals/ensemble/generate."""
    status: str = "ok"
    message: str = ""
    signals_generated: int = 0
    as_of: Optional[str] = None


# ---------------------------------------------------------------------------
# ETF Contracts
# ---------------------------------------------------------------------------

class ETFHoldingResponse(BaseModel):
    """Single ETF holding in API response."""
    etf_symbol: str
    holding_symbol: str
    holding_name: Optional[str] = None
    weight: Optional[float] = None
    shares_held: Optional[int] = None
    market_value: Optional[float] = None
    sector: Optional[str] = None
    as_of_date: Optional[str] = None
    # Enrichment from ensemble signals
    signal: Optional[str] = None
    confidence: Optional[float] = None


class ETFHoldingsResponse(BaseModel):
    """Response for GET /api/etfs/{symbol}/holdings."""
    status: str = "ok"
    etf_symbol: str
    holdings_count: int
    as_of_date: Optional[str] = None
    holdings: List[ETFHoldingResponse]


class ETFSummaryResponse(BaseModel):
    """Single ETF in list response."""
    symbol: str
    etf_name: Optional[str] = None
    sector: Optional[str] = None
    nav: Optional[float] = None
    return_1w: Optional[float] = None
    return_1m: Optional[float] = None
    return_3m: Optional[float] = None
    holdings_count: int = 0


class ETFListResponse(BaseModel):
    """Response for GET /api/etfs."""
    status: str = "ok"
    count: int
    etfs: List[ETFSummaryResponse]


class ETFSectorAllocation(BaseModel):
    """Sector allocation for an ETF."""
    sector: str
    weight: float
    holding_count: int = 0


# ---------------------------------------------------------------------------
# Alert Contracts
# ---------------------------------------------------------------------------

class CreateAlertRequest(BaseModel):
    """Request for POST /api/alerts."""
    symbol: str
    alert_type: AlertType
    threshold: float
    notification_channel: str = "email"


class AlertResponse(BaseModel):
    """Single alert in API response."""
    id: int
    user_id: int
    symbol: str
    alert_type: str
    threshold: float
    status: str = "active"
    notification_channel: str = "email"
    created_at: str
    triggered_at: Optional[str] = None
    current_price: Optional[float] = None


class AlertListResponse(BaseModel):
    """Response for GET /api/alerts."""
    status: str = "ok"
    count: int
    alerts: List[AlertResponse]


# ---------------------------------------------------------------------------
# Screener Contracts (Month 5-6)
# ---------------------------------------------------------------------------

class ScreenerFilters(BaseModel):
    """Filters for stock screener search."""
    signal_types: Optional[List[str]] = None
    min_confidence: Optional[float] = None
    max_pe: Optional[float] = None
    min_dividend_yield: Optional[float] = None
    min_roe: Optional[float] = None
    max_debt_to_equity: Optional[float] = None
    sectors: Optional[List[str]] = None
    min_adv: Optional[float] = None


class ScreenerResultItem(BaseModel):
    """Single result in screener response."""
    symbol: str
    company_name: Optional[str] = None
    signal: Optional[str] = None
    confidence: Optional[float] = None
    ensemble_score: Optional[float] = None
    pe_ratio: Optional[float] = None
    roe: Optional[float] = None
    dividend_yield: Optional[float] = None
    sector: Optional[str] = None
    market_cap: Optional[float] = None


class ScreenerResponse(BaseModel):
    """Response for POST /api/screener/search."""
    status: str = "ok"
    count: int
    total_matches: int = 0
    results: List[ScreenerResultItem]


# ---------------------------------------------------------------------------
# Accuracy Contracts (Month 5-6)
# ---------------------------------------------------------------------------

class SignalOutcome(BaseModel):
    """Single signal outcome record."""
    symbol: str
    signal_date: str
    signal_type: str
    confidence: Optional[float] = None
    model_id: str
    actual_return_21d: Optional[float] = None
    prediction_correct: Optional[bool] = None
    evaluated_at: Optional[str] = None


class AccuracySummaryItem(BaseModel):
    """Accuracy summary for a model/signal type/month."""
    model_id: str
    signal_type: Optional[str] = None
    month: Optional[str] = None
    total_signals: int
    correct: int
    accuracy: float
    avg_return: Optional[float] = None


class AccuracyResponse(BaseModel):
    """Response for GET /api/accuracy."""
    status: str = "ok"
    model_id: str
    overall_accuracy: float
    total_evaluated: int
    by_signal_type: List[AccuracySummaryItem] = []
    monthly: List[AccuracySummaryItem] = []
