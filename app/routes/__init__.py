"""
app/routes/__init__.py
Route module initialization.
"""

from fastapi import APIRouter

from app.routes import health, refresh, model, portfolio, loan, signals, insights

# Create main router
router = APIRouter()

# Include all route modules
router.include_router(health.router, tags=["Health"])
router.include_router(refresh.router, tags=["Refresh"])
router.include_router(model.router, tags=["Model"])
router.include_router(portfolio.router, tags=["Portfolio"])
router.include_router(loan.router, tags=["Loan"])
router.include_router(signals.router, tags=["Signals"])
router.include_router(insights.router, tags=["Insights"])
