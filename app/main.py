"""
app/main.py
ASX Portfolio OS - Main FastAPI application.

This is the entry point for the API. All route handlers are organized
in separate modules under app/routes/.
"""

from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.openapi.utils import get_openapi
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core import logger
from app.routes import health, refresh, model, portfolio, loan, signals, insights, fusion, jobs, drift, portfolio_management

# Initialize FastAPI app
app = FastAPI(title="ASX Portfolio OS", version="0.4.0")

# Rate limiting configuration
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.get("/")
def home():
    """Root endpoint."""
    return {"message": "ASX Portfolio OS API is running ✅"}


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests."""
    logger.info("➡️ %s %s", request.method, request.url.path)
    try:
        response = await call_next(request)
        logger.info("⬅️ %s %s", response.status_code, request.url.path)
        return response
    except Exception as e:
        logger.exception("💥 Exception during %s %s: %s", request.method, request.url.path, e)
        raise


# Include all route modules
app.include_router(health.router)
app.include_router(refresh.router)
app.include_router(model.router)
app.include_router(portfolio.router)
app.include_router(portfolio_management.router)  # User portfolio management (upload, holdings, rebalancing)
app.include_router(loan.router)
app.include_router(signals.router)
app.include_router(insights.router)
app.include_router(fusion.router)
app.include_router(jobs.router)
app.include_router(drift.router)


@app.get("/openapi-actions.json", include_in_schema=False)
def openapi_actions(request: Request):
    """Generate OpenAPI schema for ChatGPT Actions integration."""
    schema = get_openapi(
        title=app.title,
        version=app.version,
        routes=app.routes,
    )

    host = request.headers.get("host")
    if host:
        schema["servers"] = [{"url": f"https://{host}"}]
    else:
        schema["servers"] = [{"url": "http://127.0.0.1:8788"}]

    schema.setdefault("components", {}).setdefault("securitySchemes", {})
    schema["components"]["securitySchemes"]["ApiKeyAuth"] = {
        "type": "apiKey",
        "in": "header",
        "name": "x-api-key",
    }

    allowed_paths = {
        "/health",
        "/dashboard/model_a_v1_1",
        "/model/status/summary",
        "/model/compare",
        "/signals/live",
        "/property/valuation",
        "/loan/simulate",
        "/loan/summary",
        "/portfolio/attribution",
        "/portfolio/overview",
        "/portfolio/risk",
        "/portfolio/allocation",
        "/portfolio/refresh",
        "/portfolio/performance",
        "/portfolio/upload",  # User portfolio CSV upload
        "/portfolio",  # Get user holdings
        "/portfolio/rebalancing",  # AI rebalancing suggestions
        "/portfolio/risk-metrics",  # Portfolio risk calculations
        "/jobs/history",
        "/jobs/summary",
        "/drift/summary",
        "/drift/features",
        "/drift/history",
        "/jobs/health",
        "/ingest/asx_announcements",
        "/insights/asx_announcements",
        "/assistant/chat",
        "/model/explainability",
    }
    schema["paths"] = {p: v for p, v in schema["paths"].items() if p in allowed_paths}

    for path, ops in schema["paths"].items():
        for op in ops.values():
            if path == "/health":
                op["security"] = []
            else:
                op["security"] = [{"ApiKeyAuth": []}]

    return schema
