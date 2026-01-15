"""
app/routes/loan.py
Loan simulation and summary endpoints.
"""

from typing import Optional

import psycopg2
from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel

from app.core import db, require_key, logger

router = APIRouter()


class LoanSimulateReq(BaseModel):
    principal: float
    annual_rate: float
    years: int
    extra_payment: float = 0.0
    persist: bool = False


@router.post("/loan/simulate")
def loan_simulate(req: LoanSimulateReq, x_api_key: Optional[str] = Header(default=None)):
    """Simulate loan amortization schedule."""
    require_key(x_api_key)
    try:
        from jobs.loan_simulator import loan_amortization
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Loan module import failed: {e}")

    schedule = loan_amortization(req.principal, req.annual_rate, req.years, req.extra_payment)
    monthly_payment = schedule["principal_paid"].iloc[0] + schedule["interest"].iloc[0]
    total_interest = float(schedule["interest"].sum())

    if req.persist:
        with db() as con, con.cursor() as cur:
            cur.execute(
                """
                insert into loan_accounts (principal, annual_rate, years, extra_payment, monthly_payment, total_interest)
                values (%s, %s, %s, %s, %s, %s)
                """,
                (
                    float(req.principal),
                    float(req.annual_rate),
                    int(req.years),
                    float(req.extra_payment),
                    float(monthly_payment),
                    float(total_interest),
                ),
            )
            con.commit()

    return {
        "status": "ok",
        "monthly_payment": float(monthly_payment),
        "total_interest": float(total_interest),
        "months": int(len(schedule)),
        "preview": schedule.head(6).to_dict(orient="records"),
    }


@router.get("/loan/summary")
def loan_summary(
    limit: int = Query(10, ge=1, le=100),
    x_api_key: Optional[str] = Header(default=None),
):
    """Get loan portfolio summary."""
    require_key(x_api_key)
    try:
        with db() as con, con.cursor() as cur:
            cur.execute(
                """
                select
                    count(*),
                    sum(principal),
                    avg(annual_rate),
                    avg(years),
                    sum(total_interest),
                    avg(monthly_payment)
                from loan_accounts
                """
            )
            totals_row = cur.fetchone()

            cur.execute(
                """
                select principal, annual_rate, years, extra_payment, monthly_payment, total_interest, created_at
                from loan_accounts
                order by created_at desc
                limit %s
                """,
                (limit,),
            )
            rows = cur.fetchall()
    except psycopg2.errors.UndefinedTable:
        raise HTTPException(status_code=404, detail="loan_accounts table not found")
    except Exception as exc:
        logger.exception("Loan summary failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))

    count = int(totals_row[0]) if totals_row and totals_row[0] is not None else 0
    total_principal = float(totals_row[1]) if totals_row and totals_row[1] is not None else None
    avg_rate = float(totals_row[2]) if totals_row and totals_row[2] is not None else None
    avg_years = float(totals_row[3]) if totals_row and totals_row[3] is not None else None
    total_interest = float(totals_row[4]) if totals_row and totals_row[4] is not None else None
    avg_monthly_payment = float(totals_row[5]) if totals_row and totals_row[5] is not None else None

    interest_ratio = None
    health_score = None
    if total_principal and total_interest is not None:
        interest_ratio = total_interest / total_principal if total_principal else None
        if interest_ratio is not None:
            health_score = max(0.0, 100.0 - min(100.0, interest_ratio * 50.0))

    latest = [
        {
            "principal": float(row[0]) if row[0] is not None else None,
            "annual_rate": float(row[1]) if row[1] is not None else None,
            "years": int(row[2]) if row[2] is not None else None,
            "extra_payment": float(row[3]) if row[3] is not None else None,
            "monthly_payment": float(row[4]) if row[4] is not None else None,
            "total_interest": float(row[5]) if row[5] is not None else None,
            "created_at": row[6].isoformat() if row[6] else None,
        }
        for row in rows
    ]

    return {
        "status": "ok",
        "totals": {
            "count": count,
            "total_principal": total_principal,
            "avg_rate": avg_rate,
            "avg_years": avg_years,
            "total_interest": total_interest,
            "avg_monthly_payment": avg_monthly_payment,
            "interest_ratio": interest_ratio,
            "health_score": health_score,
        },
        "latest": latest,
    }
