"""
app/routes/portfolio.py
Portfolio attribution and performance endpoints.
"""

from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.core import db, require_key, logger

router = APIRouter()


class PortfolioAttributionRunReq(BaseModel):
    model: str = "model_a_v1_1"
    as_of: Optional[str] = None


@router.post("/portfolio/attribution/run")
def run_portfolio_attribution(
    req: PortfolioAttributionRunReq,
    x_api_key: Optional[str] = Header(default=None),
):
    """Run portfolio attribution calculation."""
    require_key(x_api_key)
    try:
        from jobs.portfolio_attribution_job import main as attribution_main
        attribution_main(model=req.model, as_of=req.as_of)
        return {"status": "ok", "model": req.model, "as_of": req.as_of}
    except Exception as exc:
        logger.exception("Portfolio attribution run failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/portfolio/attribution")
def portfolio_attribution(
    model: str = "model_a_v1_1",
    as_of: Optional[str] = None,
    limit: int = 50,
    x_api_key: Optional[str] = Header(default=None),
):
    """Get portfolio attribution breakdown."""
    require_key(x_api_key)
    with db() as con, con.cursor() as cur:
        if not as_of:
            cur.execute(
                """
                select max(as_of)
                from portfolio_attribution
                where model = %s
                """,
                (model,),
            )
            row = cur.fetchone()
            if not row or not row[0]:
                raise HTTPException(status_code=404, detail="No attribution data found.")
            as_of = row[0].isoformat()

        cur.execute(
            """
            select symbol, weight, return_1d, contribution
            from portfolio_attribution
            where model = %s and as_of = %s
            order by contribution desc nulls last
            limit %s
            """,
            (model, as_of, limit),
        )
        rows = cur.fetchall()

        cur.execute(
            """
            select portfolio_return, volatility, sharpe
            from portfolio_performance
            where model = %s and as_of = %s
            """,
            (model, as_of),
        )
        perf = cur.fetchone()

    items = [
        {
            "symbol": r[0],
            "weight": float(r[1]) if r[1] is not None else None,
            "return_1d": float(r[2]) if r[2] is not None else None,
            "contribution": float(r[3]) if r[3] is not None else None,
        }
        for r in rows
    ]

    return {
        "status": "ok",
        "model": model,
        "as_of": as_of,
        "items": items,
        "summary": {
            "portfolio_return": float(perf[0]) if perf and perf[0] is not None else None,
            "volatility": float(perf[1]) if perf and perf[1] is not None else None,
            "sharpe": float(perf[2]) if perf and perf[2] is not None else None,
        },
    }


@router.get("/portfolio/performance")
def portfolio_performance(
    model: str = "model_a_v1_1",
    limit: int = 30,
    x_api_key: Optional[str] = Header(default=None),
):
    """Get portfolio performance history."""
    require_key(x_api_key)
    with db() as con, con.cursor() as cur:
        cur.execute(
            """
            select as_of, portfolio_return, volatility, sharpe, created_at
            from portfolio_performance
            where model = %s
            order by as_of desc
            limit %s
            """,
            (model, limit),
        )
        rows = cur.fetchall()

    series = [
        {
            "as_of": r[0].isoformat() if r[0] else None,
            "portfolio_return": float(r[1]) if r[1] is not None else None,
            "volatility": float(r[2]) if r[2] is not None else None,
            "sharpe": float(r[3]) if r[3] is not None else None,
            "created_at": r[4].isoformat() if r[4] else None,
        }
        for r in rows
    ]

    return {"status": "ok", "model": model, "series": series}
