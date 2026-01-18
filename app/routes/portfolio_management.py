"""
app/routes/portfolio_management.py
User portfolio management endpoints: upload, holdings, rebalancing, risk metrics
"""

import csv
import io
from datetime import date, datetime, timedelta
from typing import Optional, List
import pandas as pd
import numpy as np

from fastapi import APIRouter, Header, HTTPException, UploadFile, File, Query
from pydantic import BaseModel, Field

from app.core import db, require_key, logger

router = APIRouter()


# =============================================================================
# Request/Response Models
# =============================================================================

class PortfolioUploadResponse(BaseModel):
    status: str
    portfolio_id: int
    holdings_count: int
    message: str


class HoldingResponse(BaseModel):
    id: int
    ticker: str
    shares: float
    avg_cost: float
    date_acquired: Optional[str]
    current_price: Optional[float]
    current_value: Optional[float]
    cost_basis: Optional[float]
    unrealized_pl: Optional[float]
    unrealized_pl_pct: Optional[float]
    current_signal: Optional[str]
    signal_confidence: Optional[float]


class PortfolioResponse(BaseModel):
    portfolio_id: int
    user_id: str
    name: str
    total_value: Optional[float]
    total_cost_basis: Optional[float]
    total_pl: Optional[float]
    total_pl_pct: Optional[float]
    cash_balance: float
    num_holdings: int
    holdings: List[HoldingResponse]
    last_synced_at: Optional[str]


class RebalancingSuggestion(BaseModel):
    ticker: str
    action: str  # BUY, SELL, HOLD, TRIM, ADD
    suggested_quantity: Optional[float]
    suggested_value: Optional[float]
    reason: str
    current_signal: Optional[str]
    signal_confidence: Optional[float]
    current_shares: Optional[float]
    current_weight_pct: Optional[float]
    target_weight_pct: Optional[float]
    priority: int
    confidence_score: float


class RiskMetrics(BaseModel):
    as_of: str
    total_return_pct: Optional[float]
    volatility: Optional[float]
    sharpe_ratio: Optional[float]
    beta: Optional[float]
    max_drawdown_pct: Optional[float]
    top_holding_weight_pct: Optional[float]
    sector_weights: Optional[dict]
    signal_distribution: Optional[dict]


# =============================================================================
# POST /portfolio/upload - Upload CSV and create portfolio
# =============================================================================

@router.post("/portfolio/upload", response_model=PortfolioUploadResponse)
async def upload_portfolio(
    file: UploadFile = File(...),
    portfolio_name: str = Query(default="My Portfolio"),
    user_id: str = Query(default="default_user"),
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Upload a CSV file with portfolio holdings.

    Expected CSV format:
    ticker,shares,avg_cost,date_acquired
    CBA.AX,100,95.50,2023-06-15
    BHP.AX,250,42.30,2023-08-20

    Returns the created portfolio ID and number of holdings processed.
    """
    require_key(x_api_key)

    try:
        # Read CSV file
        contents = await file.read()
        csv_text = contents.decode('utf-8')

        # Parse CSV
        csv_reader = csv.DictReader(io.StringIO(csv_text))
        holdings_data = []

        for row in csv_reader:
            # Validate required fields
            if not all(k in row for k in ['ticker', 'shares', 'avg_cost']):
                raise HTTPException(
                    status_code=400,
                    detail="CSV must have columns: ticker, shares, avg_cost, date_acquired (optional)"
                )

            # Parse and validate data
            try:
                ticker = row['ticker'].strip().upper()
                shares = float(row['shares'])
                avg_cost = float(row['avg_cost'])
                date_acquired = row.get('date_acquired', None)

                if shares <= 0:
                    raise ValueError(f"Shares must be positive for {ticker}")
                if avg_cost < 0:
                    raise ValueError(f"Average cost must be non-negative for {ticker}")

                # Ensure ticker has .AX suffix if not present
                if not ticker.endswith('.AX'):
                    ticker = f"{ticker}.AX"

                holdings_data.append({
                    'ticker': ticker,
                    'shares': shares,
                    'avg_cost': avg_cost,
                    'date_acquired': date_acquired
                })
            except ValueError as ve:
                raise HTTPException(status_code=400, detail=str(ve))

        if not holdings_data:
            raise HTTPException(status_code=400, detail="No valid holdings found in CSV")

        # Create portfolio in database
        with db() as con, con.cursor() as cur:
            # Check if user already has a portfolio
            cur.execute(
                """
                select id from user_portfolios
                where user_id = %s and is_active = true
                limit 1
                """,
                (user_id,)
            )
            existing = cur.fetchone()

            if existing:
                portfolio_id = existing[0]
                logger.info(f"Using existing portfolio {portfolio_id} for user {user_id}")

                # Delete existing holdings
                cur.execute(
                    "delete from user_holdings where portfolio_id = %s",
                    (portfolio_id,)
                )
            else:
                # Create new portfolio
                cur.execute(
                    """
                    insert into user_portfolios (user_id, name, cash_balance)
                    values (%s, %s, 0)
                    returning id
                    """,
                    (user_id, portfolio_name)
                )
                portfolio_id = cur.fetchone()[0]
                logger.info(f"Created new portfolio {portfolio_id} for user {user_id}")

            # Insert holdings
            holdings_count = 0
            for holding in holdings_data:
                cur.execute(
                    """
                    insert into user_holdings (
                        portfolio_id, ticker, shares, avg_cost, date_acquired
                    )
                    values (%s, %s, %s, %s, %s)
                    returning id
                    """,
                    (
                        portfolio_id,
                        holding['ticker'],
                        holding['shares'],
                        holding['avg_cost'],
                        holding['date_acquired']
                    )
                )
                holding_id = cur.fetchone()[0]

                # Sync prices and signals
                cur.execute("select sync_holding_prices(%s)", (holding_id,))
                holdings_count += 1

            # Update portfolio totals
            cur.execute("select update_portfolio_totals(%s)", (portfolio_id,))

            con.commit()

        logger.info(f"✅ Uploaded {holdings_count} holdings to portfolio {portfolio_id}")

        return PortfolioUploadResponse(
            status="success",
            portfolio_id=portfolio_id,
            holdings_count=holdings_count,
            message=f"Successfully uploaded {holdings_count} holdings"
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Portfolio upload failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(exc)}")


# =============================================================================
# GET /portfolio - Get user's portfolio with holdings
# =============================================================================

@router.get("/portfolio", response_model=PortfolioResponse)
def get_portfolio(
    user_id: str = Query(default="default_user"),
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Get user's portfolio with all holdings, current prices, P&L, and signals.
    """
    require_key(x_api_key)

    with db() as con, con.cursor() as cur:
        # Get portfolio
        cur.execute(
            """
            select
                id, user_id, name, total_value, total_cost_basis,
                total_pl, total_pl_pct, cash_balance, last_synced_at
            from user_portfolios
            where user_id = %s and is_active = true
            limit 1
            """,
            (user_id,)
        )
        portfolio_row = cur.fetchone()

        if not portfolio_row:
            raise HTTPException(status_code=404, detail="Portfolio not found")

        portfolio_id = portfolio_row[0]

        # Get holdings
        cur.execute(
            """
            select
                id, ticker, shares, avg_cost, date_acquired,
                current_price, current_value, cost_basis,
                unrealized_pl, unrealized_pl_pct,
                current_signal, signal_confidence
            from user_holdings
            where portfolio_id = %s
            order by current_value desc nulls last
            """,
            (portfolio_id,)
        )
        holdings_rows = cur.fetchall()

        holdings = [
            HoldingResponse(
                id=row[0],
                ticker=row[1],
                shares=float(row[2]),
                avg_cost=float(row[3]),
                date_acquired=row[4].isoformat() if row[4] else None,
                current_price=float(row[5]) if row[5] else None,
                current_value=float(row[6]) if row[6] else None,
                cost_basis=float(row[7]) if row[7] else None,
                unrealized_pl=float(row[8]) if row[8] else None,
                unrealized_pl_pct=float(row[9]) if row[9] else None,
                current_signal=row[10],
                signal_confidence=float(row[11]) if row[11] else None,
            )
            for row in holdings_rows
        ]

        return PortfolioResponse(
            portfolio_id=portfolio_id,
            user_id=portfolio_row[1],
            name=portfolio_row[2],
            total_value=float(portfolio_row[3]) if portfolio_row[3] else None,
            total_cost_basis=float(portfolio_row[4]) if portfolio_row[4] else None,
            total_pl=float(portfolio_row[5]) if portfolio_row[5] else None,
            total_pl_pct=float(portfolio_row[6]) if portfolio_row[6] else None,
            cash_balance=float(portfolio_row[7]),
            num_holdings=len(holdings),
            holdings=holdings,
            last_synced_at=portfolio_row[8].isoformat() if portfolio_row[8] else None,
        )


# =============================================================================
# GET /portfolio/rebalancing - AI rebalancing suggestions
# =============================================================================

@router.get("/portfolio/rebalancing")
def get_rebalancing_suggestions(
    user_id: str = Query(default="default_user"),
    regenerate: bool = Query(default=False),
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Get AI-driven rebalancing suggestions for the user's portfolio.

    Suggestions are based on:
    - Current AI signals and confidence scores
    - Position sizes and portfolio concentration
    - Risk metrics and diversification
    - Overweight/underweight positions

    Args:
        regenerate: If True, regenerate suggestions instead of using cached ones
    """
    require_key(x_api_key)

    with db() as con, con.cursor() as cur:
        # Get portfolio
        cur.execute(
            """
            select id, total_value
            from user_portfolios
            where user_id = %s and is_active = true
            limit 1
            """,
            (user_id,)
        )
        portfolio_row = cur.fetchone()

        if not portfolio_row:
            raise HTTPException(status_code=404, detail="Portfolio not found")

        portfolio_id, total_value = portfolio_row

        if not total_value or total_value <= 0:
            return {
                "status": "ok",
                "portfolio_id": portfolio_id,
                "suggestions": [],
                "message": "Portfolio has no value. Upload holdings first."
            }

        # Check for existing suggestions (generated in last 24 hours)
        if not regenerate:
            cur.execute(
                """
                select
                    ticker, action, suggested_quantity, suggested_value,
                    reason, current_signal, signal_confidence,
                    current_shares, current_weight_pct, target_weight_pct,
                    priority, confidence_score
                from portfolio_rebalancing_suggestions
                where portfolio_id = %s
                  and status = 'pending'
                  and generated_at > now() - interval '24 hours'
                order by priority asc
                """,
                (portfolio_id,)
            )
            existing = cur.fetchall()

            if existing:
                suggestions = [
                    RebalancingSuggestion(
                        ticker=row[0],
                        action=row[1],
                        suggested_quantity=float(row[2]) if row[2] else None,
                        suggested_value=float(row[3]) if row[3] else None,
                        reason=row[4],
                        current_signal=row[5],
                        signal_confidence=float(row[6]) if row[6] else None,
                        current_shares=float(row[7]) if row[7] else None,
                        current_weight_pct=float(row[8]) if row[8] else None,
                        target_weight_pct=float(row[9]) if row[9] else None,
                        priority=row[10],
                        confidence_score=float(row[11]) if row[11] else 50.0,
                    )
                    for row in existing
                ]

                return {
                    "status": "ok",
                    "portfolio_id": portfolio_id,
                    "suggestions": suggestions,
                    "generated_at": datetime.now().isoformat(),
                    "message": f"Returning {len(suggestions)} cached suggestions"
                }

        # Generate new suggestions
        cur.execute(
            """
            select
                ticker, shares, current_price, current_value,
                current_signal, signal_confidence
            from user_holdings
            where portfolio_id = %s
              and current_price is not null
            order by current_value desc nulls last
            """,
            (portfolio_id,)
        )
        holdings = cur.fetchall()

        if not holdings:
            return {
                "status": "ok",
                "portfolio_id": portfolio_id,
                "suggestions": [],
                "message": "No holdings with current prices found"
            }

        # Clear old suggestions
        cur.execute(
            "delete from portfolio_rebalancing_suggestions where portfolio_id = %s",
            (portfolio_id,)
        )

        suggestions = []
        priority = 1

        for ticker, shares, current_price, current_value, signal, confidence in holdings:
            if not signal:
                continue

            current_weight = (float(current_value) / float(total_value)) * 100 if current_value and total_value else 0

            # Rule 1: Strong signals with high confidence
            if signal == 'STRONG_SELL' and confidence and confidence >= 70:
                # Suggest selling entire position
                reason = f"Strong sell signal (confidence: {confidence:.1f}%). Returns don't justify risk."
                action = 'SELL'
                suggested_qty = float(shares)
                suggested_value = float(shares) * float(current_price)
                target_weight = 0
                conf_score = float(confidence)

            elif signal == 'SELL' and confidence and confidence >= 60:
                # Suggest trimming position by 50%
                reason = f"Sell signal (confidence: {confidence:.1f}%). Consider reducing exposure."
                action = 'TRIM'
                suggested_qty = float(shares) * 0.5
                suggested_value = suggested_qty * float(current_price)
                target_weight = current_weight * 0.5
                conf_score = float(confidence) * 0.8

            elif signal == 'STRONG_BUY' and confidence and confidence >= 80:
                # Suggest adding to position (20% more)
                reason = f"Strong buy signal (confidence: {confidence:.1f}%). Attractive entry point."
                action = 'ADD'
                suggested_qty = float(shares) * 0.2
                suggested_value = suggested_qty * float(current_price)
                target_weight = current_weight * 1.2
                conf_score = float(confidence)

            elif signal == 'BUY' and confidence and confidence >= 70:
                # Suggest adding to position (10% more)
                reason = f"Buy signal (confidence: {confidence:.1f}%). Good value opportunity."
                action = 'ADD'
                suggested_qty = float(shares) * 0.1
                suggested_value = suggested_qty * float(current_price)
                target_weight = current_weight * 1.1
                conf_score = float(confidence) * 0.9

            # Rule 2: Overweight positions (> 15% of portfolio)
            elif current_weight > 15:
                reason = f"Position is {current_weight:.1f}% of portfolio (overweight). Reduce concentration risk."
                action = 'TRIM'
                # Bring down to 12%
                target_value = float(total_value) * 0.12
                target_shares = target_value / float(current_price)
                suggested_qty = float(shares) - target_shares
                suggested_value = suggested_qty * float(current_price)
                target_weight = 12.0
                conf_score = 70.0

            else:
                # No action needed
                continue

            # Insert suggestion
            cur.execute(
                """
                insert into portfolio_rebalancing_suggestions (
                    portfolio_id, ticker, action, suggested_quantity, suggested_value,
                    reason, current_signal, signal_confidence,
                    current_shares, current_weight_pct, target_weight_pct,
                    priority, confidence_score, expires_at
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    portfolio_id, ticker, action, suggested_qty, suggested_value,
                    reason, signal, confidence,
                    float(shares), current_weight, target_weight,
                    priority, conf_score, datetime.now() + timedelta(days=7)
                )
            )

            suggestions.append(RebalancingSuggestion(
                ticker=ticker,
                action=action,
                suggested_quantity=suggested_qty,
                suggested_value=suggested_value,
                reason=reason,
                current_signal=signal,
                signal_confidence=float(confidence) if confidence else None,
                current_shares=float(shares),
                current_weight_pct=current_weight,
                target_weight_pct=target_weight,
                priority=priority,
                confidence_score=conf_score,
            ))

            priority += 1

        con.commit()

        logger.info(f"✅ Generated {len(suggestions)} rebalancing suggestions for portfolio {portfolio_id}")

        return {
            "status": "ok",
            "portfolio_id": portfolio_id,
            "suggestions": suggestions,
            "generated_at": datetime.now().isoformat(),
            "message": f"Generated {len(suggestions)} new suggestions"
        }


# =============================================================================
# GET /portfolio/risk-metrics - Portfolio risk metrics
# =============================================================================

@router.get("/portfolio/risk-metrics", response_model=RiskMetrics)
def get_risk_metrics(
    user_id: str = Query(default="default_user"),
    recalculate: bool = Query(default=False),
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Get calculated risk metrics for the user's portfolio.

    Includes:
    - Volatility (annualized standard deviation)
    - Sharpe ratio
    - Beta (vs ASX 200)
    - Max drawdown
    - Concentration metrics
    - Sector weights
    - Signal distribution
    """
    require_key(x_api_key)

    with db() as con, con.cursor() as cur:
        # Get portfolio
        cur.execute(
            """
            select id from user_portfolios
            where user_id = %s and is_active = true
            limit 1
            """,
            (user_id,)
        )
        portfolio_row = cur.fetchone()

        if not portfolio_row:
            raise HTTPException(status_code=404, detail="Portfolio not found")

        portfolio_id = portfolio_row[0]

        # Check for existing metrics (calculated today)
        if not recalculate:
            cur.execute(
                """
                select
                    as_of, total_return_pct, volatility, sharpe_ratio, beta,
                    max_drawdown_pct, top_holding_weight_pct,
                    sector_weights, signal_distribution
                from portfolio_risk_metrics
                where portfolio_id = %s
                  and as_of = current_date
                limit 1
                """,
                (portfolio_id,)
            )
            existing = cur.fetchone()

            if existing:
                return RiskMetrics(
                    as_of=existing[0].isoformat(),
                    total_return_pct=float(existing[1]) if existing[1] else None,
                    volatility=float(existing[2]) if existing[2] else None,
                    sharpe_ratio=float(existing[3]) if existing[3] else None,
                    beta=float(existing[4]) if existing[4] else None,
                    max_drawdown_pct=float(existing[5]) if existing[5] else None,
                    top_holding_weight_pct=float(existing[6]) if existing[6] else None,
                    sector_weights=existing[7],
                    signal_distribution=existing[8],
                )

        # Calculate metrics
        cur.execute(
            """
            select
                h.ticker, h.current_value, h.unrealized_pl_pct, h.current_signal,
                p.total_value
            from user_holdings h
            join user_portfolios p on p.id = h.portfolio_id
            where h.portfolio_id = %s
              and h.current_value is not null
            order by h.current_value desc
            """,
            (portfolio_id,)
        )
        holdings = cur.fetchall()

        if not holdings:
            raise HTTPException(
                status_code=404,
                detail="No holdings with current prices found. Cannot calculate metrics."
            )

        total_value = float(holdings[0][4])

        # Calculate concentration metrics
        values = [float(h[1]) for h in holdings]
        weights = [v / total_value * 100 for v in values]

        top_holding_weight = weights[0] if weights else 0
        top_5_weight = sum(weights[:5]) if len(weights) >= 5 else sum(weights)

        # Herfindahl index (sum of squared weights)
        herfindahl = sum([(w/100)**2 for w in weights]) if weights else 0

        # Signal distribution
        signal_dist = {}
        for h in holdings:
            signal = h[3] or 'UNKNOWN'
            signal_dist[signal] = signal_dist.get(signal, 0) + 1

        # Simple volatility estimate (based on unrealized P&L variance)
        returns = [float(h[2]) for h in holdings if h[2] is not None]
        volatility = float(np.std(returns)) if returns else None

        # Simplified Sharpe (assuming risk-free rate = 2%)
        avg_return = float(np.mean(returns)) if returns else 0
        sharpe = (avg_return - 2.0) / volatility if volatility and volatility > 0 else None

        # Simplified beta (correlation with market, estimated)
        # For now, use a placeholder - in production, calculate from historical prices
        beta = 1.0

        # Max drawdown (simplified - would need historical data)
        max_drawdown = min(returns) if returns else 0

        # Insert metrics
        cur.execute(
            """
            insert into portfolio_risk_metrics (
                portfolio_id, as_of, total_return_pct, volatility,
                sharpe_ratio, beta, max_drawdown_pct,
                top_holding_weight_pct, top_5_weight_pct, herfindahl_index,
                sector_weights, signal_distribution
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            on conflict (portfolio_id, as_of)
            do update set
                total_return_pct = excluded.total_return_pct,
                volatility = excluded.volatility,
                sharpe_ratio = excluded.sharpe_ratio,
                beta = excluded.beta,
                max_drawdown_pct = excluded.max_drawdown_pct,
                top_holding_weight_pct = excluded.top_holding_weight_pct,
                calculation_timestamp = now()
            """,
            (
                portfolio_id, date.today(), avg_return, volatility,
                sharpe, beta, max_drawdown,
                top_holding_weight, top_5_weight, herfindahl,
                {}, signal_dist  # Sector weights placeholder
            )
        )

        con.commit()

        logger.info(f"✅ Calculated risk metrics for portfolio {portfolio_id}")

        return RiskMetrics(
            as_of=date.today().isoformat(),
            total_return_pct=avg_return,
            volatility=volatility,
            sharpe_ratio=sharpe,
            beta=beta,
            max_drawdown_pct=max_drawdown,
            top_holding_weight_pct=top_holding_weight,
            sector_weights={},  # TODO: Add sector classification
            signal_distribution=signal_dist,
        )
